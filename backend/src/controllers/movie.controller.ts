import { Request, Response, NextFunction, RequestHandler } from 'express';
import { MovieRepository } from '../repositories/movie.repository';
import { TranscodeService } from '../services/transcode.service';
import { WatchParty } from '../models/watch-party.model';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import crypto from 'crypto';
import { PlaybackProgress } from '../models/playback-progress.model';
import { Profile } from '../models/profile.model';
import mongoose from 'mongoose';

const movieRepository = new MovieRepository();
const transcodeService = new TranscodeService();

export const createMovie: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, releaseYear, genres, ageRating, duration, featured, isOriginal, isTrending, cast } = req.body;
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.video || !files.thumbnail || !files.poster) {
      throw new BadRequestError('Required files (video, thumbnail, poster) are missing');
    }

    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail[0];
    const posterFile = files.poster[0];

    // Web URLs for serving images
    const thumbnailWebPath = `/uploads/thumbnails/${thumbnailFile.filename}`;
    const posterWebPath = `/uploads/posters/${posterFile.filename}`;

    // Perform HLS Transcoding
    const videoStreamPath = await transcodeService.transcodeToHLS(videoFile.path, videoFile.filename);

    const movie = await movieRepository.create({
      title,
      description,
      releaseYear: Number(releaseYear),
      genres: Array.isArray(genres) ? genres : genres.split(',').map((g: string) => g.trim()),
      ageRating,
      duration: Number(duration),
      thumbnail: thumbnailWebPath,
      poster: posterWebPath,
      videoUrl: videoStreamPath,
      cast: Array.isArray(cast) ? cast : cast ? cast.split(',').map((c: string) => c.trim()) : [],
      featured: featured === 'true' || featured === true,
      isOriginal: isOriginal === 'true' || isOriginal === true,
      isTrending: isTrending === 'true' || isTrending === true,
      active: true,
    });

    res.status(201).json({
      success: true,
      movie,
    });
  } catch (error) {
    next(error);
  }
};

const filterKidsMovies = (moviesList: any[], isKidsProfile: boolean) => {
  if (!isKidsProfile) return moviesList;
  return moviesList.filter((m) => m && (m.ageRating === 'G' || m.ageRating === 'PG'));
};

export const getMovies: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, genre } = req.query;
    let movies;

    if (search) {
      movies = await movieRepository.searchMovies(search as string);
    } else if (genre) {
      movies = await movieRepository.findByGenre(genre as string);
    } else {
      movies = await movieRepository.find({ active: true });
    }

    movies = filterKidsMovies(movies, !!req.profile?.isKids);

    res.status(200).json({
      success: true,
      movies,
    });
  } catch (error) {
    next(error);
  }
};

export const getMovieById: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const movie = await movieRepository.findById(id);
    if (!movie || !movie.active) {
      throw new NotFoundError('Movie/Show not found');
    }

    if (req.profile?.isKids && !['G', 'PG'].includes(movie.ageRating)) {
      throw new NotFoundError('Movie/Show not found or age restricted');
    }

    // Increment view count in background
    await movieRepository.incrementViews(id);

    // Get playback progress if profile is present
    let resumeTime = 0;
    if (req.profile) {
      const progress = await PlaybackProgress.findOne({ profileId: req.profile._id, movieId: id });
      if (progress) {
        resumeTime = progress.currentTime;
      }
    }

    res.status(200).json({
      success: true,
      movie,
      resumeTime,
    });
  } catch (error) {
    next(error);
  }
};

export const getTrending: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let movies = await movieRepository.findTrending(10);
    movies = filterKidsMovies(movies, !!req.profile?.isKids);
    res.status(200).json({
      success: true,
      movies,
    });
  } catch (error) {
    next(error);
  }
};

export const getOriginals: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let movies = await movieRepository.findOriginals(10);
    movies = filterKidsMovies(movies, !!req.profile?.isKids);
    res.status(200).json({
      success: true,
      movies,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeatured: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let movie = await movieRepository.findFeatured();
    if (req.profile?.isKids && movie && !['G', 'PG'].includes(movie.ageRating)) {
      const MovieModel = require('../models/movie.model').default;
      movie = await MovieModel.findOne({ active: true, ageRating: { $in: ['G', 'PG'] } }).exec();
    }
    res.status(200).json({
      success: true,
      movie,
    });
  } catch (error) {
    next(error);
  }
};

export const likeMovie: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const movie = await movieRepository.findById(id);
    if (!movie || !movie.active) {
      throw new NotFoundError('Movie not found');
    }

    movie.likes += 1;
    await movie.save();

    res.status(200).json({
      success: true,
      likes: movie.likes,
    });
  } catch (error) {
    next(error);
  }
};

// Real-time Watch Party Control
export const createWatchParty: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hostId = req.user!.id;
    const { movieId } = req.body;

    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie selected is invalid');
    }

    // Generate random short party code (e.g. WP-A3F9-D98B)
    const partyCode = 'WP-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const watchParty = await WatchParty.create({
      hostId,
      movieId,
      partyCode,
      participants: [hostId],
      status: 'active',
    });

    res.status(201).json({
      success: true,
      partyCode: watchParty.partyCode,
      party: watchParty,
    });
  } catch (error) {
    next(error);
  }
};

export const getWatchPartyByCode: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    const party = await WatchParty.findOne({ partyCode: code.toUpperCase(), status: 'active' })
      .populate('movieId')
      .populate('hostId', 'name email');

    if (!party) {
      throw new NotFoundError('Watch Party room is expired or invalid');
    }

    res.status(200).json({
      success: true,
      party,
    });
  } catch (error) {
    next(error);
  }
};

// 1. Save playback progress
export const saveProgress: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { currentTime, duration } = req.body;
    
    if (!req.profile) {
      throw new BadRequestError('Profile context is required to track progress');
    }

    const progress = await PlaybackProgress.findOneAndUpdate(
      { profileId: req.profile._id, movieId: id },
      {
        userId: req.user!._id,
        currentTime: Number(currentTime),
        duration: Number(duration),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, progress });
  } catch (error) {
    next(error);
  }
};

// 2. Get continue watching list
export const getContinueWatching: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.profile) {
      throw new BadRequestError('Profile context is required');
    }

    const progressItems = await PlaybackProgress.find({
      profileId: req.profile._id,
      currentTime: { $gt: 10 },
    })
      .populate('movieId')
      .sort({ updatedAt: -1 })
      .exec();

    const activeProgress = progressItems.filter((p: any) => {
      if (!p.movieId || !p.movieId.active) return false;
      if (req.profile?.isKids && !['G', 'PG'].includes(p.movieId.ageRating)) return false;
      return p.currentTime < p.duration - 15;
    });

    res.status(200).json({
      success: true,
      progress: activeProgress.map((p: any) => ({
        id: p._id,
        currentTime: p.currentTime,
        duration: p.duration,
        movie: p.movieId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 3. Toggle movie in watchlist
export const toggleWatchlist: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.profile) {
      throw new BadRequestError('Profile context is required');
    }

    const profile = await Profile.findById(req.profile._id);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const movieId = new mongoose.Types.ObjectId(id);
    const index = profile.watchlist.findIndex((mId) => mId.toString() === id);
    let added = false;

    if (index === -1) {
      profile.watchlist.push(movieId);
      added = true;
    } else {
      profile.watchlist.splice(index, 1);
    }

    await profile.save();

    res.status(200).json({
      success: true,
      watchlist: profile.watchlist,
      added,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Toggle movie in favorites
export const toggleFavorite: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.profile) {
      throw new BadRequestError('Profile context is required');
    }

    const profile = await Profile.findById(req.profile._id);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const movieId = new mongoose.Types.ObjectId(id);
    const index = profile.favorites.findIndex((mId) => mId.toString() === id);
    let added = false;

    if (index === -1) {
      profile.favorites.push(movieId);
      added = true;
    } else {
      profile.favorites.splice(index, 1);
    }

    await profile.save();

    res.status(200).json({
      success: true,
      favorites: profile.favorites,
      added,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get watchlist and favorites for active profile
export const getMyList: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.profile) {
      throw new BadRequestError('Profile context is required');
    }

    const profile = await Profile.findById(req.profile._id)
      .populate('watchlist')
      .populate('favorites')
      .exec();

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const watchlist = filterKidsMovies(profile.watchlist || [], !!req.profile.isKids);
    const favorites = filterKidsMovies(profile.favorites || [], !!req.profile.isKids);

    res.status(200).json({
      success: true,
      watchlist,
      favorites,
    });
  } catch (error) {
    next(error);
  }
};

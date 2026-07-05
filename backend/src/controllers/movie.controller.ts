import { Request, Response, NextFunction, RequestHandler } from 'express';
import { MovieRepository } from '../repositories/movie.repository';
import { TranscodeService } from '../services/transcode.service';
import { WatchParty } from '../models/watch-party.model';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import crypto from 'crypto';

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

    // Increment view count in background
    await movieRepository.incrementViews(id);

    res.status(200).json({
      success: true,
      movie,
    });
  } catch (error) {
    next(error);
  }
};

export const getTrending: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movies = await movieRepository.findTrending(10);
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
    const movies = await movieRepository.findOriginals(10);
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
    const movie = await movieRepository.findFeatured();
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

import mongoose from 'mongoose';
import { env } from './environment';
import { logger } from '../utils/logger';
import { Coupon } from '../models/coupon.model';
import { Movie } from '../models/movie.model';

export const connectDatabase = async (): Promise<void> => {
  const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    logger.info('Connecting to MongoDB Atlas...');
    await mongoose.connect(env.MONGODB_URI, options);
    
    // Seed test coupons for the user to try out
    await Coupon.findOneAndUpdate(
      { code: 'AG50' },
      { code: 'AG50', discountPercentage: 50, active: true },
      { upsert: true, new: true }
    );
    await Coupon.findOneAndUpdate(
      { code: 'FREE100' },
      { code: 'FREE100', discountPercentage: 100, active: true },
      { upsert: true, new: true }
    );
    logger.info('Test billing coupons seeded successfully.');

    // Seed mock movies using upsert to guarantee they exist
    const mockMovies = [
      {
        title: 'Tears of Steel',
        description: 'A sci-fi film set in a dystopian future where a group of soldiers and scientists gather at the Oude Kerk in Amsterdam to stage a critical experiment to rescue the world from destructive robots.',
        releaseYear: 2012,
        genres: ['Sci-Fi', 'Action', 'Drama'],
        ageRating: 'PG-13',
        duration: 12,
        thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
        poster: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1080&auto=format&fit=crop&q=80',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Derek de Lint', 'Rogier Schippers', 'Jody Bhe'],
        isOriginal: true,
        isTrending: true,
        featured: true,
        active: true,
      },
      {
        title: 'Sintel',
        description: 'A lonely young woman named Sintel befriends a baby dragon she names Scales. When Scales is kidnapped by an adult dragon, Sintel embarks on a long, arduous quest to rescue her friend.',
        releaseYear: 2010,
        genres: ['Fantasy', 'Adventure', 'Drama'],
        ageRating: 'PG',
        duration: 15,
        thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&auto=format&fit=crop&q=80',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Halina Reijn', 'Thom Hoffman'],
        isOriginal: true,
        isTrending: false,
        featured: false,
        active: true,
      },
      {
        title: 'Big Buck Bunny',
        description: 'A large, lovable rabbit named Big Buck Bunny wakes up to find three forest rodents bullying him and destroying nature. He decides to craft clever traps to teach the bullies a lesson.',
        releaseYear: 2008,
        genres: ['Animation', 'Comedy', 'Family'],
        ageRating: 'G',
        duration: 10,
        thumbnail: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=500&auto=format&fit=crop&q=80',
        poster: 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=1080&auto=format&fit=crop&q=80',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Bunny', 'Squirrel', 'Gopher'],
        isOriginal: false,
        isTrending: true,
        featured: false,
        active: true,
      },
      {
        title: 'Elephant Dream',
        description: 'Two characters, Proog, who is older and experienced, and Emo, who is younger, live inside a bizarre, giant machine, exploring its strange quirks, gears, and rooms.',
        releaseYear: 2006,
        genres: ['Sci-Fi', 'Fantasy', 'Surreal'],
        ageRating: 'PG',
        duration: 11,
        thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80',
        poster: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=1080&auto=format&fit=crop&q=80',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Tygo Gernandt', 'Cas Jansen'],
        isOriginal: false,
        isTrending: false,
        featured: false,
        active: true,
      }
    ];

    for (const m of mockMovies) {
      await Movie.findOneAndUpdate(
        { title: m.title },
        m,
        { upsert: true, new: true }
      );
    }
    logger.info('Mock movies database seeded/upserted successfully.');
  } catch (error) {
    logger.error('Initial MongoDB connection failed:', error);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

// Handle graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully through app termination.');
  } catch (err) {
    logger.error('Error closing MongoDB connection:', err);
  }
};

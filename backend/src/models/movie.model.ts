import { Schema, model, Document } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  description: string;
  releaseYear: number;
  genres: string[];
  ageRating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
  duration: number; // in minutes
  thumbnail: string; // URL/Path to thumbnail
  poster: string; // URL/Path to poster
  videoUrl: string; // URL/Path to video file (.mp4 or .m3u8)
  cast: string[];
  views: number;
  likes: number;
  isOriginal: boolean;
  isTrending: boolean;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    releaseYear: {
      type: Number,
      required: true,
    },
    genres: {
      type: [String],
      required: true,
      index: true,
    },
    ageRating: {
      type: String,
      enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    poster: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    cast: {
      type: [String],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
      required: true,
    },
    isOriginal: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search Index helper
movieSchema.index({ title: 'text', description: 'text', genres: 'text', cast: 'text' });

export const Movie = model<IMovie>('Movie', movieSchema);
export default Movie;

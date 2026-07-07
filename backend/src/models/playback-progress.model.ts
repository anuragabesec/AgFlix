import { Schema, model, Document, Types } from 'mongoose';

export interface IPlaybackProgress extends Document {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  movieId: Types.ObjectId;
  currentTime: number; // in seconds
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const playbackProgressSchema = new Schema<IPlaybackProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    currentTime: {
      type: Number,
      required: true,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one progress entry per profile per movie
playbackProgressSchema.index({ profileId: 1, movieId: 1 }, { unique: true });

export const PlaybackProgress = model<IPlaybackProgress>('PlaybackProgress', playbackProgressSchema);
export default PlaybackProgress;

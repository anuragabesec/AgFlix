import { Schema, model, Document, Types } from 'mongoose';

export interface IProfile extends Document {
  userId: Types.ObjectId;
  name: string;
  avatar: string;
  isKids: boolean;
  pinHash?: string; // Hashed 4-digit PIN for locks
  watchlist: Types.ObjectId[];
  favorites: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    isKids: {
      type: Boolean,
      default: false,
    },
    pinHash: {
      type: String,
    },
    watchlist: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Movie',
      },
    ],
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Movie',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
profileSchema.index({ userId: 1 });

export const Profile = model<IProfile>('Profile', profileSchema);
export default Profile;

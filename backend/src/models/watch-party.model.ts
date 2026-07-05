import { Schema, model, Document, Types } from 'mongoose';

export interface IWatchParty extends Document {
  hostId: Types.ObjectId;
  movieId: Types.ObjectId;
  partyCode: string;
  participants: Types.ObjectId[];
  status: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

const watchPartySchema = new Schema<IWatchParty>(
  {
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    partyCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WatchParty = model<IWatchParty>('WatchParty', watchPartySchema);
export default WatchParty;

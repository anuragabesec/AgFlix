import { Schema, model, Document, Types } from 'mongoose';

export interface IActiveSession extends Document {
  userId: Types.ObjectId;
  tokenFamily: string; // Used to identify family of rotated tokens
  refreshTokenHash: string;
  deviceId: string; // Device fingerprint ID from the client
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isStreaming: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activeSessionSchema = new Schema<IActiveSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenFamily: {
      type: String,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      default: 'Unknown Browser',
    },
    os: {
      type: String,
      default: 'Unknown OS',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: 'Unknown Location',
    },
    isStreaming: {
      type: Boolean,
      default: false,
      required: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
activeSessionSchema.index({ userId: 1 });
activeSessionSchema.index({ tokenFamily: 1 });
activeSessionSchema.index({ refreshTokenHash: 1 });
activeSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const ActiveSession = model<IActiveSession>('ActiveSession', activeSessionSchema);
export default ActiveSession;

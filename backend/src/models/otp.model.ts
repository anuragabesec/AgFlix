import { Schema, model, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  purpose: 'signup' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['signup', 'password_reset'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to expire documents automatically at the expiresAt date (TTL Index)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

export const Otp = model<IOtp>('Otp', otpSchema);
export default Otp;

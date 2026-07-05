import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  status: 'active' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      required: true,
    },
    lockUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
export default User;

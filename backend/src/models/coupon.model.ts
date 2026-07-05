import { Schema, model, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountPercentage: number;
  active: boolean;
  expiresAt?: Date;
  maxRedemptions?: number;
  redemptionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    expiresAt: {
      type: Date,
    },
    maxRedemptions: {
      type: Number,
    },
    redemptionsCount: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);
export default Coupon;

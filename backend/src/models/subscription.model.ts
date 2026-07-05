import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  planName: 'mobile' | 'basic' | 'standard' | 'premium';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'ended' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  razorpaySubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planName: {
      type: String,
      enum: ['mobile', 'basic', 'standard', 'premium'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'ended', 'unpaid'],
      default: 'unpaid',
      required: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    stripeCustomerId: {
      type: String,
    },
    razorpaySubscriptionId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;

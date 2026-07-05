import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  paymentGateway: 'stripe' | 'razorpay';
  transactionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    paymentGateway: {
      type: String,
      enum: ['stripe', 'razorpay'],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'refunded', 'pending'],
      required: true,
    },
    receiptUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
export default Payment;

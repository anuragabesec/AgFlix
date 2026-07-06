import { Schema, model, Document } from 'mongoose';

export interface IVisitCounter extends Document {
  key: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const visitCounterSchema = new Schema<IVisitCounter>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'visitor_count',
    },
    count: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const VisitCounter = model<IVisitCounter>('VisitCounter', visitCounterSchema);
export default VisitCounter;

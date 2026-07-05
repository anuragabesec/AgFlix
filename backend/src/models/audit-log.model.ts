import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: Types.ObjectId;
  email?: string;
  eventType: string; // e.g., 'LOGIN_FAILED', 'SIGNUP', 'PASSWORD_CHANGE', 'SESSION_REVOKED', 'SUSPICIOUS_LOGIN'
  severity: 'info' | 'warn' | 'critical';
  ipAddress: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warn', 'critical'],
      required: true,
      default: 'info',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need creation time for logs
  }
);

// Indexes for Admin Analytics queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;

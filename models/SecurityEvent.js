import mongoose from 'mongoose';

const SIGNIN_DATA_RETENTION_DAYS = Number.parseInt(process.env.AUTH_AUDIT_RETENTION_DAYS || '7', 10);
const retentionMs = SIGNIN_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const SecurityEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    username: { type: String, default: '', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    ip: { type: String, default: '', index: true },
    userAgent: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Auto-delete security activity logs after short retention.
    recordExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + retentionMs),
    },
  },
  { timestamps: true }
);

SecurityEventSchema.index({ recordExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', SecurityEventSchema);

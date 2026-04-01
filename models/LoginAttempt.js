import mongoose from 'mongoose';

const SIGNIN_DATA_RETENTION_DAYS = Number.parseInt(process.env.AUTH_AUDIT_RETENTION_DAYS || '7', 10);
const retentionMs = SIGNIN_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const LoginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, index: true },
    username: { type: String, required: true, index: true },
    attempts: { type: Number, default: 0 },
    firstAttemptAt: { type: Date, default: Date.now },
    lastAttemptAt: { type: Date, default: Date.now },
    blockedUntil: { type: Date, default: null, index: true },
    // Auto-delete stale sign-in attempt records after short retention.
    recordExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + retentionMs),
    },
  },
  { timestamps: true }
);

LoginAttemptSchema.index({ ip: 1, username: 1 }, { unique: true });
LoginAttemptSchema.index({ recordExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema);

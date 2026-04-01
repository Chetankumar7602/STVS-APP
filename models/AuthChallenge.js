import mongoose from 'mongoose';

const AuthChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    username: { type: String, required: true, index: true },
    method: { type: String, enum: ['email', 'sms'], required: true },
    destination: { type: String, default: '' },
    codeHash: { type: String, required: true },
    attemptsLeft: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-remove expired one-time 2FA challenges.
AuthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AuthChallenge || mongoose.model('AuthChallenge', AuthChallengeSchema);

import mongoose from 'mongoose';

const PasskeyChallengeSchema = new mongoose.Schema(
  {
    challenge: { type: String, required: true, index: true },
    type: { type: String, enum: ['registration', 'authentication'], required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    username: { type: String, default: '', index: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

PasskeyChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasskeyChallenge || mongoose.model('PasskeyChallenge', PasskeyChallengeSchema);

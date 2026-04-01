import mongoose from 'mongoose';

const AdminSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      index: true,
    },
    username: { type: String, required: true, index: true },
    email: { type: String, default: '', index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    authMethod: { type: String, enum: ['password', 'password_2fa', 'passkey'], default: 'password' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    issuedAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    revokedBy: { type: String, default: '' },
    revokeReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-remove expired sessions from storage.
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AdminSession || mongoose.model('AdminSession', AdminSessionSchema);

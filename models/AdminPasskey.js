import mongoose from 'mongoose';

const AdminPasskeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      index: true,
    },
    username: { type: String, required: true, index: true },
    credentialID: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String, default: '' },
    backedUp: { type: Boolean, default: false },
    label: { type: String, default: 'Fingerprint Passkey' },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminPasskey || mongoose.model('AdminPasskey', AdminPasskeySchema);

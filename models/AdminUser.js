import mongoose from 'mongoose';

const AdminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    maxlength: [30, 'Username cannot be more than 30 characters'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorMethod: {
    type: String,
    enum: ['email', 'sms', 'authenticator'],
    default: 'email',
  },
  totpSecret: {
    type: String,
    default: '',
  },
  passwordUpdatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid recompiling model
export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

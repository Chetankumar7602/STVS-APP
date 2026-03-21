import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
});

// Avoid recompiling model
export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

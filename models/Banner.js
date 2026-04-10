import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  message: { type: String, default: 'Welcome to our site! We have an update.' },
  duration: { type: Number, default: 0 }, // in hours
  expiresAt: { type: Date, default: null },

  // New Expanded Features
  expandedContent: { type: String, default: '' }, // For the big pop-up
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['none', 'image'], default: 'none' },

  position: { type: String, enum: ['top', 'bottom-center', 'bottom-left', 'bottom-right', 'top-left', 'top-right', 'center-modal'], default: 'top' },
  shape: { type: String, enum: ['sharp', 'rounded', 'rounded-2xl', 'pill', 'leaf'], default: 'sharp' },
  size: { type: String, enum: ['small', 'medium', 'large', 'full'], default: 'medium' },
  animation: { type: String, enum: ['slide', 'pop', 'fade', 'bounce'], default: 'slide' },
  backgroundColor: { type: String, default: '#ef4444' }, // tailwind red-500
  textColor: { type: String, default: '#ffffff' },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

delete mongoose.models.Banner;
export default mongoose.model('Banner', BannerSchema);

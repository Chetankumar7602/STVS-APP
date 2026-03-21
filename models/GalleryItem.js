import mongoose from 'mongoose';

const GalleryItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  src: {
    type: String,
    required: [true, 'Please provide a source URL'],
  },
  thumb: {
    type: String, // For videos
  },
  category: {
    type: String,
    default: 'Community Service',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.GalleryItem || mongoose.model('GalleryItem', GalleryItemSchema);

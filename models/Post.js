import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
  },
  image: {
    type: String, // URL to image
  },
  author: {
    type: String,
    default: 'STVS Admin',
  },
  category: {
    type: String,
    enum: ['Success Stories', 'School Updates', 'Community Events', 'Impact Reports', 'Other'],
    default: 'Success Stories',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Define it in .env.local or your shell env.');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const GalleryItemSchema = new mongoose.Schema({
      title: String,
      src: String,
    });

    const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', GalleryItemSchema);

    // Delete items by title keywords
    const titleResult = await GalleryItem.deleteMany({
      $or: [
        { title: { $regex: 'virat', $options: 'i' } },
        { title: { $regex: 'virattt', $options: 'i' } }
      ]
    });
    console.log(`Deleted ${titleResult.deletedCount} items by title.`);

    // Delete items with Google Search URLs (the cause of the error)
    const urlResult = await GalleryItem.deleteMany({
      src: { $regex: 'google\\.com/search', $options: 'i' }
    });
    console.log(`Deleted ${urlResult.deletedCount} items with invalid Google Search URLs.`);

  } catch (err) {
    console.error('Cleanup error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanup();

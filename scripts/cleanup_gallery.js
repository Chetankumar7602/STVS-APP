const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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

    // Define schema inline to avoid imports
    const GalleryItemSchema = new mongoose.Schema({
      title: String,
      src: String,
    });

    const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', GalleryItemSchema);

    // Delete items where title includes "virat" or "virattt"
    const result = await GalleryItem.deleteMany({
      $or: [
        { title: /virat/i },
        { title: /virattt/i }
      ]
    });

    console.log(`Deleted ${result.deletedCount} items.`);
    
    // Also check for the specific google search URL if any
    const urlResult = await GalleryItem.deleteMany({
      src: /google\.com\/search/
    });
    console.log(`Deleted ${urlResult.deletedCount} items with invalid google search URLs.`);

  } catch (err) {
    console.error('Cleanup error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();

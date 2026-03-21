const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define MONGODB_URI in .env.local');
  process.exit(1);
}

function getArgValue(flag) {
  const arg = process.argv.find((value) => value.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : undefined;
}

const username = getArgValue('--username') || process.env.ADMIN_USERNAME;
const password = getArgValue('--password') || process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Missing admin credentials. Use --username=... --password=... or set ADMIN_USERNAME and ADMIN_PASSWORD.');
  process.exit(1);
}

if (password.length < 10) {
  console.error('Refusing weak password. Use at least 10 characters.');
  process.exit(1);
}

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

async function resetAdmin() {
  try {
    const host = MONGODB_URI.includes('@') ? MONGODB_URI.split('@')[1] : 'mongodb-uri-hidden';
    console.log('Connecting to:', host); // Log host only for safety
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await AdminUser.findOneAndUpdate(
      { username },
      { username, password: hashedPassword },
      { upsert: true, new: true }
    );

    console.log(`ADMIN_RESET_SUCCESS: Username: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

resetAdmin();

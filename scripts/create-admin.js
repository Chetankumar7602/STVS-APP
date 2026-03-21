const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
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

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await AdminUser.findOne({ username });
    if (existingAdmin) {
      console.log(`Admin user '${username}' already exists.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await AdminUser.create({
      username,
      password: hashedPassword
    });

    console.log(`Successfully created admin user: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

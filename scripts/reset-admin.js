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
const email = getArgValue('--email') || process.env.ADMIN_EMAIL;

if (!username || !password) {
  console.error('Missing admin credentials. Use --username=... --password=... or set ADMIN_USERNAME and ADMIN_PASSWORD.');
  process.exit(1);
}

if (email && !String(email).includes('@')) {
  console.error('Invalid admin email. Use --email=... or set ADMIN_EMAIL.');
  process.exit(1);
}

const passwordChecks = [
  { ok: password.length >= 12, message: 'at least 12 characters' },
  { ok: /[A-Z]/.test(password), message: 'one uppercase letter' },
  { ok: /[a-z]/.test(password), message: 'one lowercase letter' },
  { ok: /\d/.test(password), message: 'one number' },
  { ok: /[^A-Za-z0-9]/.test(password), message: 'one symbol' },
];

const failedPolicy = passwordChecks.filter((check) => !check.ok).map((check) => check.message);
if (failedPolicy.length > 0) {
  console.error(`Refusing weak password. Missing: ${failedPolicy.join(', ')}.`);
  process.exit(1);
}

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'superadmin' },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorMethod: { type: String, enum: ['email', 'sms', 'authenticator'], default: 'email' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
});

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

async function resetAdmin() {
  try {
    const host = MONGODB_URI.includes('@') ? MONGODB_URI.split('@')[1] : 'mongodb-uri-hidden';
    console.log('Connecting to:', host); // Log host only for safety
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const update = { username, password: hashedPassword };
    if (email) {
      update.email = String(email).trim().toLowerCase();
    }

    await AdminUser.findOneAndUpdate({ username }, update, { upsert: true, new: true });

    console.log(`ADMIN_RESET_SUCCESS: Username: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

resetAdmin();

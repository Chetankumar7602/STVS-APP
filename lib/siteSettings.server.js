import connectToDatabase from '@/lib/db';
import SiteSetting from '@/models/SiteSetting';

export async function getSiteSettingsMap() {
  await connectToDatabase();
  const settings = await SiteSetting.find({}).lean();
  return settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
}

export async function getSiteSettingValue(key, fallback = '') {
  if (!key) return fallback;
  await connectToDatabase();
  const setting = await SiteSetting.findOne({ key }).lean();
  if (!setting) return fallback;
  return setting.value ?? fallback;
}

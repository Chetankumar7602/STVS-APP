import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Donation from '@/models/Donation';
import Contact from '@/models/Contact';
import Volunteer from '@/models/Volunteer';
import GalleryItem from '@/models/GalleryItem';
import SiteSetting from '@/models/SiteSetting';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { deleteAllSanityGalleryItems, isSanityWriteConfigured } from '@/lib/sanityGallery';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('adminToken')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function normalizeSections(input) {
  const defaults = {
    donations: true,
    contacts: true,
    volunteers: true,
    gallery: false,
    settings: false,
  };

  if (!input || typeof input !== 'object') return defaults;

  const sections = {
    donations: Boolean(input.donations),
    contacts: Boolean(input.contacts),
    volunteers: Boolean(input.volunteers),
    gallery: Boolean(input.gallery),
    settings: Boolean(input.settings),
  };

  const anySelected = Object.values(sections).some(Boolean);
  return anySelected ? sections : defaults;
}

export async function DELETE(request) {
  const authResp = await requireAdmin();
  if (authResp) return authResp;

  try {
    await connectDB();
    const [d, c, v] = await Promise.all([
      Donation.deleteMany({}),
      Contact.deleteMany({}),
      Volunteer.deleteMany({}),
    ]);
    return NextResponse.json({
      success: true,
      deleted: { donations: d.deletedCount, contacts: c.deletedCount, volunteers: v.deletedCount }
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authResp = await requireAdmin();
  if (authResp) return authResp;

  try {
    const body = await request.json().catch(() => ({}));
    const sections = normalizeSections(body?.sections);

    if (sections.gallery && !isSanityWriteConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Sanity write access is not configured for gallery.' },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = {};

    if (sections.donations) {
      const res = await Donation.deleteMany({});
      deleted.donations = res.deletedCount;
    }

    if (sections.contacts) {
      const res = await Contact.deleteMany({});
      deleted.contacts = res.deletedCount;
    }

    if (sections.volunteers) {
      const res = await Volunteer.deleteMany({});
      deleted.volunteers = res.deletedCount;
    }

    if (sections.gallery) {
      const res = await GalleryItem.deleteMany({});
      deleted.gallery = res.deletedCount;

      const sanityRes = await deleteAllSanityGalleryItems({ withAssets: true });
      deleted.gallerySanity = sanityRes.deletedCount;
    }

    if (sections.settings) {
      const res = await SiteSetting.deleteMany({});
      deleted.settings = res.deletedCount;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

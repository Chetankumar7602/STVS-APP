import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import connectDB from '@/lib/db';
import Donation from '@/models/Donation';
import Contact from '@/models/Contact';
import Volunteer from '@/models/Volunteer';
import GalleryItem from '@/models/GalleryItem';
import SiteSetting from '@/models/SiteSetting';
import { getSanityGalleryItems } from '@/lib/sanityGallery';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

  if (!input || typeof input !== 'object') {
    return defaults;
  }

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

async function buildWorkbook(sections) {
  await connectDB();
  const wb = XLSX.utils.book_new();

  if (sections.donations) {
    const donations = await Donation.find({ status: 'successful' }).sort({ createdAt: -1 }).lean();
    const donationRows = donations.map(d => ({
      'Date':              d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '',
      'Name':              d.name || '',
      'Phone':             d.phone || '',
      'Amount (₹)':        d.amount || 0,
      'Message':           d.message || '',
      'Status':            d.status || 'pending',
      'Razorpay Order ID': d.razorpayOrderId || '',
      'Razorpay Pay ID':   d.razorpayPaymentId || '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(donationRows.length ? donationRows : [{ Note: 'No donations this period' }]),
      'Donations'
    );
  }

  if (sections.contacts) {
    const contacts = await Contact.find({}).sort({ createdAt: -1 }).lean();
    const contactRows = contacts.map(c => ({
      'Date':    c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : '',
      'Name':    c.name || '',
      'Contact': c.contact || '',
      'Message': c.message || '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(contactRows.length ? contactRows : [{ Note: 'No contacts this period' }]),
      'Contacts'
    );
  }

  if (sections.volunteers) {
    const volunteers = await Volunteer.find({}).sort({ createdAt: -1 }).lean();
    const volunteerRows = volunteers.map(v => ({
      'Date':     v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN') : '',
      'Name':     v.name || '',
      'Phone':    v.phone || '',
      'Interest': v.interest || '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(volunteerRows.length ? volunteerRows : [{ Note: 'No volunteers this period' }]),
      'Volunteers'
    );
  }

  if (sections.gallery) {
    const [dbGalleryItems, sanityGalleryItems] = await Promise.all([
      GalleryItem.find({}).sort({ createdAt: -1 }).lean(),
      getSanityGalleryItems(),
    ]);

    const galleryRows = [
      ...dbGalleryItems.map((g) => ({
        'Source': 'db',
        'ID': g._id ? String(g._id) : '',
        'Date': g.createdAt ? new Date(g.createdAt).toLocaleString('en-IN') : '',
        'Title': g.title || '',
        'Type': g.type || '',
        'Category': g.category || '',
        'Src': g.src || '',
        'Thumb': g.thumb || '',
      })),
      ...sanityGalleryItems.map((g) => ({
        'Source': 'sanity',
        'ID': g._id ? String(g._id) : '',
        'Date': g.createdAt ? new Date(g.createdAt).toLocaleString('en-IN') : '',
        'Title': g.title || '',
        'Type': g.type || '',
        'Category': g.category || '',
        'Src': g.src || '',
        'Thumb': g.thumb || '',
      })),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(galleryRows.length ? galleryRows : [{ Note: 'No gallery items in DB' }]),
      'Gallery'
    );
  }

  if (sections.settings) {
    const settings = await SiteSetting.find({}).sort({ key: 1 }).lean();
    const settingsRows = settings.map((s) => ({
      'Key': s.key || '',
      'Value': typeof s.value === 'undefined' ? '' : JSON.stringify(s.value),
      'Updated At': s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-IN') : '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(settingsRows.length ? settingsRows : [{ Note: 'No site settings saved' }]),
      'Site Settings'
    );
  }

  return wb;
}

export async function GET(request) {
  const authResp = await requireAdmin();
  if (authResp) return authResp;

  try {
    const wb = await buildWorkbook({
      donations: true,
      contacts: true,
      volunteers: true,
      gallery: false,
      settings: false,
    });

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `STVS_Archive_${new Date().toISOString().slice(0, 7)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authResp = await requireAdmin();
  if (authResp) return authResp;

  try {
    const body = await request.json().catch(() => ({}));
    const sections = normalizeSections(body?.sections);
    const wb = await buildWorkbook(sections);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `STVS_Archive_${new Date().toISOString().slice(0, 7)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

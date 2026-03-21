import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GalleryItem from '@/models/GalleryItem';
import { authenticate } from '@/lib/auth';
import { prepareGalleryItemInput } from '@/lib/gallery';
import { getSanityGalleryItems, isSanityConfigured as isSanityGalleryConfigured } from '@/lib/sanityGallery';

// GET all gallery items
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const shouldPaginate = pageParam !== null || limitParam !== null;

    if (!shouldPaginate) {
      let sanityItems = [];
      let dbItems = [];

      if (isSanityGalleryConfigured()) {
        try {
          const fetched = await getSanityGalleryItems();
          if (Array.isArray(fetched)) {
            sanityItems = fetched;
          }
        } catch (err) {
          // Ignore Sanity errors and still return DB-backed items below
        }
      }

      await connectToDatabase();
      dbItems = await GalleryItem.find({}).sort({ createdAt: -1 });

      const combined = [...sanityItems, ...dbItems];
      const source = sanityItems.length && dbItems.length ? 'mixed' : sanityItems.length ? 'sanity' : 'db';

      return NextResponse.json({ success: true, data: combined, source }, { status: 200 });
    }

    await connectToDatabase();
    const page = Math.max(Number(pageParam || 1), 1);
    const limit = Math.min(Math.max(Number(limitParam || 10), 1), 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      GalleryItem.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      GalleryItem.countDocuments({}),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST new gallery item (Admin Only)
export async function POST(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const payload = prepareGalleryItemInput(body);
    await connectToDatabase();
    const item = await GalleryItem.create(payload);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    const status = /required|valid|supported|cannot be shown|missing/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

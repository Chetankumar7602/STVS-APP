import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import GalleryItem from '@/models/GalleryItem';
import { buildCsv } from '@/lib/csv';
import { deleteSanityGalleryItemWithAssets, getSanityGalleryItemById, isSanityWriteConfigured } from '@/lib/sanityGallery';
import { unlink } from 'fs/promises';
import path from 'path';

function normalizeSelection(selection) {
  if (!Array.isArray(selection)) return [];

  return selection
    .map((item) => {
      const source = item?.source === 'db' ? 'db' : item?.source === 'sanity' ? 'sanity' : '';
      const id = String(item?.id || item?._id || '').trim();
      if (!source || !id) return null;
      return { source, id };
    })
    .filter(Boolean);
}

async function deleteLocalGalleryFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/gallery/')) {
    return;
  }

  const relativePath = fileUrl.replace(/^\/+/, '').split('?')[0];
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'gallery');
  const targetPath = path.normalize(path.join(process.cwd(), 'public', relativePath));

  if (!targetPath.startsWith(uploadsRoot)) {
    return;
  }

  try {
    await unlink(targetPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function POST(request) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const selection = normalizeSelection(body.items);

    if (selection.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one gallery item.' }, { status: 400 });
    }

    const dbIds = selection.filter((s) => s.source === 'db').map((s) => s.id);
    const sanityIds = selection.filter((s) => s.source === 'sanity').map((s) => s.id);

    await connectToDatabase();

    const [dbDocs, sanityDocs] = await Promise.all([
      dbIds.length ? GalleryItem.find({ _id: { $in: dbIds } }).sort({ createdAt: -1 }).lean() : Promise.resolve([]),
      sanityIds.length ? Promise.all(sanityIds.map((id) => getSanityGalleryItemById(id))) : Promise.resolve([]),
    ]);

    const rows = [
      ...dbDocs.map((d) => ({
        source: 'db',
        id: d._id ? String(d._id) : '',
        date: d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '',
        title: d.title || '',
        type: d.type || '',
        category: d.category || '',
        src: d.src || '',
        thumb: d.thumb || '',
      })),
      ...sanityDocs
        .filter(Boolean)
        .map((d) => ({
          source: 'sanity',
          id: d._id ? String(d._id) : '',
          date: d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '',
          title: d.title || '',
          type: d.type || '',
          category: d.category || '',
          src: d.src || '',
          thumb: d.thumb || '',
        })),
    ];

    const csv = buildCsv(rows, [
      { key: 'source', label: 'Source' },
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'src', label: 'Media URL' },
      { key: 'thumb', label: 'Thumbnail URL' },
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gallery_selected.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const selection = normalizeSelection(body.items);

    if (selection.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one gallery item.' }, { status: 400 });
    }

    const dbIds = selection.filter((s) => s.source === 'db').map((s) => s.id);
    const sanityIds = selection.filter((s) => s.source === 'sanity').map((s) => s.id);

    if (sanityIds.length > 0 && !isSanityWriteConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Sanity write access is not configured for gallery.' },
        { status: 400 },
      );
    }

    let deletedDbCount = 0;
    let deletedSanityCount = 0;

    if (dbIds.length) {
      await connectToDatabase();
      const docs = await GalleryItem.find({ _id: { $in: dbIds } }).lean();
      const result = await GalleryItem.deleteMany({ _id: { $in: dbIds } });
      deletedDbCount = result.deletedCount || 0;

      await Promise.all(
        docs.flatMap((doc) => [deleteLocalGalleryFile(doc.src), deleteLocalGalleryFile(doc.thumb)])
      );
    }

    if (sanityIds.length) {
      for (const id of sanityIds) {
        await deleteSanityGalleryItemWithAssets(id);
        deletedSanityCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      deleted: {
        db: deletedDbCount,
        sanity: deletedSanityCount,
        total: deletedDbCount + deletedSanityCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

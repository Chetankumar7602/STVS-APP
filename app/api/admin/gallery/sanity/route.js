import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import {
  getSanityGalleryItems,
  isSanityConfigured,
  isSanityWriteConfigured,
  createSanityGalleryItem,
  deleteSanityGalleryItemWithAssets,
} from '@/lib/sanityGallery';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const items = await getSanityGalleryItems();
    return NextResponse.json({
      success: true,
      data: items,
      sanityConfigured: isSanityConfigured(),
      writeConfigured: isSanityWriteConfigured(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!isSanityWriteConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Sanity write access is not configured for gallery.' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const type = body.type === 'video' ? 'video' : 'image';
    const src = String(body.src || '').trim();

    if (!title || !src) {
      return NextResponse.json(
        {
          success: false,
          message:
            type === 'video'
              ? 'Title and video URL are required.'
              : 'Title and image URL are required.',
        },
        { status: 400 },
      );
    }

    const newItem = await createSanityGalleryItem({
      title,
      type,
      src,
      thumb: String(body.thumb || '').trim(),
      category: String(body.category || 'Community Service').trim(),
    });

    return NextResponse.json({
      success: true,
      data: newItem,
      message: 'Gallery item published to Sanity.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!isSanityWriteConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Sanity write access is not configured for gallery.' },
      { status: 400 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Gallery item id is required.' },
        { status: 400 },
      );
    }

    await deleteSanityGalleryItemWithAssets(id);

    return NextResponse.json({
      success: true,
      message: 'Gallery item deleted from Sanity.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

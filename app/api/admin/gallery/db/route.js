import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GalleryItem from '@/models/GalleryItem';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectToDatabase();
    const items = await GalleryItem.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

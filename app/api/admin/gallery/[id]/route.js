import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import connectToDatabase from '@/lib/db';
import GalleryItem from '@/models/GalleryItem';
import { authenticate } from '@/lib/auth';

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
    if (
      error.code !== 'ENOENT' &&
      error.code !== 'EACCES' &&
      error.code !== 'EPERM' &&
      error.code !== 'EROFS'
    ) {
      throw error;
    }
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    await connectToDatabase();

    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });

    await Promise.all([
      deleteLocalGalleryFile(item.src),
      deleteLocalGalleryFile(item.thumb),
    ]);

    return NextResponse.json({ success: true, message: 'Item deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import {
  deleteSanityBlogWithAssets,
  getSanityBlogById,
  getSanityBlogs,
  isSanityWriteConfigured,
  updateSanityBlog,
} from '@/lib/sanityBlogs';

export async function DELETE(request, { params }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!isSanityWriteConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Sanity write access is not configured.' },
      { status: 400 }
    );
  }

  try {
    const resolvedParams = await params;
    const blogId = String(resolvedParams.id || '');
    const { blogs } = await getSanityBlogs();
    const target = blogs.find((post) => post._id === blogId);

    if (!target) {
      return NextResponse.json({ success: false, message: 'Blog not found.' }, { status: 404 });
    }

    await deleteSanityBlogWithAssets(blogId);

    return NextResponse.json({
      success: true,
      message: 'Blog deleted from Sanity.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!isSanityWriteConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Sanity write access is not configured.' },
      { status: 400 }
    );
  }

  try {
    const resolvedParams = await params;
    const blogId = String(resolvedParams.id || '').trim();
    if (!blogId) {
      return NextResponse.json({ success: false, message: 'Blog id is required.' }, { status: 400 });
    }

    const existing = await getSanityBlogById(blogId);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Blog not found.' }, { status: 404 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const image = String(body.image || '').trim();
    if (!title || !content || !image) {
      return NextResponse.json(
        { success: false, message: 'Title, content, and image URL are required.' },
        { status: 400 }
      );
    }

    const updated = await updateSanityBlog(blogId, {
      title,
      excerpt: String(body.excerpt || '').trim(),
      content,
      category: String(body.category || existing.category || 'General').trim(),
      author: String(body.author || existing.author || auth.username || 'Admin Team').trim(),
      image,
      createdAt: existing.createdAt,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Blog updated.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

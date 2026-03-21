import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createSanityBlog, getSanityBlogs, isSanityConfigured, isSanityWriteConfigured } from '@/lib/sanityBlogs';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { blogs, source } = await getSanityBlogs();
    return NextResponse.json({
      success: true,
      data: blogs,
      source,
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
      { success: false, message: 'Sanity write access is not configured.' },
      { status: 400 }
    );
  }

  try {
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

    const newBlog = await createSanityBlog({
      title,
      excerpt: String(body.excerpt || '').trim(),
      content,
      category: String(body.category || 'General').trim(),
      author: String(body.author || auth.username || 'Admin Team').trim(),
      image,
    });

    return NextResponse.json({
      success: true,
      data: newBlog,
      message: 'Blog published to Sanity.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

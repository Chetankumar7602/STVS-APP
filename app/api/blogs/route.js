import { NextResponse } from 'next/server';
import { getSanityBlogs, isSanityConfigured } from '@/lib/sanityBlogs';

export async function GET() {
  try {
    const { blogs, source } = await getSanityBlogs();
    return NextResponse.json({
      success: true,
      data: blogs,
      source,
      sanityConfigured: isSanityConfigured(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

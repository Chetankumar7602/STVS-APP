import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Banner from '@/models/Banner';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectToDatabase();
    let banner = await Banner.findOne({});
    if (!banner) {
      banner = await Banner.create({});
    }

    return NextResponse.json({ success: true, data: banner }, { status: 200 });
  } catch (error) {
    console.error('Banner fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectToDatabase();
    const data = await request.json();

    let banner = await Banner.findOne({});
    if (!banner) {
      banner = new Banner();
    }

    if (data.isActive !== undefined) banner.isActive = data.isActive;
    if (data.message !== undefined) banner.message = data.message;

    if (data.duration !== undefined) {
      banner.duration = data.duration;
      if (data.duration > 0) {
        banner.expiresAt = new Date(Date.now() + data.duration * 60 * 60 * 1000);
      } else {
        banner.expiresAt = null;
      }
    }

    if (data.expandedContent !== undefined) banner.expandedContent = data.expandedContent;
    if (data.mediaUrl !== undefined) banner.mediaUrl = data.mediaUrl;
    if (data.mediaType !== undefined) banner.mediaType = data.mediaType;
    if (data.position !== undefined) banner.position = data.position;
    if (data.shape !== undefined) banner.shape = data.shape;
    if (data.size !== undefined) banner.size = data.size;
    if (data.animation !== undefined) banner.animation = data.animation;
    if (data.backgroundColor !== undefined) banner.backgroundColor = data.backgroundColor;
    if (data.textColor !== undefined) banner.textColor = data.textColor;

    banner.updatedAt = Date.now();
    await banner.save();

    return NextResponse.json({ success: true, data: banner }, { status: 200 });
  } catch (error) {
    console.error('Banner update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

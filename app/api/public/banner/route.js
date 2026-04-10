import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Banner from '@/models/Banner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    let banner = await Banner.findOne({}).lean();
    
    if (!banner) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    // Auto-expiry check
    if (banner.isActive && banner.expiresAt && new Date() > new Date(banner.expiresAt)) {
      banner.isActive = false; // Mute it if expired
      
      // Optional: Asynchronously auto-update database so admin portal accurately reflects it turned off natively
      Banner.updateOne({ _id: banner._id }, { isActive: false }).exec().catch(err => console.error("Banner expiry update failed:", err));
    }

    return NextResponse.json({ success: true, data: banner }, { status: 200 });
  } catch (error) {
    console.error('Public banner fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

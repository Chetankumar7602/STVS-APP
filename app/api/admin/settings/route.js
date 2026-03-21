import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SiteSetting from '@/models/SiteSetting';
import { authenticate } from '@/lib/auth';

// GET all settings
export async function GET() {
  try {
    await connectToDatabase();
    const settings = await SiteSetting.find({});
    // Transform to object for easier consumption
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    return NextResponse.json({ success: true, data: settingsObj }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST/UPDATE setting (Admin Only)
export async function POST(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const { key, value } = await request.json();
    await connectToDatabase();
    
    const setting = await SiteSetting.findOneAndUpdate(
      { key },
      { value, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ success: true, data: setting }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

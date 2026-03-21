import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Volunteer from '@/models/Volunteer';

export async function POST(request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const volunteer = await Volunteer.create(body);

    return NextResponse.json({ success: true, data: volunteer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

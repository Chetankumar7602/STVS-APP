import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Contact from '@/models/Contact';

export async function POST(request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    
    const contact = await Contact.create(body);
    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

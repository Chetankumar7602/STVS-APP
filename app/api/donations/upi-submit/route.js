import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const upiReference = String(body.upiReference || '').trim();
    const message = String(body.message || '').trim();
    const amount = Number(body.amount);

    if (!name || !email || !upiReference || !amount || amount < 100) {
      return NextResponse.json(
        { success: false, message: 'Name, email, amount, and UPI reference are required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const donation = await Donation.create({
      name,
      phone,
      email,
      amount,
      message,
      upiReference,
      paymentMethod: 'upi_qr',
      status: 'pending_verification',
      manualReviewStatus: 'pending',
    });

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'UPI payment submitted for verification. We will verify it and send the receipt after confirmation.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';
import { authenticate } from '@/lib/auth';
import { sendDonationReceiptEmail } from '@/lib/donationReceipt';

export async function POST(request, { params }) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    await connectToDatabase();

    const donation = await Donation.findById(id);
    if (!donation) {
      return NextResponse.json({ success: false, message: 'Donation not found' }, { status: 404 });
    }

    if (donation.status !== 'successful') {
      return NextResponse.json({ success: false, message: 'Receipt can only be sent for successful donations' }, { status: 400 });
    }

    if (!donation.email) {
      return NextResponse.json({ success: false, message: 'No email address available for this donor' }, { status: 400 });
    }

    await sendDonationReceiptEmail(donation);
    donation.receiptSentAt = new Date();
    await donation.save();

    return NextResponse.json({ success: true, message: 'Receipt email sent successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';

export async function POST(request, { params }) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const resolvedParams = await params;
    const body = await request.json();
    const outcome = String(body.outcome || '').trim().toLowerCase();
    const reason = String(body.reason || '').trim();
    const confirmedAmount = body.confirmedAmount === '' || body.confirmedAmount === null || typeof body.confirmedAmount === 'undefined'
      ? null
      : Number(body.confirmedAmount);

    if (!['successful', 'unsuccessful', 'wrong_amount'].includes(outcome)) {
      return NextResponse.json({ success: false, message: 'Invalid review outcome.' }, { status: 400 });
    }

    if (outcome === 'wrong_amount' && (!confirmedAmount || confirmedAmount < 1)) {
      return NextResponse.json({ success: false, message: 'Confirmed paid amount is required for wrong amount cases.' }, { status: 400 });
    }

    await connectToDatabase();

    const donation = await Donation.findById(resolvedParams.id);
    if (!donation) {
      return NextResponse.json({ success: false, message: 'Donation not found.' }, { status: 404 });
    }

    if (donation.paymentMethod !== 'upi_qr') {
      return NextResponse.json({ success: false, message: 'Manual review is only available for QR payments.' }, { status: 400 });
    }

    donation.manualReviewStatus = outcome;
    donation.manualReviewReason = reason || '';
    donation.verifiedAt = new Date();
    donation.confirmedAmount = outcome === 'wrong_amount'
      ? confirmedAmount
      : outcome === 'successful'
        ? donation.amount
        : null;
    donation.status = outcome === 'unsuccessful' ? 'failed' : 'successful';
    await donation.save();

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'UPI donation review updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

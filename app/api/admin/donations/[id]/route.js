import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';

export async function PATCH(request, { params }) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const donation = await Donation.findById(id);
    if (!donation) {
      return NextResponse.json({ success: false, message: 'Donation not found.' }, { status: 404 });
    }

    const name = String(body.name ?? donation.name).trim();
    const phone = String(body.phone ?? donation.phone ?? '').trim();
    const email = String(body.email ?? donation.email ?? '').trim();
    const message = String(body.message ?? donation.message ?? '').trim();
    const upiReference = String(body.upiReference ?? donation.upiReference ?? '').trim();
    const reason = String(body.reason ?? '').trim();
    const outcome = body.outcome ? String(body.outcome).trim().toLowerCase() : '';
    const enteredAmount = body.amount === '' || body.amount === null || typeof body.amount === 'undefined'
      ? donation.amount
      : Number(body.amount);
    const confirmedAmount = body.confirmedAmount === '' || body.confirmedAmount === null || typeof body.confirmedAmount === 'undefined'
      ? null
      : Number(body.confirmedAmount);

    if (!name || !email || !enteredAmount || Number.isNaN(enteredAmount)) {
      return NextResponse.json({ success: false, message: 'Name, email, and amount are required.' }, { status: 400 });
    }

    donation.name = name;
    donation.phone = phone;
    donation.email = email;
    donation.amount = enteredAmount;
    donation.message = message;

    if (donation.paymentMethod === 'upi_qr') {
      donation.upiReference = upiReference;

      if (outcome) {
        if (!['successful', 'unsuccessful', 'wrong_amount'].includes(outcome)) {
          return NextResponse.json({ success: false, message: 'Invalid review outcome.' }, { status: 400 });
        }

        if (outcome === 'wrong_amount' && (!confirmedAmount || confirmedAmount < 1)) {
          return NextResponse.json({ success: false, message: 'Confirmed paid amount is required for wrong amount cases.' }, { status: 400 });
        }

        donation.manualReviewStatus = outcome;
        donation.manualReviewReason = reason;
        donation.verifiedAt = new Date();
        donation.confirmedAmount = outcome === 'wrong_amount'
          ? confirmedAmount
          : outcome === 'successful'
            ? enteredAmount
            : null;
        donation.status = outcome === 'unsuccessful' ? 'failed' : 'successful';
      }
    }

    await donation.save();

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'Donation updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    await connectToDatabase();

    const donation = await Donation.findByIdAndDelete(id);
    if (!donation) {
      return NextResponse.json({ success: false, message: 'Donation not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Donation deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';

function normalizeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export async function PATCH(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const ids = normalizeIds(body.ids);
    const outcome = String(body.outcome || '').trim().toLowerCase();
    const reason = String(body.reason || '').trim();
    const confirmedAmount = body.confirmedAmount === '' || body.confirmedAmount === null || typeof body.confirmedAmount === 'undefined'
      ? null
      : Number(body.confirmedAmount);

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one donation.' }, { status: 400 });
    }

    if (!['successful', 'unsuccessful', 'wrong_amount'].includes(outcome)) {
      return NextResponse.json({ success: false, message: 'Invalid review outcome.' }, { status: 400 });
    }

    if (outcome === 'wrong_amount' && (!confirmedAmount || confirmedAmount < 1)) {
      return NextResponse.json({ success: false, message: 'Confirmed paid amount is required for wrong amount cases.' }, { status: 400 });
    }

    await connectToDatabase();

    const donations = await Donation.find({ _id: { $in: ids } });
    if (donations.length === 0) {
      return NextResponse.json({ success: false, message: 'No donations found for the selected entries.' }, { status: 404 });
    }

    const invalidEntry = donations.find((item) => item.paymentMethod !== 'upi_qr');
    if (invalidEntry) {
      return NextResponse.json({ success: false, message: 'Bulk review editing is only available for QR payments.' }, { status: 400 });
    }

    await Promise.all(
      donations.map(async (donation) => {
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
      })
    );

    return NextResponse.json({
      success: true,
      updatedCount: donations.length,
      message: 'Selected QR donation reviews updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const ids = normalizeIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one donation.' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await Donation.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: 'Selected donations deleted successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

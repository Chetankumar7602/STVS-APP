import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';
import crypto from 'crypto';
import { sendDonationReceiptEmail } from '@/lib/donationReceipt';


export async function POST(request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Missing payment details' }, { status: 400 });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body_str = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body_str.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Find pending order and mark as failed
      await connectToDatabase();
      await Donation.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );

      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }

    await connectToDatabase();

    const existingDonation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
    if (!existingDonation) {
      return NextResponse.json({ success: false, message: 'Donation order not found' }, { status: 404 });
    }

    const alreadyProcessed =
      existingDonation.status === 'successful' &&
      existingDonation.razorpayPaymentId === razorpay_payment_id;

    existingDonation.status = 'successful';
    existingDonation.razorpayPaymentId = razorpay_payment_id;
    existingDonation.razorpaySignature = razorpay_signature;
    await existingDonation.save();

    let receiptEmailSent = false;
    let receiptEmailError = null;

    if (!alreadyProcessed) {
      if (existingDonation.email) {
        try {
          await sendDonationReceiptEmail(existingDonation);
          receiptEmailSent = true;
        } catch (err) {
          receiptEmailError = err.message;
          console.error('Donation receipt email error:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: existingDonation,
      receiptEmailQueued: Boolean(existingDonation.email),
      receiptEmailSent,
      receiptEmailError,
    }, { status: 200 });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

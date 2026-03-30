import { NextResponse } from 'next/server';

// Razorpay payment verification has been removed.
// UPI QR donations are handled via /api/donations/upi-submit
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Online payment gateway is not available. Please use UPI QR or Bank Transfer.' },
    { status: 410 }
  );
}

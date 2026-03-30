import { NextResponse } from 'next/server';

// Razorpay has been removed. This route is no longer in use.
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Online payment gateway is not available. Please use UPI QR or Bank Transfer.' },
    { status: 410 }
  );
}

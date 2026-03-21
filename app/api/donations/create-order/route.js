import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';

export async function POST(request) {
  try {
    const { amount, name, phone, email, message } = await request.json();

    if (!amount || amount < 100) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create an order in Razorpay (amount handles in smallest currency unit, paise)
    const options = {
      amount: Math.round(amount * 100), 
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await instance.orders.create(options);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Failed to create Razorpay order' }, { status: 500 });
    }

    // Connect to DB and create a 'pending' donation
    await connectToDatabase();
    
    await Donation.create({
      name,
      phone,
      email,
      amount,
      message,
      razorpayOrderId: order.id,
      status: 'pending'
    });

    return NextResponse.json({ success: true, order }, { status: 200 });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

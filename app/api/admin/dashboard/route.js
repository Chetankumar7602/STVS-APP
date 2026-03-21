import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';
import Contact from '@/models/Contact';
import Volunteer from '@/models/Volunteer';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return the 401 response
    }

    await connectToDatabase();

    const totalDonationsCount = await Donation.countDocuments({ status: 'successful' });
    const donations = await Donation.find(
      {
        $or: [
          { paymentMethod: 'upi_qr', manualReviewStatus: { $in: ['successful', 'wrong_amount'] } },
          { paymentMethod: { $ne: 'upi_qr' }, status: 'successful' },
        ],
      },
      'amount confirmedAmount paymentMethod manualReviewStatus'
    ).lean();

    const totalDonationAmount = donations.reduce((acc, donation) => {
      if (donation.paymentMethod === 'upi_qr' && donation.manualReviewStatus === 'wrong_amount') {
        return acc + Number(donation.confirmedAmount || 0);
      }

      return acc + Number(donation.amount || 0);
    }, 0);
    
    const totalContactsCount = await Contact.countDocuments();
    const totalVolunteersCount = await Volunteer.countDocuments();

    return NextResponse.json({
      success: true,
      data: {
        totalDonationsCount,
        totalDonationAmount,
        totalContactsCount,
        totalVolunteersCount
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

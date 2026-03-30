import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Donation from '@/models/Donation';
import { authenticate } from '@/lib/auth';
import { buildCsv } from '@/lib/csv';

export async function GET(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectToDatabase();

    // Migrate legacy records that have no paymentMethod set
    await Donation.updateMany(
      {
        $or: [
          { paymentMethod: { $exists: false } },
          { paymentMethod: null },
          { paymentMethod: '' },
        ],
      },
      { $set: { paymentMethod: 'upi_qr' } }
    );

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 10);
    const search = String(searchParams.get('search') || '').trim();
    const format = String(searchParams.get('format') || 'json').toLowerCase();
    const sort = String(searchParams.get('sort') || 'latest').toLowerCase();
    const paymentMethod = String(searchParams.get('paymentMethod') || '').trim().toLowerCase();
    const statusFilter = String(searchParams.get('status') || '').trim().toLowerCase();
    const selectionMode = String(searchParams.get('selection') || '').trim().toLowerCase();

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (paymentMethod === 'upi_qr') {
      query.paymentMethod = 'upi_qr';
    } else if (paymentMethod === 'bank_transfer') {
      query.paymentMethod = 'bank_transfer';
    }
    if (statusFilter === 'successful') {
      query.status = 'successful';
    } else if (statusFilter === 'pending') {
      query.status = { $in: ['pending', 'pending_verification'] };
    } else if (statusFilter === 'unsuccessful') {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { status: 'failed' },
            { manualReviewStatus: 'unsuccessful' },
          ],
        },
      ];
    } else if (statusFilter === 'wrong_amount') {
      query.manualReviewStatus = 'wrong_amount';
    }

    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amount_high: { amount: -1, createdAt: -1 },
      amount_low: { amount: 1, createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.latest;

    if (selectionMode === 'ids') {
      const items = await Donation.find(query).sort(sortQuery).select({ _id: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: items.map((item) => String(item._id)),
      }, { status: 200 });
    }

    if (format === 'csv') {
      const items = await Donation.find(query).sort(sortQuery).lean();
      const csv = buildCsv(
        items.map((item) => ({
          date: item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '',
          name: item.name || '',
          phone: item.phone || '',
          email: item.email || '',
          amount: item.amount || 0,
          confirmedAmount: item.confirmedAmount || '',
          paymentMethod: item.paymentMethod || 'upi_qr',
          status: item.status || '',
          manualReviewStatus: item.manualReviewStatus || '',
          upiReference: item.upiReference || '',
          transactionId: item.transactionId || '',
          message: item.message || '',
        })),
        [
          { key: 'date', label: 'Date' },
          { key: 'name', label: 'Donor Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'amount', label: 'Amount (INR)' },
          { key: 'confirmedAmount', label: 'Confirmed Amount (INR)' },
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'status', label: 'Status' },
          { key: 'manualReviewStatus', label: 'Manual Review Status' },
          { key: 'upiReference', label: 'UPI Reference' },
          { key: 'transactionId', label: 'Transaction ID' },
          { key: 'message', label: 'Message' },
        ]
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="donations.csv"',
        },
      });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Donation.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
      Donation.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

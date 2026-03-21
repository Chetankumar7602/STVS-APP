import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Volunteer from '@/models/Volunteer';
import { authenticate } from '@/lib/auth';
import { buildCsv } from '@/lib/csv';

export async function GET(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 10);
    const search = String(searchParams.get('search') || '').trim();
    const format = String(searchParams.get('format') || 'json').toLowerCase();
    const sort = String(searchParams.get('sort') || 'latest').toLowerCase();

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { interest: { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_az: { name: 1, createdAt: -1 },
      name_za: { name: -1, createdAt: -1 },
      interest_az: { interest: 1, createdAt: -1 },
      interest_za: { interest: -1, createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.latest;

    if (format === 'csv') {
      const items = await Volunteer.find(query).sort(sortQuery).lean();
      const csv = buildCsv(
        items.map((item) => ({
          date: item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '',
          name: item.name || '',
          phone: item.phone || '',
          interest: item.interest || '',
        })),
        [
          { key: 'date', label: 'Apply Date' },
          { key: 'name', label: 'Volunteer Name' },
          { key: 'phone', label: 'Phone Number' },
          { key: 'interest', label: 'Area of Interest' },
        ]
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="volunteers.csv"',
        },
      });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Volunteer.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
      Volunteer.countDocuments(query),
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

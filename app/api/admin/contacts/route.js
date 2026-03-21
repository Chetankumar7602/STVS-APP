import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Contact from '@/models/Contact';
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
        { contact: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_az: { name: 1, createdAt: -1 },
      name_za: { name: -1, createdAt: -1 },
      contact_az: { contact: 1, createdAt: -1 },
      contact_za: { contact: -1, createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.latest;

    if (format === 'csv') {
      const items = await Contact.find(query).sort(sortQuery).lean();
      const csv = buildCsv(
        items.map((item) => ({
          date: item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '',
          name: item.name || '',
          contact: item.contact || '',
          message: item.message || '',
        })),
        [
          { key: 'date', label: 'Date' },
          { key: 'name', label: 'Sender' },
          { key: 'contact', label: 'Contact Info' },
          { key: 'message', label: 'Message' },
        ]
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="messages.csv"',
        },
      });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Contact.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
      Contact.countDocuments(query),
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

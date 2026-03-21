import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Contact from '@/models/Contact';
import { authenticate } from '@/lib/auth';
import { buildCsv } from '@/lib/csv';

function normalizeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export async function POST(request) {
  try {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json().catch(() => ({}));
    const ids = normalizeIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one message.' }, { status: 400 });
    }

    await connectToDatabase();

    const items = await Contact.find({ _id: { $in: ids } }).sort({ createdAt: -1 }).lean();

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
        'Content-Disposition': 'attachment; filename="messages_selected.csv"',
      },
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

    const body = await request.json().catch(() => ({}));
    const ids = normalizeIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one message.' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await Contact.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: 'Selected messages deleted successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

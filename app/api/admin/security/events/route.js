import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import SecurityEvent from '@/models/SecurityEvent';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const includeAll = request.nextUrl.searchParams.get('all') === '1';
  const query = includeAll ? {} : { userId: auth.id };
  const events = await SecurityEvent.find(query).sort({ createdAt: -1 }).limit(100).lean();

  return NextResponse.json({
    success: true,
    data: events.map((item) => ({
      id: String(item._id),
      type: item.type,
      severity: item.severity,
      username: item.username,
      ip: item.ip,
      details: item.details || {},
      createdAt: item.createdAt,
    })),
  });
}

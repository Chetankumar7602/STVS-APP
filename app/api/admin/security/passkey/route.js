import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminPasskey from '@/models/AdminPasskey';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const passkeys = await AdminPasskey.find({ userId: auth.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    success: true,
    data: passkeys.map((item) => ({
      id: String(item._id),
      label: item.label,
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt,
    })),
  });
}

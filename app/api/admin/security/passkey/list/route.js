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
    data: passkeys.map((p) => ({
      id: String(p._id),
      label: p.label || 'Fingerprint Passkey',
      deviceType: p.deviceType || '',
      lastUsedAt: p.lastUsedAt || null,
      createdAt: p.createdAt || null,
    })),
  });
}

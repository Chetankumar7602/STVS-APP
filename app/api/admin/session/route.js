import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    data: {
      username: auth.username,
      role: auth.role || 'admin',
    },
  });
}

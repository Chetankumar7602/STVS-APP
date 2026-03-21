import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  return NextResponse.json(
    {
      success: false,
      message: 'Redeploy is no longer required for blogs. The site now reads blog content from Sanity directly.',
    },
    { status: 400 }
  );
}

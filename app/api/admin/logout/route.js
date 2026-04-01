import { NextResponse } from 'next/server';
import { clearAuthCookie, verifyToken, revokeSessionByTokenId } from '@/lib/auth';

export async function POST(request) {
  const token = request.cookies.get('adminToken')?.value;
  const decoded = token ? verifyToken(token) : null;
  if (decoded?.sid) {
    await revokeSessionByTokenId(decoded.sid, decoded.username || 'self', 'logout');
  }

  const response = NextResponse.json({ success: true, message: 'Logout successful' }, { status: 200 });
  clearAuthCookie(response);

  return response;
}

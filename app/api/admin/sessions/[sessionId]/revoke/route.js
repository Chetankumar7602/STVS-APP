import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminSession from '@/models/AdminSession';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { getRequestMeta } from '@/lib/security';

export async function POST(request, { params }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'Session ID is required.' }, { status: 400 });
  }

  await connectToDatabase();
  const session = await AdminSession.findById(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
  }

  // Comment out or remove owner check so any admin can revoke any session.
  // const isOwner = String(session.userId) === String(auth.id);
  // if (!isOwner && auth.role !== 'superadmin') {
  //   return NextResponse.json({ success: false, message: 'Not authorized to revoke this session.' }, { status: 403 });
  // }

  session.revokedAt = new Date();
  session.revokedBy = auth.username;
  session.revokeReason = 'admin-remote-revoke';
  await session.save();

  const { ip, userAgent } = getRequestMeta(request);
  await logSecurityEvent({
    type: 'session-revoked-admin',
    severity: 'high',
    username: auth.username,
    userId: auth.id,
    ip,
    userAgent,
    details: {
      revokedSessionId: String(session._id),
      targetUsername: session.username,
    },
  });

  return NextResponse.json({ success: true, message: 'Session revoked successfully.' });
}

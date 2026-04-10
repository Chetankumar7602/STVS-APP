import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate, verifyToken } from '@/lib/auth';
import AdminSession from '@/models/AdminSession';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { getRequestMeta } from '@/lib/security';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const includeAll = request.nextUrl.searchParams.get('all') === '1';
  const query = includeAll ? {} : { userId: auth.id };
  const sessions = await AdminSession.find(query).sort({ createdAt: -1 }).limit(50).lean();

  const now = new Date();
  return NextResponse.json({
    success: true,
    data: sessions.map((session) => {
      const isExpired = session.expiresAt && new Date(session.expiresAt) < now;
      const trulyRevoked = session.revokedAt || isExpired;
      
      return {
        id: String(session._id),
        tokenId: session.tokenId,
        username: session.username,
        authMethod: session.authMethod,
        ip: session.ip,
        userAgent: session.userAgent,
        issuedAt: session.issuedAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        revokedAt: trulyRevoked ? (session.revokedAt || session.expiresAt) : null,
        isCurrent: session.tokenId === auth.sid,
      };
    }),
  });
}

export async function DELETE(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { ip, userAgent } = getRequestMeta(request);
  await connectToDatabase();
  const result = await AdminSession.updateMany(
    {
      userId: auth.id,
      tokenId: { $ne: auth.sid },
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokedBy: auth.username,
        revokeReason: 'remote-sign-out',
      },
    }
  );

  await logSecurityEvent({
    type: 'sessions-revoked-self',
    severity: 'medium',
    username: auth.username,
    userId: auth.id,
    ip,
    userAgent,
    details: { modifiedCount: result.modifiedCount },
  });

  return NextResponse.json({
    success: true,
    message: 'Other sessions revoked.',
    count: result.modifiedCount,
  });
}

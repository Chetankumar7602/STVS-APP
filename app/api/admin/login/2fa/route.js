import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import AuthChallenge from '@/models/AuthChallenge';
import { buildAuthCookie, createAdminSession } from '@/lib/auth';
import { getRequestMeta, hashValue, sanitizeOtp } from '@/lib/security';
import { logSecurityEvent } from '@/lib/securityMonitoring';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeId = String(body.challengeId || '').trim();
    const code = sanitizeOtp(body.code);
    const { ip, userAgent } = getRequestMeta(request);

    if (!challengeId || !code) {
      return NextResponse.json({ success: false, message: 'Challenge ID and code are required.' }, { status: 400 });
    }

    await connectToDatabase();
    const challenge = await AuthChallenge.findOne({ challengeId });
    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Invalid challenge.' }, { status: 400 });
    }

    if (challenge.consumedAt) {
      return NextResponse.json({ success: false, message: 'Challenge already used.' }, { status: 400 });
    }

    if (challenge.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: 'Verification code expired.' }, { status: 400 });
    }

    if (challenge.attemptsLeft <= 0) {
      return NextResponse.json({ success: false, message: 'Too many invalid attempts.' }, { status: 429 });
    }

    const isValid = hashValue(code) === challenge.codeHash;
    if (!isValid) {
      challenge.attemptsLeft = Math.max(challenge.attemptsLeft - 1, 0);
      await challenge.save();
      await logSecurityEvent({
        type: 'failed-2fa',
        severity: 'high',
        username: challenge.username,
        userId: challenge.userId,
        ip,
        userAgent,
        details: { method: challenge.method, challengeId },
      });
      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 401 });
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    const admin = await AdminUser.findById(challenge.userId);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
    }

    const { token } = await createAdminSession({
      user: admin,
      ip,
      userAgent,
      authMethod: 'password_2fa',
    });

    await logSecurityEvent({
      type: 'login-success-2fa',
      severity: 'low',
      username: admin.username,
      userId: admin._id,
      ip,
      userAgent,
      details: { method: challenge.method },
    });

    const response = NextResponse.json({ success: true, message: '2FA verified. Login successful.' }, { status: 200 });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to verify 2FA.' }, { status: 500 });
  }
}

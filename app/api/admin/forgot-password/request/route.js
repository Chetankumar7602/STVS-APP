import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import PasswordResetToken from '@/models/PasswordResetToken';
import { sendMail } from '@/lib/email';
import { getRequestMeta, hashValue, randomToken, sanitizeIdentifier } from '@/lib/security';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

const RESET_TOKEN_EXP_MINUTES = Number.parseInt(process.env.AUTH_PASSWORD_RESET_EXPIRES_MINUTES || '15', 10);

function getAppOrigin(request) {
  const origin = new URL(request.url).origin;
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || '').trim();

  if (/^https?:\/\//i.test(configured) && !/localhost|127\.0\.0\.1/i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  return origin;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = sanitizeIdentifier(body.email, 128).toLowerCase();
    const { ip, userAgent } = getRequestMeta(request);

    if (!email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Please provide a valid email.' }, { status: 400 });
    }

    await connectToDatabase();
    const admin = await AdminUser.findOne({ email });

    // Generic response prevents user/email enumeration.
    const generic = NextResponse.json({
      success: true,
      message: 'If the account is eligible, a password reset link has been sent.',
    });

    if (!admin || !isAllowedAdminEmail(email)) {
      return generic;
    }

    const rawToken = randomToken(24);
    const tokenHash = hashValue(rawToken);
    await PasswordResetToken.create({
      userId: admin._id,
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXP_MINUTES * 60 * 1000),
      ip,
      userAgent,
    });

    const appUrl = getAppOrigin(request);
    const resetLink = `${appUrl}/admin/forgot-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
    await sendMail({
      to: email,
      subject: 'STVS Admin Password Reset',
      html: `<p>Use this secure link to reset your admin password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in ${RESET_TOKEN_EXP_MINUTES} minutes.</p>`,
    });

    await logSecurityEvent({
      type: 'forgot-password-link-sent',
      severity: 'medium',
      username: admin.username,
      userId: admin._id,
      ip,
      userAgent,
      details: { email },
    });

    return generic;
  } catch (error) {
    console.error('Forgot password request error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to process request.' }, { status: 500 });
  }
}

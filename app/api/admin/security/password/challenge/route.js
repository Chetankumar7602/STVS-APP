import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import AuthChallenge from '@/models/AuthChallenge';
import { getRequestMeta, hashValue, randomNumericCode } from '@/lib/security';
import { sendMail } from '@/lib/email';
import { sendSMS } from '@/lib/smsService';

const OTP_EXPIRES_MINUTES = Number.parseInt(process.env.AUTH_OTP_EXPIRES_MINUTES || '10', 10);

async function sendChallenge({ user, method, code }) {
  if (method === 'email') {
    if (!user.email) throw new Error('2FA email is not configured.');
    await sendMail({
      to: user.email,
      subject: 'STVS Password Change Verification',
      html: `<p>Your password change verification code is <strong>${code}</strong>.</p><p>Expires in ${OTP_EXPIRES_MINUTES} minutes.</p>`,
    });
    return user.email;
  }

  if (method === 'sms') {
    if (!user.phone) throw new Error('2FA SMS is not configured.');
    await sendSMS(user.phone, `STVS password change code: ${code}. Expires in ${OTP_EXPIRES_MINUTES} minutes.`);
    return user.phone;
  }

  throw new Error('Unsupported challenge method.');
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  if (!admin.twoFactorEnabled) {
    return NextResponse.json(
      { success: false, message: '2FA must be enabled to change password.' },
      { status: 400 }
    );
  }

  if (admin.twoFactorMethod === 'authenticator') {
    return NextResponse.json({
      success: true,
      method: 'authenticator',
      message: 'Enter your authenticator app code.',
    });
  }

  const code = randomNumericCode(6);
  const challengeId = crypto.randomUUID();
  const destination = await sendChallenge({ user: admin, method: admin.twoFactorMethod, code });

  const { ip, userAgent } = getRequestMeta(request);
  await AuthChallenge.create({
    challengeId,
    userId: admin._id,
    username: admin.username,
    method: admin.twoFactorMethod,
    destination,
    codeHash: hashValue(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
    ip,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    method: admin.twoFactorMethod,
    challengeId,
    message: `Verification code sent via ${admin.twoFactorMethod}.`,
  });
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import AuthChallenge from '@/models/AuthChallenge';
import { validatePasswordPolicy, hashValue, sanitizeOtp } from '@/lib/security';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { decryptSensitiveValue } from '@/lib/fieldCrypto';
import { verifyTotpCode } from '@/lib/totp';

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  const twoFactorCode = sanitizeOtp(body.twoFactorCode);
  const challengeId = String(body.challengeId || '').trim();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, message: 'Current and new passwords are required.' }, { status: 400 });
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.isValid) {
    return NextResponse.json(
      { success: false, message: 'New password does not meet policy requirements.', errors: policy.errors },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  if (!admin.twoFactorEnabled) {
    return NextResponse.json(
      { success: false, message: '2FA must be enabled before changing password.' },
      { status: 400 }
    );
  }

  const isCurrentMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isCurrentMatch) {
    await logSecurityEvent({
      type: 'failed-password-change',
      severity: 'high',
      username: admin.username,
      userId: admin._id,
      details: { reason: 'wrong-current-password' },
    });
    return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 401 });
  }

  if (!twoFactorCode) {
    return NextResponse.json({ success: false, message: '2FA verification code is required.' }, { status: 400 });
  }

  if (admin.twoFactorMethod === 'authenticator') {
    const secret = decryptSensitiveValue(admin.totpSecret);
    if (!secret || !verifyTotpCode(twoFactorCode, secret)) {
      return NextResponse.json({ success: false, message: 'Invalid authenticator code.' }, { status: 401 });
    }
  } else {
    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Challenge ID is required for OTP verification.' }, { status: 400 });
    }

    const challenge = await AuthChallenge.findOne({
      challengeId,
      userId: admin._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!challenge || challenge.method !== admin.twoFactorMethod) {
      return NextResponse.json({ success: false, message: 'Invalid or expired password-change challenge.' }, { status: 400 });
    }

    if (challenge.attemptsLeft <= 0) {
      return NextResponse.json({ success: false, message: 'Too many invalid attempts. Request a new code.' }, { status: 429 });
    }

    const isValidCode = hashValue(twoFactorCode) === challenge.codeHash;
    if (!isValidCode) {
      challenge.attemptsLeft = Math.max(challenge.attemptsLeft - 1, 0);
      await challenge.save();
      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 401 });
    }

    challenge.consumedAt = new Date();
    await challenge.save();
  }

  const salt = await bcrypt.genSalt(12);
  admin.password = await bcrypt.hash(newPassword, salt);
  admin.passwordUpdatedAt = new Date();
  await admin.save();

  await logSecurityEvent({
    type: 'password-changed',
    severity: 'high',
    username: admin.username,
    userId: admin._id,
  });

  return NextResponse.json({ success: true, message: 'Password updated successfully.' });
}

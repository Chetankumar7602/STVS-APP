import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import PasswordResetToken from '@/models/PasswordResetToken';
import AdminSession from '@/models/AdminSession';
import { hashValue, sanitizeIdentifier } from '@/lib/security';
import { validatePasswordPolicy } from '@/lib/security';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = sanitizeIdentifier(body.email, 128).toLowerCase();
    const token = String(body.token || '').trim();
    const newPassword = String(body.newPassword || '');

    if (!email || !token || !newPassword) {
      return NextResponse.json({ success: false, message: 'Email, token, and new password are required.' }, { status: 400 });
    }

    if (!isAllowedAdminEmail(email)) {
      return NextResponse.json({ success: false, message: 'Access denied for this account.' }, { status: 403 });
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.isValid) {
      return NextResponse.json(
        { success: false, message: 'Password does not meet policy requirements.', errors: policy.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const tokenHash = hashValue(token);
    const reset = await PasswordResetToken.findOne({
      email,
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!reset) {
      return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 });
    }

    const admin = await AdminUser.findById(reset.userId);
    if (!admin || String(admin.email || '').toLowerCase() !== email) {
      return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
    }

    const salt = await bcrypt.genSalt(12);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.passwordUpdatedAt = new Date();
    await admin.save();

    reset.usedAt = new Date();
    await reset.save();

    await AdminSession.updateMany(
      { userId: admin._id, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedBy: 'system', revokeReason: 'password-reset' } }
    );

    await logSecurityEvent({
      type: 'forgot-password-reset-success',
      severity: 'high',
      username: admin.username,
      userId: admin._id,
      details: { email },
    });

    return NextResponse.json({ success: true, message: 'Password reset successful. Please login again.' });
  } catch (error) {
    console.error('Forgot password reset error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to reset password.' }, { status: 500 });
  }
}

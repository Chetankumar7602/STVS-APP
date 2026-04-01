import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import LoginAttempt from '@/models/LoginAttempt';
import AuthChallenge from '@/models/AuthChallenge';
import { buildAuthCookie, createAdminSession } from '@/lib/auth';
import { getRequestMeta, hashValue, randomNumericCode, sanitizeIdentifier, sanitizeOtp } from '@/lib/security';
import { sendMail } from '@/lib/email';
import { sendSMS } from '@/lib/smsService';
import { verifyTotpCode } from '@/lib/totp';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { decryptSensitiveValue } from '@/lib/fieldCrypto';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

const MAX_LOGIN_ATTEMPTS = Number.parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5', 10);
const BLOCK_MINUTES = Number.parseInt(process.env.AUTH_BLOCK_MINUTES || '15', 10);
const OTP_EXPIRES_MINUTES = Number.parseInt(process.env.AUTH_OTP_EXPIRES_MINUTES || '10', 10);
const SIGNIN_DATA_RETENTION_DAYS = Number.parseInt(process.env.AUTH_AUDIT_RETENTION_DAYS || '7', 10);

async function getAttempt(ip, username) {
  return LoginAttempt.findOne({ ip, username });
}

async function blockOnFailedAttempt({ ip, username }) {
  const now = new Date();
  const recordExpiresAt = new Date(now.getTime() + SIGNIN_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const attempt = await LoginAttempt.findOneAndUpdate(
    { ip, username },
    {
      $setOnInsert: { firstAttemptAt: now },
      $set: { lastAttemptAt: now, recordExpiresAt },
      $inc: { attempts: 1 },
    },
    { upsert: true, new: true }
  );

  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.blockedUntil = new Date(now.getTime() + BLOCK_MINUTES * 60 * 1000);
    await attempt.save();
  }
  return attempt;
}

async function clearAttempts(ip, username) {
  await LoginAttempt.deleteOne({ ip, username });
}

async function sendChallenge({ user, method, code }) {
  if (method === 'email') {
    if (!user.email) {
      throw new Error('2FA email is not configured for this admin account.');
    }
    await sendMail({
      to: user.email,
      subject: 'Your STVS Admin verification code',
      html: `<p>Your login verification code is <strong>${code}</strong>.</p><p>This code expires in ${OTP_EXPIRES_MINUTES} minutes.</p>`,
    });
    return user.email;
  }

  if (method === 'sms') {
    if (!user.phone) {
      throw new Error('2FA SMS is not configured for this admin account.');
    }
    await sendSMS(user.phone, `Your STVS admin verification code is ${code}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`);
    return user.phone;
  }

  throw new Error('Unsupported 2FA method.');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = sanitizeIdentifier(body.username);
    const password = String(body.password || '');
    const twoFactorCode = sanitizeOtp(body.twoFactorCode);
    const { ip, userAgent } = getRequestMeta(request);

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Please provide username and password' }, { status: 400 });
    }

    await connectToDatabase();
    const existingAttempt = await getAttempt(ip, username);
    if (existingAttempt?.blockedUntil && existingAttempt.blockedUntil > new Date()) {
      await logSecurityEvent({
        type: 'login-rate-limited',
        severity: 'high',
        username,
        ip,
        userAgent,
        details: { blockedUntil: existingAttempt.blockedUntil },
      });
      return NextResponse.json(
        { success: false, message: 'Too many failed attempts. Try again later.' },
        { status: 429 }
      );
    }

    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      const attempt = await blockOnFailedAttempt({ ip, username });
      await logSecurityEvent({
        type: 'failed-login',
        severity: attempt.attempts >= MAX_LOGIN_ATTEMPTS ? 'high' : 'medium',
        username,
        ip,
        userAgent,
        details: { reason: 'unknown-user', attempts: attempt.attempts },
      });
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      const attempt = await blockOnFailedAttempt({ ip, username });
      await logSecurityEvent({
        type: 'failed-login',
        severity: attempt.attempts >= MAX_LOGIN_ATTEMPTS ? 'high' : 'medium',
        username,
        userId: admin._id,
        ip,
        userAgent,
        details: { reason: 'wrong-password', attempts: attempt.attempts },
      });
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    await clearAttempts(ip, username);

    const adminEmail = String(admin.email || '').toLowerCase();
    if (!isAllowedAdminEmail(adminEmail)) {
      await logSecurityEvent({
        type: 'admin-login-blocked-email-not-allowed',
        severity: 'high',
        username: admin.username,
        userId: admin._id,
        ip,
        userAgent,
        details: { email: adminEmail || 'missing' },
      });
      return NextResponse.json(
        { success: false, message: 'Access denied. Your email is not allowed for admin portal.' },
        { status: 403 }
      );
    }

    if (admin.twoFactorEnabled) {
      if (admin.twoFactorMethod === 'authenticator') {
        if (!admin.totpSecret) {
          return NextResponse.json(
            { success: false, message: 'Authenticator 2FA is not configured for this account.' },
            { status: 400 }
          );
        }

        if (!twoFactorCode) {
          return NextResponse.json(
            {
              success: false,
              requiresTwoFactor: true,
              method: 'authenticator',
              message: 'Enter your authenticator app code to continue.',
            },
            { status: 202 }
          );
        }

        const totpSecret = decryptSensitiveValue(admin.totpSecret);
        const isValidTotp = verifyTotpCode(twoFactorCode, totpSecret);
        if (!isValidTotp) {
          await logSecurityEvent({
            type: 'failed-2fa',
            severity: 'high',
            username: admin.username,
            userId: admin._id,
            ip,
            userAgent,
            details: { method: 'authenticator' },
          });
          return NextResponse.json({ success: false, message: 'Invalid 2FA code' }, { status: 401 });
        }
      } else {
        const code = randomNumericCode(6);
        const challengeId = crypto.randomUUID();
        const destination = await sendChallenge({ user: admin, method: admin.twoFactorMethod, code });

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

        await logSecurityEvent({
          type: '2fa-challenge-issued',
          severity: 'low',
          username: admin.username,
          userId: admin._id,
          ip,
          userAgent,
          details: { method: admin.twoFactorMethod },
        });

        return NextResponse.json(
          {
            success: false,
            requiresTwoFactor: true,
            method: admin.twoFactorMethod,
            challengeId,
            message: `Verification code sent via ${admin.twoFactorMethod}.`,
          },
          { status: 202 }
        );
      }
    }

    const { token } = await createAdminSession({
      user: admin,
      ip,
      userAgent,
      authMethod: admin.twoFactorEnabled ? 'password_2fa' : 'password',
    });

    await logSecurityEvent({
      type: 'login-success',
      severity: 'low',
      username: admin.username,
      userId: admin._id,
      ip,
      userAgent,
    });

    const response = NextResponse.json({ success: true, message: 'Login successful' }, { status: 200 });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Login failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import { sanitizeIdentifier, sanitizeOtp } from '@/lib/security';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from '@/lib/totp';
import { decryptSensitiveValue, encryptSensitiveValue } from '@/lib/fieldCrypto';

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id).lean();
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      twoFactorEnabled: Boolean(admin.twoFactorEnabled),
      twoFactorMethod: admin.twoFactorMethod || 'email',
      email: admin.email || '',
      phone: admin.phone || '',
      hasAuthenticatorSecret: Boolean(admin.totpSecret),
    },
  });
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '').trim();

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  if (action === 'setup-authenticator') {
    const secret = generateTotpSecret();
    admin.totpSecret = encryptSensitiveValue(secret);
    admin.twoFactorMethod = 'authenticator';
    admin.twoFactorEnabled = false;
    await admin.save();

    const issuer = process.env.AUTH_APP_ISSUER || 'STVS Admin';
    const accountName = admin.email || admin.username;
    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl: buildOtpAuthUrl({ issuer, accountName, secret }),
      },
      message: 'Authenticator secret generated. Verify a code to enable 2FA.',
    });
  }

  if (action === 'enable') {
    const method = String(body.method || '').trim();
    if (!['email', 'sms', 'authenticator'].includes(method)) {
      return NextResponse.json({ success: false, message: 'Invalid 2FA method.' }, { status: 400 });
    }

    if (method === 'email') {
      const email = sanitizeIdentifier(body.email, 128).toLowerCase();
      if (!email.includes('@')) {
        return NextResponse.json({ success: false, message: 'Valid email is required for email 2FA.' }, { status: 400 });
      }
      admin.email = email;
    }

    if (method === 'sms') {
      const phone = String(body.phone || '').trim().replace(/[^\d+]/g, '').slice(0, 20);
      if (!phone) {
        return NextResponse.json({ success: false, message: 'Valid phone is required for SMS 2FA.' }, { status: 400 });
      }
      admin.phone = phone;
    }

    if (method === 'authenticator') {
      const code = sanitizeOtp(body.code);
      if (!admin.totpSecret) {
        return NextResponse.json({ success: false, message: 'Set up authenticator secret first.' }, { status: 400 });
      }
      const secret = decryptSensitiveValue(admin.totpSecret);
      if (!verifyTotpCode(code, secret)) {
        return NextResponse.json({ success: false, message: 'Invalid authenticator code.' }, { status: 400 });
      }
    }

    admin.twoFactorMethod = method;
    admin.twoFactorEnabled = true;
    await admin.save();
    return NextResponse.json({ success: true, message: '2FA enabled successfully.' });
  }

  if (action === 'disable') {
    admin.twoFactorEnabled = false;
    await admin.save();
    return NextResponse.json({ success: true, message: '2FA disabled.' });
  }

  return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
}

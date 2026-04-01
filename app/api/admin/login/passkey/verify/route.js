import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import AdminPasskey from '@/models/AdminPasskey';
import PasskeyChallenge from '@/models/PasskeyChallenge';
import { sanitizeIdentifier, getRequestMeta } from '@/lib/security';
import { getPasskeyConfig } from '@/lib/passkey';
import { buildAuthCookie, createAdminSession } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = sanitizeIdentifier(body.username);
  const credential = body.response;
  if (!username || !credential) {
    return NextResponse.json({ success: false, message: 'Username and fingerprint response are required.' }, { status: 400 });
  }

  await connectToDatabase();
  const admin = await AdminUser.findOne({ username });
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
  }

  if (!isAllowedAdminEmail(admin.email)) {
    return NextResponse.json({ success: false, message: 'Access denied. Your email is not allowed for admin portal.' }, { status: 403 });
  }

  const challenge = await PasskeyChallenge.findOne({
    userId: admin._id,
    type: 'authentication',
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!challenge || challenge.expiresAt < new Date()) {
    return NextResponse.json({ success: false, message: 'Fingerprint challenge expired. Try again.' }, { status: 400 });
  }

  const passkey = await AdminPasskey.findOne({
    userId: admin._id,
    credentialID: credential.id,
  });
  if (!passkey) {
    return NextResponse.json({ success: false, message: 'Fingerprint credential not recognized.' }, { status: 401 });
  }

  const { rpID, expectedOrigin } = getPasskeyConfig(request.url);
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialID,
      publicKey: Buffer.from(passkey.publicKey, 'base64url'),
      counter: passkey.counter || 0,
      transports: passkey.transports || [],
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ success: false, message: 'Fingerprint verification failed.' }, { status: 401 });
  }

  passkey.counter = verification.authenticationInfo.newCounter;
  passkey.lastUsedAt = new Date();
  await passkey.save();

  challenge.consumedAt = new Date();
  await challenge.save();

  const { ip, userAgent } = getRequestMeta(request);
  const { token } = await createAdminSession({
    user: admin,
    ip,
    userAgent,
    authMethod: 'passkey',
  });

  await logSecurityEvent({
    type: 'passkey-login-success',
    severity: 'medium',
    username: admin.username,
    userId: admin._id,
    ip,
    userAgent,
  });

  const response = NextResponse.json({ success: true, message: 'Fingerprint login successful.' });
  response.cookies.set(buildAuthCookie(token));
  return response;
}

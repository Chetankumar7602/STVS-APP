import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import AdminPasskey from '@/models/AdminPasskey';
import PasskeyChallenge from '@/models/PasskeyChallenge';
import { getPasskeyConfig } from '@/lib/passkey';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { getRequestMeta } from '@/lib/security';

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const credential = body.response;
  if (!credential) {
    return NextResponse.json({ success: false, message: 'Passkey registration response is required.' }, { status: 400 });
  }

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  const challenge = await PasskeyChallenge.findOne({
    userId: admin._id,
    type: 'registration',
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!challenge || challenge.expiresAt < new Date()) {
    return NextResponse.json({ success: false, message: 'Passkey registration challenge expired.' }, { status: 400 });
  }

  const { rpID, expectedOrigin } = getPasskeyConfig(request.url);
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ success: false, message: 'Passkey registration failed.' }, { status: 400 });
  }

  const registrationInfo = verification.registrationInfo;
  const credentialInfo = registrationInfo.credential;
  const credentialID = credentialInfo.id;
  const publicKey = Buffer.from(credentialInfo.publicKey).toString('base64url');

  await AdminPasskey.findOneAndUpdate(
    { credentialID },
    {
      userId: admin._id,
      username: admin.username,
      credentialID,
      publicKey,
      counter: credentialInfo.counter || 0,
      transports: credentialInfo.transports || [],
      deviceType: credentialInfo.deviceType || '',
      backedUp: Boolean(credentialInfo.backedUp),
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  challenge.consumedAt = new Date();
  await challenge.save();

  const { ip, userAgent } = getRequestMeta(request);
  await logSecurityEvent({
    type: 'passkey-registered',
    severity: 'medium',
    username: admin.username,
    userId: admin._id,
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true, message: 'Fingerprint/passkey enabled successfully.' });
}

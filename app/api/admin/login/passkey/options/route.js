import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import AdminPasskey from '@/models/AdminPasskey';
import PasskeyChallenge from '@/models/PasskeyChallenge';
import { sanitizeIdentifier } from '@/lib/security';
import { getPasskeyConfig } from '@/lib/passkey';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = sanitizeIdentifier(body.username);
  if (!username) {
    return NextResponse.json({ success: false, message: 'Username is required for fingerprint login.' }, { status: 400 });
  }

  await connectToDatabase();
  const admin = await AdminUser.findOne({ username });
  if (!admin) {
    return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
  }

  const passkeys = await AdminPasskey.find({ userId: admin._id }).lean();
  if (passkeys.length === 0) {
    return NextResponse.json({ success: false, message: 'No fingerprint/passkey is configured for this account.' }, { status: 400 });
  }

  const { rpID } = getPasskeyConfig(request.url);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports || [],
    })),
  });

  await PasskeyChallenge.create({
    challenge: options.challenge,
    type: 'authentication',
    userId: admin._id,
    username: admin.username,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return NextResponse.json({ success: true, options });
}

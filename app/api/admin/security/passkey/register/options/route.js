import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import AdminPasskey from '@/models/AdminPasskey';
import PasskeyChallenge from '@/models/PasskeyChallenge';
import { getPasskeyConfig } from '@/lib/passkey';

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const admin = await AdminUser.findById(auth.id);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 });
  }

  const { rpID, rpName } = getPasskeyConfig(request.url);
  const existingPasskeys = await AdminPasskey.find({ userId: admin._id }).lean();
  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: admin.username,
    userDisplayName: admin.username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports || [],
    })),
  });

  await PasskeyChallenge.create({
    challenge: options.challenge,
    type: 'registration',
    userId: admin._id,
    username: admin.username,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return NextResponse.json({ success: true, options });
}

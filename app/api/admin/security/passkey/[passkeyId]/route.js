import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminPasskey from '@/models/AdminPasskey';

export async function DELETE(request, { params }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { passkeyId } = params;
  if (!passkeyId) {
    return NextResponse.json({ success: false, message: 'Passkey ID required.' }, { status: 400 });
  }

  await connectToDatabase();

  // Only allow deleting own passkeys (unless superadmin)
  const query = { _id: passkeyId };
  if (auth.role !== 'superadmin') {
    query.userId = auth.id;
  }

  const result = await AdminPasskey.findOneAndDelete(query);
  if (!result) {
    return NextResponse.json({ success: false, message: 'Passkey not found or access denied.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Passkey removed successfully.' });
}

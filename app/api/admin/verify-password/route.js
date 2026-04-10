import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import { authenticate } from '@/lib/auth';
import AdminUser from '@/models/AdminUser';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { getRequestMeta } from '@/lib/security';

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { password } = await request.json();
    const { ip, userAgent } = getRequestMeta(request);

    if (!password) {
      return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Auth already contains auth.id or auth.username?
    // authenticate() returns { id, username, role, sid }
    const admin = await AdminUser.findById(auth.id);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(String(password), admin.password);
    
    if (!isValid) {
      await logSecurityEvent({
        type: 'auto-lock-unlock-failed',
        severity: 'medium',
        username: admin.username,
        userId: admin._id,
        ip,
        userAgent,
      });
      return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
    }

    await logSecurityEvent({
      type: 'auto-lock-unlocked',
      severity: 'low',
      username: admin.username,
      userId: admin._id,
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Unlocked' });
  } catch (error) {
    console.error('Verify password error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

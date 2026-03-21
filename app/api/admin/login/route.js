import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AdminUser from '@/models/AdminUser';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Please provide username and password' }, { status: 400 });
    }

    await connectToDatabase();

    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ id: admin._id, username: admin.username });

    const response = NextResponse.json({ success: true, message: 'Login successful' }, { status: 200 });
    
    // Set cookie
    response.cookies.set({
      name: 'adminToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 1, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

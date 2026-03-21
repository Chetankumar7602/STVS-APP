import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET environment variable is not set correctly.');
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware utility to verify JWT token from request cookies.
 * Returns the decoded token if valid, else returns a NextResponse with 401 error.
 */
export async function authenticate(request) {
  const token = request.cookies.get('adminToken')?.value;
  
  if (!token) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
  }

  return decoded;
}

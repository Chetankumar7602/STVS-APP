import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AdminSession from '@/models/AdminSession';
import { logSecurityEvent } from '@/lib/securityMonitoring';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET environment variable is not set correctly.');
}

const JWT_TTL_SECONDS = Number.parseInt(process.env.AUTH_JWT_TTL_SECONDS || '1200', 10); // 20 min
const SESSION_MAX_SECONDS = Number.parseInt(process.env.AUTH_SESSION_MAX_SECONDS || '28800', 10); // 8 hours
const IDLE_TIMEOUT_SECONDS = Number.parseInt(process.env.AUTH_IDLE_TIMEOUT_SECONDS || '900', 10); // 15 min
const ACTIVITY_UPDATE_MIN_SECONDS = Number.parseInt(process.env.AUTH_ACTIVITY_UPDATE_MIN_SECONDS || '60', 10);

function unauthorizedResponse(message = 'Authentication required') {
  const response = NextResponse.json({ success: false, message }, { status: 401 });
  response.cookies.set({
    name: 'adminToken',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
  return response;
}

function forbiddenResponse(message = 'Access denied') {
  const response = NextResponse.json({ success: false, message }, { status: 403 });
  response.cookies.set({
    name: 'adminToken',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
  return response;
}

export function signToken(payload, expiresInSeconds = JWT_TTL_SECONDS) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${expiresInSeconds}s` });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function buildAuthCookie(token) {
  return {
    name: 'adminToken',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: JWT_TTL_SECONDS,
    path: '/',
  };
}

export function clearAuthCookie(response) {
  response.cookies.set({
    name: 'adminToken',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
}

export async function createAdminSession({ user, ip = '', userAgent = '', authMethod = 'password' }) {
  await connectToDatabase();
  const now = new Date();
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_SECONDS * 1000);

  const token = signToken({
    id: String(user._id),
    username: user.username,
    email: user.email || '',
    role: user.role || 'admin',
    sid: tokenId,
  });

  await AdminSession.create({
    userId: user._id,
    username: user.username,
    email: user.email || '',
    tokenId,
    authMethod,
    ip,
    userAgent,
    issuedAt: now,
    lastActivityAt: now,
    expiresAt,
  });

  return { token, tokenId, expiresAt };
}

export async function revokeSessionByTokenId(tokenId, revokedBy = 'system', revokeReason = 'manual') {
  if (!tokenId) return;
  await connectToDatabase();
  await AdminSession.updateOne(
    { tokenId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedBy, revokeReason } }
  );
}

/**
 * Middleware utility to verify JWT token from request cookies.
 * Returns the decoded token when valid, else returns a 401 response.
 */
export async function authenticate(request) {
  const token = request.cookies.get('adminToken')?.value;
  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.sid || !decoded.id) {
    return unauthorizedResponse('Invalid or expired token');
  }

  await connectToDatabase();
  const session = await AdminSession.findOne({ tokenId: decoded.sid }).lean();
  if (!session || session.revokedAt) {
    return unauthorizedResponse('Session revoked or expired');
  }

  const sessionEmail = String(session.email || decoded.email || '').toLowerCase();
  if (!isAllowedAdminEmail(sessionEmail)) {
    await revokeSessionByTokenId(decoded.sid, 'system', 'email-not-allowed');
    await logSecurityEvent({
      type: 'admin-access-denied-email',
      severity: 'high',
      username: decoded.username,
      userId: decoded.id,
      details: { email: sessionEmail || 'missing' },
    });
    return forbiddenResponse('Access denied for this account.');
  }

  const now = Date.now();
  const lastActivityAt = new Date(session.lastActivityAt || session.issuedAt || now).getTime();
  const sessionExpiresAt = new Date(session.expiresAt).getTime();
  if (sessionExpiresAt <= now) {
    await revokeSessionByTokenId(decoded.sid, 'system', 'session-expired');
    return unauthorizedResponse('Session expired');
  }

  if (now - lastActivityAt > IDLE_TIMEOUT_SECONDS * 1000) {
    await revokeSessionByTokenId(decoded.sid, 'system', 'idle-timeout');
    await logSecurityEvent({
      type: 'idle-timeout',
      severity: 'medium',
      username: decoded.username,
      userId: decoded.id,
      details: { tokenId: decoded.sid },
    });
    return unauthorizedResponse('Session expired due to inactivity');
  }

  if (now - lastActivityAt >= ACTIVITY_UPDATE_MIN_SECONDS * 1000) {
    await AdminSession.updateOne({ tokenId: decoded.sid }, { $set: { lastActivityAt: new Date() } });
  }

  return decoded;
}

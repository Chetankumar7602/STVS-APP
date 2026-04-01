import { NextResponse } from 'next/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith('/admin');
  const isLoginPage = path === '/admin/login';
  const isForgotPage = path.startsWith('/admin/forgot-password');
  if (!isAdminPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get('adminToken')?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const email = String(payload?.email || '').toLowerCase();
  const hasAllowedEmail = Boolean(email && isAllowedAdminEmail(email));

  if (isLoginPage) {
    if (token && hasAllowedEmail) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (token && !hasAllowedEmail) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isForgotPage) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (!hasAllowedEmail) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

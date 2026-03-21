import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Protect all /admin routes except /admin/login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('adminToken')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  // Redirect logged in users away from login page
  if (path === '/admin/login') {
    const token = request.cookies.get('adminToken')?.value;
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

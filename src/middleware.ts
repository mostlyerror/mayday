import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all routes except the login page and NextAuth API routes
export const config = {
  matcher: [
    '/',
    '/api/scan/:path*',
    '/api/leads/:path*',
    '/api/export/:path*',
    '/api/stats/:path*',
    '/api/config/:path*',
  ],
};

import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Public routes that don't require authentication.
 * Auth pages and the health check endpoint are accessible without a session.
 */
const publicRoutes = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/health',
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through without session check.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const { client, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { session },
  } = await client.auth.getSession();

  // No session — redirect to login with a return path.
  if (!session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public assets (images, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};

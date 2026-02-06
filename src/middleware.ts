'use server';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkUserPermissionForPath, findDefaultRouteForUser, verifyJwtToken } from './lib/auth';
import { getUserById } from './lib/db';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/login' || pathname.startsWith('/superadmin/login');

  const session = await verifyJwtToken(request);

  if (isLoginPage) {
    if (session?.userId) {
      // This is an edge case (logged-in user visiting /login).
      // A DB call here is acceptable for correctness.
      const user = await getUserById(session.userId);
      if (user) {
        const defaultRoute = await findDefaultRouteForUser(user);
        return NextResponse.redirect(new URL(defaultRoute || '/', request.url));
      }
    }
    // User is not logged in and is on a login page, allow it.
    return NextResponse.next();
  }

  const hasPermission = await checkUserPermissionForPath(request);

  if (!hasPermission) {
    // FALLBACK for Super Admins: 
    // If the token says "no", but the DB verifies they really ARE a super admin, allow it.
    // This handles stale tokens or payload issues.
    const isSuperAdminPath = pathname.startsWith('/superadmin');
    if (isSuperAdminPath && session?.userId) {
      const user = await getUserById(session.userId);
      if (user?.isSuperadmin) {
        // Allow access even if token permission check failed
        return NextResponse.next();
      }
    }

    const loginUrl = isSuperAdminPath ? '/superadmin/login?error=NoPermissions' : '/login?error=NoPermissions';
    const response = NextResponse.redirect(new URL(loginUrl, request.url));

    // Only delete cookie if we are truly denying access
    response.cookies.delete('auth-token');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

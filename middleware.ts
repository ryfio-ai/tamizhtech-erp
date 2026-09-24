import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // If user is authenticated and tries to access login, redirect to dashboard
    if (pathname.startsWith("/login") && !!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to login, auth API, static files, and public image assets without a token
        if (
          pathname.startsWith("/login") || 
          pathname.startsWith("/api/auth") ||
          pathname.includes("_next") ||
          pathname === "/favicon.ico" ||
          pathname.startsWith("/assets") ||
          pathname === "/logo.png" ||
          /\.(png|jpg|jpeg|svg|webp|ico|gif)$/i.test(pathname)
        ) {
          return true;
        }

        // Otherwise, require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image and media assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

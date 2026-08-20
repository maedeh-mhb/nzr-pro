import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host === "nazira.ir") {
    const url = request.nextUrl.clone();
    url.host = "www.nazira.ir";
    return NextResponse.redirect(url, { status: 301 });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (adjust as needed for your app)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://zibal.ir",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' https: blob:",
    "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 https://*.vercel.app https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://api.zibal.ir https://accounts.google.com https://oauth2.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://gateway.zibal.ir https://sandbox.zibal.ir https://accounts.google.com",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Permissions Policy (formerly Feature Policy)
  const permissionsPolicy = [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=()",
  ].join(", ");
  response.headers.set("Permissions-Policy", permissionsPolicy);

  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};


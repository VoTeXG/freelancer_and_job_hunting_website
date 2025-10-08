import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getOrCreateRequestId(req: NextRequest) {
  return (
    req.headers.get('x-request-id') ||
    req.headers.get('cf-ray') ||
    req.headers.get('x-vercel-id') ||
    cryptoRandomId()
  );
}

function cryptoRandomId() {
  try {
    // Avoid importing crypto in middleware for edge minimalism
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// Apply minimal security headers and CORS gating for /api routes.
export function middleware(req: NextRequest) {
  const start = Date.now();
  const reqId = getOrCreateRequestId(req);
  const res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
  // Ensure the propagated request id is available to route handlers via request headers
  (res.headers as any).set('X-Request-Id', reqId);
  // Basic security headers
  res.headers.set('Referrer-Policy', 'same-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // A very tight CSP for API routes (JSON only)
  res.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  // Minimal Permissions-Policy
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains; preload');
  }

  // CORS: allow configured origin only (default allow-all for dev if not set)
  const allowed = process.env.NEXT_PUBLIC_APP_ORIGIN || '*';
  if (allowed === '*') {
    res.headers.set('Access-Control-Allow-Origin', '*');
  } else {
    const origin = req.headers.get('origin');
    if (origin && origin === allowed) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.headers.set('Vary', 'Origin');
  res.headers.set('X-Request-Id', reqId);
  // Also expose for client consumption if needed
  res.headers.set('Access-Control-Expose-Headers', 'X-Request-Id, Server-Timing');
  // Lightweight timing log in response headers for basic observability
  const dur = Date.now() - start;
  res.headers.set('Server-Timing', `app;dur=${dur}`);
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};

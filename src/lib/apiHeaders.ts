import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';

// Centralized helper to attach common security + basic CORS headers.
// Adjust allowed origin via NEXT_PUBLIC_APP_ORIGIN or harden further per-route.
export function withCommonHeaders(res: NextResponse) {
  res.headers.set('Referrer-Policy', 'same-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export function preflightResponse() {
  return withCommonHeaders(new NextResponse(null, { status: 204 }));
}

// Extract or synthesize a request ID from headers
export function getRequestId(req: NextRequest) {
  return (
    req.headers.get('x-request-id') ||
    req.headers.get('cf-ray') ||
    req.headers.get('x-vercel-id') ||
    crypto.randomUUID()
  );
}

// Generate / validate ETag for JSON payloads to enable 304 responses.
export function respondWithJSONAndETag(req: NextRequest, data: any, init: ResponseInit = {}) {
  const body = JSON.stringify(data);
  const etagValue = 'W/"' + crypto.createHash('sha256').update(body).digest('base64url').slice(0, 16) + '"';
  const ifNoneMatch = req.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etagValue) {
    const notModified = new NextResponse(null, { status: 304 });
    notModified.headers.set('ETag', etagValue);
    return withCommonHeaders(notModified);
  }
  const res = new NextResponse(body, {
    ...init,
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {} as any),
      ETag: etagValue,
      'X-Response-Bytes': Buffer.byteLength(body).toString(),
    },
  });
  // Attach request id for correlation
  res.headers.set('X-Request-Id', getRequestId(req));
  return withCommonHeaders(res);
}

// Lightweight payload slimming helper: pass an array and select keys.
export function mapSelect<T extends Record<string, any>>(items: T[], allowed: (keyof T)[]): Partial<T>[] {
  return items.map(i => {
    const o: Partial<T> = {};
    for (const k of allowed) { o[k] = i[k]; }
    return o;
  });
}

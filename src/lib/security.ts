import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';

export function getAllowedOrigin(req?: NextRequest): string | null {
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || '';
  if (envOrigin) return envOrigin;
  // Fallback: reflect same origin for server-side requests if available
  const origin = req?.headers.get('origin');
  return origin || null;
}

export function isAllowedOrigin(req: NextRequest): boolean {
  const allowed = getAllowedOrigin(req);
  if (!allowed) return true; // if not configured, allow
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-CORS same-origin
  return origin === allowed;
}

export function createCsrfToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function setCsrfCookie(res: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    path: '/',
    httpOnly: false, // double-submit token must be readable by JS
    sameSite: 'lax',
    secure: isProd,
    maxAge: 60 * 60, // 1 hour
  });
  return res;
}

export function verifyCsrf(req: NextRequest): { ok: boolean; reason?: string } {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true };

  if (!isAllowedOrigin(req)) {
    return { ok: false, reason: 'Origin not allowed' };
  }
  const header = req.headers.get('x-csrf-token');
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!header || !cookie) {
    return { ok: false, reason: 'Missing CSRF token' };
  }
  if (header !== cookie) {
    return { ok: false, reason: 'Invalid CSRF token' };
  }
  return { ok: true };
}

// Basic HTML escaping to prevent XSS when storing/displaying user-provided strings.
export function escapeHTML(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Enforce JSON content type on state-changing requests
export function ensureJson(req: NextRequest): { ok: boolean; reason?: string } {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true };
  const ct = req.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return { ok: false, reason: 'Unsupported content-type, expected application/json' };
  }
  return { ok: true };
}

// Sanitize a single text field with basic trimming and HTML escaping; optional max length
export function sanitizeText(
  input: unknown,
  opts?: { trim?: boolean; escape?: boolean; maxLength?: number }
): string {
  const { trim = true, escape = true, maxLength } = opts || {};
  let s = typeof input === 'string' ? input : String(input ?? '');
  if (trim) s = s.trim();
  if (typeof maxLength === 'number' && maxLength > 0) s = s.slice(0, maxLength);
  return escape ? escapeHTML(s) : s;
}

// Sanitize an array of strings with per-item limits and optional overall cap
export function sanitizeStringArray(
  input: unknown,
  opts?: { itemMaxLength?: number; maxItems?: number; dedupe?: boolean }
): string[] {
  const { itemMaxLength = 100, maxItems = 100, dedupe = true } = opts || {};
  const arr = Array.isArray(input) ? input : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (out.length >= maxItems) break;
    const s = sanitizeText(item, { maxLength: itemMaxLength });
    if (!s) continue;
    if (dedupe) {
      if (seen.has(s)) continue;
      seen.add(s);
    }
    out.push(s);
  }
  return out;
}

// Return a shallow copy of obj with specific string keys sanitized
export function sanitizeObjectFields<T extends Record<string, any>>(
  obj: T,
  fields: Array<keyof T>,
  opts?: { trim?: boolean; escape?: boolean; maxLength?: number }
): T {
  const copy: any = { ...obj };
  for (const key of fields) {
    if (copy[key] == null) continue;
    copy[key] = sanitizeText(copy[key], opts);
  }
  return copy as T;
}

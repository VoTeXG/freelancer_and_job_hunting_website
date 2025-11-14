import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// --- apiFetch with automatic 401 refresh+retry logic ---
// Feature flag (client): set NEXT_PUBLIC_REQUIRE_CSRF=false to skip sending CSRF headers
const REQUIRE_CSRF = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_REQUIRE_CSRF !== 'false')
  : true;

let refreshPromise: Promise<void> | null = null;

function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find(c => c.startsWith(name + '='));
    if (!match) return null;
    return decodeURIComponent(match.split('=')[1] || '');
  } catch {
    return null;
  }
}

function getCsrfToken(): string | null {
  return getCookie('csrf_token');
}

async function refreshAccessToken(): Promise<void> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (REQUIRE_CSRF) {
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  let res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    // If CSRF missing, bootstrap via nonce and retry once (only when required)
    const text = await res.text().catch(() => '');
    const msg = (() => { try { return JSON.parse(text).error as string; } catch { return text; } })() || '';
    const missingCsrf = msg.toLowerCase().includes('csrf');
    if (missingCsrf && REQUIRE_CSRF) {
      try { await fetch('/api/auth/nonce', { credentials: 'include' }); } catch {}
      const headers2 = new Headers();
      headers2.set('Accept', 'application/json');
      headers2.set('Content-Type', 'application/json');
      if (REQUIRE_CSRF) {
        const csrf2 = getCsrfToken();
        if (csrf2) headers2.set('X-CSRF-Token', csrf2);
      }
      res = await fetch('/api/auth/refresh', { method: 'POST', headers: headers2, credentials: 'include' });
      if (res.ok) return;
    }
    // surface server error payload if any
    try {
      const data = text ? JSON.parse(text) : {};
      throw new Error(data.error || text || 'Failed to refresh session');
    } catch {
      throw new Error(text || 'Failed to refresh session');
    }
  }
}

function withCsrfAndJsonHeaders(init: RequestInit = {}): { headers: Headers; init: RequestInit } {
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (REQUIRE_CSRF) {
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  return { headers, init: { ...init, headers, credentials: 'include' as const } };
}

async function parseOkResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as unknown as T;
  const ctRaw = res.headers.get('Content-Type') || '';
  const ct = ctRaw.toLowerCase();
  // Guard: if the body starts with an HTML doctype or tag, treat as error (unexpected server-side HTML)
  if (ct.includes('application/json')) {
    const text = await res.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error('Server returned HTML instead of JSON');
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error('Invalid JSON response');
    }
  }
  // Attempt heuristic detection for HTML even if content-type misconfigured
  const peek = await res.text();
  if (peek.startsWith('<!DOCTYPE') || peek.startsWith('<html')) {
    throw new Error('Unexpected HTML response');
  }
  return peek as unknown as T;
}

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  try {
    const data = text ? JSON.parse(text) : {};
    throw new Error(data.error || text || `Request failed with ${res.status}`);
  } catch {
    throw new Error(text || `Request failed with ${res.status}`);
  }
}

// API fetch wrapper that adds JSON headers, CSRF header, and performs a one-time
// refresh-and-retry when receiving 401 due to expired access token.
export async function apiFetch<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  // Prevent recursive refresh on the refresh endpoint itself
  const isRefreshCall = typeof input === 'string' && input.includes('/api/auth/refresh');
  const originalBody = init.body;
  let didRetry = false;
  let didCsrfBootstrap = false;

  const doFetch = async (): Promise<Response> => {
    // Re-apply headers each attempt to include latest CSRF token
    const prepared = withCsrfAndJsonHeaders({ ...init, body: originalBody });
    return fetch(input, prepared.init);
  };

  let res = await doFetch();

  // If CSRF missing, bootstrap via nonce once and retry (only when required)
  if (res.status === 403 && !didCsrfBootstrap && REQUIRE_CSRF) {
    const text = await res.text().catch(() => '');
    const msg = (() => { try { return JSON.parse(text).error as string; } catch { return text; } })() || '';
    if (msg.toLowerCase().includes('csrf')) {
      didCsrfBootstrap = true;
      try { await fetch('/api/auth/nonce', { credentials: 'include' }); } catch {}
      res = await doFetch();
    } else {
      // put body text back for downstream error handling
      res = new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
    }
  }

  if (res.status === 401 && !didRetry && !isRefreshCall) {
    didRetry = true;
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      await refreshPromise;
      res = await doFetch();
    } catch (e) {
      // Refresh failed; bubble up original 401 error body if available
      // Fall through to error handling using the current response if not ok
    }
  }

  if (!res.ok) {
    return throwFromResponse(res);
  }

  try {
    return await parseOkResponse<T>(res);
  } catch (e: any) {
    // Wrap to provide endpoint context
    throw new Error(`${e.message} (while fetching ${typeof input === 'string' ? input : 'resource'})`);
  }
}

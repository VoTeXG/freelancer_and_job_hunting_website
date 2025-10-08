import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// --- apiFetch with automatic 401 refresh+retry logic ---

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
  const csrf = getCsrfToken();
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  let res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    // If CSRF missing, bootstrap via nonce and retry once
    const text = await res.text().catch(() => '');
    const msg = (() => { try { return JSON.parse(text).error as string; } catch { return text; } })() || '';
    const missingCsrf = msg.toLowerCase().includes('csrf');
    if (missingCsrf) {
      try { await fetch('/api/auth/nonce', { credentials: 'include' }); } catch {}
      const csrf2 = getCsrfToken();
      const headers2 = new Headers();
      headers2.set('Accept', 'application/json');
      headers2.set('Content-Type', 'application/json');
      if (csrf2) headers2.set('X-CSRF-Token', csrf2);
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
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  return { headers, init: { ...init, headers, credentials: 'include' as const } };
}

async function parseOkResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  const text = await res.text();
  // If non-JSON, return text as-is (caller can type as needed)
  return text as unknown as T;
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

  const doFetch = async (): Promise<Response> => {
    // Re-apply headers each attempt to include latest CSRF token
    const prepared = withCsrfAndJsonHeaders({ ...init, body: originalBody });
    return fetch(input, prepared.init);
  };

  let res = await doFetch();

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

  return parseOkResponse<T>(res);
}

import { NextRequest, NextResponse } from 'next/server';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { revokeRefreshToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

export async function POST(req: NextRequest) {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) {
    return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
  }
  const rt = req.cookies.get('refresh_token')?.value;
  if (rt) await revokeRefreshToken(rt);
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.set('session_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
  return withCommonHeaders(res);
}

import { NextRequest, NextResponse } from 'next/server';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { verifyCsrf, ensureJson } from '@/lib/security';
import { defaultScopes, generateAccessToken, rotateRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function OPTIONS() { return preflightResponse(); }

export async function POST(req: NextRequest) {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
  const ct = ensureJson(req);
  if (!ct.ok) return withCommonHeaders(NextResponse.json({ success: false, error: ct.reason }, { status: 415 }));

  const raw = req.cookies.get('refresh_token')?.value || (await req.json().catch(() => ({}))).refreshToken;
  if (!raw) return withCommonHeaders(NextResponse.json({ success: false, error: 'Missing refresh token' }, { status: 400 }));

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ua = req.headers.get('user-agent') || undefined;
  const rotated = await rotateRefreshToken(raw, { ip, userAgent: ua });
  if (!rotated) return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid or expired refresh token' }, { status: 401 }));

  // Load user to determine scopes
  const user = await prisma.user.findUnique({ where: { id: rotated.userId }, select: { id: true, username: true, userType: true } });
  if (!user) return withCommonHeaders(NextResponse.json({ success: false, error: 'User not found' }, { status: 404 }));

  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: defaultScopes(user.userType), typ: 'access' });
  const res = NextResponse.json({ success: true, token });
  res.cookies.set('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15, // 15 minutes typical
  });
  res.cookies.set('refresh_token', rotated.raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor((rotated.expiresAt.getTime() - Date.now()) / 1000),
  });
  return withCommonHeaders(res);
}

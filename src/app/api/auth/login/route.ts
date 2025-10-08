import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateAccessToken, defaultScopes, issueRefreshToken } from '@/lib/auth';
import { z } from 'zod';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { rateLimit } from '@/lib/rateLimit';
import { verifyCsrf, ensureJson } from '@/lib/security';
import '@/lib/env';

const LoginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(8),
});

export async function OPTIONS() { return preflightResponse(); }

export async function POST(req: NextRequest) {
  try {
    const csrf = verifyCsrf(req);
    if (!csrf.ok) {
      return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
    }
  const ct = ensureJson(req);
  if (!ct.ok) return withCommonHeaders(NextResponse.json({ success: false, error: ct.reason }, { status: 415 }));
    // Rate limit: 10 login attempts per 5 minutes per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Too many attempts, try again later' }, { status: 429 }));
    }
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 }));
    }
    const { emailOrUsername, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        userType: true,
        walletAddress: true,
        profile: { select: { avatar: true, rating: true, completedJobs: true } },
      },
    });

    if (!user || !user.password) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 }));
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 }));
    }

  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: defaultScopes(user.userType), typ: 'access' });
  const { raw: refreshRaw, expiresAt } = await issueRefreshToken(user.id, { userAgent: req.headers.get('user-agent') || undefined, ip });

    const { password: _pw, ...safeUser } = user;
    const res = NextResponse.json({ success: true, user: safeUser, token });
    res.cookies.set('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set('refresh_token', refreshRaw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    });
    return withCommonHeaders(res);
  } catch (e) {
    console.error('Login error', e);
    return withCommonHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateAccessToken, defaultScopes, withAdminScope } from '@/lib/auth';
import { z } from 'zod';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { rateLimit } from '@/lib/rateLimit';
import { verifyCsrf, ensureJson } from '@/lib/security';
import '@/lib/env';

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(100),
  userType: z.enum(['FREELANCER','CLIENT','BOTH']).optional(),
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
    // Rate limit: 5 registrations per hour per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `register:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Rate limit exceeded. Try later.' }, { status: 429 }));
    }
    const json = await req.json();
    const parsed = RegisterSchema.safeParse(json);
    if (!parsed.success) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 }));
    }
  const { email, username, password, userType } = parsed.data;

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { id: true } });
    if (existing) {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Email or username already taken' }, { status: 409 }));
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        userType: userType || 'FREELANCER',
        profile: { create: {} },
      },
      select: {
        id: true,
        username: true,
        email: true,
        userType: true,
        walletAddress: true,
        profile: { select: { avatar: true, rating: true, completedJobs: true } },
      },
    });

  // Apply admin scope if wallet allowlist OR explicit ADMIN username env override (dev convenience)
  const scopes = withAdminScope(defaultScopes(user.userType), user.walletAddress || (user.username.toLowerCase() === 'admin' ? undefined : undefined));
  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: scopes, typ: 'access' });
    const res = NextResponse.json({ success: true, user, token });
    res.cookies.set('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return withCommonHeaders(res);
  } catch (e) {
    console.error('Register error', e);
    return withCommonHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

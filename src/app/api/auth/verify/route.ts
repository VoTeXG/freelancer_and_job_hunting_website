import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, verifyWalletSignature, defaultScopes, issueRefreshToken, withAdminScope } from '@/lib/auth';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { verifyCsrf, ensureJson } from '@/lib/security';
import '@/lib/env';

export async function OPTIONS() { return preflightResponse(); }

export async function POST(request: NextRequest) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
    }
    const ct = ensureJson(request);
    if (!ct.ok) {
      return withCommonHeaders(NextResponse.json({ success: false, error: ct.reason }, { status: 415 }));
    }
    let parsedBody: any;
    try {
      parsedBody = await request.json();
    } catch {
      return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid or empty JSON body' }, { status: 400 }));
    }
    const { address, message, signature } = parsedBody || {};

    if (!address || !message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing address, message or signature' },
        { status: 400 }
      );
    }

    const nonce = request.cookies.get('siwe_nonce')?.value;
    const addrCookie = request.cookies.get('siwe_addr')?.value;

    if (!nonce) {
      return NextResponse.json(
        { success: false, error: 'Missing nonce cookie. Call /api/auth/nonce first.' },
        { status: 400 }
      );
    }

    const addrMatches = addrCookie ? addrCookie === address.toLowerCase() : true;
    const msgHasNonce = message.includes(nonce);
    const sigOk = verifyWalletSignature(message, signature, address);

    if (!addrMatches || !msgHasNonce || !sigOk) {
      return NextResponse.json(
        { success: false, error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Upsert user by wallet address if not existing
    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: {
        username: `user_${address.slice(2, 8)}`,
        email: `${address.toLowerCase()}@wallet.local`,
        walletAddress: address,
        userType: 'BOTH',
        profile: { create: {} },
      },
      select: {
        id: true,
        username: true,
        email: true,
        userType: true,
        walletAddress: true,
        profile: {
          select: {
            avatar: true,
            rating: true,
            completedJobs: true,
          },
        },
      },
    });

  const scopes = withAdminScope(defaultScopes(user.userType), user.walletAddress);
  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: scopes, typ: 'access' });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const { raw: refreshRaw, expiresAt } = await issueRefreshToken(user.id, { userAgent: request.headers.get('user-agent') || undefined, ip });

  const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletAddress: user.walletAddress,
        profile: user.profile,
      },
      token,
    });

    // Optional: set a session cookie for server-side usage
    res.cookies.set('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    if (refreshRaw && expiresAt) {
      res.cookies.set('refresh_token', refreshRaw, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      });
    }

    // Clear nonce to prevent replay
    res.cookies.set('siwe_nonce', '', { path: '/', maxAge: 0 });
    res.cookies.set('siwe_addr', '', { path: '/', maxAge: 0 });

  return withCommonHeaders(res);
  } catch (err) {
    console.error('SIWE verify error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

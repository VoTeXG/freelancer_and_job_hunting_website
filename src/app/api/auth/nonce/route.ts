import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/auth';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';
import { createCsrfToken, setCsrfCookie } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || '';

  const isValidAddress = address ? /^0x[a-fA-F0-9]{40}$/.test(address) : true;
  if (!isValidAddress) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const nonce = generateNonce();

  const res = NextResponse.json({ success: true, nonce });
  res.headers.set('Cache-Control', 'no-store');
  // Nonce must not be cached by browsers; allow short s-maxage at edge if desired
  res.headers.set('Cache-Control', 'no-store, max-age=0, s-maxage=0');
  res.cookies.set('siwe_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 5 * 60,
  });
  if (address) {
    res.cookies.set('siwe_addr', address.toLowerCase(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 5 * 60,
    });
  }
  // Also issue CSRF token for subsequent state-changing requests
  const csrf = createCsrfToken();
  setCsrfCookie(res, csrf);
  return withCommonHeaders(res);
}

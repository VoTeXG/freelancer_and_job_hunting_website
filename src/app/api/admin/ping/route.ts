import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';

export async function OPTIONS() { return preflightResponse(); }

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const token = request.cookies.get('session_token')?.value || (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined);
  if (!token) return withCommonHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));
  const access = verifyAccessToken(token);
  if (!access || !access.scope.includes('admin:all')) {
    return withCommonHeaders(NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }));
  }
  return withCommonHeaders(NextResponse.json({ success: true, message: 'admin-ok', user: { id: access.sub, username: access.usr } }));
}

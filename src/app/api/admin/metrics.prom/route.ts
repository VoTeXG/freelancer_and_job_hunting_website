import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { renderPrometheus } from '@/lib/metrics';
import { preflightResponse, withCommonHeaders } from '@/lib/apiHeaders';

export async function OPTIONS() { return preflightResponse(); }

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const token = authHeader.split(' ')[1];
    const access = verifyAccessToken(token);
    if (!access || !access.scope?.includes('admin:all')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = renderPrometheus();
    const res = new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/plain; version=0.0.4' } });
    return withCommonHeaders(res);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
}

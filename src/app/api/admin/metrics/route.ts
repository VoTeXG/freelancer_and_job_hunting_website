import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getMetricsSnapshot } from '@/lib/metrics';
import { withCommonHeaders, preflightResponse } from '@/lib/apiHeaders';

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
    const snapshot = getMetricsSnapshot();
    const res = NextResponse.json({ success: true, metrics: snapshot });
    return withCommonHeaders(res);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }
}
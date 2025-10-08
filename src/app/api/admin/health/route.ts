import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loggerWithRequest } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || undefined;
  const log = loggerWithRequest(requestId).child({ route: 'admin_health' });
  const started = Date.now();
  let dbOk = false;
  let migrationInfo: any = null;
  try {
    // Lightweight query
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    // Attempt to introspect _prisma_migrations table (optional)
    try {
      migrationInfo = await prisma.$queryRaw<any[]>`SELECT count(*)::int AS count FROM "_prisma_migrations"`;
    } catch {
      migrationInfo = null;
    }
  } catch (err: any) {
    log.error('health.db_error', { message: err?.message });
  }
  const uptimeSec = Math.floor(process.uptime());
  const body = {
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSec,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown',
    version: process.env.APP_VERSION || '0.1.0',
    db: { ok: dbOk, migrations: migrationInfo?.[0]?.count ?? null },
    requestId,
  };
  const res = NextResponse.json(body, { status: 200 });
  const dur = Date.now() - started;
  const existing = res.headers.get('Server-Timing');
  res.headers.set('Server-Timing', existing ? `${existing}, health;dur=${dur}` : `health;dur=${dur}`);
  log.info('health.ok', { dbOk, dur });
  return res;
}
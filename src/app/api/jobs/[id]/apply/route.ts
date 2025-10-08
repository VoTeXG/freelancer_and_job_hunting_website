import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';
import { preflightResponse, withCommonHeaders } from '@/lib/apiHeaders';
import { verifyCsrf, sanitizeText } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

// POST /api/jobs/:id/apply
// Body: { coverLetter: string, proposedRate?: number, estimatedDuration: string, portfolio?: string }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const csrf = verifyCsrf(request);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
  const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `apply:${ip}`, limit: 15, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      const access = verifyAccessToken(token);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:applications')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });
      userId = access.sub;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Ensure job exists & open
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, status: true, clientId: true, budgetAmount: true, budgetType: true } });
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (job.status !== 'OPEN') return NextResponse.json({ success: false, error: 'Job not open for applications' }, { status: 400 });
    if (job.clientId === userId) return NextResponse.json({ success: false, error: 'Cannot apply to own job' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const Schema = z.object({
      coverLetter: z.string().min(5).max(5000),
      proposedRate: z.number().positive().optional(),
      estimatedDuration: z.string().min(1).max(100),
      portfolio: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
  let { coverLetter, proposedRate, estimatedDuration, portfolio } = parsed.data as any;
  coverLetter = sanitizeText(coverLetter, { maxLength: 5000 });
  estimatedDuration = sanitizeText(estimatedDuration, { maxLength: 100 });
  if (typeof portfolio === 'string') portfolio = sanitizeText(portfolio, { maxLength: 2048, escape: false });

    // Duplicate check
    const existing = await prisma.application.findUnique({ where: { jobId_freelancerId: { jobId, freelancerId: userId } } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Already applied' }, { status: 409 });
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        freelancerId: userId,
  coverLetter,
        proposedRate: proposedRate ?? job.budgetAmount,
  estimatedDuration,
  portfolio,
      },
      include: {
        job: { select: { id: true } },
      },
    });

    const res = NextResponse.json({ success: true, application });
    return withCommonHeaders(res);
  } catch (error) {
    console.error('Apply error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/jobs/:id/apply -> edit own application
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const csrf = verifyCsrf(request);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const { id: jobId } = await params;
    if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `apply_edit:${ip}`, limit: 20, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    let userId: string;
    try {
      const access = verifyAccessToken(authHeader.split(' ')[1]);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:applications')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });
      userId = access.sub;
    } catch { return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 }); }

    // Parse body
    const Schema = z.object({
      coverLetter: z.string().min(5).max(5000).optional(),
      proposedRate: z.number().positive().optional(),
      estimatedDuration: z.string().min(1).max(100).optional(),
      portfolio: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    });
    const body = await request.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    // Ensure application exists and belongs to user
    const application = await prisma.application.findUnique({ where: { jobId_freelancerId: { jobId, freelancerId: userId } }, select: { id: true, status: true } });
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (application.status !== 'PENDING') return NextResponse.json({ success: false, error: 'Only pending applications can be edited' }, { status: 400 });

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        ...(parsed.data.coverLetter !== undefined ? { coverLetter: parsed.data.coverLetter } : {}),
        ...(parsed.data.proposedRate !== undefined ? { proposedRate: parsed.data.proposedRate } : {}),
        ...(parsed.data.estimatedDuration !== undefined ? { estimatedDuration: parsed.data.estimatedDuration } : {}),
        ...(parsed.data.portfolio !== undefined ? { portfolio: parsed.data.portfolio } : {}),
      },
    });

    const res = NextResponse.json({ success: true, application: updated });
    return withCommonHeaders(res);
  } catch (error) {
    console.error('Apply edit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/jobs/:id/apply -> withdraw own application
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const csrf = verifyCsrf(request);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const { id: jobId } = await params;
    if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `apply_withdraw:${ip}`, limit: 20, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    let userId: string;
    try {
      const access = verifyAccessToken(authHeader.split(' ')[1]);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:applications')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });
      userId = access.sub;
    } catch { return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 }); }

    // Ensure application exists and belongs to user
    const application = await prisma.application.findUnique({ where: { jobId_freelancerId: { jobId, freelancerId: userId } }, select: { id: true, status: true } });
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (application.status !== 'PENDING') return NextResponse.json({ success: false, error: 'Only pending applications can be withdrawn' }, { status: 400 });

    await prisma.application.delete({ where: { id: application.id } });
    const res = NextResponse.json({ success: true, message: 'Application withdrawn' });
    return withCommonHeaders(res);
  } catch (error) {
    console.error('Apply withdraw error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

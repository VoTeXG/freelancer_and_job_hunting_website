import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import { preflightResponse, withCommonHeaders } from '@/lib/apiHeaders';
import { verifyCsrf, ensureJson } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

// PATCH /api/jobs/:id/escrow
// Body: { action: 'retry' | 'mark_deployed' | 'fail' | 'release' | 'rollback_request' | 'rollback_confirm', onChainId?: number, milestoneIndex?: number, reason?: string }
const BodySchema = z.object({
  action: z.enum(['retry','mark_deployed','fail','release','rollback_request','rollback_confirm']),
  onChainId: z.number().int().optional(),
  milestoneIndex: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
    }
  const { id } = await params;
  const ct = ensureJson(request);
  if (!ct.ok) return withCommonHeaders(NextResponse.json({ success: false, error: ct.reason }, { status: 415 }));

    // Rate limit: 5 escrow mutations per 10 minutes per job
    const rl = rateLimit({ key: `escrow_mut:${id}`, limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    let clientId: string | null = null;
    try {
      const token = authHeader.split(' ')[1];
      const access = verifyAccessToken(token);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('escrow:manage')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope escrow:manage' }, { status: 403 });
      clientId = access.sub;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
  const { action, onChainId, reason } = parsed.data;

    // Ensure job belongs to caller
  const job = await (prisma.job as any).findUnique({ where: { id }, select: { clientId: true, useBlockchain: true, escrowPending: true, escrowDeployed: true, escrowDeploymentAttempts: true, escrowOnChainId: true, escrowRollbackRequested: true, escrowRollbackReason: true, escrowCancelledAt: true } });
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (job.clientId !== clientId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    if (!job.useBlockchain) return NextResponse.json({ success: false, error: 'Escrow not enabled for this job' }, { status: 400 });

    let updated;
    switch (action) {
      case 'retry': {
        // Increment attempts, mark pending again if not already deployed
  if ((job as any).escrowDeployed) {
          return NextResponse.json({ success: false, error: 'Escrow already deployed' }, { status: 400 });
        }
  updated = await (prisma.job as any).update({
          where: { id },
          data: {
            escrowPending: true,
            escrowDeploymentAttempts: { increment: 1 },
          },
          select: { id: true, escrowPending: true, escrowDeploymentAttempts: true },
        });
        break;
      }
      case 'mark_deployed': {
  if ((job as any).escrowDeployed) {
          return NextResponse.json({ success: true, job }, { status: 200 });
        }
  updated = await (prisma.job as any).update({
          where: { id },
          data: {
            escrowPending: false,
            escrowDeployed: true,
            escrowOnChainId: onChainId ?? null,
          },
          select: { id: true, escrowDeployed: true, escrowOnChainId: true },
        });
        break;
      }
      case 'fail': {
  if ((job as any).escrowDeployed) {
          return NextResponse.json({ success: false, error: 'Cannot mark failed after deployment' }, { status: 400 });
        }
  updated = await (prisma.job as any).update({
          where: { id },
          data: { escrowPending: false },
          select: { id: true, escrowPending: true },
        });
        break;
      }
      case 'release': {
        // Server-side validation + return on-chain escrowId; on-chain tx is executed from client wallet.
        if (!(job as any).escrowDeployed || (job as any).escrowOnChainId == null) {
          return NextResponse.json({ success: false, error: 'Escrow not deployed yet' }, { status: 400 });
        }
        const escrowId = Number((job as any).escrowOnChainId);
        const idx = (typeof (parsed.data as any).milestoneIndex === 'number') ? (parsed.data as any).milestoneIndex : undefined;
        const res = NextResponse.json({ success: true, action: 'release', escrowId, milestoneIndex: idx });
        return withCommonHeaders(res);
      }
      case 'rollback_request': {
        if ((job as any).escrowDeployed) {
          return NextResponse.json({ success: false, error: 'Cannot request rollback after deployment' }, { status: 400 });
        }
        updated = await (prisma.job as any).update({
          where: { id },
          data: { escrowRollbackRequested: true, escrowRollbackReason: reason || null },
          select: { id: true, escrowRollbackRequested: true, escrowRollbackReason: true }
        });
        break;
      }
      case 'rollback_confirm': {
        if (!(job as any).escrowRollbackRequested) {
          return NextResponse.json({ success: false, error: 'No rollback requested' }, { status: 400 });
        }
        if ((job as any).escrowDeployed) {
          return NextResponse.json({ success: false, error: 'Escrow already deployed; cannot cancel' }, { status: 400 });
        }
        updated = await (prisma.job as any).update({
          where: { id },
          data: { escrowPending: false, escrowRollbackRequested: false, escrowCancelledAt: new Date() },
          select: { id: true, escrowCancelledAt: true }
        });
        break;
      }
    }

    const res = NextResponse.json({ success: true, job: updated, action });
    return withCommonHeaders(res);
  } catch (err) {
    console.error('Escrow status update error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

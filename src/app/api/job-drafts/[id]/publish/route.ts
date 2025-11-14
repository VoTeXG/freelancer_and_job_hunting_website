import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';
import { JobCoreSchema } from '@/lib/validation/job';
import { preflightResponse } from '@/lib/apiHeaders';
import { verifyCsrf, ensureJson } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

// POST /api/job-drafts/:id/publish -> validate draft data, create Job, mark draft published (or delete)
type Params = { id: string };
export async function POST(req: NextRequest, context: { params: Promise<Params> }) {
  try {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
  const ct = ensureJson(req);
  if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });
  const auth = req.headers.get('authorization') || '';
  const token = req.cookies.get('session_token')?.value || (auth.startsWith('Bearer ') ? auth.split(' ')[1] : undefined);
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const access = verifyAccessToken(token);
  if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  if (!access.scope?.includes('write:jobs')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });

  const clientAny = prisma as any;
  const ctxParams = await context.params;
  const draft = await clientAny.jobDraft.findFirst({ where: { id: ctxParams.id, clientId: access.sub } });
    if (!draft) return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    if (draft.published) return NextResponse.json({ success: false, error: 'Already published' }, { status: 400 });

  // Support both legacy plain form draft.data and new structured { form, _fieldTs }
  const raw = draft.data as any || {};
  const data = raw.form && typeof raw.form === 'object' ? raw.form : raw;

    // Minimal validation similar to job create (subset); adapt for full validation
  const parsed = JobCoreSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Draft validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
  const { title, description, budgetAmount, budgetType, duration, skills, useBlockchain } = parsed.data as any;

    const job = await prisma.job.create({
      data: ({
        title,
        description,
  clientId: access.sub,
        budgetAmount: Number(budgetAmount),
        budgetType: budgetType,
        currency: (parsed.data as any).currency || 'USD',
        duration,
        deadline: (parsed.data as any).deadline ? new Date((parsed.data as any).deadline) : null,
        skills: Array.isArray(skills) ? skills : [],
        requirements: Array.isArray((parsed.data as any).requirements) ? (parsed.data as any).requirements : [],
        useBlockchain: !!useBlockchain,
        escrowDeployed: false,
        escrowPending: !!useBlockchain,
        escrowDeploymentAttempts: 0,
      }) as any,
      include: { client: { include: { profile: true } } }
    });

  await clientAny.jobDraft.update({ where: { id: ctxParams.id }, data: { published: true } });

    return NextResponse.json({ success: true, job, draftId: draft.id });
  } catch (e) {
    console.error('Publish draft error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

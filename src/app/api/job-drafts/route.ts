import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import { preflightResponse, withCommonHeaders, respondWithJSONAndETag } from '@/lib/apiHeaders';
import { verifyCsrf, sanitizeText, sanitizeStringArray } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

// GET /api/job-drafts -> list current user's drafts (paginated)
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const token = auth.split(' ')[1];
  const access = verifyAccessToken(token);
  if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  if (!access.scope?.includes('write:jobs')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));
    const skip = (page - 1) * limit;

    const clientAny = prisma as any;
    const [drafts, total] = await Promise.all([
      clientAny.jobDraft.findMany({
        where: { clientId: access.sub },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
  clientAny.jobDraft.count({ where: { clientId: access.sub } })
    ]);

    return respondWithJSONAndETag(req, { success: true, drafts, pagination: { page, limit, total } });
  } catch (e) {
    console.error('List drafts error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

const DraftUpsertSchema = z.object({
  id: z.string().cuid().optional(),
  data: z.record(z.any()).refine(v => Object.keys(v).length > 0, 'Draft data required'),
  published: z.boolean().optional()
});

// POST /api/job-drafts -> create or update (id optional). For updates prefer PUT /api/job-drafts/:id but allow upsert convenience.
export async function POST(req: NextRequest) {
  try {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    // Rate limit: 30 writes per hour per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `draft_upsert:${ip}`, limit: 30, windowMs: 60*60*1000 });
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });

    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const token = auth.split(' ')[1];
  const access = verifyAccessToken(token);
  if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  if (!access.scope?.includes('write:jobs')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });

    const json = await req.json().catch(() => ({}));
    const parsed = DraftUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    let { id, data, published } = parsed.data as any;
    // Normalize: if not already having 'form' key, wrap into { form, _fieldTs?: {} }
    if (data && !data.form) {
      data = { form: data, _fieldTs: data._fieldTs || {} };
    }
    // Best-effort sanitization of common text fields in draft.form
    try {
      const form = data?.form || {};
      if (typeof form.title !== 'undefined') form.title = sanitizeText(form.title, { maxLength: 140 });
      if (typeof form.description !== 'undefined') form.description = sanitizeText(form.description, { maxLength: 20000 });
      if (typeof form.duration !== 'undefined') form.duration = sanitizeText(form.duration, { maxLength: 100 });
      if (Array.isArray(form.skills)) form.skills = sanitizeStringArray(form.skills, { itemMaxLength: 40, maxItems: 50 });
      data.form = form;
    } catch {}
    const clientAny2 = prisma as any;
    let draft;
    if (id) {
  draft = await clientAny2.jobDraft.update({ where: { id }, data: { data, published: published ?? false } });
    } else {
      draft = await clientAny2.jobDraft.create({
        data: { clientId: access.sub, data, published: published ?? false }
      });
    }

    return NextResponse.json({ success: true, draft });
  } catch (e) {
    console.error('Upsert draft error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

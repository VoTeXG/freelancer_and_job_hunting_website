import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';
import { preflightResponse } from '@/lib/apiHeaders';
import { verifyCsrf, sanitizeText, sanitizeStringArray } from '@/lib/security';

export async function OPTIONS() { return preflightResponse(); }

function authUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const access = verifyAccessToken(auth.split(' ')[1]);
    if (!access) return null;
    if (!access.scope?.includes('write:jobs')) return null;
    return { userId: access.sub } as any;
  } catch {
    return null;
  }
}

// GET /api/job-drafts/:id -> fetch single draft
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = authUser(req);
    if (!decoded?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const clientAny = prisma as any;
  const p = await params;
  const draft = await clientAny.jobDraft.findFirst({ where: { id: p.id, clientId: decoded.userId } });
    if (!draft) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, draft });
  } catch (e) {
    console.error('Get draft error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

const DraftUpdateSchema = z.object({
  data: z.record(z.any()).optional(),
  published: z.boolean().optional()
}).refine(v => v.data || typeof v.published === 'boolean', 'Nothing to update');

// PUT /api/job-drafts/:id -> update draft
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const decoded = authUser(req);
    if (!decoded?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const parsed = DraftUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const clientAny = prisma as any;
  const p = await params;
  const existing = await clientAny.jobDraft.findFirst({ where: { id: p.id, clientId: decoded.userId } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    // Sanitize if data.form present
    const updateData: any = { ...parsed.data };
    try {
      const form = updateData?.data?.form;
      if (form) {
        if (typeof form.title !== 'undefined') form.title = sanitizeText(form.title, { maxLength: 140 });
        if (typeof form.description !== 'undefined') form.description = sanitizeText(form.description, { maxLength: 20000 });
        if (typeof form.duration !== 'undefined') form.duration = sanitizeText(form.duration, { maxLength: 100 });
        if (Array.isArray(form.skills)) form.skills = sanitizeStringArray(form.skills, { itemMaxLength: 40, maxItems: 50 });
        updateData.data.form = form;
      }
    } catch {}
    const draft = await clientAny.jobDraft.update({ where: { id: p.id }, data: updateData });
    return NextResponse.json({ success: true, draft });
  } catch (e) {
    console.error('Update draft error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/job-drafts/:id -> remove draft
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const csrf = verifyCsrf(req);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const decoded = authUser(req);
    if (!decoded?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const clientAny = prisma as any;
  const p = await params;
  const existing = await clientAny.jobDraft.findFirst({ where: { id: p.id, clientId: decoded.userId } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  await clientAny.jobDraft.delete({ where: { id: p.id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (e) {
    console.error('Delete draft error', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

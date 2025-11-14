import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import '@/lib/env';
import { withCommonHeaders, preflightResponse, respondWithJSONAndETag } from '@/lib/apiHeaders';
import { ensureJson, verifyCsrf, sanitizeText, sanitizeStringArray } from '@/lib/security';
import { z } from 'zod';
import { bumpVersion } from '@/lib/cache';

export async function OPTIONS() { return preflightResponse(); }

// GET /api/jobs/:id -> fetch single job
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: ({
        id: true,
        title: true,
        description: true,
        budgetAmount: true,
        budgetType: true,
        currency: true,
        duration: true,
        deadline: true,
        skills: true,
        requirements: true,
        status: true,
        createdAt: true,
        useBlockchain: true,
        escrowDeployed: true,
        escrowPending: true,
        escrowDeploymentAttempts: true,
        escrowOnChainId: true,
        client: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
            profile: { select: { companyName: true, rating: true, completedJobs: true } },
          },
        },
        applications: {
          select: {
            id: true,
            coverLetter: true,
            proposedRate: true,
            estimatedDuration: true,
            portfolio: true,
            status: true,
            appliedAt: true,
            freelancer: {
              select: {
                id: true,
                username: true,
                profile: { select: { skills: true, hourlyRate: true, rating: true, completedJobs: true } },
              },
            },
          },
        },
      }) as any,
    });
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    return respondWithJSONAndETag(_request, { success: true, job }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs/:id -> submit application (legacy endpoint retained)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const ct = ensureJson(request);
    if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });

    // Rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `job_apply:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });

    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  const access = verifyAccessToken(token);
  if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  if (!access.scope?.includes('write:applications')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });

    const { id: jobId } = await params;
    const { coverLetter, proposedRate, estimatedDuration, portfolio } = await request.json();
    if (!coverLetter || !proposedRate || !estimatedDuration) return NextResponse.json({ success: false, error: 'Missing required application fields' }, { status: 400 });

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (job.status !== 'OPEN') return NextResponse.json({ success: false, error: 'Job is no longer accepting applications' }, { status: 400 });

    // Unique on [jobId, freelancerId]
    const application = await prisma.application.create({
      data: {
        jobId,
  freelancerId: access.sub,
        coverLetter,
        proposedRate: parseFloat(proposedRate),
        estimatedDuration,
        portfolio: portfolio ?? null,
        status: 'PENDING',
      },
    });

    const res = NextResponse.json({ success: true, message: 'Application submitted successfully', application });
    return withCommonHeaders(res);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'You have already applied to this job' }, { status: 400 });
    }
    console.error('Job application error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/jobs/:id -> update own job (client only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const ct = ensureJson(request);
    if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let clientId: string;
    try {
      const access = verifyAccessToken(token);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:jobs')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });
      clientId = access.sub;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    // Ensure job exists and belongs to client
    const existing = await prisma.job.findFirst({ where: { id, clientId }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Job not found or access denied' }, { status: 404 });

    const UpdateSchema = z.object({
      title: z.string().min(3).max(140).optional(),
      description: z.string().min(10).max(20000).optional(),
      budgetAmount: z.union([z.number(), z.string()]).transform(v => Number(v)).optional(),
      budgetType: z.enum(['FIXED','HOURLY','fixed','hourly']).transform(v => v.toString().toUpperCase()).optional(),
      currency: z.string().max(10).optional(),
      duration: z.string().min(1).max(100).optional(),
      deadline: z.string().datetime().optional().or(z.string().optional()),
      skills: z.array(z.string()).max(50).optional(),
      requirements: z.array(z.string()).max(100).optional(),
      // Allow limited status transitions for clients
      status: z.enum(['OPEN','CANCELLED']).optional(),
    }).strip();

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const dataIn = parsed.data as any;
    const updateData: any = {};
    if (dataIn.title !== undefined) updateData.title = sanitizeText(dataIn.title, { maxLength: 140 });
    if (dataIn.description !== undefined) updateData.description = sanitizeText(dataIn.description, { maxLength: 20000 });
    if (dataIn.budgetAmount !== undefined) updateData.budgetAmount = Number(dataIn.budgetAmount);
    if (dataIn.budgetType !== undefined) updateData.budgetType = (dataIn.budgetType as string).toUpperCase();
    if (dataIn.currency !== undefined) updateData.currency = sanitizeText(dataIn.currency, { maxLength: 10 });
    if (dataIn.duration !== undefined) updateData.duration = sanitizeText(dataIn.duration, { maxLength: 100 });
    if (dataIn.deadline !== undefined) updateData.deadline = dataIn.deadline ? new Date(dataIn.deadline) : null;
    if (dataIn.skills !== undefined) updateData.skills = sanitizeStringArray(dataIn.skills, { itemMaxLength: 40, maxItems: 50 });
    if (dataIn.requirements !== undefined) updateData.requirements = sanitizeStringArray(dataIn.requirements, { itemMaxLength: 100, maxItems: 100 });
    if (dataIn.status !== undefined) updateData.status = dataIn.status;

    const job = await prisma.job.update({ where: { id }, data: updateData, select: { id: true, title: true, status: true, updatedAt: true } });
    // Invalidate public jobs list cache
    bumpVersion('jobs_list').catch(() => {});
    return NextResponse.json({ success: true, job, message: 'Job updated successfully' });
  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/jobs/:id -> delete own job (client only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    let clientId: string;
    try {
      const access = verifyAccessToken(token);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:jobs')) return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });
      clientId = access.sub;
    } catch { return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 }); }

    const { id } = await params;
    const job = await prisma.job.findFirst({ where: { id, clientId }, select: { id: true, status: true } });
    if (!job) return NextResponse.json({ success: false, error: 'Job not found or access denied' }, { status: 404 });
    // Only allow deletion if not in progress or completed
    if (job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Cannot delete a job that is in progress or completed' }, { status: 400 });
    }

    await prisma.job.delete({ where: { id } });
    bumpVersion('jobs_list').catch(() => {});
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Job delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

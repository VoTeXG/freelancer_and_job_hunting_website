import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import '@/lib/env';
import { withCommonHeaders, preflightResponse, respondWithJSONAndETag } from '@/lib/apiHeaders';
import { ensureJson, verifyCsrf } from '@/lib/security';

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
// temporarily disabled for typecheck
export {};

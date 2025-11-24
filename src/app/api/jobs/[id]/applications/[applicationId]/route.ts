import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCsrf, ensureJson } from '@/lib/security';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/jobs/:id/applications/:applicationId -> fetch application detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { id: jobId, applicationId } = await params;
    const application = await prisma.application.findFirst({
      where: { id: applicationId, jobId },
      select: {
        id: true,
        coverLetter: true,
        proposedRate: true,
        estimatedDuration: true,
        portfolio: true,
        status: true,
        appliedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            budgetAmount: true,
            budgetType: true,
            currency: true,
            duration: true,
            status: true,
            client: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        freelancer: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
            profile: {
              select: {
                skills: true,
                hourlyRate: true,
                rating: true,
                completedJobs: true,
                totalEarnings: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Application fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Accept or reject an application for a job (client-only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    }
  const ct = ensureJson(request);
  if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });
    const { action } = await request.json();
    const { id: jobId, applicationId } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    let clientId: string | undefined;
    try {
      const access = verifyAccessToken(token);
      if (!access) throw new Error('Invalid token');
      if (!access.scope?.includes('write:applications')) {
        return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });
      }
      clientId = access.sub;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate action
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Ensure the job exists and belongs to the authenticated client
    const job = await prisma.job.findFirst({
      where: { id: jobId, clientId },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Ensure the application exists and belongs to this job
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, jobId: true, status: true },
    });

    if (!application || application.jobId !== jobId) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (action === 'accept') {
      // Accept this application, reject other pending ones, move job to IN_PROGRESS
      await prisma.$transaction([
        prisma.application.update({
          where: { id: applicationId },
          data: { status: 'ACCEPTED' },
        }),
        prisma.application.updateMany({
          where: { jobId, NOT: { id: applicationId }, status: 'PENDING' },
          data: { status: 'REJECTED' },
        }),
        prisma.job.update({ where: { id: jobId }, data: { status: 'IN_PROGRESS' } }),
      ]);
    } else {
      // Reject just this application
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'REJECTED' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

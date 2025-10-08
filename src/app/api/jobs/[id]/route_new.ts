import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCsrf, ensureJson, sanitizeText } from '@/lib/security';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            profile: true,
          },
        },
        applications: {
          include: {
            freelancer: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });

  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    }
    const ct = ensureJson(request);
    if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const access = verifyAccessToken(token);
      if (!access) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      if (!access.scope?.includes('write:applications')) {
        return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:applications' }, { status: 403 });
      }
      const freelancerId = access.sub;
      const applicationData = await request.json();

      // Validate required fields
  let { coverLetter, proposedRate, estimatedDuration } = applicationData as any;
  coverLetter = sanitizeText(coverLetter, { maxLength: 5000 });
  estimatedDuration = sanitizeText(estimatedDuration, { maxLength: 100 });
      
      if (!coverLetter || !proposedRate || !estimatedDuration) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if job exists and is open
      const { id } = await params;
      const job = await prisma.job.findUnique({
        where: { id },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      if (job.status !== 'OPEN') {
        return NextResponse.json(
          { success: false, error: 'Job is no longer accepting applications' },
          { status: 400 }
        );
      }

      // Check if user already applied
  const existingApplication = await prisma.application.findUnique({
        where: {
          jobId_freelancerId: {
    jobId: id,
            freelancerId,
          },
        },
      });

      if (existingApplication) {
        return NextResponse.json(
          { success: false, error: 'You have already applied to this job' },
          { status: 409 }
        );
      }

      // Create application
    const application = await prisma.application.create({
        data: {
      jobId: id,
          freelancerId,
          coverLetter,
          proposedRate: parseFloat(proposedRate),
          estimatedDuration,
          portfolio: applicationData.portfolio || null,
        },
        include: {
          freelancer: {
            include: {
              profile: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        application,
        message: 'Application submitted successfully',
      });

    } catch (tokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Application error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

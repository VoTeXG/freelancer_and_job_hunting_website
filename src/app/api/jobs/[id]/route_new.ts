import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = verifyToken(token) as any;
      const freelancerId = decoded.userId;
      const applicationData = await request.json();

      // Validate required fields
      const { coverLetter, proposedRate, estimatedDuration } = applicationData;
      
      if (!coverLetter || !proposedRate || !estimatedDuration) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if job exists and is open
      const job = await prisma.job.findUnique({
        where: { id: params.id },
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
            jobId: params.id,
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
          jobId: params.id,
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

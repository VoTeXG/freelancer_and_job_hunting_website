import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Get a specific job by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const job = await Job.findById(params.id)
      .populate('clientId', 'username reputation completedJobs companyName profilePicture')
      .populate('applicants.freelancerId', 'username reputation skills profilePicture')
      .select('-__v');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply to a job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { coverLetter, proposedRate, estimatedDuration } = await request.json();

    if (!coverLetter || !proposedRate || !estimatedDuration) {
      return NextResponse.json(
        { error: 'Missing required application fields' },
        { status: 400 }
      );
    }

    const job = await Job.findById(params.id);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'open') {
      return NextResponse.json(
        { error: 'Job is no longer accepting applications' },
        { status: 400 }
      );
    }

    // Check if user already applied
    const existingApplication = job.applicants.find(
      (app: any) => app.freelancerId.toString() === decoded.userId
    );

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      );
    }

    // Add application
    job.applicants.push({
      freelancerId: decoded.userId,
      coverLetter,
      proposedRate,
      estimatedDuration,
      status: 'pending',
      appliedAt: new Date(),
    });

    await job.save();

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
    });

  } catch (error) {
    console.error('Job application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

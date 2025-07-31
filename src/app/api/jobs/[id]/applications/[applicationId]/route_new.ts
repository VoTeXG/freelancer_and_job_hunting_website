import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; applicationId: string } }
) {
  try {
    const { action } = await request.json();
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
      const clientId = decoded.userId;

      // Find the job and verify ownership
      const job = await prisma.job.findFirst({
        where: {
          id: params.id,
          clientId: clientId,
        },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found or access denied' },
          { status: 404 }
        );
      }

      // Validate action
      if (!['accept', 'reject'].includes(action)) {
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
      }

      // Find and update the application
      const application = await prisma.application.findUnique({
        where: { id: params.applicationId },
      });

      if (!application || application.jobId !== params.id) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }

      // Update application status
      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
      
      await prisma.application.update({
        where: { id: params.applicationId },
        data: { status: newStatus },
      });

      // If accepting an application, optionally reject all others and update job status
      if (action === 'accept') {
        // Reject other pending applications
        await prisma.application.updateMany({
          where: {
            jobId: params.id,
            id: { not: params.applicationId },
            status: 'PENDING',
          },
          data: { status: 'REJECTED' },
        });
        
        // Update job status to in progress
        await prisma.job.update({
          where: { id: params.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Application ${action}ed successfully`,
      });

    } catch (tokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; applicationId: string } }
) {
  try {
    await connectDB();

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
      const decoded = verifyToken(token);
      const clientId = decoded.userId;

      // Find the job and verify ownership
      const job = await Job.findOne({ 
        _id: params.id, 
        clientId: clientId 
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
      const applicationIndex = job.applicants.findIndex(
        (app: any) => app._id.toString() === params.applicationId
      );

      if (applicationIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }

      // Update application status
      job.applicants[applicationIndex].status = action === 'accept' ? 'accepted' : 'rejected';

      // If accepting an application, you might want to reject all others
      if (action === 'accept') {
        job.applicants.forEach((app: any, index: number) => {
          if (index !== applicationIndex && app.status === 'pending') {
            app.status = 'rejected';
          }
        });
        
        // Optionally update job status to 'in-progress' or 'assigned'
        job.status = 'in-progress';
      }

      await job.save();

      return NextResponse.json({
        success: true,
        message: `Application ${action}ed successfully`
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

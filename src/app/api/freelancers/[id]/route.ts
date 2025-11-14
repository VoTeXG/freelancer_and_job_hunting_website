import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respondWithJSONAndETag, preflightResponse } from '@/lib/apiHeaders';

export async function OPTIONS() { return preflightResponse(); }

// GET /api/freelancers/:id -> single freelancer detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: 'Freelancer ID required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            title: true,
            bio: true,
            skills: true,
            hourlyRate: true,
            experience: true,
            rating: true,
            completedJobs: true,
            avatar: true,
            portfolio: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Freelancer not found' }, { status: 404 });
    }

    // Map to UI shape expected by freelancer detail page
    const portfolioArray: string[] = Array.isArray(user.profile?.portfolio) ? user.profile!.portfolio : [];
    const portfolio = portfolioArray.map((url, idx) => ({ id: `${user.id}-p-${idx}`, title: `Project ${idx + 1}`, description: '', image: url }));

    const freelancer = {
      id: user.id,
      walletAddress: user.walletAddress || '',
      username: user.username,
      isFreelancer: true,
      isClient: user.userType === 'BOTH',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      reputation: user.profile?.rating || 0,
      completedJobs: user.profile?.completedJobs || 0,
      skills: user.profile?.skills || [],
      hourlyRate: user.profile?.hourlyRate || 0,
      title: user.profile?.title || 'Freelancer',
      description: user.profile?.bio || '',
      portfolio,
      availability: 'available',
      languages: [] as string[],
      experience: user.profile?.experience || 0,
      certifications: [] as Array<{ id: string; name: string; issuer?: string }>,
      profilePicture: user.profile?.avatar || '/default-avatar.png',
    };

    return respondWithJSONAndETag(request, { success: true, freelancer }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (error) {
    console.error('Freelancer detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

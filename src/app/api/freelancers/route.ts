import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respondWithJSONAndETag, preflightResponse } from '@/lib/apiHeaders';

export async function OPTIONS() { return preflightResponse(); }

// GET /api/freelancers
// Query params:
// page, limit, search, skills (comma list), minRate, maxRate, minExperience, minRating, sort=rating|rate|experience|recent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')));
    const search = (searchParams.get('search') || '').trim();
    const skillsParam = (searchParams.get('skills') || '').trim();
    const minRate = searchParams.get('minRate');
    const maxRate = searchParams.get('maxRate');
    const minExperience = searchParams.get('minExperience');
    const minRating = searchParams.get('minRating');
  const sort = (searchParams.get('sort') || 'rating').toLowerCase();
  const selectMode = (searchParams.get('select') || '').toLowerCase(); // '' | 'basic'

    const where: any = {
      OR: [
        { userType: 'FREELANCER' },
        { userType: 'BOTH' },
      ],
      profile: { is: {} }, // require users with a profile
    };

    const profileFilters: any = {};

    if (skillsParam) {
      const skillList = skillsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length) profileFilters.skills = { hasSome: skillList };
    }
    if (minRate || maxRate) {
      profileFilters.hourlyRate = {};
      if (minRate) profileFilters.hourlyRate.gte = parseFloat(minRate);
      if (maxRate) profileFilters.hourlyRate.lte = parseFloat(maxRate);
    }
    if (minExperience) profileFilters.experience = { gte: parseInt(minExperience) };
    if (minRating) profileFilters.rating = { gte: parseFloat(minRating) };

  if (Object.keys(profileFilters).length) where.profile = { is: { ...profileFilters } };

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { profile: { title: { contains: search, mode: 'insensitive' } } },
          { profile: { bio: { contains: search, mode: 'insensitive' } } },
          { profile: { skills: { has: search } } },
        ],
      });
    }

    const skip = (page - 1) * limit;

    // Prefer indexed columns for sorting to reduce sort cost
    const orderBy = (() => {
      switch (sort) {
        case 'rate': return { profile: { hourlyRate: 'asc' } } as const;
        case 'experience': return { profile: { experience: 'desc' } } as const;
        case 'recent': return { createdAt: 'desc' } as const;
        default: return { profile: { rating: 'desc' } } as const; // rating
      }
    })();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          walletAddress: true,
          createdAt: true,
          updatedAt: true,
          userType: true,
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
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const freelancersFull = users.map(u => ({
      id: u.id,
      walletAddress: u.walletAddress || '',
      username: u.username,
      isFreelancer: true,
      isClient: u.userType === 'BOTH',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      reputation: u.profile?.rating || 0,
      completedJobs: u.profile?.completedJobs || 0,
      skills: u.profile?.skills || [],
      hourlyRate: u.profile?.hourlyRate || 0,
      title: u.profile?.title || 'Freelancer',
      description: u.profile?.bio || '',
      portfolio: [],
      availability: 'available',
      languages: [],
      experience: u.profile?.experience || 0,
      certifications: [],
      profilePicture: u.profile?.avatar || '/default-avatar.png',
    }));
    const freelancers = selectMode === 'basic'
      ? freelancersFull.map(f => ({ id: f.id, username: f.username, title: f.title, reputation: f.reputation, hourlyRate: f.hourlyRate, skills: f.skills.slice(0,5), profilePicture: f.profilePicture }))
      : freelancersFull;

    const totalPages = Math.ceil(total / limit);

    return respondWithJSONAndETag(request, {
      success: true,
      freelancers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      meta: { mode: selectMode || 'full' }
    }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (error) {
    console.error('Freelancers fetch error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500 });
  }
}

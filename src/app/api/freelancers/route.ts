import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respondWithJSONAndETag, preflightResponse } from '@/lib/apiHeaders';
import { cacheJSON } from '@/lib/cache';
import { withLatency } from '@/lib/metrics';
import { ServerTiming, withTiming } from '@/lib/serverTiming';

export async function OPTIONS() { return preflightResponse(); }

// GET /api/freelancers
// Query params:
// page, limit, search, skills (comma list), minRate, maxRate, minExperience, minRating, sort=rating|rate|experience|recent
export async function GET(request: NextRequest) {
  return withLatency('api.freelancers.list', async () => {
    const timing = new ServerTiming();
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
      // For 1:1 relation filters on profile, use `is: { ... }` to target related fields
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { profile: { is: { title: { contains: search, mode: 'insensitive' } } } },
          { profile: { is: { bio: { contains: search, mode: 'insensitive' } } } },
          { profile: { is: { skills: { has: search } } } },
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

    const cacheEligible = selectMode !== 'basic';
    const cacheKeyObj = { page, limit, search, skillsParam, sort, minRate, maxRate, minExperience, minRating };
    const cacheKey = Buffer.from(JSON.stringify(cacheKeyObj)).toString('base64url');

    const fetchUsers = () => withTiming(timing, 'db_users', () => prisma.user.findMany({
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
    }) as any);

    let usersRaw: any[] = [];
    let total = 0; let cacheHit = false;
    if (cacheEligible) {
      const { value, hit } = await cacheJSON('freelancers', cacheKey, {
        versionNs: 'freelancers_list',
        ttlSeconds: 30,
        timing,
        build: async () => {
          const [ur, cnt] = await Promise.all([
            fetchUsers(),
            withTiming(timing, 'db_count', () => prisma.user.count({ where }))
          ]);
          return { ur, cnt };
        }
      });
      usersRaw = value.ur as any[]; total = Number(value.cnt as any); cacheHit = hit;
    } else {
      const [ur, cnt] = await Promise.all([
        fetchUsers(),
        withTiming(timing, 'db_count', () => prisma.user.count({ where }))
      ]);
      usersRaw = ur as any[]; total = Number(cnt as any);
    }

    const freelancersFull = (usersRaw as Array<{
      id: string; username: string; walletAddress?: string | null; createdAt: Date; updatedAt: Date; userType: string;
      profile?: { title?: string | null; bio?: string | null; skills?: string[] | null; hourlyRate?: number | null; experience?: number | null; rating?: number | null; completedJobs?: number | null; avatar?: string | null } | null;
    }>).map(u => ({
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

    const response = respondWithJSONAndETag(request, {
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
    if (cacheEligible) response.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    const existing = response.headers.get('Server-Timing');
    response.headers.set('Server-Timing', timing.mergeInto(existing));
    return response;
  } catch (error) {
    console.error('Freelancers fetch error:', error);
    // Ensure API returns a proper JSON response with ETag and Server-Timing even on errors
    const errorResponse = respondWithJSONAndETag(request, { success: false, error: 'Internal server error' }, { status: 500 });
    const existing = errorResponse.headers.get('Server-Timing');
    errorResponse.headers.set('Server-Timing', timing.mergeInto(existing));
    return errorResponse;
  }
  });
}

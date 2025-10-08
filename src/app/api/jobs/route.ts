import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BudgetType } from '@prisma/client';
import { verifyAccessToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import { JobCoreSchema } from '@/lib/validation/job';
import { withCommonHeaders, preflightResponse, respondWithJSONAndETag } from '@/lib/apiHeaders';
import { verifyCsrf, sanitizeText, sanitizeStringArray, ensureJson } from '@/lib/security';
import { loggerWithRequest } from '@/lib/logger';
import { ServerTiming, withTiming } from '@/lib/timing';
import { recordEvent } from '@/lib/analytics';

export async function OPTIONS() { return preflightResponse(); }

// Get all jobs with filtering and pagination
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || undefined;
  const log = loggerWithRequest(requestId).child({ route: 'jobs_list' });
  const timing = new ServerTiming();
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
  const budgetType = searchParams.get('budgetType') || '';
  const sort = (searchParams.get('sort') || 'recent').toLowerCase();
  const skillsParam = searchParams.get('skills') || '';
  const selectMode = (searchParams.get('select') || '').toLowerCase(); // '' | 'basic'
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const clientOnly = searchParams.get('clientOnly') === 'true';
    
    // Build where clause
    const where: any = {
      status: 'OPEN',
    };

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add budget type filter
    if (budgetType && (budgetType === 'FIXED' || budgetType === 'HOURLY')) {
      where.budgetType = budgetType;
    }

    // Skills filter (comma separated list) - match any of the provided skills
    if (skillsParam) {
      const skillList = skillsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        where.skills = { hasSome: skillList };
      }
    }

    // Add budget range filter
    if (minBudget || maxBudget) {
      where.budgetAmount = {};
      if (minBudget) {
        where.budgetAmount.gte = parseFloat(minBudget);
      }
      if (maxBudget) {
        where.budgetAmount.lte = parseFloat(maxBudget);
      }
    }

    // For client dashboard - filter by client ID
    if (clientOnly) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const access = verifyAccessToken(token);
          if (!access) throw new Error('invalid');
          where.clientId = access.sub;
          delete where.status; // Show all statuses for client's own jobs
        } catch (error) {
          return NextResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 401 }
          );
        }
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const jobsPromise = withTiming(timing, 'db_jobs', () => prisma.job.findMany({
        where,
        // Cast to any to allow newly migrated escrow fields while TS JobSelect not yet reflecting them (editor cache issue)
        select: ({
          id: true,
          title: true,
          description: true,
          budgetAmount: true,
          budgetType: true,
          currency: true,
          duration: true,
          skills: true,
          status: true,
          createdAt: true,
          deadline: true,
          useBlockchain: true,
          escrowDeployed: true,
          escrowPending: true,
          escrowDeploymentAttempts: true,
          escrowOnChainId: true,
          client: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  rating: true,
                  completedJobs: true,
                },
              },
            },
          },
          _count: { select: { applications: true } },
        }) as any,
        orderBy: (() => {
          switch (sort) {
            case 'budget':
              return { budgetAmount: 'desc' } as const;
            case 'deadline':
              return { deadline: 'asc' } as const;
            default:
              return { createdAt: 'desc' } as const;
          }
        })(),
        skip,
        take: limit,
      }) as any);
    const countPromise = withTiming(timing, 'db_count', () => prisma.job.count({ where }));
    const [jobsRaw, totalCount] = await Promise.all([jobsPromise, countPromise]);

    const jobs = selectMode === 'basic'
      ? (jobsRaw as any[]).map((j: any) => ({
          id: j.id,
          title: j.title,
          budgetAmount: j.budgetAmount,
          budgetType: j.budgetType,
          currency: j.currency,
          skills: (j.skills || []).slice(0,6),
          createdAt: j.createdAt,
          client: {
            id: j.client?.id,
            username: j.client?.username,
            rating: j.client?.profile?.rating || 0,
          },
          applications: j._count?.applications || 0,
          descriptionPreview: j.description?.slice(0,160) || '',
        }))
      : jobsRaw;

    const totalPages = Math.ceil(totalCount / limit);
    const isAuthedClientView = Boolean(clientOnly && request.headers.get('authorization'));

    const baseResp = {
    success: true,
    jobs,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    meta: { mode: selectMode || 'full' }
  };
    const response = respondWithJSONAndETag(request, baseResp, { headers: { 'Cache-Control': isAuthedClientView ? 'private, max-age=0, no-cache' : 'public, max-age=30, s-maxage=60' } });
    // Merge timing
    const existing = response.headers.get('Server-Timing');
    response.headers.set('Server-Timing', timing.mergeInto(existing));
  const jobCount = (jobsRaw as any[]).length;
  log.info('jobs_list.query.success', { count: jobCount, totalCount });
  recordEvent('jobs.list', { count: jobCount, total: totalCount, page, limit, basic: selectMode === 'basic' });
    return response;

  } catch (error) {
    log.error('jobs_list.query.error', { err: (error as any)?.message });
    recordEvent('jobs.list.error', { message: (error as any)?.message });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new job
export async function POST(request: NextRequest) {
  try {
  const csrf = verifyCsrf(request);
  if (!csrf.ok) return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    const ct = ensureJson(request);
    if (!ct.ok) return NextResponse.json({ success: false, error: ct.reason }, { status: 415 });
    // Simple rate limit: 5 writes per 5 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = rateLimit({ key: `jobs_create:${ip}`, limit: 5, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
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
      if (!access) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      }
      // Require scope to create jobs
      if (!access.scope?.includes('write:jobs')) {
        return NextResponse.json({ success: false, error: 'Forbidden: missing scope write:jobs' }, { status: 403 });
      }
      const clientId = access.sub;
  const jobData = await request.json();

      // Validate request body with zod
  const parsed = JobCoreSchema.safeParse(jobData);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid payload', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
  let { title, description, budgetAmount, budgetType, duration, skills, useBlockchain } = parsed.data as any;
  // Sanitize text fields and arrays (defensive; zod handles shape)
  title = sanitizeText(title, { maxLength: 140 });
  description = sanitizeText(description, { maxLength: 10000 });
  duration = sanitizeText(duration, { maxLength: 100 });
  skills = sanitizeStringArray(skills, { itemMaxLength: 40, maxItems: 50 });

      // Create job
      const job = await prisma.job.create({
  // Cast to any to allow new fields before generated client updates (pending migration)
  data: ({
          title,
          description,
          clientId,
          budgetAmount: Number(budgetAmount),
          // Cast to Prisma enum type; zod transform already upper-cased
          budgetType: budgetType as BudgetType,
          currency: (parsed.data as any).currency || 'USD',
          duration,
          deadline: (parsed.data as any).deadline ? new Date((parsed.data as any).deadline) : null,
          skills: Array.isArray(skills) ? skills : [],
          requirements: Array.isArray((parsed.data as any).requirements) ? (parsed.data as any).requirements : [],
          useBlockchain: !!useBlockchain,
          escrowDeployed: false,
          escrowPending: !!useBlockchain, // mark pending if blockchain requested
          escrowDeploymentAttempts: 0,
  }) as any,
        include: {
          client: {
            include: {
              profile: true,
            },
          },
        },
      });

  const res = NextResponse.json({
        success: true,
        job,
        message: 'Job created successfully',
  });
  return withCommonHeaders(res);

    } catch (tokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

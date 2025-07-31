import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Get all jobs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const budgetType = searchParams.get('budgetType') || '';
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
          const decoded = verifyToken(token) as any;
          where.clientId = decoded.userId;
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
    const [jobs, totalCount] = await Promise.all([
      prisma.job.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new job
export async function POST(request: NextRequest) {
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
      const clientId = decoded.userId;
      const jobData = await request.json();

      // Validate required fields
      const { title, description, budgetAmount, budgetType, duration, skills } = jobData;
      
      if (!title || !description || !budgetAmount || !budgetType || !duration || !skills) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Create job
      const job = await prisma.job.create({
        data: {
          title,
          description,
          clientId,
          budgetAmount: parseFloat(budgetAmount),
          budgetType: budgetType.toUpperCase(),
          currency: jobData.currency || 'USD',
          duration,
          deadline: jobData.deadline ? new Date(jobData.deadline) : null,
          skills: Array.isArray(skills) ? skills : [],
          requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
        },
        include: {
          client: {
            include: {
              profile: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        job,
        message: 'Job created successfully',
      });

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

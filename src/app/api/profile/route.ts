import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import '@/lib/env';
import { verifyAccessToken } from '@/lib/auth';
import { withCommonHeaders, preflightResponse, respondWithJSONAndETag } from '@/lib/apiHeaders';
import { verifyCsrf, escapeHTML, ensureJson, sanitizeText, sanitizeStringArray } from '@/lib/security';
import { z } from 'zod';
import { bumpVersion } from '@/lib/cache';

export async function OPTIONS() { return preflightResponse(); }

// Get user profile
export async function GET(request: NextRequest) {
  try {
  const ct = ensureJson(request);
  if (!ct.ok) return withCommonHeaders(NextResponse.json({ success: false, error: ct.reason }, { status: 415 }));
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
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      const userId = access.sub;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
            userType: true,
          walletAddress: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              title: true,
              location: true,
              companyName: true,
              avatar: true,
              skills: true,
              hourlyRate: true,
              rating: true,
              completedJobs: true,
              totalEarnings: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

  return respondWithJSONAndETag(request, {
    success: true,
    user,
  }, { headers: { 'Cache-Control': 'private, max-age=0, no-store' } });

    } catch (tokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return withCommonHeaders(NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 }));
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
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      // Require scope to update profile
      if (!access.scope?.includes('write:profile')) {
        return withCommonHeaders(NextResponse.json({ success: false, error: 'Forbidden: missing scope write:profile' }, { status: 403 }));
      }
      const userId = access.sub;
      const updateData = await request.json();

      // Validate and sanitize payload
      const ProfileSchema = z.object({
        username: z.string().min(3).max(32).optional(),
        email: z.string().email().max(254).optional(),
        userType: z.enum(['FREELANCER','CLIENT','BOTH']).optional(),
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        title: z.string().min(1).max(80).optional(),
        location: z.string().min(1).max(100).optional(),
        companyName: z.string().min(1).max(100).optional(),
        avatar: z.string().url().max(2048).optional(),
        skills: z.array(z.string().min(1).max(40)).max(50).optional(),
        hourlyRate: z.number().min(0).max(100000).optional(),
        rating: z.number().min(0).max(5).optional(),
        completedJobs: z.number().int().min(0).optional(),
        totalEarnings: z.number().min(0).optional(),
        bio: z.string().max(2000).optional(),
      }).strip();

      const parsed = ProfileSchema.safeParse(updateData);
      if (!parsed.success) {
        return withCommonHeaders(NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 }));
      }
      const { username, email, userType, ...profileData } = parsed.data as any;
  if (profileData.bio) profileData.bio = sanitizeText(profileData.bio, { maxLength: 2000 });
  if (profileData.title) profileData.title = sanitizeText(profileData.title, { maxLength: 80 });
  if (profileData.firstName) profileData.firstName = sanitizeText(profileData.firstName, { maxLength: 50 });
  if (profileData.lastName) profileData.lastName = sanitizeText(profileData.lastName, { maxLength: 50 });
  if (profileData.location) profileData.location = sanitizeText(profileData.location, { maxLength: 100 });
  if (profileData.companyName) profileData.companyName = sanitizeText(profileData.companyName, { maxLength: 100 });
  if (Array.isArray(profileData.skills)) profileData.skills = sanitizeStringArray(profileData.skills, { itemMaxLength: 40, maxItems: 50 });

      // Update user basic info if provided
      if (username || email || userType) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(username && { username }),
            ...(email && { email }),
            ...(userType && { userType }),
          },
        });
      }

      // Update or create profile
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
        },
        update: profileData,
      });

      // Fetch updated user with profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          userType: true,
          walletAddress: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              title: true,
              location: true,
              companyName: true,
              avatar: true,
              skills: true,
              hourlyRate: true,
              rating: true,
              completedJobs: true,
              totalEarnings: true,
            },
          },
        },
      });

  const res = NextResponse.json({
        success: true,
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
          userType: user!.userType,
          walletAddress: user!.walletAddress,
          profile: user!.profile,
        },
        message: 'Profile updated successfully',
  });
  // Invalidate freelancers listing caches (title, rate, rating, skills changes should reflect quickly)
  bumpVersion('freelancers_list').catch(()=>{});
  return withCommonHeaders(res);

    } catch (tokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

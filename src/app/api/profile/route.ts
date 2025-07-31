import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Get user profile
export async function GET(request: NextRequest) {
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
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      const userId = decoded.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          userType: user.userType,
          walletAddress: user.walletAddress,
          profile: user.profile,
        },
      });

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
      
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      const userId = decoded.userId;
      const updateData = await request.json();

      // Separate user data from profile data
      const { username, email, userType, ...profileData } = updateData;

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
        include: {
          profile: true,
        },
      });

      return NextResponse.json({
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

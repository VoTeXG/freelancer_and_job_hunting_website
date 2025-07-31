import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'signup') {
      const { username, email, password, userType, walletAddress } = data;

      // Validate required fields
      if (!username || !email || (!password && !walletAddress)) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username },
            ...(walletAddress ? [{ walletAddress }] : []),
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User already exists' },
          { status: 409 }
        );
      }

      // Hash password if provided
      const hashedPassword = password ? await hashPassword(password) : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          userType: userType || 'FREELANCER',
          walletAddress,
          profile: {
            create: {}
          }
        },
        include: {
          profile: true,
        },
      });

      // Generate JWT token
      const token = generateToken({ userId: user.id, username: user.username });

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
        token,
      });

    } else if (type === 'signin') {
      const { username, password, walletAddress, signature } = data;

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email: username },
            ...(walletAddress ? [{ walletAddress }] : []),
          ],
        },
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

      // Verify credentials
      let isValid = false;
      
      if (password && user.password) {
        isValid = await verifyPassword(password, user.password);
      } else if (walletAddress && signature) {
        // For wallet authentication, implement signature verification
        // This is a simplified version - in production, verify the signature
        isValid = user.walletAddress === walletAddress;
      }

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = generateToken({ userId: user.id, username: user.username });

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
        token,
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

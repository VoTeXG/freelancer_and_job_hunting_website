import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, hashPassword, verifyPassword, verifyWalletSignature } from '@/lib/auth';
import { verifyCsrf } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const csrf = verifyCsrf(request);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: csrf.reason || 'CSRF failed' }, { status: 403 });
    }
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
      const { username, password, walletAddress, signature, message } = data;

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
        // SIWE-style verification using nonce cookie and claimed address
        if (!message) {
          return NextResponse.json(
            { success: false, error: 'Missing signed message' },
            { status: 400 }
          );
        }

        const reqNonce = request.cookies.get('siwe_nonce')?.value;
        const reqAddr = request.cookies.get('siwe_addr')?.value;
        if (!reqNonce) {
          return NextResponse.json(
            { success: false, error: 'Missing nonce (call /api/auth/nonce first)' },
            { status: 400 }
          );
        }

        const messageContainsNonce = message.includes(reqNonce);
        const addressMatches = reqAddr ? reqAddr === walletAddress.toLowerCase() : true;

        isValid =
          user.walletAddress === walletAddress &&
          messageContainsNonce &&
          addressMatches &&
          verifyWalletSignature(message, signature, walletAddress);
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

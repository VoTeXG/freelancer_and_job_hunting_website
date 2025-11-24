import { prisma } from '../src/lib/prisma';
import { hashPassword, generateAccessToken, defaultScopes, withAdminScope } from '../src/lib/auth';

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'Admin';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin';
  const wallet = process.env.SEED_ADMIN_WALLET || null; // optional to also grant admin:all via wallet list

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { id: true } });
  if (existing) {
    console.log('[seed-admin] User already exists. Skipping create.');
    await prisma.user.update({ where: { id: existing.id }, data: { isVerified: true } });
  } else {
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        userType: 'CLIENT', // give job posting + escrow manage rights
        walletAddress: wallet,
        isVerified: true,
        profile: { create: {} },
      },
      select: { id: true, username: true, userType: true, walletAddress: true }
    });
    console.log('[seed-admin] Created user', user);
  }
  // Fetch after (in case existed)
  const user = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true, userType: true, walletAddress: true } });
  if (!user) throw new Error('Failed to load admin user after create');
  const scopes = withAdminScope(defaultScopes(user.userType), user.walletAddress || undefined);
  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: scopes, typ: 'access' });
  console.log('[seed-admin] Access token (store for local use):\n');
  console.log(token);
  console.log('\nSet as session_token cookie or use Bearer header for admin endpoints.');
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());

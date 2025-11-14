import { PrismaClient, UserType } from '@prisma/client';

// Usage (PowerShell):
//   npm run cleanup:freelancers -- --keep=10
// or
//   tsx scripts/cleanup-freelancers.ts --keep=10
//
// This script keeps the earliest `keep` freelancers (by createdAt asc) and deletes the rest.
// Cascades will remove dependent profiles, applications, and reviews.

const prisma = new PrismaClient();

function getArg(name: string, fallback?: string) {
  const idx = process.argv.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return fallback;
  const val = process.argv[idx];
  if (val.includes('=')) return val.split('=')[1];
  const next = process.argv[idx+1];
  if (!next || next.startsWith('--')) return fallback;
  return next;
}

async function main() {
  const keepStr = getArg('keep', process.env.KEEP || '10');
  const keep = Math.max(0, parseInt(String(keepStr), 10) || 10);

  console.log(`[cleanup-freelancers] Keeping first ${keep} freelancers, deleting the rest...`);

  const total = await prisma.user.count({ where: { userType: UserType.FREELANCER } });
  if (total <= keep) {
    console.log(`[cleanup-freelancers] Nothing to do. Total freelancers: ${total} ≤ keep: ${keep}`);
    return;
  }

  const keepers = await prisma.user.findMany({
    where: { userType: UserType.FREELANCER },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: keep,
  });
  const keeperIds = new Set(keepers.map(k => k.id));

  const toDelete = await prisma.user.findMany({
    where: { userType: UserType.FREELANCER },
    select: { id: true, email: true, username: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    skip: keep,
  });

  console.log(`[cleanup-freelancers] Deleting ${toDelete.length} freelancer(s) out of ${total}...`);

  // Delete in chunks to avoid parameter limits
  const CHUNK = 50;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    await prisma.user.deleteMany({ where: { id: { in: chunk.map(u => u.id) } } });
    console.log(`[cleanup-freelancers] Deleted ${Math.min(i + CHUNK, toDelete.length)} / ${toDelete.length}`);
  }

  const remaining = await prisma.user.count({ where: { userType: UserType.FREELANCER } });
  console.log(`[cleanup-freelancers] Done. Remaining freelancers: ${remaining}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient, BudgetType, JobStatus, ApplicationStatus, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample data...');

  // Helper to upsert a user with profile
  async function upsertUser({
    username,
    email,
    walletAddress,
    password,
    userType,
    profile,
  }: {
    username: string;
    email: string;
    walletAddress?: string | null;
    password?: string | null;
    userType?: UserType;
    profile?: Partial<Parameters<typeof prisma.profile.create>[0]['data']>;
  }) {
    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        username,
        walletAddress: walletAddress || null,
        userType: userType ?? UserType.FREELANCER,
        ...(hashed ? { password: hashed } : {}),
      },
      create: {
        username,
        email,
        walletAddress: walletAddress || null,
        userType: userType ?? UserType.FREELANCER,
        isVerified: true,
        ...(hashed ? { password: hashed } : {}),
      },
    });

    // Ensure profile exists/updated
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        ...profile,
      },
      create: {
        userId: user.id,
        skills: profile?.skills as string[] || [],
        hourlyRate: (profile as any)?.hourlyRate ?? null,
        experience: (profile as any)?.experience ?? null,
        rating: (profile as any)?.rating ?? 0,
        completedJobs: (profile as any)?.completedJobs ?? 0,
        totalEarnings: (profile as any)?.totalEarnings ?? 0,
        portfolio: (profile as any)?.portfolio || [],
        firstName: (profile as any)?.firstName || null,
        lastName: (profile as any)?.lastName || null,
        title: (profile as any)?.title || null,
        bio: (profile as any)?.bio || null,
        location: (profile as any)?.location || null,
        companyName: (profile as any)?.companyName || null,
        avatar: (profile as any)?.avatar || null,
        website: (profile as any)?.website || null,
      },
    });

    return user;
  }

  // Create a client and two freelancers
  const client = await upsertUser({
    username: 'client_neo',
    email: 'client@example.com',
    walletAddress: '0x1111111111111111111111111111111111111111',
    password: 'password123',
    userType: UserType.CLIENT,
    profile: {
      companyName: 'Nebula Labs',
      title: 'Tech Lead',
      bio: 'We build decentralized applications at scale.',
      skills: ['Product Management', 'DeFi'],
      rating: 4.8,
      completedJobs: 12,
      totalEarnings: 0,
    },
  });

  const freelancerA = await upsertUser({
    username: 'alice_chain',
    email: 'alice@example.com',
    walletAddress: '0x2222222222222222222222222222222222222222',
    password: 'password123',
    userType: UserType.FREELANCER,
    profile: {
      title: 'Senior Blockchain Engineer',
      bio: 'Solidity, React, and everything Web3.',
      skills: ['Solidity', 'React', 'TypeScript', 'Hardhat'],
      hourlyRate: 100,
      experience: 5,
      rating: 4.9,
      completedJobs: 47,
      totalEarnings: 125000,
    },
  });

  const freelancerB = await upsertUser({
    username: 'bob_web3',
    email: 'bob@example.com',
    walletAddress: '0x3333333333333333333333333333333333333333',
    password: 'password123',
    userType: UserType.FREELANCER,
    profile: {
      title: 'Smart Contract Auditor',
      bio: 'Security audits for DeFi and NFTs.',
      skills: ['Solidity', 'Foundry', 'Security'],
      hourlyRate: 120,
      experience: 6,
      rating: 4.7,
      completedJobs: 32,
      totalEarnings: 82000,
    },
  });

  // Additional clients and freelancers
  const client2 = await upsertUser({
    username: 'client_orion',
    email: 'client2@example.com',
    walletAddress: '0x4444444444444444444444444444444444444444',
    password: 'password123',
    userType: UserType.CLIENT,
    profile: {
      companyName: 'Orion DeFi',
      title: 'Product Owner',
      bio: 'Pushing the boundaries of decentralized finance.',
      skills: ['Product', 'Security'],
      rating: 4.6,
      completedJobs: 8,
      totalEarnings: 0,
    },
  });

  const client3 = await upsertUser({
    username: 'client_zen',
    email: 'client3@example.com',
    walletAddress: '0x5555555555555555555555555555555555555555',
    password: 'password123',
    userType: UserType.CLIENT,
    profile: {
      companyName: 'Zen Labs',
      title: 'CTO',
      bio: 'Clean UX meets robust Web3 backends.',
      skills: ['Architecture', 'UX'],
      rating: 4.9,
      completedJobs: 20,
      totalEarnings: 0,
    },
  });

  const freelancerC = await upsertUser({
    username: 'charlie_sol',
    email: 'charlie@example.com',
    walletAddress: '0x6666666666666666666666666666666666666666',
    password: 'password123',
    userType: UserType.FREELANCER,
    profile: {
      title: 'Solidity Engineer',
      bio: 'Auditable contracts with robust test coverage.',
      skills: ['Solidity', 'Hardhat', 'OpenZeppelin'],
      hourlyRate: 95,
      experience: 4,
      rating: 4.5,
      completedJobs: 18,
      totalEarnings: 61000,
    },
  });

  const freelancerD = await upsertUser({
    username: 'diana_defi',
    email: 'diana@example.com',
    walletAddress: '0x7777777777777777777777777777777777777777',
    password: 'password123',
    userType: UserType.FREELANCER,
    profile: {
      title: 'DeFi Strategist',
      bio: 'Tokenomics and protocol design specialist.',
      skills: ['Tokenomics', 'DeFi', 'Research'],
      hourlyRate: 110,
      experience: 7,
      rating: 4.8,
      completedJobs: 40,
      totalEarnings: 145000,
    },
  });

  const freelancerE = await upsertUser({
    username: 'eve_frontend',
    email: 'eve@example.com',
    walletAddress: '0x8888888888888888888888888888888888888888',
    password: 'password123',
    userType: UserType.FREELANCER,
    profile: {
      title: 'Web3 Frontend Dev',
      bio: 'Delightful dApps with React, Next.js, Wagmi.',
      skills: ['React', 'Next.js', 'Wagmi', 'Tailwind'],
      hourlyRate: 85,
      experience: 3,
      rating: 4.6,
      completedJobs: 22,
      totalEarnings: 54000,
    },
  });

  // Upsert two jobs for the client
  const job1 = await prisma.job.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      title: 'Build NFT Marketplace Frontend',
      description: 'Create a responsive Next.js frontend for an NFT marketplace with wallet connect.',
      clientId: client.id,
      budgetAmount: 3.5,
      budgetType: BudgetType.FIXED,
      currency: 'ETH',
      duration: '3-4 weeks',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      skills: ['Next.js', 'Tailwind', 'WalletConnect'],
      requirements: ['Experience with Web3 libraries', 'Good UI/UX sense'],
      status: JobStatus.OPEN,
      useBlockchain: true,
    },
  });

  const job2 = await prisma.job.upsert({
    where: { id: 'seed-job-2' },
    update: {},
    create: {
      id: 'seed-job-2',
      title: 'DeFi Protocol Smart Contracts',
      description: 'Implement lending/borrowing smart contracts with unit tests and audits.',
      clientId: client.id,
      budgetAmount: 5,
      budgetType: BudgetType.FIXED,
      currency: 'ETH',
      duration: '1-2 months',
      skills: ['Solidity', 'Hardhat', 'DeFi'],
      requirements: ['Security mindset', 'Gas optimizations'],
      status: JobStatus.OPEN,
      useBlockchain: true,
    },
  });

  // More jobs across clients with mixed budget types and currencies
  const job3 = await prisma.job.upsert({
    where: { id: 'seed-job-3' },
    update: {},
    create: {
      id: 'seed-job-3',
      title: 'Tokenomics Model for Governance Token',
      description: 'Design a sustainable token model with emission schedule and staking rewards.',
      clientId: client2.id,
      budgetAmount: 120, // hourly
      budgetType: BudgetType.HOURLY,
      currency: 'USDC',
      duration: '3-6 months',
      skills: ['Tokenomics', 'Modeling', 'DeFi'],
      requirements: ['Past token designs', 'Risk mitigation plan'],
      status: JobStatus.OPEN,
      useBlockchain: false,
    },
  });

  const job4 = await prisma.job.upsert({
    where: { id: 'seed-job-4' },
    update: {},
    create: {
      id: 'seed-job-4',
      title: 'React dApp with WalletConnect + Wagmi',
      description: 'Build a polished dApp UI with RainbowKit onboarding and transaction status toasts.',
      clientId: client2.id,
      budgetAmount: 2.2,
      budgetType: BudgetType.FIXED,
      currency: 'ETH',
      duration: '1-2 months',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
      skills: ['React', 'Next.js', 'Wagmi', 'RainbowKit'],
      requirements: ['Accessibility basics', 'Responsive design'],
      status: JobStatus.OPEN,
      useBlockchain: true,
      escrowPending: true,
    },
  });

  const job5 = await prisma.job.upsert({
    where: { id: 'seed-job-5' },
    update: {},
    create: {
      id: 'seed-job-5',
      title: 'Smart Contract Audit (Medium Protocol)',
      description: 'Audit contracts for reentrancy, authorization, and accounting bugs. Provide report.',
      clientId: client3.id,
      budgetAmount: 4.0,
      budgetType: BudgetType.FIXED,
      currency: 'ETH',
      duration: '2-4 weeks',
      skills: ['Solidity', 'Security', 'Hardhat'],
      requirements: ['Prior audits', 'Coverage reports'],
      status: JobStatus.OPEN,
      useBlockchain: true,
      escrowDeployed: true,
      escrowOnChainId: 1001,
    },
  });

  const job6 = await prisma.job.upsert({
    where: { id: 'seed-job-6' },
    update: {},
    create: {
      id: 'seed-job-6',
      title: 'DeFi Dashboard Data Aggregation',
      description: 'Aggregate on-chain data and display analytics with charts.',
      clientId: client3.id,
      budgetAmount: 75,
      budgetType: BudgetType.HOURLY,
      currency: 'USDC',
      duration: '1-3 months',
      skills: ['TheGraph', 'TypeScript', 'React'],
      requirements: ['API design', 'Perf mindset'],
      status: JobStatus.OPEN,
      useBlockchain: false,
    },
  });

  const job7 = await prisma.job.upsert({
    where: { id: 'seed-job-7' },
    update: {},
    create: {
      id: 'seed-job-7',
      title: 'NFT Metadata Service + Pinning',
      description: 'Build metadata generator with IPFS pinning and batch uploads.',
      clientId: client.id,
      budgetAmount: 1.2,
      budgetType: BudgetType.FIXED,
      currency: 'ETH',
      duration: '1-2 weeks',
      skills: ['Node.js', 'IPFS', 'Helia'],
      requirements: ['Rate limits', 'Retry logic'],
      status: JobStatus.OPEN,
      useBlockchain: true,
    },
  });

  // Applications
  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job1.id, freelancerId: freelancerA.id } },
    update: {},
    create: {
      jobId: job1.id,
      freelancerId: freelancerA.id,
      coverLetter: 'I have shipped 3 NFT marketplaces. Happy to help!',
      proposedRate: 3.5,
      estimatedDuration: '3 weeks',
      portfolio: 'https://example.com/alice',
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job2.id, freelancerId: freelancerB.id } },
    update: { status: ApplicationStatus.ACCEPTED },
    create: {
      jobId: job2.id,
      freelancerId: freelancerB.id,
      coverLetter: 'Audited multiple DeFi protocols; can deliver robust contracts.',
      proposedRate: 5,
      estimatedDuration: '6 weeks',
      status: ApplicationStatus.ACCEPTED,
    },
  });

  // A review from client to freelancerB
  await prisma.review.upsert({
    where: { fromUserId_toUserId: { fromUserId: client.id, toUserId: freelancerB.id } },
    update: { rating: 5, comment: 'Excellent audit with thorough findings.' },
    create: {
      fromUserId: client.id,
      toUserId: freelancerB.id,
      rating: 5,
      comment: 'Excellent audit with thorough findings.',
    },
  });

  // More applications across jobs with mixed statuses
  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job3.id, freelancerId: freelancerD.id } },
    update: {},
    create: {
      jobId: job3.id,
      freelancerId: freelancerD.id,
      coverLetter: 'I can design a sustainable token model with clear incentives.',
      proposedRate: 120,
      estimatedDuration: '12 weeks',
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job4.id, freelancerId: freelancerE.id } },
    update: { status: ApplicationStatus.ACCEPTED },
    create: {
      jobId: job4.id,
      freelancerId: freelancerE.id,
      coverLetter: 'Experienced with Wagmi/RainbowKit; can deliver a polished UX.',
      proposedRate: 2.2,
      estimatedDuration: '6 weeks',
      status: ApplicationStatus.ACCEPTED,
    },
  });

  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job5.id, freelancerId: freelancerA.id } },
    update: { status: ApplicationStatus.REJECTED },
    create: {
      jobId: job5.id,
      freelancerId: freelancerA.id,
      coverLetter: 'Strong background in audits; attaching previous reports.',
      proposedRate: 3.8,
      estimatedDuration: '3 weeks',
      status: ApplicationStatus.REJECTED,
    },
  });

  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job6.id, freelancerId: freelancerC.id } },
    update: {},
    create: {
      jobId: job6.id,
      freelancerId: freelancerC.id,
      coverLetter: 'I will build a performant data layer and charts.',
      proposedRate: 80,
      estimatedDuration: '8 weeks',
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.application.upsert({
    where: { jobId_freelancerId: { jobId: job7.id, freelancerId: freelancerE.id } },
    update: {},
    create: {
      jobId: job7.id,
      freelancerId: freelancerE.id,
      coverLetter: 'Familiar with Helia and pinning strategies; can implement retries.',
      proposedRate: 1.2,
      estimatedDuration: '10 days',
      status: ApplicationStatus.PENDING,
    },
  });

  // More reviews (client to freelancer)
  await prisma.review.upsert({
    where: { fromUserId_toUserId: { fromUserId: client2.id, toUserId: freelancerE.id } },
    update: { rating: 5, comment: 'Great UX and smooth wallet flows.' },
    create: {
      fromUserId: client2.id,
      toUserId: freelancerE.id,
      rating: 5,
      comment: 'Great UX and smooth wallet flows.',
    },
  });

  await prisma.review.upsert({
    where: { fromUserId_toUserId: { fromUserId: client3.id, toUserId: freelancerC.id } },
    update: { rating: 4, comment: 'Solid delivery, a few minor issues resolved quickly.' },
    create: {
      fromUserId: client3.id,
      toUserId: freelancerC.id,
      rating: 4,
      comment: 'Solid delivery, a few minor issues resolved quickly.',
    },
  });

  // A couple of server-side job drafts for client and client2
  await prisma.jobDraft.upsert({
    where: { id: 'seed-draft-1' },
    update: { data: { form: { title: 'Draft: Cross-chain bridge', skills: ['Solidity', 'Bridging'] } } as any },
    create: {
      id: 'seed-draft-1',
      clientId: client.id,
      data: { form: { title: 'Draft: Cross-chain bridge', budgetType: 'FIXED', skills: ['Solidity', 'Bridging'] } },
      published: false,
    },
  });

  await prisma.jobDraft.upsert({
    where: { id: 'seed-draft-2' },
    update: { data: { form: { title: 'Draft: ZK identity module' } } as any },
    create: {
      id: 'seed-draft-2',
      clientId: client2.id,
      data: { form: { title: 'Draft: ZK identity module', budgetType: 'HOURLY' } },
      published: false,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

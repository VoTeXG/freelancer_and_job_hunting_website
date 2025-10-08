// @ts-nocheck
import { test, expect } from '@playwright/test';
import { generateAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// NOTE: This test assumes the app server is running (npm run dev) and DATABASE_URL points to a test-safe DB.
// It directly seeds a user and job via Prisma, then exercises the escrow PATCH endpoint lifecycle.

async function seedClient() {
  const user = await prisma.user.create({
    data: {
      username: `client_${Date.now()}`,
      email: `client_${Date.now()}@test.dev`,
      password: 'hashed',
      userType: 'CLIENT',
    },
  });
  return user;
}

async function seedJob(clientId: string) {
  return prisma.job.create({
    data: {
      title: 'Escrow Test Job',
      description: 'Testing escrow lifecycle',
      clientId,
      budgetAmount: 1,
      budgetType: 'FIXED',
      duration: '1 week',
      skills: ['test'],
      requirements: [],
      useBlockchain: true,
      escrowPending: false,
    },
  });
}

// Helper to auth header
function bearer(user: any) {
  const token = generateAccessToken({ sub: user.id, usr: user.username, scope: ['read:jobs','read:applications','read:profile','write:jobs','write:applications','escrow:manage'], typ: 'access' });
  return { Authorization: `Bearer ${token}` };
}

test.describe('Escrow endpoint lifecycle', () => {
  test('retry -> mark_deployed -> fail blocked', async ({ request }) => {
    const client = await seedClient();
    const job = await seedJob(client.id);

    // 1) Retry (sets pending + increments attempts)
    // Fetch CSRF for protected writes
    const nonce1 = await request.get(`/api/auth/nonce`);
    const setCookie1 = nonce1.headers()['set-cookie'] || '';
    const m1 = /csrf_token=([^;]+)/.exec(setCookie1);
    const csrf1 = m1 ? decodeURIComponent(m1[1]) : '';
    const retryRes = await request.patch(`/api/jobs/${job.id}/escrow`, {
      headers: { ...bearer(client), 'X-CSRF-Token': csrf1, 'Content-Type': 'application/json' },
      data: { action: 'retry' },
    });
    expect(retryRes.ok()).toBeTruthy();
    const retryJson = await retryRes.json();
    expect(retryJson.success).toBeTruthy();
    expect(retryJson.job.escrowPending).toBeTruthy();
    expect(retryJson.job.escrowDeploymentAttempts).toBe(1);

    // 2) Mark deployed
    const nonce2 = await request.get(`/api/auth/nonce`);
    const setCookie2 = nonce2.headers()['set-cookie'] || '';
    const m2 = /csrf_token=([^;]+)/.exec(setCookie2);
    const csrf2 = m2 ? decodeURIComponent(m2[1]) : '';
    const deployRes = await request.patch(`/api/jobs/${job.id}/escrow`, {
      headers: { ...bearer(client), 'X-CSRF-Token': csrf2, 'Content-Type': 'application/json' },
      data: { action: 'mark_deployed', onChainId: 123 },
    });
    expect(deployRes.ok()).toBeTruthy();
    const deployJson = await deployRes.json();
    expect(deployJson.success).toBeTruthy();
    expect(deployJson.job.escrowDeployed).toBeTruthy();
    expect(deployJson.job.escrowOnChainId).toBe(123);

    // 3) Fail after deployment should error
    const nonce3 = await request.get(`/api/auth/nonce`);
    const setCookie3 = nonce3.headers()['set-cookie'] || '';
    const m3 = /csrf_token=([^;]+)/.exec(setCookie3);
    const csrf3 = m3 ? decodeURIComponent(m3[1]) : '';
    const failRes = await request.patch(`/api/jobs/${job.id}/escrow`, {
      headers: { ...bearer(client), 'X-CSRF-Token': csrf3, 'Content-Type': 'application/json' },
      data: { action: 'fail' },
    });
    expect(failRes.status()).toBe(400);
    const failJson = await failRes.json();
    expect(failJson.success).toBeFalsy();
  });
});

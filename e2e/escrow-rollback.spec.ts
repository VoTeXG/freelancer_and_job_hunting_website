import { test, expect, request } from '@playwright/test';

// This test assumes:
// - Job creation endpoint: POST /api/jobs { title, description, budgetAmount, budgetType, currency, duration, skills, requirements, useBlockchain }
// - Auth works via registration returning access token (CLIENT type gets escrow:manage scope)
// - Escrow rollback actions on PATCH /api/jobs/:id/escrow with JSON { action }
// - CSRF enforced on write; if needed, adjust to fetch nonce & include header

async function createClient(api: any, base: string) {
  const username = `client_${Date.now()}`;
  const password = 'TestPass123!';
  const reg = await api.post(`${base}/api/auth/register`, { data: { username, password, userType: 'CLIENT' } });
  const json = await reg.json();
  return { username, password, access: json.accessToken || json.token };
}

async function createJob(api: any, base: string, access: string) {
  const job = await api.post(`${base}/api/jobs`, {
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    data: {
      title: 'Rollback Test Job',
      description: 'Testing rollback path',
      budgetAmount: 1000,
      budgetType: 'FIXED',
      currency: 'USD',
      duration: '1w',
      skills: ['test'],
      requirements: ['req'],
      useBlockchain: true
    }
  });
  expect(job.ok()).toBeTruthy();
  const j = await job.json();
  return j.job?.id || j.id || j.jobId || j?.data?.id;
}

test.describe('Escrow rollback lifecycle', () => {
  test('request then confirm rollback before deployment', async () => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const api = await request.newContext();

    const { access } = await createClient(api, base);
    expect(access).toBeTruthy();

    const jobId = await createJob(api, base, access);
    expect(jobId).toBeTruthy();

    // Request rollback
    const reqRollback = await api.patch(`${base}/api/jobs/${jobId}/escrow`, {
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      data: { action: 'rollback_request', reason: 'Client cancelled' }
    });
    expect(reqRollback.ok()).toBeTruthy();
    const reqJson = await reqRollback.json();
    expect(reqJson.job.escrowRollbackRequested).toBeTruthy();

    // Confirm rollback
    const confirmRollback = await api.patch(`${base}/api/jobs/${jobId}/escrow`, {
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      data: { action: 'rollback_confirm' }
    });
    expect(confirmRollback.ok()).toBeTruthy();
    const confJson = await confirmRollback.json();
    expect(confJson.job.escrowCancelledAt).toBeTruthy();

    // Further retry should now fail since escrow cancelled and not pending
    const retry = await api.patch(`${base}/api/jobs/${jobId}/escrow`, {
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      data: { action: 'retry' }
    });
    expect(retry.status()).toBeGreaterThanOrEqual(400);
  });
});

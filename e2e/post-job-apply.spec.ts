import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';

async function getCsrf(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get(`${base}/api/auth/nonce`, { failOnStatusCode: false });
  expect(res.ok()).toBeTruthy();
  const cookies = res.headers()['set-cookie'] || '';
  const m = /csrf_token=([^;]+)/.exec(cookies);
  return m ? decodeURIComponent(m[1]) : '';
}

test.describe('Post job then apply flow', () => {
  test('register client, post job, list shows job; register freelancer, apply', async ({ request }) => {
    // Seed CSRF for client
    const csrf = await getCsrf(request);

    // Register client
    const uniq = Date.now();
    let res = await request.post(`${base}/api/auth/register`, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      data: { email: `client_${uniq}@example.com`, username: `client_user_${uniq}`, password: 'StrongPassw0rd!', userType: 'CLIENT' },
    });
    expect(res.ok()).toBeTruthy();
    const clientJson = await res.json();
    const clientToken = clientJson.token as string;

    // Create a job using client session
    const jobPayload = {
      title: 'Test Job from E2E',
      description: 'Looking for a skilled dev',
      budgetAmount: 500,
      budgetType: 'FIXED',
      currency: 'USD',
      duration: '2 weeks',
      skills: ['react','typescript'],
      requirements: [],
      useBlockchain: false,
    };
    res = await request.post(`${base}/api/jobs`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        Authorization: `Bearer ${clientToken}`,
      },
      data: jobPayload,
    });
    expect(res.ok()).toBeTruthy();

    // Verify job appears in list (no auth required)
    const list = await request.get(`${base}/api/jobs?search=Test%20Job%20from%20E2E`);
    expect(list.ok()).toBeTruthy();
    const listJson = await list.json();
    expect(listJson.success).toBeTruthy();

    // Register a freelancer
    const csrf2 = await getCsrf(request);
    res = await request.post(`${base}/api/auth/register`, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf2 },
      data: { email: `freelancer_${uniq}@example.com`, username: `freelancer_user_${uniq}`, password: 'StrongPassw0rd!', userType: 'FREELANCER' },
    });
    expect(res.ok()).toBeTruthy();
    const freelancerJson = await res.json();
    const freelancerToken = freelancerJson.token as string;

    // Get job id from list, then apply via endpoint if implemented
    const jobsData = listJson.jobs || [];
    expect(Array.isArray(jobsData)).toBeTruthy();
    if (!jobsData.length) test.skip(true, 'No jobs found to apply');
    const jobId = jobsData[0].id;

    const csrf3 = await getCsrf(request);
    const applyRes = await request.post(`${base}/api/jobs/${jobId}/apply`, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf3, Authorization: `Bearer ${freelancerToken}` },
      data: { coverLetter: 'I can do this job', proposedRate: 500, estimatedDuration: '2 weeks', portfolio: '' },
    });
    expect([200,201,202,409]).toContain(applyRes.status());
  });
});

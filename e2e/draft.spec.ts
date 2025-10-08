// @ts-nocheck
import { test, expect } from '@playwright/test';
import { ethers } from 'ethers';

// Draft lifecycle: create draft -> list -> fetch -> update -> publish -> verify job exists
// Relies on SIWE auth endpoints and draft/job APIs.

test('job draft lifecycle publish flow', async ({ request }) => {
  // 1. Create ephemeral wallet & obtain nonce
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const nonceRes = await request.get(`/api/auth/nonce?address=${address}`);
  expect(nonceRes.ok()).toBeTruthy();
  const nonceJson = await nonceRes.json();
  const nonce: string = nonceJson.nonce;
  expect(nonce).toBeTruthy();

  // 2. Sign SIWE-like message & verify to obtain JWT token
  const message = `Sign in to BlockFreelancer\nNonce: ${nonce}`;
  const signature = await wallet.signMessage(message);
  const setCookie = nonceRes.headers()['set-cookie'] || '';
  const m = /csrf_token=([^;]+)/.exec(setCookie);
  const csrf = m ? decodeURIComponent(m[1]) : '';
  const verifyRes = await request.post('/api/auth/verify', { headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, data: { address, message, signature } });
  expect(verifyRes.ok()).toBeTruthy();
  const verifyJson = await verifyRes.json();
  expect(verifyJson.success).toBeTruthy();
  const token = verifyJson.token;
  expect(token).toBeTruthy();

  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 3. Create a draft
  const draftPayload = {
    data: {
      title: 'Draft Job Initial Title',
      description: 'This is a draft job description with sufficient length to pass validation. It describes the project.',
      budgetAmount: 1.25,
      budgetType: 'fixed',
      duration: '1-2 weeks',
      skills: ['TypeScript','React'],
      requirements: ['Good communication'],
      useBlockchain: false
    }
  };
  // CSRF for writes
  const nonceRes2 = await request.get('/api/auth/nonce');
  const setCookie2 = nonceRes2.headers()['set-cookie'] || '';
  const m2 = /csrf_token=([^;]+)/.exec(setCookie2);
  const csrf2 = m2 ? decodeURIComponent(m2[1]) : '';
  const createDraftRes = await request.post('/api/job-drafts', { data: draftPayload, headers: { ...authHeaders, 'X-CSRF-Token': csrf2 } });
  expect(createDraftRes.ok()).toBeTruthy();
  const createDraftJson = await createDraftRes.json();
  expect(createDraftJson.success).toBeTruthy();
  const draftId = createDraftJson.draft.id;
  expect(draftId).toBeTruthy();

  // 4. List drafts (pagination)
  const listRes = await request.get('/api/job-drafts?page=1&limit=5', { headers: authHeaders });
  expect(listRes.ok()).toBeTruthy();
  const listJson = await listRes.json();
  expect(listJson.success).toBeTruthy();
  const found = listJson.drafts.find((d:any) => d.id === draftId);
  expect(found).toBeTruthy();

  // 5. Fetch single draft
  const singleRes = await request.get(`/api/job-drafts/${draftId}`, { headers: authHeaders });
  expect(singleRes.ok()).toBeTruthy();
  const singleJson = await singleRes.json();
  expect(singleJson.success).toBeTruthy();
  const draftData = singleJson.draft.data || {};
  const formData = draftData.form && typeof draftData.form === 'object' ? draftData.form : draftData;
  expect(formData.title).toBe('Draft Job Initial Title');

  // 6. Update draft title
  const nonceRes3 = await request.get('/api/auth/nonce');
  const setCookie3 = nonceRes3.headers()['set-cookie'] || '';
  const m3 = /csrf_token=([^;]+)/.exec(setCookie3);
  const csrf3 = m3 ? decodeURIComponent(m3[1]) : '';
  const updateRes = await request.put(`/api/job-drafts/${draftId}`, { data: { data: { title: 'Updated Draft Title' } }, headers: { ...authHeaders, 'X-CSRF-Token': csrf3 } });
  expect(updateRes.ok()).toBeTruthy();
  const updateJson = await updateRes.json();
  expect(updateJson.success).toBeTruthy();
  expect(updateJson.draft.data.title).toBe('Updated Draft Title');

  // 7. Publish draft -> becomes a job
  const nonceRes4 = await request.get('/api/auth/nonce');
  const setCookie4 = nonceRes4.headers()['set-cookie'] || '';
  const m4 = /csrf_token=([^;]+)/.exec(setCookie4);
  const csrf4 = m4 ? decodeURIComponent(m4[1]) : '';
  const publishRes = await request.post(`/api/job-drafts/${draftId}/publish`, { headers: { ...authHeaders, 'X-CSRF-Token': csrf4, 'Content-Type': 'application/json' } });
  expect(publishRes.ok()).toBeTruthy();
  const publishJson = await publishRes.json();
  expect(publishJson.success).toBeTruthy();
  expect(publishJson.job).toBeTruthy();
  expect(publishJson.job.title).toBe('Updated Draft Title');

  // 8. Fetch client-only jobs and ensure presence
  const jobsRes = await request.get('/api/jobs?clientOnly=true', { headers: authHeaders });
  expect(jobsRes.ok()).toBeTruthy();
  const jobsJson = await jobsRes.json();
  expect(jobsJson.success).toBeTruthy();
  const jobFound = jobsJson.jobs.find((j:any) => j.title === 'Updated Draft Title');
  expect(jobFound).toBeTruthy();
});

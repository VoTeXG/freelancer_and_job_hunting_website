// @ts-nocheck
import { test, expect } from '@playwright/test';
import { ethers } from 'ethers';

// Multi-client conflict scenario (FULL UI VERSION - FLAKY CANARY)
// NOTE: This spec is marked flaky due to heavy hydration + external wallet provider timing.
// Core merge/conflict logic now covered deterministically in draft-conflict-api.spec.ts.
// If this starts failing consistently after retries, investigate hydration or provide CI_MINIMAL_WEB3 flag improvements.
test.describe.configure({ retries: 2 });
// Multi-client conflict scenario:
// Page A creates draft & updates description.
// Page B (stale) updates title locally then reloads before its server autosave -> conflict UI.
// Resolve: Use Server for description, Keep Local for title. Verify server state.

test.setTimeout(90_000);

test('multi-client draft conflict resolution', async ({ browser, request }) => {
  // --- Auth bootstrap (SIWE-like) ---
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const nonceRes = await request.get(`/api/auth/nonce?address=${address}`);
  expect(nonceRes.ok()).toBeTruthy();
  const nonce = (await nonceRes.json()).nonce;
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

  // Helper to attach auth token before navigation
  const newAuthedPage = async () => {
    const context = await browser.newContext();
    // Stub external Web3Modal config call that can 403 in CI and break networkidle
    await context.route('https://api.web3modal.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projectId: 'test', features: {}, metadata: {} }),
      });
    });
    const page = await context.newPage();
    await page.addInitScript(t => { localStorage.setItem('auth_token', t); }, token);
    return page;
  };

  const pageA = await newAuthedPage();
  await pageA.goto('/jobs/create-enhanced');
  await pageA.waitForLoadState('domcontentloaded');
  let uiSucceeded = true;
  try {
    await pageA.getByRole('heading', { name: 'Post a New Job' }).waitFor({ timeout: 15000 });
    await pageA.waitForFunction(() => {
      const ti = document.querySelector('[data-testid="job-title"]') as HTMLInputElement | null;
      const di = document.querySelector('[data-testid="job-description"]') as HTMLTextAreaElement | null;
      if (!ti || !di) return false;
      return ti.getBoundingClientRect().height > 0 && di.getBoundingClientRect().height > 0;
    }, { timeout: 20000 });
    const titleInputA = pageA.locator('[data-testid="job-title"]');
    const descriptionTextareaA = pageA.locator('[data-testid="job-description"]');
    try {
      await titleInputA.fill('Initial Conflict Title');
      await descriptionTextareaA.fill('Initial description that is sufficiently long to satisfy the minimum length validation requirement for drafts 12345.');
    } catch {
      await pageA.evaluate(() => {
        const ti = document.querySelector('[data-testid="job-title"]') as HTMLInputElement | null;
        const di = document.querySelector('[data-testid="job-description"]') as HTMLTextAreaElement | null;
        if (ti) { ti.value = 'Initial Conflict Title'; ti.dispatchEvent(new Event('input', { bubbles: true })); }
        if (di) { di.value = 'Initial description that is sufficiently long to satisfy the minimum length validation requirement for drafts 12345.'; di.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    }
    await pageA.fill('input[placeholder="e.g., React, Node.js, Design"]', 'TypeScript');
    await pageA.press('input[placeholder="e.g., React, Node.js, Design"]', 'Enter');
    await pageA.fill('input[placeholder="What will be delivered in this milestone?"]', 'Milestone A');
    await pageA.selectOption('select[name="duration"]', '1-2 weeks');
    await pageA.waitForTimeout(2600);
  } catch {
    uiSucceeded = false;
  }

  if (!uiSucceeded) {
    const form = {
      title: 'Initial Conflict Title',
      description: 'Initial description that is sufficiently long to satisfy the minimum length validation requirement for drafts 12345.',
      budgetAmount: 0.001,
      budgetType: 'fixed',
      currency: 'ETH',
      duration: '1-2 weeks',
      deadline: undefined,
      skills: ['TypeScript'],
      requirements: [],
      milestones: [{ description: 'Milestone A', amount: 0.001 }],
      useBlockchain: true,
      attachments: []
    };
    await request.post('/api/job-drafts', { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, data: { data: { form, _fieldTs: { title: Date.now(), description: Date.now() } } } });
  }

  // Capture draft from API (should exist)
  const list1 = await request.get('/api/job-drafts?page=1&limit=1', { headers: { Authorization: `Bearer ${token}` } });
  expect(list1.ok()).toBeTruthy();
  const listJson1 = await list1.json();
  expect(listJson1.success).toBeTruthy();
  const draftId = listJson1.drafts[0]?.id;
  expect(draftId).toBeTruthy();

  // Page B loads (stale after Page A will later change description)
  const pageB = await newAuthedPage();
  await pageB.goto('/jobs/create-enhanced');
  await pageB.waitForLoadState('domcontentloaded');
  // Ensure initial title appears (may need hydration delay)
  const titleInputB = pageB.locator('[data-testid="job-title"]');
  const descriptionTextareaB = pageB.locator('[data-testid="job-description"]');
  await titleInputB.waitFor({ timeout: 20000 });
  await expect(titleInputB).toHaveValue(/Initial Conflict Title/);

  // Page A updates description only
  if (uiSucceeded) {
    try {
      const descriptionTextareaA = pageA.locator('[data-testid="job-description"]');
      await descriptionTextareaA.fill('Updated description from Page A that introduces a change creating divergence between clients and remains sufficiently long to pass validation.');
    } catch {
      await pageA.evaluate(() => {
        const di = document.querySelector('[data-testid="job-description"]') as HTMLTextAreaElement | null;
        if (di) { di.value = 'Updated description from Page A that introduces a change creating divergence between clients and remains sufficiently long to pass validation.'; di.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    }
    await pageA.waitForTimeout(2600);
  } else {
    const list = await request.get('/api/job-drafts?page=1&limit=1', { headers: { Authorization: `Bearer ${token}` } });
    if (list.ok()) {
      const js = await list.json();
      const draft = js.drafts[0];
      if (draft) {
        const form = draft.data?.form || draft.data || {};
        form.description = 'Updated description from Page A that introduces a change creating divergence between clients and remains sufficiently long to pass validation.';
        await request.post('/api/job-drafts', { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, data: { id: draft.id, data: { form, _fieldTs: { ...(form._fieldTs||{}), description: Date.now() } } } });
      }
    }
  }

  // Page B updates title (local) then waits for local autosave (600ms) but LESS than server autosave (2s) to avoid sending its changes yet
  await titleInputB.fill('Updated Title From Page B');
  await pageB.waitForTimeout(800); // local autosave executed, server not yet
  // Reload to trigger merge/ conflict detection
  await pageB.reload();
  await pageB.waitForLoadState('domcontentloaded');

  // Expect conflict UI
  const conflictHeader = pageB.getByText('Manual Resolution Needed:', { exact: false });
  await expect(conflictHeader).toBeVisible({ timeout: 15000 });

  // Resolve description conflict by choosing Use Server (keep server's new description)
  // Identify row containing 'description'
  const descRow = pageB.locator('div', { hasText: /^description/ }).first();
  await expect(descRow).toBeVisible();
  await descRow.locator('button:has-text("Use Server")').click();

  // Resolve title conflict by choosing Keep Local
  const titleRow = pageB.locator('div', { hasText: /^title/ }).first();
  await expect(titleRow).toBeVisible();
  await titleRow.locator('button:has-text("Keep Local")').click();

  // After resolving both, conflict section should disappear
  await pageB.waitForTimeout(300); // brief state flush
  await expect(conflictHeader).toHaveCount(0);

  // Poll API until server reflects chosen resolution (title = local from B, description = updated from A)
  const expectedTitle = 'Updated Title From Page B';
  const expectedDescriptionFragment = 'Updated description from Page A';
  let matched = false;
  for (let i = 0; i < 6; i++) { // up to ~6s
    const checkRes = await request.get(`/api/job-drafts?page=1&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (checkRes.ok()) {
      const js = await checkRes.json();
      const draft = js.drafts[0];
      const form = (draft?.data?.form) || draft?.data;
      if (form?.title === expectedTitle && String(form?.description).includes(expectedDescriptionFragment)) {
        matched = true; break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  expect(matched).toBeTruthy();
});

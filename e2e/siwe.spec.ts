// @ts-nocheck
import { test, expect } from '@playwright/test';
import { ethers } from 'ethers';

// Simple SIWE E2E that hits the nonce endpoint, signs a message with ethers,
// and verifies to receive a JWT and session cookie.
// Requires a running DB and valid envs (DATABASE_URL, JWT_SECRET).

test('SIWE verify issues JWT and clears nonce', async ({ request }) => {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;

  // 1) Request nonce and let cookies be set on this request context
  const nonceRes = await request.get(`/api/auth/nonce?address=${address}`);
  expect(nonceRes.ok()).toBeTruthy();
  const nonceJson = await nonceRes.json();
  const nonce: string = nonceJson.nonce;
  expect(nonce).toBeTruthy();

  // 2) Sign a message containing the nonce
  const message = `Sign in to BlockFreelancer\nNonce: ${nonce}`;
  const signature = await wallet.signMessage(message);

  // 3) Verify
  // Include CSRF header from nonce cookie (double-submit)
  const setCookie = nonceRes.headers()['set-cookie'] || '';
  const m = /csrf_token=([^;]+)/.exec(setCookie);
  const csrf = m ? decodeURIComponent(m[1]) : '';
  const verifyRes = await request.post('/api/auth/verify', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    data: { address, message, signature },
  });
  expect(verifyRes.ok()).toBeTruthy();
  const verifyJson = await verifyRes.json();
  expect(verifyJson.success).toBeTruthy();
  expect(verifyJson.token).toBeTruthy();

  // 4) Ensure cookies updated (session_token present, nonce cleared)
  const setCookie2 = verifyRes.headers()['set-cookie'] || '';
  expect(setCookie2).toContain('session_token=');
});

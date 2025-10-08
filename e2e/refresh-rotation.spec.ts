import { test, expect, request } from '@playwright/test';

// Assumptions:
// - /api/auth/register accepts { username, password, walletAddress? }
// - /api/auth/login (if exists) or SIWE flow replaced; here we assume a simplified password path for test env.
// - /api/auth/refresh POST { refreshToken } => issues new access + refresh
// - Protected endpoint /api/profile (GET) requires Bearer access token
// Adjust selectors/paths as needed to match actual implementation.

test.describe('Refresh token rotation', () => {
  test('rotates and invalidates old refresh token', async ({ }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const api = await request.newContext();

    const username = `user_${Date.now()}`;
    const password = 'TestPass123!';

    // Register
    const reg = await api.post(`${base}/api/auth/register`, {
      data: { username, password, userType: 'CLIENT' }
    });
    expect(reg.ok()).toBeTruthy();

    // Login (if a dedicated login endpoint exists) - fallback: maybe register returns tokens
    const regJson = await reg.json();
    let access = regJson.accessToken || regJson.token;
    let refresh = regJson.refreshToken;

    if (!access || !refresh) {
      // Try explicit login
      const login = await api.post(`${base}/api/auth/login`, { data: { username, password } });
      expect(login.ok()).toBeTruthy();
      const loginJson = await login.json();
      access = loginJson.accessToken || loginJson.token;
      refresh = loginJson.refreshToken;
    }

    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();

    // Use access token on protected route
    const prof1 = await api.get(`${base}/api/profile`, { headers: { Authorization: `Bearer ${access}` } });
    expect(prof1.status()).toBe(200);

    // Rotate
    const rotate1 = await api.post(`${base}/api/auth/refresh`, { data: { refreshToken: refresh } });
    expect(rotate1.ok()).toBeTruthy();
    const r1 = await rotate1.json();
    const newAccess = r1.accessToken || r1.token;
    const newRefresh = r1.refreshToken;
    expect(newAccess).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toEqual(refresh);

    // Old refresh should now be invalid
    const rotateOld = await api.post(`${base}/api/auth/refresh`, { data: { refreshToken: refresh } });
    expect(rotateOld.status()).toBeGreaterThanOrEqual(400);

    // New access still works
    const prof2 = await api.get(`${base}/api/profile`, { headers: { Authorization: `Bearer ${newAccess}` } });
    expect(prof2.status()).toBe(200);
  });
});

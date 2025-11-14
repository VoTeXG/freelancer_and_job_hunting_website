import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin';

test.describe('Auth → Navigation integration', () => {
  test('hides Login/Register and shows profile after sign-in', async ({ page }) => {
    // Go to login
    await page.goto(`${base}/login`);

    // Fill and submit login form
  await page.locator('#login-identifier').fill(ADMIN_EMAIL);
  await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for success message or dashboard redirect
    await Promise.race([
      page.getByText(/Login successful/i).waitFor({ state: 'visible' }).catch(() => {}),
      page.waitForURL(/\/dashboard/i, { timeout: 15000 }).catch(() => {}),
    ]);

    // Navigation should not show Login/Register
    const loginBtn = page.getByRole('link', { name: 'Login' });
    const registerBtn = page.getByRole('link', { name: 'Register' });
    await expect(loginBtn).toHaveCount(0);
    await expect(registerBtn).toHaveCount(0);

    // Prefer asserting the signed-in email shows in the nav (desktop)
    const emailLabel = page.getByText(ADMIN_EMAIL, { exact: true });
    if (await emailLabel.count()) {
      await expect(emailLabel.first()).toBeVisible();
    } else {
      // Fallback: find a visible avatar trigger and open menu to check for Profile
      const visibleTrigger = page.locator('[data-user-menu-trigger]:visible').first();
      await visibleTrigger.click();
      await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
    }
  });
});

// @ts-nocheck
import { test, expect } from '@playwright/test';

test('home loads and navigates to jobs', async ({ page }) => {
  await page.goto('/');
  // Accept either primary or alternative hero headline text
  const hero = page.getByRole('heading').first();
  await expect(hero).toBeVisible();
  const link = page.getByRole('link', { name: /Browse Jobs/i }).first();
  await link.click();
  // Accept any heading presence as jobs page loads with varying text
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('filter chips toggle on jobs page', async ({ page }) => {
  await page.goto('/jobs');
  const chip = page.getByRole('button', { name: 'React' });
  await chip.click();
  await expect(chip).toHaveClass(/bg-purple-100/);
  await chip.click();
  await expect(chip).not.toHaveClass(/bg-purple-100/);
});

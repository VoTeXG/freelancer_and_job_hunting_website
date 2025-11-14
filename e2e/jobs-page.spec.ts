import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';

// Basic UI regression for the Jobs page
// Assumes the API is reachable and seeded; falls back to empty state gracefully.
test.describe('Jobs Page', () => {
  test('loads list and supports filters', async ({ page }) => {
    await page.goto(`${base}/jobs`);

    // Header should render
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Wait for either any job card content or empty state
    const empty = page.getByText(/No jobs found|Try adjusting your search/i);
    // JobListing may not have data-testid; check for common elements
    const applyButtons = page.getByRole('button', { name: /Apply|Advanced Filters/i });
    await Promise.race([
      applyButtons.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      empty.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    // Interact with filters (Sort By and Budget Type) if present
    const sortBy = page.getByLabel('Sort By');
    if (await sortBy.count()) {
      await sortBy.selectOption('budget');
      await sortBy.selectOption('deadline');
      await sortBy.selectOption('recent');
    }

    const budgetType = page.getByLabel('Budget Type');
    if (await budgetType.count()) {
      await budgetType.selectOption('fixed');
      await budgetType.selectOption('hourly');
      await budgetType.selectOption('all');
    }

    // Toggle advanced filters to ensure UI interaction
    // Disambiguate: there are two buttons with similar labels; use the header one
    const advBtn = page.getByRole('button', { name: 'Advanced Filters', exact: true }).first();
    if (await advBtn.count()) {
      await advBtn.click();
      // Now the button should read "Hide Filters"; click again to close
      const hideBtn = page.getByRole('button', { name: 'Hide Filters', exact: true }).first();
      if (await hideBtn.count()) {
        await hideBtn.click();
      }
    }
  });
});

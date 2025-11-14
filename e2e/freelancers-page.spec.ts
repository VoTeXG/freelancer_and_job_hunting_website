import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';

// Basic UI regression for the Freelancers page
// Assumes the API is reachable and seeded with some data. Falls back gracefully if empty.
test.describe('Freelancers Page', () => {
  test('loads list and supports sort filter', async ({ page }) => {
    await page.goto(`${base}/freelancers`);

    // Wait for either cards or empty state
    const card = page.getByTestId('freelancer-card').first();
    const empty = page.getByText(/No freelancers found|Try adjusting your filters/i);
    await Promise.race([
      card.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      empty.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    // Interact with Sort By select to ensure no errors
    const sortSelect = page.getByLabel('Sort By');
    await sortSelect.selectOption('experience');
    await sortSelect.selectOption('rate');
    await sortSelect.selectOption('rating');

    // If we have at least one card, assert key bits render
    if (await card.isVisible()) {
      await expect(card.getByText(/\$/)).toBeVisible(); // shows rate
      await expect(card.getByRole('link', { name: /View Profile/i })).toBeVisible();
    }
  });
});

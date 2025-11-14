/*
  Lightweight a11y scan using Playwright + @axe-core/playwright.
  This is informational (non-failing) unless explicitly configured to fail on violations.
*/
import { chromium } from '@playwright/test';
import injectAxe from '@axe-core/playwright';
import checkA11y from '@axe-core/playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Scan key pages; expand as needed
  const targets = ['/', '/jobs', '/freelancers'];
  const results: Array<{ url: string; violations: number }> = [];
  for (const url of targets) {
    try {
      await page.goto(`http://localhost:3000${url}`);
      await injectAxe(page);
      const { violations } = await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      }, true);
      results.push({ url, violations: violations?.length || 0 });
    } catch (e) {
      results.push({ url, violations: -1 });
    }
  }
  await browser.close();
  // Print a simple summary; do not fail CI by default
  console.log('axe-scan summary:', results);
}

run();

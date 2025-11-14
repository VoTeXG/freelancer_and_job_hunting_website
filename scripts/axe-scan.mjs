/*
  Lightweight a11y scan using Playwright + @axe-core/playwright.
  This is informational (non-failing) unless explicitly configured to fail on violations.
*/
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const targets = [
    '/',
    '/jobs',
    '/freelancers',
    '/login',
    '/register',
    '/jobs/create-enhanced',
    '/dashboard/enhanced',
    '/advanced',
    '/ipfs-manager',
    '/blockchain-test',
    '/admin/metrics'
  ];
  const results = [];
  try {
    for (const url of targets) {
      try {
        await page.goto(`http://localhost:3000${url}`);
        const analysis = await new AxeBuilder({ page })
          // Limit to common WCAG tags; adjust as needed
          .withTags(['wcag2a', 'wcag2aa'])
          // Focus on main content to avoid scanning persistent navigation/header widgets
          .include('#main-content')
          .analyze();
        const violations = analysis.violations?.length || 0;
        if (violations > 0) {
          console.error(`axe violations on ${url}:`);
          for (const v of analysis.violations) {
            console.error(`  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
            for (const n of v.nodes) {
              const targets = Array.isArray(n.target) ? n.target.join(', ') : String(n.target);
              console.error(`      node: ${targets}`);
            }
          }
        }
        results.push({ url, violations });
      } catch (e) {
        console.error(`axe scan error on ${url}:`, e?.message || e);
        results.push({ url, violations: -1 });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
  console.log('axe-scan summary:', results);
  const hadError = results.some(r => r.violations < 0);
  const totalViolations = results.reduce((sum, r) => sum + (r.violations > 0 ? r.violations : 0), 0);
  if (hadError || totalViolations > 0) {
    console.error(`Accessibility violations detected: ${totalViolations}. Failing CI.`);
    process.exit(1);
  }
}

run();

// Serve the production build first. Override SITE_URL and ARTIFACT_DIR as needed.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
process.env.PWDEBUG = '0';
process.env.PLAYWRIGHT_HTML_OPEN = 'never';
(async () => {
  const base = process.env.SITE_URL || 'http://127.0.0.1:8877';
  const artifacts = process.env.ARTIFACT_DIR || path.resolve('test-results/continuity');
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Change agents.');
    await page.getByRole('button', { name: 'Copy installation command' }).click();
    await expect(page.getByRole('status')).toHaveText('Installation command copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install -g specweave');
    const review = page.getByRole('button', { name: /Preserve work across agents/ });
    await review.click();
    await expect(review).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[aria-live="polite"]')).toContainText('Review and verification still decide');
    const small = page.getByRole('button', { name: /Make exports accessible/ });
    await small.focus();
    await page.keyboard.press('Enter');
    await expect(small).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[aria-live="polite"]')).toContainText('An intent can start small.');
    await page.screenshot({ path: path.join(artifacts, 'specweave-desktop.png'), fullPage: true });
    for (const route of ['/product/', '/integrations/', '/docs/getting-started/', '/docs/integrations/']) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      expect(response.status(), route).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), route + ' overflow').toBe(false);
    }
    await page.goto(base + '/integrations/', { waitUntil: 'networkidle' });
    await page.getByText('Will changing a card update Jira?', { exact: true }).click();
    await expect(page.getByText('A board state change is local.', { exact: false })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base, { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: path.join(artifacts, 'specweave-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Toggle navigation bar' }).click();
    await expect(page.getByRole('link', { name: 'Product', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    console.log('PASS: production routes, clipboard, keyboard/card inspection, integration disclosure, mobile navigation, no overflow or runtime errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

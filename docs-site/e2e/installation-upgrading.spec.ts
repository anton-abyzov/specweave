import { test, expect } from '@playwright/test';

test.describe('Installation page — Upgrading section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/getting-started/installation');
  });

  test('installation page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Installation/i);
    await expect(page.locator('h1')).toContainText('Installation', { timeout: 5000 });
  });

  test('upgrading section exists with specweave update recommendation', async ({ page }) => {
    const upgrading = page.locator('#upgrading');
    await expect(upgrading).toBeVisible();

    // The recommended approach should be specweave update
    const recommended = page.locator('h3#recommended-specweave-update');
    await expect(recommended).toBeVisible();
  });

  test('explains why npm update alone is insufficient', async ({ page }) => {
    const whyNot = page.locator('h3#why-not-just-npm-update--g-specweave');
    await expect(whyNot).toBeVisible();

    // Should mention key differences
    const content = await page.textContent('article');
    expect(content).toContain('only updates the CLI binary');
    expect(content).toContain('Migrates project configuration');
    expect(content).toContain('Refreshes marketplace plugins');
  });

  test('lists specweave update flags', async ({ page }) => {
    const content = await page.textContent('article');
    expect(content).toContain('--check');
    expect(content).toContain('--no-plugins');
    expect(content).toContain('--no-self');
    expect(content).toContain('--verbose');
  });
});

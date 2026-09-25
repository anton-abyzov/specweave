import { test, expect } from '@playwright/test';

test.describe('Installation page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/getting-started/installation');
  });

  test('loads with its title', async ({ page }) => {
    await expect(page).toHaveTitle(/Installation/i);
    await expect(page.locator('h1')).toContainText('Installation', { timeout: 5000 });
  });

  test('explains upgrading from 2.x with specweave update', async ({ page }) => {
    await expect(page.locator('h2#upgrade-from-2x')).toBeVisible();
    const content = await page.textContent('article');
    expect(content).toContain('specweave update');
    expect(content).toContain('--check');
    expect(content).toContain('What changed in 3.0');
  });

  test('lists the files init writes', async ({ page }) => {
    const content = await page.textContent('article');
    for (const file of ['AGENTS.md', 'CLAUDE.md', '.specweave/config.json', '.claude/skills/']) {
      expect(content).toContain(file);
    }
  });
});

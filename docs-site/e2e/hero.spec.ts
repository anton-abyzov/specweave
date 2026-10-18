import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero headline and primary actions are visible', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Switch AI tools without losing your place.');
    const download = page.getByRole('link', { name: /Download SpecWithCode|Download for Mac/ }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute('href', /\.dmg$/);
    await expect(page.getByRole('link', { name: 'Get the CLI' })).toHaveAttribute('href', /^\/product\/?$/);
  });

  test('family section names all three products', async ({ page }) => {
    for (const name of ['SpecWeave CLI', 'SpecWithCode', 'Verified Skill']) {
      await expect(page.locator('#family h3', { hasText: name })).toHaveCount(1);
    }
  });

  test('handoff section shows all four layers', async ({ page }) => {
    await expect(page.locator('#how')).toContainText('When Claude Code hits its limit, Codex picks up the same task');
    for (const title of ['The spec', 'The agents', 'The ledger in git', 'The handoff']) {
      await expect(page.locator('#how h3', { hasText: title })).toHaveCount(1);
    }
  });

  test('page never scrolls sideways', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

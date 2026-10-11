import { test, expect } from '@playwright/test';

test.describe('3.0 landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero headline and primary action are visible', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero.locator('h1')).toContainText('Every coding agent.');
    await expect(hero.locator('h1')).toContainText('One project.');
    const studio = hero.getByRole('link', { name: /See SpecWeave Studio/ });
    await expect(studio).toBeVisible();
    await expect(studio).toHaveAttribute('href', /^\/studio\/?$/);
    await expect(hero.getByRole('link', { name: /Start free with the CLI/ })).toHaveAttribute('href', /^\/docs\/getting-started\/?$/);
  });

  test('handoff story keeps the tagline and all four beats', async ({ page }) => {
    await expect(page.locator('#how')).toContainText('Switch tools. Keep your place.');
  });

  test('scroll story shows all four beats', async ({ page }) => {
    for (const title of ['what done means.', 'with its criteria.', 'Hand it off.', 'Same place.']) {
      await expect(page.locator('#how h3', { hasText: title })).toHaveCount(1);
    }
  });

  test('page never scrolls sideways', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

import { test, expect } from '@playwright/test';

test.describe('3.0 landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero headline and primary action are visible', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero.locator('h1')).toContainText('Switch tools.');
    await expect(hero.locator('h1')).toContainText('Keep your place.');
    const start = hero.getByRole('link', { name: /Start with your project/ });
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute('href', '/docs/getting-started');
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

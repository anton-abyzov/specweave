import { test, expect } from '@playwright/test';

test.describe('Hero section rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('headline and animated text are visible', async ({ page }) => {
    const hero = page.locator('section').first();

    // "Ship Features" — static text, always visible
    await expect(hero.locator('h1')).toContainText('Ship Features', { timeout: 5000 });

    // "While You Sleep" — WordAnimation, must become visible after hydration
    await expect(hero.locator('h1')).toContainText('While You Sleep', { timeout: 5000 });
  });

  test('CTA buttons are visible and clickable', async ({ page }) => {
    // Scope to the hero section (first section on the page)
    const hero = page.locator('section').first();
    const getStarted = hero.getByRole('link', { name: 'Get Started' });
    const watchDemo = hero.getByRole('link', { name: 'Watch Demo' });

    await expect(getStarted).toBeVisible({ timeout: 5000 });
    await expect(watchDemo).toBeVisible({ timeout: 5000 });

    await expect(getStarted).toHaveAttribute('href', '/docs/getting-started');
  });

  test('badge pills are visible', async ({ page }) => {
    await expect(page.getByText('Open Source')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Claude Code Native')).toBeVisible({ timeout: 5000 });
  });

  test('subheading text is visible', async ({ page }) => {
    await expect(
      page.getByText('Weave specs into shipping software'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('hero elements are not stuck at opacity 0', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(2000);

    const hero = page.locator('section').first();
    const getStartedBtn = hero.getByRole('link', { name: 'Get Started' });

    const opacity = await getStartedBtn.evaluate(
      (el) => window.getComputedStyle(el.closest('[class*="ctas"]') || el).opacity,
    );
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

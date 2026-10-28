import { test, expect, type Page } from '@playwright/test';

// One brand accent everywhere: Weave iris, light #6d4fb5 and dark #a88cf6 (src/css/weave.css).
const IRIS = { light: 'rgb(109, 79, 181)', dark: 'rgb(168, 140, 246)' } as const;
const PAGES = ['/', '/code/', '/code/download/', '/pricing/', '/product/', '/docs/getting-started/'];

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate(t => {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`brand accent (${theme})`, () => {
    for (const path of PAGES) {
      test(`${path} resolves the primary to Weave iris`, async ({ page }) => {
        await page.goto(path);
        await setTheme(page, theme);
        const iris = await page.evaluate(() => {
          const probe = document.createElement('span');
          // Read the token where pages consume it, so a page-scoped override is caught.
          const host = document.querySelector('main') ?? document.body;
          probe.style.color = 'var(--wv-iris)';
          host.appendChild(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        });
        expect(iris).toBe(IRIS[theme]);
      });
    }

    test('/code primary download button is iris', async ({ page }) => {
      await page.goto('/code/');
      await setTheme(page, theme);
      const button = page.locator('main a.wv-btn--primary').first();
      await expect(button).toHaveCSS('background-color', IRIS[theme]);
    });
  });
}

test.describe('/code hero', () => {
  test('explains the run in four steps', async ({ page }) => {
    await page.goto('/code/');
    const flow = page.locator('figure[aria-labelledby="hero-flow-caption"]');
    await expect(flow).toBeVisible();
    for (const step of ['You give the goal', 'The coordinator splits it', 'Agents work in parallel', 'You review and merge']) {
      await expect(flow.getByText(step)).toBeVisible();
    }
    await expect(flow.locator('a[href="#real-run"]')).toHaveCount(1);
    await expect(page.locator('#real-run')).toHaveCount(1);
  });

  test('never scrolls sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/code/');
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('main *')].some(el => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed'));
    expect(overflow).toBe(false);
  });
});

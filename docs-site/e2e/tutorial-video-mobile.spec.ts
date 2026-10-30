import { test, expect } from '@playwright/test';

// Tutorial players on phone, foldable cover screen and tablet widths.
const viewports = [
  { name: 'iPhone', width: 402, height: 874 },
  { name: 'iPhone Duo cover', width: 466, height: 678 },
  { name: 'iPad portrait', width: 820, height: 1180 },
];

const pages = ['/docs/getting-started/first-increment/', '/docs/studio/projects/', '/tutorials/install-and-plan/'];

for (const vp of viewports) {
  test.describe(`tutorial player on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 760, hasTouch: true });

    for (const path of pages) {
      test(`${path}: player, details and chapters fit the frame`, async ({ page }) => {
        await page.goto(path);
        const figures = page.locator('figure:has(video)');
        const count = await figures.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const figure = figures.nth(i);
          const video = figure.locator('video');
          await expect(video).toHaveAttribute('controls', '');
          await expect(video).toHaveAttribute('playsinline', '');
          const src = await video.locator('source').first().getAttribute('src');
          expect(src).toMatch(/^https:\/\/media\.spec-weave\.com\/video\/.+\.mp4$/);

          const box = await figure.evaluate((fig) => {
            const width = fig.getBoundingClientRect().width;
            const wide = [...fig.querySelectorAll('*')]
              .map((el) => el.getBoundingClientRect().width)
              .filter((w) => w > width + 1);
            const list = fig.querySelector('nav ol');
            const items = list ? [...list.querySelectorAll('li')] : [];
            const last = items[items.length - 1];
            let lastReachable = true;
            if (list && last) {
              list.scrollLeft = list.scrollWidth;
              const l = last.getBoundingClientRect();
              const f = fig.getBoundingClientRect();
              lastReachable = l.left >= f.left - 1 && l.left < f.right;
            }
            return { width, widest: wide.length ? Math.max(...wide) : 0, lastReachable };
          });
          expect(box.widest, `an element inside the player is wider than its ${box.width}px frame`).toBe(0);
          expect(box.lastReachable, 'last chapter cannot be scrolled into view').toBe(true);
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow).toBe(false);
      });
    }
  });
}

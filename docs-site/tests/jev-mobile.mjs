import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:3018';
const output = process.env.SITE_ARTIFACTS || '/tmp/0880-site-artifacts';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 375, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/', '/jev']) {
      const response = await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, `${path}: HTTP status`);
      assert.equal(await page.locator('main h1').count(), 1, `${path}: one main heading`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${path}: horizontal overflow at ${width}`);
      const clipped = await page.locator('main').evaluate(main => Array.from(main.querySelectorAll('p, h1, h2, h3, button, blockquote, dd, code')).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map(el => el.textContent?.slice(0, 100)));
      assert.deepEqual(clipped, [], `${path}: clipped text at ${width}`);
      if (path === '/') {
        await page.getByRole('link', { name: 'Explore Jev in practice' }).waitFor();
        await page.getByRole('button', { name: /Make exports accessible/ }).click();
        await page.getByText('An intent can start small.', { exact: false }).waitFor();
      } else {
        await page.getByRole('button', { name: 'A fallback' }).click();
        assert.match(await page.locator('[aria-live="polite"] blockquote').innerText(), /what leagues do i have/);
        assert.match(await page.locator('[aria-live="polite"]').innerText(), /0\.91/);
        await page.getByRole('button', { name: 'Another language' }).click();
        assert.match(await page.locator('[aria-live="polite"] blockquote').innerText(), /Enséñame/);
        await page.getByRole('button', { name: 'A paraphrase' }).click();
        const faq = page.locator('summary').filter({ hasText: 'What leaves my machine?' });
        await faq.focus();
        await page.keyboard.press('Enter');
        assert.equal(await faq.evaluate(el => el.parentElement.open), true, 'FAQ opens by keyboard');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('main img').evaluate(img => img.complete && img.naturalWidth > 0), true, 'hero image loads');
        const data = await page.request.get(baseUrl + '/evidence/jev-easychamp-benchmark.json');
        assert.equal(data.status(), 200);
        assert.equal((await data.json()).suite.rows.length, 26);
        const replayResponse = await page.request.get(baseUrl + '/evidence/jev-easychamp-replay.json');
        assert.equal(replayResponse.status(), 200, 'current replay is publicly readable');
        const replay = await replayResponse.json();
        assert.equal(replay.rows.length, 62, 'current replay denominator');
        assert.equal(replay.provider.calls, 41, 'current replay provider calls');
        assert.equal(replay.metrics.all.additional_correct_direct_routes, 5);
        const comparisonResponse = await page.request.get(baseUrl + '/evidence/jev-easychamp-agent-comparison.json');
        assert.equal(comparisonResponse.status(), 200, 'paired handler evidence is publicly readable');
        const comparison = await comparisonResponse.json();
        assert.equal(comparison.rows.length, 5, 'paired handler sample size');
        assert.equal(comparison.rows.filter(row => row.enabled.jev.some(call => call.reason === 'accepted')).length, 4, 'paired handler rerun acceptance');
        for (const file of ['jev-easychamp-benchmark.json', 'jev-easychamp-replay.json', 'jev-easychamp-agent-comparison.json']) {
          assert.equal(await page.locator(`main a[href="/evidence/${file}"]`).count(), 1, `${file}: evidence link exists`);
        }
      }
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.screenshot({ path: `${output}/${path === '/' ? 'home' : 'jev'}-${width}-hero.png` });
      await page.screenshot({ path: `${output}/${path === '/' ? 'home' : 'jev'}-${width}.png`, fullPage: true });
      if (path === '/jev') {
        await page.locator('#measurements').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' }));
        await page.screenshot({ path: `${output}/jev-${width}-evidence.png` });
      }
      results.push({ path, width, status: 'pass', consoleErrors: errors });
      assert.deepEqual(errors, [], `${path}: page errors`);
    }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/results.json`, JSON.stringify({ testedAt: new Date().toISOString(), baseUrl, headless: true, results }, null, 2));
console.log(`${results.length} responsive page checks passed; screenshots: ${output}`);

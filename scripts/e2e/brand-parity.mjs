/** Compare the real public website with the real local dashboard; always headless. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = process.env.SPECWEAVE_PACKAGE_ROOT || source;
const artifacts = process.env.SPECWEAVE_E2E_ARTIFACTS || path.join(os.tmpdir(), 'sw-brand-parity');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-brand-project-'));
fs.mkdirSync(artifacts, { recursive: true });
let browser, instance;
try {
  const result = spawnSync(process.execPath, [path.join(pkg, 'bin/specweave.js'), 'project', 'init', '--root', root, '--name', 'Research & product studio', '--goal', 'Create useful work across every AI tool.'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  // Populate both chart paths with real on-disk data; empty states hide contrast regressions.
  const increment = path.join(root, '.specweave/increments/0001-design-check');
  fs.mkdirSync(increment, { recursive: true });
  fs.writeFileSync(path.join(increment, 'metadata.json'), JSON.stringify({ id: '0001-design-check', title: 'Design check', status: 'active', type: 'feature', created: new Date().toISOString() }));
  fs.writeFileSync(path.join(increment, 'spec.md'), '# Design check\n\n## Problem\nVerify populated dashboard contrast.\n');
  const spend = path.join(root, '.specweave/state/spend');
  fs.mkdirSync(spend, { recursive: true });
  fs.writeFileSync(path.join(spend, '2026-09.jsonl'), JSON.stringify({ id: 'design-check', timestamp: '2026-09-22T00:00:00.000Z', provider: 'openai', model: 'test-model', input_tokens: 1000, output_tokens: 200, cached_tokens: 0, cache_write_tokens: 0, reasoning_tokens: 0, cost_usd: 1.25, cost_source: 'calculated' }) + '\n');
  const { DashboardServer } = await import(pathToFileURL(path.join(pkg, 'dist/src/dashboard/server/dashboard-server.js')).href);
  instance = await new DashboardServer({ port: 0, projectRoots: [root], openBrowser: false }).start();
  browser = await chromium.launch({ headless: true });
  const website = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await website.goto('https://spec-weave.com/', { waitUntil: 'networkidle' });
  const reference = await website.evaluate(() => {
    const main = getComputedStyle(document.querySelector('main'));
    const button = getComputedStyle(document.querySelector('a[class*="primary"]'));
    const board = getComputedStyle(document.querySelector('section[class*="board"]'));
    return { background: main.backgroundColor, ink: main.color, font: main.fontFamily,
      headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      button: button.backgroundColor, buttonInk: button.color,
      panel: board.backgroundColor, border: board.borderTopColor };
  });
  await website.screenshot({ path: path.join(artifacts, 'website-reference.png'), fullPage: true });
  const local = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [], externalRequests = [];
  local.on('pageerror', error => errors.push(error.message));
  await local.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      externalRequests.push(route.request().url()); return route.abort();
    }
    return route.continue();
  });
  await local.goto(`http://127.0.0.1:${instance.port}/project`);
  await local.getByRole('heading', { name: 'Research & product studio', exact: true }).waitFor();
  await local.evaluate(() => document.fonts.ready);
  const actual = await local.evaluate(() => {
    const shell = getComputedStyle(document.querySelector('.work-shell'));
    const button = getComputedStyle(document.querySelector('.hub-primary'));
    const panel = getComputedStyle(document.querySelector('.hub-purpose'));
    return { background: shell.backgroundColor, ink: shell.color, font: shell.fontFamily,
      headingFont: getComputedStyle(document.querySelector('.hub-heading h1')).fontFamily,
      button: button.backgroundColor, buttonInk: button.color,
      panel: panel.backgroundColor, border: panel.borderTopColor };
  });
  assert.deepEqual(actual, reference, 'Public website and dashboard design differ');
  assert.equal(await local.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').some(f => f.family.includes('Newsreader') && f.weight === '450')), true, 'Exact 450 display face must load locally');
  assert.equal(await local.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').some(f => f.family.includes('IBM Plex Sans'))), true, 'Body font must load locally');
  for (const [name, width, height] of [['desktop', 1440, 1050], ['tablet', 820, 1180], ['mobile', 390, 844]]) {
    await local.setViewportSize({ width, height });
    await local.screenshot({ path: path.join(artifacts, `aligned-hub-${name}.png`), fullPage: true });
    assert.equal(await local.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
  }
  const routes = [];
  for (const route of ['/', '/increments', '/sessions', '/sync', '/overview', '/config', '/notifications', '/costs']) {
    await local.setViewportSize({ width: 1440, height: 1050 });
    await local.goto(`http://127.0.0.1:${instance.port}${route}`);
    await local.locator('.work-shell').waitFor();
    await local.waitForFunction(() => !document.querySelector('[role="status"]')?.textContent?.includes('Loading'));
    if (route === '/overview') {
      const total = local.locator('.relative.inline-flex .absolute span').filter({ hasText: /^1$/ });
      await total.waitFor();
      assert.equal(await total.evaluate(el => getComputedStyle(el).color), reference.ink, 'Populated overview total lacks contrast');
    }
    if (route === '/costs') {
      await local.getByRole('button', { name: 'Providers', exact: true }).click();
      const amount = local.getByRole('button').filter({ hasText: 'openai' }).getByText('$1.25', { exact: true });
      await amount.waitFor();
      assert.equal(await amount.evaluate(el => getComputedStyle(el).color), reference.ink, 'Provider amount lacks contrast');
    }
    await local.waitForFunction(ink => [...document.querySelectorAll('button.bg-gray-700.text-white')].every(el => getComputedStyle(el).color === ink), reference.ink);
    const controls = await local.evaluate(() => {
      const visible = element => element.getBoundingClientRect().width > 0;
      return {
        helpers: [...document.querySelectorAll('.text-gray-600')].filter(visible).slice(0, 5).map(element => getComputedStyle(element).color),
        selected: [...document.querySelectorAll('button.bg-gray-700.text-white')].filter(visible).map(element => ({
          text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor,
        })),
        primary: [...document.querySelectorAll('button.bg-indigo-600')].filter(visible).map(element => ({
          text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor,
        })),
      };
    });
    for (const helper of controls.helpers) assert.equal(helper, 'rgb(101, 105, 94)', `Helper text lacks website contrast on ${route}`);
    for (const selected of controls.selected) assert.equal(selected.color, reference.ink, `Low-contrast selected control on ${route}: ${selected.text}`);
    for (const primary of controls.primary) {
      assert.equal(primary.background, reference.button, `Primary action differs on ${route}: ${primary.text}`);
      assert.equal(primary.color, reference.buttonInk, `Primary action foreground differs on ${route}`);
    }
    routes.push({ route, ...controls });
    await local.screenshot({ path: path.join(artifacts, `aligned-${route.replaceAll('/', '') || 'board'}.png`), fullPage: true });
  }
  assert.ok(routes.some(route => route.selected.length > 0), 'Selected-control comparison must run');
  assert.ok(routes.some(route => route.primary.length > 0), 'Adjacent primary-action comparison must run');
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, [], 'Local dashboard must not fetch third-party fonts or assets');
  fs.writeFileSync(path.join(artifacts, 'brand-parity.json'), JSON.stringify({ reference, actual, routes, externalRequests, errors }, null, 2));
  console.log('PASS: live website/dashboard colors, type, buttons and panels match; fonts load locally; desktop/tablet/mobile and eight adjacent routes pass with selected-control and primary-action assertions');
} finally {
  await browser?.close();
  await instance?.stop();
  fs.rmSync(root, { recursive: true, force: true });
}

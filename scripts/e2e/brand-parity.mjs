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
  assert.equal(await local.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').some(f => f.family.includes('Newsreader'))), true, 'Display font must load locally');
  assert.equal(await local.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').some(f => f.family.includes('IBM Plex Sans'))), true, 'Body font must load locally');
  for (const [name, width, height] of [['desktop', 1440, 1050], ['tablet', 820, 1180], ['mobile', 390, 844]]) {
    await local.setViewportSize({ width, height });
    await local.screenshot({ path: path.join(artifacts, `aligned-hub-${name}.png`), fullPage: true });
    assert.equal(await local.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
  }
  for (const route of ['/', '/increments', '/sessions', '/sync', '/overview', '/config']) {
    await local.setViewportSize({ width: 1440, height: 1050 });
    await local.goto(`http://127.0.0.1:${instance.port}${route}`);
    await local.locator('.work-shell').waitFor();
    await local.screenshot({ path: path.join(artifacts, `aligned-${route.replaceAll('/', '') || 'board'}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, [], 'Local dashboard must not fetch third-party fonts or assets');
  fs.writeFileSync(path.join(artifacts, 'brand-parity.json'), JSON.stringify({ reference, actual, externalRequests, errors }, null, 2));
  console.log('PASS: live website/dashboard colors, type, buttons and panels match; fonts load locally; desktop/tablet/mobile and six adjacent routes pass');
} finally {
  await browser?.close();
  await instance?.stop();
  fs.rmSync(root, { recursive: true, force: true });
}

/** Real server + isolated usage logs. Run after npm run build. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { DashboardServer } from '../../dist/src/dashboard/server/dashboard-server.js';

process.env.PWDEBUG = '0';
process.env.PLAYWRIGHT_HTML_OPEN = 'never';
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-cost-honesty-'));
const root = path.join(fixture, 'project');
const priorHome = process.env.HOME;
process.env.HOME = path.join(fixture, 'home');
const artifacts = process.env.SPECWEAVE_E2E_ARTIFACTS || path.join(os.tmpdir(), 'specweave-cost-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
fs.writeFileSync(path.join(root, '.specweave/config.json'), JSON.stringify({ project: { name: 'Usage evidence fixture' } }));
const logs = path.join(process.env.HOME, '.claude/projects', `-${root.replace(/^\//, '').replace(/\//g, '-')}`);
fs.mkdirSync(logs, { recursive: true });
function session(id, models) {
  fs.writeFileSync(path.join(logs, `${id}.jsonl`), models.map((model, i) => JSON.stringify({
    type: 'assistant', timestamp: `2026-09-14T10:0${i}:00Z`,
    message: { model, usage: { input_tokens: 1000, output_tokens: 500 } },
  })).join('\n'));
}
session('unknown-session', ['claude-opus-5']);
session('mixed-session', ['claude-opus-4-6', 'claude-sonnet-4-6']);
session('priced-session', ['claude-opus-4-6']);
const server = new DashboardServer({ port: 0, projectRoots: [root], openBrowser: false });
let instance;
let browser;
try {
  instance = await server.start();
  const payload = await (await fetch(`${instance.url}/api/costs/summary`)).json();
  assert.equal(payload.data.totalCost, null);
  assert.equal(payload.data.unpricedSessionCount, 2);
  assert.equal(payload.data.estimatedSubtotal, 0.0175);
  assert.equal(payload.data.sessions.find(s => s.sessionId === 'unknown-session').model, 'claude-opus-5');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1512, height: 1080 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${instance.url}/costs`);
  await page.getByRole('heading', { name: 'Claude Code Usage' }).waitFor();
  assert.match(await page.getByText('Estimated API Value', { exact: true }).locator('..').innerText(), /Unknown/);
  await page.getByText(/2 unpriced sessions/).waitFor();
  await page.getByText('claude-opus-5', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'cost-estimates.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sessions (3)', exact: true }).click();
  const mixed = page.locator('tr').filter({ has: page.getByText('mixed', { exact: true }) });
  assert.match(await mixed.innerText(), /Unknown/);
  await mixed.click();
  await page.getByText('claude-opus-4-6 → claude-sonnet-4-6', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'mixed-model-estimate.png'), fullPage: true });
  await page.goto(`${instance.url}/overview`);
  await page.getByText('Estimated API Value', { exact: true }).waitFor();
  assert.match(await page.getByText('Estimated API Value', { exact: true }).locator('..').innerText(), /Unknown/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks: ['unknown API total', 'exact model identity', 'priced subtotal', 'unknown cost UI', 'mixed model evidence', 'overview unknown', 'no browser errors'], artifacts }, null, 2));
} finally {
  if (browser) await browser.close();
  if (instance) await instance.stop();
  if (priorHome === undefined) delete process.env.HOME;
  else process.env.HOME = priorHome;
  fs.rmSync(fixture, { recursive: true, force: true });
}

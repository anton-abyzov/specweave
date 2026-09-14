/** Run after npm run build. Exercises a real local server, isolated files and headless Chromium. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { DashboardServer } from '../../dist/src/dashboard/server/dashboard-server.js';

process.env.PWDEBUG = '0';
process.env.PLAYWRIGHT_HTML_OPEN = 'never';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-board-e2e-'));
const artifacts = process.env.SPECWEAVE_E2E_ARTIFACTS || path.join(os.tmpdir(), 'specweave-board-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const base = path.join(root, '.specweave');
fs.mkdirSync(base, { recursive: true });
fs.writeFileSync(
  path.join(base, 'config.json'),
  JSON.stringify({ project: { name: 'Continuity · test workspace' } }),
);
const now = new Date().toISOString();
function seed(id, title, summary, state, done = 0, actor = 'codex@dev') {
  const dir = path.join(base, 'increments', id);
  fs.mkdirSync(path.join(dir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ title, status: state, createdAt: now }));
  fs.writeFileSync(
    path.join(dir, 'spec.md'),
    `# ${title}\n\n## Problem\n${summary}\n\n## Acceptance Criteria\n- [${done === 2 ? 'x' : ' '}] AC-01 Expected outcome\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'tasks.md'),
    '# Tasks\n\n### T-01 Build\n- AC: AC-01 | Files: src/app.ts | Test: npm test\n\n### T-02 Verify\n- AC: AC-01 | Files: src/test.ts | Test: npm test\n',
  );
  const events = Array.from({ length: done }, (_, i) => ({
    t: `T-0${i + 1}`,
    e: 'done',
    by: actor,
    at: now,
    evidence: 'abc1234; npm test exit 0',
  }));
  if (state === 'active' && done < 2) events.push({ t: `T-0${done + 1}`, e: 'claim', by: actor, at: now });
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return dir;
}
const active = seed(
  '0001-portable',
  'Keep checkout work portable',
  'Continue checkout improvements across tools without losing the acceptance criteria.',
  'active',
  1,
);
seed(
  '0002-auth',
  'Resolve account permissions',
  'Unblock workspace invitations for the support team.',
  'paused',
  0,
  'claude@dev',
);
seed(
  '0003-release',
  'Prepare the release',
  'Review passing checks and confirm the package contains the new dashboard.',
  'active',
  2,
);
const complete = seed(
  '0004-evidence',
  'Make progress trustworthy',
  'Use ledger evidence and readable specifications as the shared record.',
  'completed',
  2,
);
fs.writeFileSync(path.join(complete, 'reports/verify.json'), JSON.stringify({ ok: true, ranAt: now }));
process.env.CODEX_HOME = path.join(root, 'codex-fixture');
fs.mkdirSync(path.join(process.env.CODEX_HOME, 'sessions'), { recursive: true });
fs.writeFileSync(
  path.join(process.env.CODEX_HOME, 'sessions/observed.jsonl'),
  [
    JSON.stringify({
      type: 'session_meta',
      payload: { id: 'observed-session', cwd: root, model_provider: 'openai', originator: 'Codex Desktop' },
    }),
    JSON.stringify({
      type: 'turn_context',
      timestamp: now,
      payload: { model: 'observed-model', effort: 'high' },
    }),
  ].join('\n'),
);
const server = new DashboardServer({ port: 0, projectRoots: [root], openBrowser: false });
let instance;
let browser;
try {
  instance = await server.start();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1512, height: 1080 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(instance.url);
  await page.getByRole('heading', { name: 'Work, without the reset.' }).waitFor();
  await page.getByRole('button', { name: 'Keep checkout work portable', exact: true }).waitFor();
  const card = page.locator('[data-intent-id="increment:0001-portable"]');
  await card.getByText('1/2 tasks', { exact: true }).waitFor();
  await page.getByRole('button', { name: '+ New intent', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Capture an intent' });
  await create.getByLabel('Title', { exact: true }).fill('Improve the handoff copy');
  await create
    .getByLabel('Intent', { exact: true })
    .fill('Make the next step clear before someone changes coding tools.');
  await create.getByRole('button', { name: 'Create intent', exact: true }).click();
  await create.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Improve the handoff copy', exact: true }).waitFor();
  const newCard = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: 'Improve the handoff copy', exact: true }) });
  await newCard.getByRole('combobox').selectOption('active');
  await page.getByRole('status').filter({ hasText: 'moved to In progress' }).waitFor();
  await page.reload();
  assert.equal(await page.getByLabel('State for Improve the handoff copy').inputValue(), 'active');
  await newCard.dragTo(page.getByRole('region', { name: 'Review column' }));
  await page.getByRole('status').filter({ hasText: 'moved to Review' }).waitFor();
  await page.getByRole('button', { name: 'Improve the handoff copy', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Improve the handoff copy' });
  await detail.getByText('+ Record a setup or continuation', { exact: true }).click();
  await detail.getByLabel('Harness', { exact: true }).fill('Claude Code');
  await detail.getByLabel('Model', { exact: true }).fill('opus-test');
  await detail.getByLabel('Effort', { exact: true }).fill('high');
  await detail.getByRole('button', { name: 'Record setup', exact: true }).click();
  await detail.getByText('opus-test', { exact: true }).waitFor();
  await detail.getByLabel('Harness', { exact: true }).fill('Codex');
  await detail.getByLabel('Model', { exact: true }).fill('astra-test');
  await detail.getByLabel('Effort', { exact: true }).fill('medium');
  await detail.getByLabel('Surface', { exact: true }).fill('Desktop');
  await detail.getByRole('button', { name: 'Record setup', exact: true }).click();
  await detail.getByText('astra-test', { exact: true }).waitFor();
  await detail.getByText('Link a local Codex or Claude Code session', { exact: true }).click();
  await detail
    .getByRole('combobox', { name: 'Local session', exact: true })
    .selectOption('Codex:observed-session');
  await detail.getByRole('button', { name: 'Link observed session', exact: true }).click();
  await detail.getByText('observed-model', { exact: true }).waitFor();
  await detail.getByText('Observed', { exact: true }).waitFor();
  await detail.screenshot({ path: path.join(artifacts, 'execution-history.png') });
  await detail.getByRole('button', { name: 'Close dialog' }).click();
  // External ledger-only edit: no tasks.md render and no reload.
  fs.appendFileSync(
    path.join(active, 'ledger.jsonl'),
    JSON.stringify({
      t: 'T-02',
      e: 'done',
      by: 'codex@dev',
      at: new Date().toISOString(),
      evidence: 'abc5678; npm test exit 0',
    }) + '\n',
  );
  await card.getByText('2/2 tasks', { exact: true }).waitFor({ timeout: 8000 });
  fs.writeFileSync(
    path.join(active, 'spec.md'),
    '# Keep checkout work portable\n\n## Problem\nContinue with any tool.\n\n## Acceptance Criteria\n- [x] AC-01 Expected outcome\n',
  );
  await card.getByText('1/1 ACs', { exact: true }).waitFor({ timeout: 8000 });
  fs.writeFileSync(
    path.join(active, 'reports/verify.json'),
    JSON.stringify({ ok: true, ranAt: new Date().toISOString() }),
  );
  await card.getByText('✓ Verified', { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: path.join(artifacts, 'work-board-desktop.png'), fullPage: true });
  await card.getByRole('link', { name: 'Evidence for Keep checkout work portable' }).click();
  await page.getByText('Verification and specification', { exact: true }).waitFor();
  await page.getByText('Task evidence', { exact: true }).click();
  await page.getByText('abc5678; npm test exit 0', { exact: true }).waitFor();
  const rejected = await fetch(`${instance.url}/api/work`, {
    method: 'POST',
    headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Forbidden' }),
  });
  assert.equal(rejected.status, 403);
  await page.goto(instance.url);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '+ New intent', exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'work-board-mobile.png'), fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'page must not overflow horizontally',
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          'modern ledger',
          'create intent',
          'accessible move',
          'persist reload',
          'drag drop',
          'cross-harness continuation',
          'explicit local session association',
          'live ledger/spec/verification refresh',
          'evidence detail',
          'origin rejection',
          'mobile overflow',
          'no browser errors',
        ],
        artifacts,
      },
      null,
      2,
    ),
  );
} finally {
  if (browser) await browser.close();
  if (instance) await instance.stop();
  fs.rmSync(root, { recursive: true, force: true });
}

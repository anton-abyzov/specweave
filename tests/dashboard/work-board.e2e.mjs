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
  await page.getByRole('heading', { name: 'Work board', exact: true }).waitFor();
  const realRoot = fs.realpathSync(root);
  assert.equal(await page.locator('.work-header-path code').innerText(), realRoot, 'header names the folder on disk');
  const cardOf = (id) => page.locator(`.wb-card[data-intent-id="${id}"]`);
  const card = cardOf('increment:0001-portable');
  await card.getByText('1/2 tasks', { exact: true }).waitFor();
  await card.getByRole('progressbar').waitFor();
  // A paused increment sits in Blocked and says why.
  await cardOf('increment:0002-auth').getByText('Paused', { exact: true }).waitFor();
  const layout = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.wb-card')].flatMap((el) => {
        const box = el.getBoundingClientRect();
        const lane = el.closest('.wb-cards');
        const inner = lane.getBoundingClientRect().left + lane.clientLeft + lane.clientWidth;
        const bar = el.querySelector('.wb-bar')?.getBoundingClientRect().height ?? 6;
        return el.scrollWidth > el.clientWidth || box.right > inner + 0.5 || bar < 6
          ? [`${el.dataset.intentId}: card ${box.right} lane ${inner} bar ${bar}`]
          : [];
      }),
    );
  assert.deepEqual(await layout(), [], 'no card is clipped, under a scrollbar or with a thin progress bar');
  await page.getByRole('button', { name: '+ New intent', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Capture an intent' });
  await create.getByLabel('Title', { exact: true }).fill('Improve the handoff copy');
  await create
    .getByLabel('Intent', { exact: true })
    .fill('Make the next step clear before someone changes coding tools.');
  await create.getByRole('button', { name: 'Create intent', exact: true }).click();
  await create.waitFor({ state: 'hidden' });
  const newCard = page.locator('.wb-card').filter({ hasText: 'Improve the handoff copy' });
  await newCard.waitFor();
  // Keyboard: Enter on the card opens the panel; the state control lives there.
  await newCard.focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('dialog', { name: 'Improve the handoff copy' });
  await detail.getByLabel('State for Improve the handoff copy').selectOption('active');
  await page.getByRole('status').filter({ hasText: 'moved to In progress' }).waitFor();
  assert.match(page.url(), /[?&]item=/, 'the open item is in the address');
  await page.reload();
  assert.equal(await detail.getByLabel('State for Improve the handoff copy').inputValue(), 'active');
  // Focus lands on the panel's close button once it is wired up; Escape then closes it.
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Close details');
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'detached' });
  assert.doesNotMatch(page.url(), /[?&]item=/);
  await newCard.dragTo(page.getByRole('region', { name: 'Review column' }));
  await page.getByRole('status').filter({ hasText: 'moved to Review' }).waitFor();
  // The card leaves its old column with an exit animation; wait for the one in Review.
  await page.getByRole('region', { name: 'Review column' }).locator('.wb-card').filter({ hasText: 'Improve the handoff copy' }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.wb-card[data-intent-id]').length === new Set([...document.querySelectorAll('.wb-card')].map((el) => el.dataset.intentId)).size);
  await newCard.click();
  await detail.getByRole('tab', { name: /^Agents/ }).click();
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
  await detail.getByRole('button', { name: 'Close details' }).click();
  await detail.waitFor({ state: 'detached' });
  // The panel of an increment: spec, criteria, tasks and the ledger timeline, all from its folder.
  await card.click();
  const panel = page.getByRole('dialog', { name: 'Keep checkout work portable' });
  await panel.getByText(path.join(realRoot, '.specweave/increments/0001-portable'), { exact: true }).waitFor();
  await panel.getByRole('tab', { name: /^Spec/ }).click();
  await panel.getByRole('heading', { name: 'Acceptance Criteria' }).waitFor();
  await panel.getByRole('tab', { name: /^Criteria/ }).click();
  await panel.getByText('Expected outcome').waitFor();
  await panel.getByText('Not met', { exact: true }).waitFor();
  await panel.getByRole('tab', { name: /^Tasks/ }).click();
  await panel.getByText('Build', { exact: true }).waitFor();
  await panel.getByRole('tabpanel', { name: 'Tasks' }).getByText('In progress', { exact: true }).waitFor();
  await panel.getByRole('tab', { name: /^Timeline/ }).click();
  await panel.getByText('abc1234; npm test exit 0', { exact: true }).waitFor();
  // External ledger-only edit: no tasks.md render and no reload. Board and open panel both follow.
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
  await panel.getByText('abc5678; npm test exit 0', { exact: true }).waitFor({ timeout: 8000 });
  await panel.getByText('2/2 tasks · 1/1 criteria', { exact: true }).waitFor({ timeout: 8000 });
  await panel.screenshot({ path: path.join(artifacts, 'detail-panel.png') });
  await panel.getByRole('button', { name: 'Close details' }).click();
  await panel.waitFor({ state: 'detached' });
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
  await card.getByText('Verified', { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: path.join(artifacts, 'work-board-desktop.png'), fullPage: true });
  // Filters: every count comes from the same set, the address carries them, Clear resets.
  // Cards leave with an exit animation, so counts are awaited, not read once.
  const shows = (n) => page.waitForFunction((count) => document.querySelectorAll('.wb-card').length === count, n);
  const total = await page.locator('.wb-card').count();
  await page.getByLabel('Search work').fill('release');
  await page.getByText('1 item shown of', { exact: false }).waitFor();
  await shows(1);
  await page.waitForURL(/[?&]q=release/);
  await page.getByRole('button', { name: /^Clear 1 filter/ }).click();
  await shows(total);
  await page.getByRole('group', { name: 'Filter by state' }).getByRole('button', { name: /Blocked/ }).click();
  await page.waitForURL(/[?&]state=blocked/);
  await shows(1);
  assert.equal(await page.locator('.wb-board').getByRole('region').count(), 1, 'only the selected column is shown');
  await page.getByLabel('Agent', { exact: true }).selectOption('codex');
  await page.getByText('No work matches these filters').waitFor();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('Verification', { exact: true }).selectOption('passed');
  await shows(2);
  await page.getByRole('button', { name: /^Clear 1 filter/ }).click();
  await page.getByLabel('Sort by').selectOption('id');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  const rows = page.locator('.wb-list tbody tr');
  await rows.first().waitFor();
  assert.equal(await rows.count(), total, 'the list shows the same items as the board');
  assert.match(await rows.first().innerText(), /^0004/, 'ID sort, newest first');
  await page.getByRole('button', { name: /^ID/ }).click();
  await page.waitForURL(/[?&]dir=asc/);
  // The header flips the order.
  await page.waitForFunction(() => document.querySelector('.wb-list tbody tr')?.textContent?.startsWith('0001'));
  await page.screenshot({ path: path.join(artifacts, 'work-list-desktop.png'), fullPage: true });
  await rows.first().click();
  await panel.getByRole('link', { name: /Open the evidence page for 0001/ }).click();
  await page.getByText('Verification and specification', { exact: true }).waitFor();
  await page.getByText('Task evidence', { exact: true }).click();
  await page.getByText('abc5678; npm test exit 0', { exact: true }).waitFor();
  // A link made on another machine names that machine's path: the local checkout is shown and named.
  await page.goto(`${instance.url}/?project=Users-someone-Projects-${path.basename(realRoot)}`);
  await page.getByRole('status').filter({ hasText: 'another machine' }).waitFor();
  await page.waitForURL((url) => url.searchParams.get('project') === realRoot.replace(/^\//, '').replace(/\//g, '-'));
  await card.waitFor();
  const rejected = await fetch(`${instance.url}/api/work`, {
    method: 'POST',
    headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Forbidden' }),
  });
  assert.equal(rejected.status, 403);
  await page.goto(`${instance.url}/sessions`);
  const localSessions = page.locator('.work-local-sessions');
  await localSessions.getByText('observed-model', { exact: true }).waitFor();
  // Native session stores are outside the project watcher: reconcile them while the page stays open.
  fs.appendFileSync(
    path.join(process.env.CODEX_HOME, 'sessions/observed.jsonl'),
    '\n' + JSON.stringify({
      type: 'turn_context',
      timestamp: new Date().toISOString(),
      payload: { model: 'continued-model', effort: 'medium' },
    }) + '\n',
  );
  fs.writeFileSync(
    path.join(process.env.CODEX_HOME, 'sessions/new.jsonl'),
    [
      JSON.stringify({ type: 'session_meta', payload: { id: 'new-session', cwd: root } }),
      JSON.stringify({
        type: 'turn_context',
        timestamp: new Date().toISOString(),
        payload: { model: 'new-session-model', effort: 'low' },
      }),
    ].join('\n'),
  );
  await localSessions.getByText('continued-model', { exact: true }).waitFor({ timeout: 35000 });
  await localSessions.getByText('new-session-model', { exact: true }).waitFor({ timeout: 35000 });
  await page.screenshot({ path: path.join(artifacts, 'native-session-live-refresh.png'), fullPage: true });
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
          'no clipped cards',
          'create intent',
          'keyboard open and move',
          'deep link reload',
          'drag drop',
          'detail panel: spec, criteria, tasks, timeline',
          'filters, sort and list view',
          'foreign project link',
          'cross-harness continuation',
          'explicit local session association',
          'live ledger/spec/verification refresh',
          'evidence detail',
          'origin rejection',
          'native session continuation and discovery without reload',
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

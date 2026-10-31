#!/usr/bin/env node
/**
 * Headless check of the dashboard Timeline page and the Work board filters.
 *
 *   node scripts/dashboard/plan-timeline-check.mjs [--root <project>] [--out <dir>]
 *
 * Without --root it builds a fixture project (live, open, recorded-after and
 * old finished increments) and asserts what a user sees. With --root it only
 * renders that project and saves screenshots. Needs `npm run build` first.
 * Always headless; screenshots go to --out (default: a temp directory).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

process.env.PWDEBUG = '0';
process.env.PLAYWRIGHT_HTML_OPEN = 'never';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..', '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const out = path.resolve(arg('--out') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'sw-timeline-check-')));
fs.mkdirSync(out, { recursive: true });

const NOW = Date.now();
const at = (minutesBefore) => new Date(NOW - minutesBefore * 60000).toISOString();

function increment(root, id, { status, title, tasks, events, created, oldDays }) {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, title, status, created }, null, 2));
  const body = tasks.map((t) => `### ${t} ${title} ${t}\n- AC: AC-01 | Files: src/${id}-${t}.ts | Test: true\n`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'spec.md'),
    `# ${title}\n\n## Problem\n\n${title} for the timeline check.\n\n## Acceptance Criteria\n\n- [ ] AC-01: works\n\n## Tasks\n\n${body}`,
  );
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''));
  if (oldDays) {
    const old = new Date(NOW - oldDays * 86400000);
    for (const f of fs.readdirSync(dir)) fs.utimesSync(path.join(dir, f), old, old);
  }
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-timeline-fixture-'));
  fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'timeline-fixture' } }));
  const live = [];
  for (let i = 1; i <= 6; i++) {
    live.push({ t: `T-0${i}`, e: 'claim', by: 'claude@m4', at: at(900 - (i - 1) * 25), model: 'opus' });
    live.push({ t: `T-0${i}`, e: 'done', by: 'claude@m4', at: at(900 - i * 25), evidence: 'abc1234', model: 'opus' });
  }
  increment(root, '0101-live-history', {
    status: 'completed', title: 'Live tracked history', created: at(1000),
    tasks: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06'], events: live,
  });
  increment(root, '0102-open-forecast', {
    status: 'active', title: 'Open work with a forecast', created: at(180),
    tasks: ['T-01', 'T-02', 'T-03'],
    events: [
      { t: 'T-01', e: 'claim', by: 'codex@m3', at: at(120) },
      { t: 'T-01', e: 'done', by: 'codex@m3', at: at(90), evidence: 'def5678' },
      { t: 'T-02', e: 'claim', by: 'codex@m3', at: at(20), line: 'Wiring the forecast' },
    ],
  });
  increment(root, '0103-recorded-after', {
    status: 'completed', title: 'Recorded after the work', created: at(300),
    tasks: ['T-01', 'T-02'],
    events: [
      { t: 'T-01', e: 'skip', by: 'claude@m4', at: at(200), note: 'Implemented in PR #9' },
      { t: 'T-02', e: 'skip', by: 'claude@m4', at: at(199.9), note: 'Implemented in PR #9' },
    ],
  });
  increment(root, '0104-old-finished', {
    status: 'completed', title: 'Finished long ago', created: at(60 * 24 * 41), oldDays: 40,
    tasks: ['T-01'],
    events: [
      { t: 'T-01', e: 'claim', by: 'claude@m4', at: at(60 * 24 * 40 + 30) },
      { t: 'T-01', e: 'done', by: 'claude@m4', at: at(60 * 24 * 40), evidence: 'aaa' },
    ],
  });
  return root;
}

const failures = [];
function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
}

const given = arg('--root');
const root = given ? path.resolve(given) : fixture();
const { DashboardServer } = await import(path.join(pkg, 'dist', 'src', 'dashboard', 'server', 'dashboard-server.js'));
const port = 3600 + Math.floor(Math.random() * 300);
const server = new DashboardServer({ port, projectRoots: [root], openBrowser: false });
const instance = await server.start();
const slug = root.replace(/^\//, '').replace(/\//g, '-');
const base = `${instance.url}`;
const q = `project=${encodeURIComponent(slug)}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1100 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${base}/timeline?${q}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="gantt"], .work-empty', { timeout: 15000 });
  await page.screenshot({ path: path.join(out, 'timeline.png'), fullPage: true });
  console.log(`screenshot ${path.join(out, 'timeline.png')}`);

  if (!given) {
    const openRows = await page.locator('.gantt-row').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-increment')));
    check(JSON.stringify(openRows) === JSON.stringify(['0102-open-forecast']), `Open view lists only open work (${openRows.join(', ')})`);
    check((await page.locator('.gantt-row .gantt-forecast').count()) === 1, 'Open increment has a forecast bar');
    check((await page.locator('.gantt-now-label').count()) === 1, 'Gantt shows a Now line');
    const kpis = await page.locator('[data-testid="timeline-kpis"]').innerText();
    check(/Open increments\s*1\s*2 tasks left/.test(kpis), 'KPI: one open increment, two tasks left');
    // Open picks the Gantt rows only: closed work in the window still feeds activity and the Closed tile.
    check((await page.locator('.timeline-activity li').count()) === 17, 'Activity feed under Open keeps the 17 events of work closed in the window');
    check(/Closed in the last 7 days\s*9/.test(kpis), 'KPI under Open: 9 tasks closed in the last 7 days');
    check((await page.locator('.timeline-throughput rect').count()) > 0, 'Throughput chart has bars');
    check((await page.locator('.timeline-pace tbody tr').count()) >= 2, 'Pace table lists the measured rates');

    await page.getByRole('radio', { name: 'All' }).click();
    await page.waitForTimeout(300);
    const allRows = await page.locator('.gantt-row').count();
    check(allRows === 3, `All (last 30 days) shows 3 increments, hides the 40-day-old one (got ${allRows})`);
    const allKpis = await page.locator('[data-testid="timeline-kpis"]').innerText();
    check(/Planned before the work\s*50%/.test(allKpis), 'KPI: half the finished increments were planned live');
    check(/Closed in the last 7 days\s*9/.test(allKpis), 'KPI: 9 tasks closed in the last 7 days across the visible increments');
    await page.getByLabel('Search increments').fill('recorded');
    await page.waitForTimeout(300);
    const searched = await page.locator('[data-testid="timeline-kpis"]').innerText();
    check(/Closed in the last 7 days\s*2/.test(searched), 'Text filter narrows the KPI tiles too');
    check((await page.locator('.timeline-activity li').count()) === 2, 'Text filter narrows the activity feed');
    await page.getByLabel('Search increments').fill('');
    await page.waitForTimeout(300);
    await page.getByLabel('Time window').selectOption('all');
    await page.waitForTimeout(300);
    check((await page.locator('.gantt-row').count()) === 4, 'All time shows all 4 increments');
    check((await page.locator('.gantt-row em', { hasText: 'recorded after' }).count()) === 1, 'Recorded-after increment is flagged');
    await page.getByLabel('Agent tool').selectOption('codex');
    await page.waitForTimeout(300);
    const codexRows = await page.locator('.gantt-row').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-increment')));
    check(JSON.stringify(codexRows) === JSON.stringify(['0102-open-forecast']), 'Agent filter narrows rows to codex work');
    check(page.url().includes('tool=codex') && page.url().includes('scope=all'), 'Filters live in the URL');
    await page.screenshot({ path: path.join(out, 'timeline-filtered.png'), fullPage: true });

    await page.locator('.gantt-row .gantt-label a').first().click();
    await page.waitForURL(/\/increments\/0102-open-forecast/, { timeout: 10000 });
    await page.waitForTimeout(800);
    check((await page.locator('body').innerText()).includes('Open work with a forecast'), 'Row link opens the increment detail page');
    await page.screenshot({ path: path.join(out, 'detail.png') });

    await page.goto(`${base}/?${q}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.work-card', { timeout: 15000 });
    const cards = () => page.locator('.work-card').evaluateAll((c) => c.map((x) => x.getAttribute('data-intent-id')).sort());
    let ids = await cards();
    check(!ids.includes('increment:0104-old-finished') && ids.length === 3, `Work board hides done work older than 14 days (${ids.length} cards)`);
    await page.getByLabel('Done window').selectOption('all');
    await page.waitForTimeout(300);
    check((await cards()).length === 4, 'Done: all shows the old card');
    await page.getByLabel('Agent tool').selectOption('codex');
    await page.waitForTimeout(300);
    ids = await cards();
    check(JSON.stringify(ids) === JSON.stringify(['increment:0102-open-forecast']), 'Work board agent filter keeps only codex work');
    await page.getByLabel('Agent tool').selectOption('claude');
    await page.waitForTimeout(300);
    const modelText = await page.locator('.work-card[data-intent-id="increment:0101-live-history"]').innerText();
    check(modelText.includes('opus'), 'Work board card shows the model from the ledger');
    await page.screenshot({ path: path.join(out, 'work-board.png'), fullPage: false });
    check(errors.length === 0, `No page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  } else {
    const rows = await page.locator('.gantt-row').count();
    check(rows > 0 || (await page.locator('.work-empty').count()) > 0, `Timeline rendered ${rows} open increments`);
    await page.getByRole('radio', { name: 'All' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, 'timeline-all.png'), fullPage: true });
    await page.goto(`${base}/?${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, 'work-board.png') });
    check(errors.length === 0, `No page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  }
} finally {
  await browser.close();
  await instance.stop();
  if (!given) fs.rmSync(root, { recursive: true, force: true });
}
console.log(`screenshots: ${out}`);
if (failures.length) {
  console.log(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('PASS');
process.exit(0);

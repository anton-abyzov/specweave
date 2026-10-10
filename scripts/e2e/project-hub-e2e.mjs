/** Real CLI and optional headless browser proof. Set SPECWEAVE_PACKAGE_ROOT to test an installed tarball. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = process.env.SPECWEAVE_PACKAGE_ROOT || source;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-project-e2e-'));
const artifacts = process.env.SPECWEAVE_E2E_ARTIFACTS || path.join(os.tmpdir(), 'sw-project-e2e-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
function cli(args, expected = 0) {
  const result = spawnSync(process.execPath, [path.join(pkg, 'bin/specweave.js'), 'project', ...args, '--root', root, '--json'], { cwd: root, encoding: 'utf8', env: { ...process.env, PWDEBUG: '0', PLAYWRIGHT_HTML_OPEN: 'never' } });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
}
let browser, instance;
try {
  const initial = cli(['init', '--name', 'Research & product studio', '--goal', 'Turn primary sources into decisions, useful content and tested software.']);
  assert.equal(initial.hub.revision, 1);
  assert.equal(fs.existsSync(path.join(root, '.git')), false);
  const originalConfig = fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8');
  assert.equal(cli(['init', '--name', 'Ignored', '--goal', 'Retain original']).existing, true);
  assert.equal(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8'), originalConfig);
  const contextFile = path.join(root, 'context.md');
  fs.writeFileSync(contextFile, 'Use original sources. Keep decisions and outputs with their work.\nDesign, research and code belong to the same project.');
  cli(['set', '--revision', '1', '--context-file', contextFile]);
  cli(['set', '--revision', '1', '--goal', 'Stale update'], 3);
  const assignment = cli(['work-add', '--title', 'Compare project workflows', '--summary', 'Research native features and document which parts stay portable.']);
  cli(['work-update', '--intent', assignment.id, '--revision', '1', '--state', 'active']);
  cli(['work-record', '--intent', assignment.id, '--revision', '2', '--harness', 'codex', '--session', 'test-session']);
  fs.mkdirSync(path.join(root, 'reports'));
  fs.writeFileSync(path.join(root, 'reports/research.md'), '# Research\nPrimary-source comparison.');
  cli(['artifact-add', '--revision', '2', '--title', 'Project workflow research', '--location', 'reports/research.md', '--intent', assignment.id]);
  fs.writeFileSync(path.join(root, 'routine.md'), 'Review current official sources. Summarize meaningful changes and cite links.');
  cli(['routine-add', '--revision', '3', '--title', 'Weekly source review', '--cadence', 'Mondays at 9am, America/New_York', '--instructions-file', path.join(root, 'routine.md')]);
  for (const harness of ['codex', 'claude', 'generic']) {
    const brief = cli(['brief', '--intent', assignment.id, '--harness', harness]);
    assert.match(brief, /Use original sources/);
    assert.match(brief, /reports\/research.md/);
    assert.match(brief, /does not start an agent/);
  }
  assert.match(cli(['brief', '--routine', cli(['show']).hub.routines[0].id]), /not an active schedule/);
  console.log('PASS: real CLI init, preservation, stale writes, work lifecycle, artifact/routine library and three harness briefs');

  if (process.argv.includes('--browser')) {
    const { chromium } = await import('@playwright/test');
    const { DashboardServer } = await import(pathToFileURL(path.join(pkg, 'dist/src/dashboard/server/dashboard-server.js')).href);
    const server = new DashboardServer({ port: 0, projectRoots: [root], openBrowser: false });
    instance = await server.start();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${instance.port}/project`);
    await page.getByRole('heading', { name: 'Research & product studio', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
    await page.getByLabel('Goal', { exact: true }).fill('Create useful work across every AI tool.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Create useful work across every AI tool.', { exact: true }).waitFor();
    await page.getByRole('button', { name: '+ Add work', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Write launch notes');
    await page.getByLabel('Outcome and scope').fill('Explain the portable workflow with evidence.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('heading', { name: 'Write launch notes', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Prepare Compare project workflows', exact: true }).click();
    await page.getByRole('dialog', { name: 'Portable worker brief' }).waitFor();
    assert.match(await page.getByLabel('Worker brief text').inputValue(), /Create useful work across every AI tool/);
    await page.getByRole('button', { name: 'Close worker brief' }).click();
    await page.getByRole('button', { name: '+ Add artifact', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Official source');
    await page.getByLabel('File path or HTTPS link').fill('https://example.com/research');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('heading', { name: 'Official source' }).waitFor();
    await page.getByRole('button', { name: '+ Add routine', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Daily handoff review');
    await page.getByLabel('Requested cadence').fill('Daily at 17:00 America/New_York');
    await page.getByLabel('Instructions', { exact: true }).fill('Review unfinished work and prepare the next assignment.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('heading', { name: 'Daily handoff review' }).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'reports/research.md ↓' }).click();
    assert.equal((await download).suggestedFilename(), 'research.md');
    for (const [label, width, height] of [['desktop', 1440, 1050], ['tablet', 820, 1180], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
      await page.screenshot({ path: path.join(artifacts, `project-hub-${label}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Remove Official source', exact: true }).click();
    await page.getByRole('heading', { name: 'Official source' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Remove Daily handoff review', exact: true }).click();
    await page.getByRole('heading', { name: 'Daily handoff review' }).waitFor({ state: 'detached' });
    await page.reload();
    await page.getByRole('heading', { name: 'Write launch notes', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: headless desktop/tablet/mobile, profile/work/artifact/routine flows, brief, download, persistence and zero runtime errors');
  }
} finally {
  await browser?.close();
  await instance?.stop();
  fs.rmSync(root, { recursive: true, force: true });
}

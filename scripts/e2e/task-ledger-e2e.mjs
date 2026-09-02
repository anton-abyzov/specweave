#!/usr/bin/env node
/**
 * End-to-end smoke for the 2.0 multi-agent primitives, zero dependencies.
 *
 * Builds a throwaway SpecWeave project in a temp dir and drives the real CLI:
 *   create-increment → task list/next/claim → task done --run → verify → complete
 * plus the negative paths (closure blocked without verify.json, second agent
 * loses the race for a claimed task).
 *
 * Usage: node scripts/e2e/task-ledger-e2e.mjs        (requires `npm run build`)
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(repoRoot, 'bin', 'specweave.js');
const INC = '0001-ledger-e2e';

let failures = 0;
const log = (s) => process.stdout.write(s + '\n');

function sw(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, SPECWEAVE_AGENT: 'e2e@host', ...env },
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function check(label, ok, detail = '') {
  log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ledger-e2e-'));
try {
  // ── Fixture: a git repo that is a SpecWeave project ────────────────────
  execFileSync('git', ['init', '-q'], { cwd: tmp });
  execFileSync('git', ['config', 'user.email', 'e2e@example.com'], { cwd: tmp });
  execFileSync('git', ['config', 'user.name', 'E2E'], { cwd: tmp });
  fs.mkdirSync(path.join(tmp, '.specweave', 'increments'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, '.specweave', 'config.json'),
    JSON.stringify({ version: '2.0', project: { name: 'e2e' }, testing: { commands: ['node -e "console.log(1)"'] } }, null, 2),
  );
  fs.writeFileSync(path.join(tmp, 'README.md'), '# e2e\n');
  execFileSync('git', ['add', '.'], { cwd: tmp });
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: tmp });

  const incDir = path.join(tmp, '.specweave', 'increments', INC);
  fs.mkdirSync(path.join(incDir, 'reports'), { recursive: true });
  fs.writeFileSync(
    path.join(incDir, 'metadata.json'),
    JSON.stringify({ id: INC, status: 'active', type: 'feature', created: new Date().toISOString(), lastActivity: new Date().toISOString() }, null, 2),
  );
  fs.writeFileSync(
    path.join(incDir, 'spec.md'),
    ['# Ledger e2e', '', '- [x] **AC-01**: task one lands', '- [x] **AC-02**: task two lands', ''].join('\n'),
  );
  fs.writeFileSync(
    path.join(incDir, 'tasks.md'),
    [
      '# Tasks',
      '',
      '### T-01 First task',
      '- AC: AC-01 | Files: src/a.ts | Test: node -e "process.exit(0)"',
      '',
      '### T-02 Second task',
      '- AC: AC-02 | Files: src/b.ts | Test: node -e "process.exit(0)"',
      '',
    ].join('\n'),
  );

  // ── whoami / list / next ───────────────────────────────────────────────
  const who = sw(tmp, ['task', 'whoami']);
  check('task whoami honours SPECWEAVE_AGENT', who.out.trim() === 'e2e@host', who.out.trim());

  const list = sw(tmp, ['task', 'list']);
  check('task list resolves the single active increment', list.code === 0 && list.out.includes('T-01') && list.out.includes('T-02'));

  const next = sw(tmp, ['task', 'next']);
  check('task next offers T-01', next.code === 0 && next.out.includes('T-01'), next.out.split('\n')[0]);

  // ── claim + race ───────────────────────────────────────────────────────
  const claim = sw(tmp, ['task', 'claim', 'T-01']);
  check('task claim T-01 succeeds', claim.code === 0 && claim.out.includes('Claimed T-01'));

  const rival = sw(tmp, ['task', 'claim', 'T-01'], { SPECWEAVE_AGENT: 'rival@host' });
  check('second agent loses the race (exit 3)', rival.code === 3, `exit ${rival.code}`);

  const nextAfterClaim = sw(tmp, ['task', 'next'], { SPECWEAVE_AGENT: 'rival@host' });
  check('task next skips the claimed task', nextAfterClaim.out.includes('T-02') && !nextAfterClaim.out.includes('T-01 First'));

  // ── done: failing command must not mark the task done ──────────────────
  const badRun = sw(tmp, ['task', 'done', 'T-01', '--run', 'node -e "process.exit(1)"']);
  check('task done --run refuses a failing command (exit 5)', badRun.code === 5, `exit ${badRun.code}`);

  const doneT1 = sw(tmp, ['task', 'done', 'T-01', '--run', 'node -e "process.exit(0)"']);
  check('task done T-01 records evidence', doneT1.code === 0 && doneT1.out.includes('Done T-01'));

  // ── closure gate blocks without verify.json ────────────────────────────
  const early = sw(tmp, ['complete', INC, '--yes']);
  check('complete blocked before verify', early.code !== 0 && /verify\.json missing/.test(early.out));

  // ── finish task 2, verify, complete ────────────────────────────────────
  sw(tmp, ['task', 'claim', 'T-02']);
  const doneT2 = sw(tmp, ['task', 'done', 'T-02', '--evidence', 'manual check']);
  check('task done T-02 with --evidence', doneT2.code === 0 && doneT2.out.includes('2/2'));

  const tasksMd = fs.readFileSync(path.join(incDir, 'tasks.md'), 'utf-8');
  check('tasks.md checkboxes rendered from the ledger', /- \[x\]/.test(tasksMd));
  check('tasks.md carries the SW:BOARD table', tasksMd.includes('<!-- SW:BOARD -->'));

  const ledger = fs.readFileSync(path.join(incDir, 'ledger.jsonl'), 'utf-8').trim().split('\n');
  check('ledger is append-only JSONL', ledger.length >= 4 && ledger.every((l) => JSON.parse(l).t), `${ledger.length} lines`);

  const verify = sw(tmp, ['verify']);
  check('verify passes', verify.code === 0 && verify.out.includes('PASS'), verify.out.trim().split('\n').pop());

  const report = JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8'));
  check('verify.json is ok with the AC table', report.ok === true && report.acs.total === 2 && report.acs.done === 2);
  check('verify.md written', fs.existsSync(path.join(incDir, 'reports', 'verify.md')));

  const complete = sw(tmp, ['complete', INC, '--yes']);
  const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
  check('complete succeeds after verify', complete.code === 0 && meta.status === 'completed', `status ${meta.status}`);

  // ── --reason path on a fresh, unverified increment ─────────────────────
  const INC2 = '0002-reason-path';
  const inc2Dir = path.join(tmp, '.specweave', 'increments', INC2);
  fs.mkdirSync(inc2Dir, { recursive: true });
  fs.writeFileSync(
    path.join(inc2Dir, 'metadata.json'),
    JSON.stringify({ id: INC2, status: 'active', type: 'feature', created: new Date().toISOString(), lastActivity: new Date().toISOString() }, null, 2),
  );
  fs.writeFileSync(path.join(inc2Dir, 'spec.md'), '# Reason path\n\n- [x] **AC-01**: nothing to do\n');
  fs.writeFileSync(path.join(inc2Dir, 'tasks.md'), '# Tasks\n\n### T-01 Nothing\n- AC: AC-01 | Files: src/c.ts\n- [x]\n');
  const reasoned = sw(tmp, ['complete', INC2, '--yes', '--reason', 'superseded by 0003']);
  const meta2 = JSON.parse(fs.readFileSync(path.join(inc2Dir, 'metadata.json'), 'utf-8'));
  check('complete --reason closes without verify.json', reasoned.code === 0 && meta2.status === 'completed');
  check('metadata.closeReason stored', meta2.closeReason === 'superseded by 0003', String(meta2.closeReason));

  log('');
  log(failures === 0 ? 'E2E PASS — all checks green' : `E2E FAIL — ${failures} check(s) failed`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failures === 0 ? 0 : 1);

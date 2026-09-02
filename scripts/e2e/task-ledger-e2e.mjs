#!/usr/bin/env node
/**
 * End-to-end smoke for the 2.0 multi-agent primitives, zero dependencies.
 *
 * Builds a throwaway SpecWeave project in a temp dir and drives the real CLI:
 *   create-increment → task list/next/claim → done --run → skip → render →
 *   verify → complete (and `complete --all --reason`)
 * plus the negative paths (closure blocked without verify.json, second agent
 * loses the race for a claimed task, skip without a reason, done over a live
 * claim by another agent).
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
    ['# Ledger e2e', '', '- [x] **AC-01**: task one lands', '- [x] **AC-02**: task two lands', '- [x] **AC-03**: task three is not needed', ''].join('\n'),
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
      '### T-03 Third task',
      '- AC: AC-03 | Files: src/c.ts | Test: -',
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
  check('done warns when HEAD subject omits the increment id', /warning: HEAD subject .* does not mention 0001/.test(doneT1.out), doneT1.out.trim().split('\n')[0]);

  const runLog = path.join(incDir, 'reports', 'task-T-01.log');
  check('task done --run writes reports/task-T-01.log', fs.existsSync(runLog) && /# exit 0/.test(fs.readFileSync(runLog, 'utf-8')));

  // ── auto-claim: a single agent needs one command ───────────────────────
  const autoClaim = sw(tmp, ['task', 'done', 'T-02', '--evidence', 'manual check']);
  check('task done auto-claims an unclaimed task', autoClaim.code === 0 && /Auto-claimed T-02/.test(autoClaim.out));

  // ── done over another agent's live claim is refused with an instruction ─
  sw(tmp, ['task', 'claim', 'T-03'], { SPECWEAVE_AGENT: 'codex@mbp' });
  const refused = sw(tmp, ['task', 'done', 'T-03', '--evidence', 'x'], { SPECWEAVE_AGENT: 'claude@mbp' });
  check(
    'done on a foreign live claim refuses with an actionable message (exit 3)',
    refused.code === 3 && /refused: T-03 is claimed by codex@mbp since /.test(refused.out) && /specweave task release T-03/.test(refused.out),
    refused.out.trim().split('\n')[0],
  );
  sw(tmp, ['task', 'release', 'T-03'], { SPECWEAVE_AGENT: 'codex@mbp' });

  // ── skip needs a reason, is terminal, renders as [-] ───────────────────
  const skipNoReason = sw(tmp, ['task', 'skip', 'T-03']);
  check('skip without --reason is refused (exit 2)', skipNoReason.code === 2 && /skip needs --reason/.test(skipNoReason.out));

  const skipped = sw(tmp, ['task', 'skip', 'T-03', '--reason', 'covered by T-01']);
  check('task skip T-03 records the reason', skipped.code === 0 && /Skipped T-03 \(terminal\): covered by T-01/.test(skipped.out));

  const skipDone = sw(tmp, ['task', 'done', 'T-03', '--evidence', 'x']);
  check('skip is terminal (later done refused)', skipDone.code !== 0);

  // ── render is idempotent ──────────────────────────────────────────────
  const render1 = sw(tmp, ['task', 'render']);
  const after1 = fs.readFileSync(path.join(incDir, 'tasks.md'), 'utf-8');
  const render2 = sw(tmp, ['task', 'render']);
  const after2 = fs.readFileSync(path.join(incDir, 'tasks.md'), 'utf-8');
  check('task render is idempotent', render1.code === 0 && render2.code === 0 && after1 === after2 && /already up to date/.test(render2.out));
  check('tasks.md shows [-] for the skipped task', /- \[-\] skipped by e2e@host/.test(after2));
  check('SW:BOARD block appears exactly once', (after2.match(/<!-- SW:BOARD -->/g) || []).length === 1);
  check('task definitions survive rendering', /### T-01 First task/.test(after2) && /- AC: AC-01 \| Files: src\/a.ts/.test(after2));

  // ── malformed ledger lines are tolerated and counted ───────────────────
  fs.appendFileSync(path.join(incDir, 'ledger.jsonl'), '\r\nnot json\r\n');

  // ── closure gate blocks without verify.json ────────────────────────────
  const early = sw(tmp, ['complete', INC, '--yes']);
  check('complete blocked before verify', early.code !== 0 && /verify\.json missing/.test(early.out));

  const tasksMd = fs.readFileSync(path.join(incDir, 'tasks.md'), 'utf-8');
  check('tasks.md checkboxes rendered from the ledger', /- \[x\]/.test(tasksMd));
  check('tasks.md carries the SW:BOARD table', tasksMd.includes('<!-- SW:BOARD -->'));

  const ledger = fs.readFileSync(path.join(incDir, 'ledger.jsonl'), 'utf-8').trim().split('\n').filter((l) => l.trim().startsWith('{'));
  check('ledger is append-only JSONL', ledger.length >= 6 && ledger.every((l) => JSON.parse(l).t), `${ledger.length} lines`);

  const verify = sw(tmp, ['verify']);
  check('verify passes', verify.code === 0 && verify.out.includes('PASS'), verify.out.trim().split('\n').pop());

  const report = JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8'));
  check('verify.json is ok with the AC table', report.ok === true && report.acs.total === 3 && report.acs.done === 3);
  check('verify.md written', fs.existsSync(path.join(incDir, 'reports', 'verify.md')));
  check(
    'verify lists the skipped task with its reason',
    report.skipped.length === 1 && report.skipped[0].id === 'T-03' && report.skipped[0].reason === 'covered by T-01',
    JSON.stringify(report.skipped),
  );
  check('verify counts the malformed ledger line', report.ledgerMalformed === 1, String(report.ledgerMalformed));

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

  // ── create-increment --supersedes ──────────────────────────────────────
  const sup = sw(tmp, [
    'create-increment', '--auto-id', '--name', 'successor',
    '--title', 'Successor', '--description', 'Replaces the reason-path increment',
    '--project', 'e2e', '--supersedes', '0002',
  ]);
  const supersededMeta = JSON.parse(fs.readFileSync(path.join(inc2Dir, 'metadata.json'), 'utf-8'));
  const successorDir = fs.readdirSync(path.join(tmp, '.specweave', 'increments')).find((d) => d.endsWith('-successor'));
  const successorMeta = successorDir
    ? JSON.parse(fs.readFileSync(path.join(tmp, '.specweave', 'increments', successorDir, 'metadata.json'), 'utf-8'))
    : {};
  check(
    'create-increment --supersedes abandons the old increment',
    sup.code === 0 && supersededMeta.status === 'abandoned' && /superseded by /.test(supersededMeta.closeReason || ''),
    `${sup.code} ${supersededMeta.status} ${supersededMeta.closeReason}`,
  );
  check('the new increment records supersedes', successorMeta.supersedes === INC2, String(successorMeta.supersedes));

  // ── complete --all --reason (batch triage) ─────────────────────────────
  const INC3 = '0004-batch-triage';
  const inc3Dir = path.join(tmp, '.specweave', 'increments', INC3);
  fs.mkdirSync(inc3Dir, { recursive: true });
  fs.writeFileSync(
    path.join(inc3Dir, 'metadata.json'),
    JSON.stringify({ id: INC3, status: 'active', type: 'feature', created: new Date().toISOString(), lastActivity: new Date().toISOString() }, null, 2),
  );
  fs.writeFileSync(path.join(inc3Dir, 'spec.md'), '# Batch\n\n- [x] **AC-01**: nothing\n');
  fs.writeFileSync(path.join(inc3Dir, 'tasks.md'), '# Tasks\n\n### T-01 Only\n- AC: AC-01 | Files: src/d.ts | Test: -\n');
  sw(tmp, ['task', 'skip', 'T-01', INC3, '--reason', 'not needed after all']);

  const allNoReason = sw(tmp, ['complete', '--all']);
  check('complete --all without --reason is refused', allNoReason.code !== 0 && /--all requires --reason/.test(allNoReason.out));

  const batch = sw(tmp, ['complete', '--all', '--yes', '--reason', 'batch triage']);
  const meta3 = JSON.parse(fs.readFileSync(path.join(inc3Dir, 'metadata.json'), 'utf-8'));
  check('complete --all closes task-complete increments', batch.code === 0 && meta3.status === 'completed', `${batch.code} ${meta3.status}`);

  // ── Windows-shaped tasks.md: CRLF + UTF-8 BOM must parse identically ───
  // Git for Windows (core.autocrlf=true) and PowerShell Set-Content/Out-File
  // write exactly this. A '\n'-only split left a trailing '\r' on every line
  // and the whole file parsed as ZERO tasks — every task verb died on Windows.
  const INC5 = '0005-crlf-windows';
  const inc5Dir = path.join(tmp, '.specweave', 'increments', INC5);
  fs.mkdirSync(inc5Dir, { recursive: true });
  fs.writeFileSync(
    path.join(inc5Dir, 'metadata.json'),
    JSON.stringify({ id: INC5, status: 'active', type: 'feature', created: new Date().toISOString(), lastActivity: new Date().toISOString() }, null, 2),
  );
  fs.writeFileSync(path.join(inc5Dir, 'spec.md'), '# CRLF\r\n\r\n- [x] **AC-01**: parses on Windows\r\n');
  fs.writeFileSync(
    path.join(inc5Dir, 'tasks.md'),
    '\uFEFF' + ['# Tasks', '', '### T-01 Windows task', '- AC: AC-01 | Files: src/w.ts | Test: -', ''].join('\r\n'),
  );

  const crlfList = sw(tmp, ['task', 'list', INC5]);
  check('task list parses a CRLF+BOM tasks.md', crlfList.code === 0 && /T-01/.test(crlfList.out), crlfList.out.trim().split('\n')[0]);

  const crlfNext = sw(tmp, ['task', 'next', INC5]);
  check('task next offers T-01 from a CRLF+BOM tasks.md', crlfNext.code === 0 && /T-01/.test(crlfNext.out), crlfNext.out.trim().split('\n')[0]);

  const crlfDone = sw(tmp, ['task', 'done', 'T-01', INC5, '--evidence', 'crlf ok']);
  check('task done resolves a task id from a CRLF+BOM tasks.md', crlfDone.code === 0, crlfDone.out.trim().split('\n')[0]);

  log('');
  log(failures === 0 ? 'E2E PASS — all checks green' : `E2E FAIL — ${failures} check(s) failed`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failures === 0 ? 0 : 1);

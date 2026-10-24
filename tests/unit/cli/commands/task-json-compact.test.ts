/**
 * `task list --json` and `task done --json` point at the `--run` log instead of
 * repeating its 50-line output tail; `--full` prints the evidence verbatim.
 * The ledger is never changed, and every fact an agent picks work by (status,
 * owner, Files, Test, ACs, the command that passed, HEAD) stays in the view.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { taskCommand } from '../../../../src/cli/commands/task.js';
import { compactEvidence } from '../../../../src/core/tasks/task-board.js';
import { appendEvent, ledgerPath, readLedger } from '../../../../src/core/tasks/ledger.js';

const SPEC = `# Compact JSON

## Acceptance Criteria

- [ ] AC-01: One
- [ ] AC-02: Two
- [ ] AC-03: Three

## Tasks

### T-01 Run a noisy test
- AC: AC-01 | Files: a.ts | Test: -

### T-02 Hand-written evidence
- AC: AC-02 | Files: b.ts, c.ts | Test: -

### T-03 Still open
- AC: AC-03 | Files: d.ts | Test: npm test -- d
`;

const NOISY = `node -e "for (let i = 1; i <= 120; i++) console.log('ok line ' + i)"`;
const RUN_EVIDENCE = [`npm test → exit 0`, 'log: .specweave/increments/0001-compact/reports/task-T-09.txt', ...Array.from({ length: 50 }, (_, i) => `ok ${i + 1}`), 'also checked by hand', 'HEAD 0123abc'].join('\n');

const tmp: string[] = [];
beforeEach(() => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'task-json-home-'));
  tmp.push(home);
  vi.stubEnv('HOME', home);
  vi.stubEnv('USERPROFILE', home);
  vi.stubEnv('CLAUDE_CODE_SESSION_ID', '');
  vi.stubEnv('CLAUDE_SESSION_ID', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function mkProject(): { root: string; inc: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'task-json-'));
  tmp.push(root);
  const inc = path.join(root, '.specweave', 'increments', '0001-compact');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ version: '2.0', project: { name: 'demo' } }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-compact', status: 'active', type: 'feature', created: '2026-10-24T00:00:00.000Z' }));
  fs.writeFileSync(path.join(inc, 'spec.md'), SPEC);
  return { root, inc };
}

function captureStdout(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { chunks.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return () => chunks.join('');
}

const opts = (root: string) => ({ cwd: root, agent: 'a@h' });

/** T-01 done through --run (120 output lines), T-02 done by hand, T-03 open. */
async function seed(root: string): Promise<void> {
  expect(await taskCommand('done', 'T-01', undefined, { ...opts(root), run: NOISY })).toBe(0);
  expect(await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'abc1234 reviewed by hand\nsecond line kept' })).toBe(0);
}

describe('compactEvidence', () => {
  it('keeps the command and HEAD lines of --run evidence and points at the log', () => {
    expect(compactEvidence(RUN_EVIDENCE)).toEqual({
      evidence: 'npm test → exit 0\nHEAD 0123abc',
      evidenceBytes: Buffer.byteLength(RUN_EVIDENCE, 'utf8'),
      evidenceLog: '.specweave/increments/0001-compact/reports/task-T-09.txt',
    });
  });

  it('returns hand-written evidence unchanged', () => {
    for (const e of ['abc1234', 'sha\nHEAD 0123abc', 'npm test → exit 0\nnot a log line\nmore', undefined]) {
      expect(compactEvidence(e)).toEqual({ evidence: e });
    }
  });
});

describe('task list --json', () => {
  it('drops the run tail but keeps every fact the next agent needs', async () => {
    const { root, inc } = mkProject();
    captureStdout();
    await seed(root);
    const read = captureStdout();
    expect(await taskCommand('list', undefined, undefined, { ...opts(root), json: true })).toBe(0);
    const raw = read();
    expect(raw.trim().split('\n')).toHaveLength(1);
    const board = JSON.parse(raw);
    expect(board.increment).toBe('0001-compact');
    expect(board.counts).toMatchObject({ total: 3, done: 2, open: 1 });

    const [t1, t2, t3] = board.tasks;
    const stored = readLedger(ledgerPath(inc)).events.find((e) => e.t === 'T-01' && e.e === 'done')!.evidence!;
    expect(stored).toContain('ok line 120');
    expect(t1).toMatchObject({ id: 'T-01', status: 'done', by: 'a@h', files: ['a.ts'], acs: ['AC-01'] });
    expect(t1.evidence).toBe(`${NOISY} → exit 0`);
    expect(t1.evidence).not.toContain('ok line 120');
    expect(t1.evidenceBytes).toBe(Buffer.byteLength(stored, 'utf8'));
    expect(t1.evidenceLog).toBe('.specweave/increments/0001-compact/reports/task-T-01.txt');
    // The log holds the complete output, not just the tail the ledger keeps.
    const log = fs.readFileSync(path.join(root, t1.evidenceLog), 'utf-8');
    expect(log).toContain('ok line 1\n');
    expect(log).toContain('ok line 120');

    expect(t2).toMatchObject({ id: 'T-02', status: 'done', evidence: 'abc1234 reviewed by hand\nsecond line kept', files: ['b.ts', 'c.ts'], acs: ['AC-02'] });
    expect(t2.evidenceBytes).toBeUndefined();
    expect(t3).toMatchObject({ id: 'T-03', status: 'open', files: ['d.ts'], test: 'npm test -- d', acs: ['AC-03'] });
    const readFull = captureStdout();
    await taskCommand('list', undefined, undefined, { ...opts(root), json: true, full: true });
    const full = readFull();
    expect(Buffer.byteLength(full) - Buffer.byteLength(raw)).toBeGreaterThan(Buffer.byteLength(stored) - Buffer.byteLength(t1.evidence));
  });

  it('--full prints the evidence verbatim in the pretty-printed form', async () => {
    const { root, inc } = mkProject();
    captureStdout();
    await seed(root);
    appendEvent(ledgerPath(inc), { t: 'T-03', e: 'done', by: 'a@h', at: '2026-10-24T12:00:00.000Z', evidence: RUN_EVIDENCE });
    const read = captureStdout();
    expect(await taskCommand('list', undefined, undefined, { ...opts(root), json: true, full: true })).toBe(0);
    const raw = read();
    const board = JSON.parse(raw);
    expect(raw).toBe(JSON.stringify(board, null, 2) + '\n');
    const events = readLedger(ledgerPath(inc)).events.filter((e) => e.e === 'done');
    for (const t of board.tasks) {
      expect(t.evidence).toBe(events.find((e) => e.t === t.id)!.evidence);
      expect(t).not.toHaveProperty('evidenceBytes');
      expect(t).not.toHaveProperty('evidenceLog');
    }
    expect(Object.keys(board.tasks[0])).toEqual(['id', 'title', 'status', 'by', 'since', 'evidence', 'files', 'acs']);
  });

  it('prints identical bytes for identical ledger and spec (AC-06)', async () => {
    const { root } = mkProject();
    captureStdout();
    await seed(root);
    const runs: string[] = [];
    for (const full of [false, false, true, true]) {
      const read = captureStdout();
      await taskCommand('list', undefined, undefined, { ...opts(root), json: true, full });
      runs.push(read());
    }
    expect(runs[1]).toBe(runs[0]);
    expect(runs[3]).toBe(runs[2]);
  });
});

describe('task done --json', () => {
  it('reports the run without its tail; --full keeps today\'s output', async () => {
    const { root, inc } = mkProject();
    let read = captureStdout();
    expect(await taskCommand('done', 'T-01', undefined, { ...opts(root), run: NOISY, json: true })).toBe(0);
    const compact = JSON.parse(read().trim().split('\n').pop()!);
    const stored = readLedger(ledgerPath(inc)).events.find((e) => e.t === 'T-01' && e.e === 'done')!.evidence!;
    expect(Object.keys(compact)).toEqual(['done', 'evidence', 'evidenceBytes', 'log', 'counts']);
    expect(compact).toMatchObject({ done: 'T-01', evidence: `${NOISY} → exit 0`, evidenceBytes: Buffer.byteLength(stored, 'utf8'), log: '.specweave/increments/0001-compact/reports/task-T-01.txt' });

    read = captureStdout();
    expect(await taskCommand('done', 'T-02', undefined, { ...opts(root), run: NOISY, json: true, full: true })).toBe(0);
    const full = JSON.parse(read().trim().split('\n').pop()!);
    const stored2 = readLedger(ledgerPath(inc)).events.find((e) => e.t === 'T-02' && e.e === 'done')!.evidence!;
    expect(Object.keys(full)).toEqual(['done', 'evidence', 'log', 'counts']);
    expect(full.evidence).toBe(stored2);
    expect(full.evidence).toContain('ok line 120');
  });

  it('keeps hand-written evidence whole', async () => {
    const { root } = mkProject();
    const read = captureStdout();
    expect(await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'abc1234 checked', json: true })).toBe(0);
    const out = JSON.parse(read().trim().split('\n').pop()!);
    expect(out.evidence).toBe('abc1234 checked');
    expect(out).not.toHaveProperty('evidenceBytes');
  });
});

describe('sw-do manual path (no CLI)', () => {
  const skill = fs.readFileSync(path.join(__dirname, '../../../../skills/sw-do/SKILL.md'), 'utf-8');
  const readLine = skill.split('\n').find((l) => l.startsWith(`grep -o '^{"t":`));

  it.skipIf(process.platform === 'win32')('prints each task\'s last event without the evidence', async () => {
    expect(readLine).toBeDefined();
    const { root, inc } = mkProject();
    captureStdout();
    await seed(root);
    expect(await taskCommand('claim', 'T-03', undefined, opts(root))).toBe(0);
    const L = ledgerPath(inc);
    const out = execFileSync('bash', ['-c', readLine!], { env: { ...process.env, L }, encoding: 'utf-8' });
    const rows = out.trim().split('\n');
    expect(rows.map((r) => r.match(/"t":"([^"]+)","e":"([^"]+)"/)!.slice(1).join(' '))).toEqual(['T-01 done', 'T-02 done', 'T-03 claim']);
    expect(out).not.toContain('evidence');
    expect(out).not.toContain('"*"');
    expect(Buffer.byteLength(out)).toBeLessThan(fs.statSync(L).size);
  });
});

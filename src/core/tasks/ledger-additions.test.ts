/**
 * 2.0 ledger additions: skip reasons, auto-claim on `done`, board rendering on
 * every write, fold hardening (BOM/CRLF/junk), `--run` logs, supersedes/parent.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { taskCommand, EXIT_LOST_RACE } from '../../cli/commands/task.js';
import { parseLedger, foldLedger, appendEvent, ledgerPath, type LedgerEvent } from './ledger.js';
import { loadTaskBoard, renderTasksMd, stateLine, BOARD_BEGIN, BOARD_END } from './task-board.js';
import { runVerify } from './verify-runner.js';
import { supersedeIncrement, setParentIncrement } from './supersede.js';
import { listTaskCompleteIncrementIds } from './resolve-increment.js';
import { migrateLegacyStatus, IncrementStatus } from '../types/increment-metadata.js';
import { tailLines } from './run-shell.js';

const TASKS = [
  '# Tasks: Demo',
  '',
  '### T-01 First',
  '- AC: AC-01 | Files: src/a.ts | Test: -',
  '',
  '### T-02 Second',
  '- AC: AC-02 | Files: src/b.ts | Test: -',
  '',
].join('\n');

const tmpDirs: string[] = [];

function mkProject(): { root: string; incDir: string; id: string } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ledger2-')));
  tmpDirs.push(root);
  const id = '0001-demo';
  const incDir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, '.specweave', 'config.json'),
    JSON.stringify({ version: '2.0', project: { name: 'demo' }, testing: { commands: [] } }),
  );
  fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id, status: 'active', type: 'feature' }));
  fs.writeFileSync(path.join(incDir, 'spec.md'), '# Demo\n\n- [x] AC-01 one\n- [x] AC-02 two\n');
  fs.writeFileSync(path.join(incDir, 'tasks.md'), TASKS);
  return { root, incDir, id };
}

let stdout: string[] = [];
let stderr: string[] = [];
beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { stdout.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((c: any) => { stderr.push(String(c)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const readTasks = (incDir: string) => fs.readFileSync(path.join(incDir, 'tasks.md'), 'utf-8');
const ledgerLines = (incDir: string) =>
  fs.existsSync(ledgerPath(incDir))
    ? fs.readFileSync(ledgerPath(incDir), 'utf-8').trim().split('\n').map((l) => JSON.parse(l) as LedgerEvent)
    : [];

describe('task skip (reason mandatory, terminal)', () => {
  it('refuses without a reason and accepts --reason', async () => {
    const { root, incDir } = mkProject();
    expect(await taskCommand('skip', 'T-01', undefined, { cwd: root, agent: 'a@h' })).toBe(2);
    expect(stderr.join('')).toContain('skip needs --reason');
    expect(ledgerLines(incDir)).toHaveLength(0);

    expect(await taskCommand('skip', 'T-01', undefined, { cwd: root, agent: 'a@h', reason: 'not needed' })).toBe(0);
    const events = ledgerLines(incDir);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ t: 'T-01', e: 'skip', by: 'a@h', note: 'not needed' });
  });

  it('renders `[-] skipped` in tasks.md with the reason', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('skip', 'T-01', undefined, { cwd: root, agent: 'a@h', reason: 'dropped from scope' });
    const md = readTasks(incDir);
    expect(md).toContain('- [-] skipped by a@h');
    expect(md).toContain('dropped from scope');
    // Task definitions survive untouched.
    expect(md).toContain('### T-01 First');
    expect(md).toContain('- AC: AC-01 | Files: src/a.ts | Test: -');
  });

  it('is terminal: a later done is refused', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('skip', 'T-01', undefined, { cwd: root, agent: 'a@h', reason: 'obsolete' });
    const code = await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'abc123' });
    expect(code).not.toBe(0);
    expect(loadTaskBoard(incDir).tasks[0].state.status).toBe('skipped');
  });

  it('verify lists skipped tasks with their reasons', async () => {
    const { root, incDir, id } = mkProject();
    await taskCommand('skip', 'T-02', undefined, { cwd: root, agent: 'a@h', reason: 'covered by T-01' });
    const { report } = await runVerify(root, id, incDir, { commands: [] });
    expect(report.skipped).toEqual([{ id: 'T-02', by: 'a@h', reason: 'covered by T-01' }]);
    expect(fs.readFileSync(path.join(incDir, 'reports', 'verify.md'), 'utf-8')).toContain('covered by T-01');
  });
});

describe('task done auto-claim', () => {
  it('auto-claims an unclaimed task (one command for a single agent)', async () => {
    const { root, incDir } = mkProject();
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'solo@h', evidence: 'sha123' })).toBe(0);
    const events = ledgerLines(incDir);
    expect(events.map((e) => e.e)).toEqual(['claim', 'done']);
    expect(loadTaskBoard(incDir).tasks[0].state.status).toBe('done');
    expect(stdout.join('')).toContain('Auto-claimed T-01');
  });

  it('does not re-claim a task the agent already holds', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'solo@h' });
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'solo@h', evidence: 'sha123' });
    expect(ledgerLines(incDir).map((e) => e.e)).toEqual(['claim', 'done']);
  });

  it('refuses a done on another live claim with an actionable message', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'codex@mbp' });
    const code = await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'claude@mbp', evidence: 'sha' });
    expect(code).toBe(EXIT_LOST_RACE);
    const msg = stderr.join('');
    expect(msg).toContain('refused: T-01 is claimed by codex@mbp since ');
    expect(msg).toContain('specweave task release T-01');
    expect(msg).toContain('2h lease');
    expect(ledgerLines(incDir).filter((e) => e.e === 'done')).toHaveLength(0);
  });

  it('takes over a stale claim without --force', async () => {
    const { root, incDir } = mkProject();
    const old = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    appendEvent(ledgerPath(incDir), { t: 'T-01', e: 'claim', by: 'ghost@h', at: old });
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'live@h', evidence: 'sha' })).toBe(0);
    expect(loadTaskBoard(incDir).tasks[0].state).toMatchObject({ status: 'done', by: 'live@h' });
  });
});

describe('board rendering on every ledger write', () => {
  it('claim / release / block also refresh the SW:BOARD block', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'a@h' });
    let md = readTasks(incDir);
    expect(md).toContain(BOARD_BEGIN);
    expect(md).toContain('| Task | State | By | Evidence | Note |');
    expect(md).toMatch(/\| T-01 \| claimed \| a@h \|/);

    await taskCommand('release', 'T-01', undefined, { cwd: root, agent: 'a@h' });
    md = readTasks(incDir);
    expect(md).toMatch(/\| T-01 \| open \|/);

    await taskCommand('block', 'T-02', undefined, { cwd: root, agent: 'a@h', reason: 'waiting on API' });
    expect(readTasks(incDir)).toMatch(/\| T-02 \| blocked \| a@h \|  \| waiting on API \|/);
  });

  it('render is idempotent and never touches task definitions', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'sha' });
    await taskCommand('render', undefined, undefined, { cwd: root, agent: 'a@h' });
    const first = readTasks(incDir);
    await taskCommand('render', undefined, undefined, { cwd: root, agent: 'a@h' });
    expect(readTasks(incDir)).toBe(first);
    expect(stdout.join('')).toContain('already up to date');
    expect(first).toContain('### T-02 Second');
    expect((first.match(new RegExp(BOARD_BEGIN, 'g')) ?? []).length).toBe(1);
    expect((first.match(new RegExp(BOARD_END, 'g')) ?? []).length).toBe(1);
  });

  it('escapes pipes so a note cannot break the table', () => {
    const board = loadTaskBoard(mkProject().incDir);
    board.tasks[0].state = { status: 'blocked', by: 'a@h', note: 'run a | b' };
    const rendered = renderTasksMd(TASKS, board);
    expect(rendered).toContain('run a \\| b');
  });
});

describe('fold hardening (BOM, CRLF, blank, junk)', () => {
  const line = (e: Partial<LedgerEvent>) =>
    JSON.stringify({ t: 'T-01', e: 'claim', by: 'a@h', at: '2026-09-02T10:00:00Z', ...e });

  it('parses a BOM + CRLF + blank-line + junk ledger', () => {
    const content = [
      '﻿' + line({}),
      '',
      '   ',
      'not json at all',
      '{"t":"T-01","e":"nope","by":"a@h","at":"2026-09-02T10:05:00Z"}',
      line({ t: 'T-01', e: 'done', evidence: 'sha', at: '2026-09-02T10:10:00Z' }),
      '',
    ].join('\r\n');
    const { events, malformed } = parseLedger(content);
    expect(events.map((e) => e.e)).toEqual(['claim', 'done']);
    expect(malformed).toBe(2);
    expect(foldLedger(events).tasks.get('T-01')!.status).toBe('done');
  });

  it('a BOM-prefixed file written by PowerShell still folds', async () => {
    const { root, incDir } = mkProject();
    fs.writeFileSync(
      ledgerPath(incDir),
      '﻿' + line({ e: 'claim', by: 'ps@win' }) + '\r\n' + 'garbage\r\n',
      'utf-8',
    );
    const board = loadTaskBoard(incDir);
    expect(board.tasks[0].state).toMatchObject({ status: 'stale', by: 'ps@win' });
    expect(board.fold.malformed).toBe(1);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: [] });
    expect(report.ledgerMalformed).toBe(1);
    expect(fs.readFileSync(path.join(incDir, 'reports', 'verify.md'), 'utf-8')).toContain('1 malformed ledger line');
  });
});

describe('task done --run', () => {
  it('captures the full output in reports/task-T-NN.log and a 50-line tail in evidence', async () => {
    const { root, incDir } = mkProject();
    const cmd = 'node -e "for (let i=1;i<=120;i++) console.log(\'line\'+i)"';
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: cmd })).toBe(0);

    const log = fs.readFileSync(path.join(incDir, 'reports', 'task-T-01.log'), 'utf-8');
    expect(log).toContain('line1\n');
    expect(log).toContain('line120');
    expect(log).toContain('# exit 0');

    const evidence = loadTaskBoard(incDir).tasks[0].state.evidence!;
    expect(evidence).toContain('→ exit 0');
    expect(evidence).toContain('reports/task-T-01.log');
    expect(evidence).toContain('line120');
    expect(evidence).not.toContain('line70'); // only the last 50 lines
  });

  it('a failing command leaves the task open and still writes the log', async () => {
    const { root, incDir } = mkProject();
    const code = await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: 'node -e "console.log(\'boom\');process.exit(3)"' });
    expect(code).toBe(5);
    expect(loadTaskBoard(incDir).tasks[0].state.status).toBe('open');
    expect(fs.readFileSync(path.join(incDir, 'reports', 'task-T-01.log'), 'utf-8')).toContain('boom');
  });

  it('tailLines keeps the last n lines and drops trailing blanks', () => {
    expect(tailLines('a\r\nb\r\nc\n\n', 2)).toBe('b\nc');
  });
});

describe('metadata: supersedes / parent / legacy status', () => {
  it('migrates the wild `superseded` status to abandoned + closeReason', () => {
    const m = migrateLegacyStatus({ id: '0001-x', status: 'superseded', supersededBy: '0002-y', lastActivity: '2026-01-01T00:00:00Z' });
    expect(m.changed).toBe(true);
    expect(m.metadata.status).toBe(IncrementStatus.ABANDONED);
    expect(m.metadata.closeReason).toBe('superseded by 0002-y');
    expect(m.metadata.abandonedAt).toBe('2026-01-01T00:00:00Z');
    // idempotent
    expect(migrateLegacyStatus(m.metadata).changed).toBe(false);
  });

  it('leaves valid statuses alone', () => {
    expect(migrateLegacyStatus({ status: 'active' })).toMatchObject({ changed: false });
    expect(migrateLegacyStatus({ status: 'something-else' })).toMatchObject({ changed: false });
  });

  it('supersedeIncrement abandons the old increment and links the new one', () => {
    const { root } = mkProject();
    const newDir = path.join(root, '.specweave', 'increments', '0002-next');
    fs.mkdirSync(newDir, { recursive: true });
    fs.writeFileSync(path.join(newDir, 'metadata.json'), JSON.stringify({ id: '0002-next', status: 'planning', type: 'feature' }));

    const result = supersedeIncrement(root, '0001', '0002-next');
    expect(result.ok).toBe(true);
    const oldMeta = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'increments', '0001-demo', 'metadata.json'), 'utf-8'));
    expect(oldMeta.status).toBe('abandoned');
    expect(oldMeta.closeReason).toBe('superseded by 0002-next');
    expect(JSON.parse(fs.readFileSync(path.join(newDir, 'metadata.json'), 'utf-8')).supersedes).toBe('0001-demo');
  });

  it('rejects unknown, ambiguous and self references', () => {
    const { root } = mkProject();
    expect(supersedeIncrement(root, '9999', '0001-demo').ok).toBe(false);
    expect(supersedeIncrement(root, '0001', '0001-demo').message).toContain('cannot supersede itself');
    expect(setParentIncrement(root, '0001-demo', '0001').message).toContain('cannot be its own parent');
  });

  it('setParentIncrement records the parent id', () => {
    const { root } = mkProject();
    const childDir = path.join(root, '.specweave', 'increments', '0002-child');
    fs.mkdirSync(childDir, { recursive: true });
    fs.writeFileSync(path.join(childDir, 'metadata.json'), JSON.stringify({ id: '0002-child', status: 'planning' }));
    expect(setParentIncrement(root, '0002-child', '0001').ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(childDir, 'metadata.json'), 'utf-8')).parent).toBe('0001-demo');
  });
});

describe('listTaskCompleteIncrementIds (complete --all)', () => {
  it('only lists active increments whose tasks are all done or skipped', async () => {
    const { root, incDir } = mkProject();
    expect(listTaskCompleteIncrementIds(root)).toEqual([]);
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'sha' });
    expect(listTaskCompleteIncrementIds(root)).toEqual([]);
    await taskCommand('skip', 'T-02', undefined, { cwd: root, agent: 'a@h', reason: 'not needed' });
    expect(listTaskCompleteIncrementIds(root)).toEqual(['0001-demo']);
    expect(loadTaskBoard(incDir).counts).toMatchObject({ done: 1, skipped: 1 });
  });

  it('ignores increments that are not active', async () => {
    const { root, incDir } = mkProject();
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'sha' });
    await taskCommand('skip', 'T-02', undefined, { cwd: root, agent: 'a@h', reason: 'no' });
    fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'completed' }));
    expect(listTaskCompleteIncrementIds(root)).toEqual([]);
  });
});

describe('stateLine', () => {
  it('renders each status distinctly', () => {
    expect(stateLine({ status: 'open' })).toBe('- [ ] open');
    expect(stateLine({ status: 'done', by: 'a', evidence: 'sha' })).toContain('- [x] done by a');
    expect(stateLine({ status: 'skipped', by: 'a', note: 'why' })).toContain('- [-] skipped by a');
    expect(stateLine({ status: 'stale', by: 'a', since: 't' })).toContain('re-claimable');
  });
});

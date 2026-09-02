import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadTaskBoard, nextTask, renderTasksMd, fileOverlaps, normalizeTaskId, BOARD_BEGIN } from './task-board.js';
import { appendEvent, ledgerPath } from './ledger.js';
import { parseTasksWithUSLinks, getAllTasks } from '../../generators/spec/task-parser.js';

const tmp: string[] = [];
function mkInc(tasksMd: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-'));
  tmp.push(dir);
  fs.writeFileSync(path.join(dir, 'tasks.md'), tasksMd);
  return dir;
}
afterEach(() => { while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true }); });

const TASKS_20 = `# Tasks: Demo

### T-01 Add parser
- AC: AC-01, AC-02 | Files: src/a.ts, src/a.test.ts | Test: npx vitest run src/a.test.ts | tail -3
Given a file → When parsed → Then fields.

### T-02 Wire CLI
- AC: AC-03 | Files: src/cli.ts | Test: npm test

### T-03 Docs
- AC: AC-04 | Files: README.md | Test: -
**Dependencies**: T-02
`;

describe('task-parser 2.0 field line', () => {
  it('parses header without colon, AC/Files/Test (Test keeps shell pipes)', () => {
    const dir = mkInc(TASKS_20);
    const tasks = getAllTasks(parseTasksWithUSLinks(path.join(dir, 'tasks.md')));
    expect(tasks.map((t) => t.id)).toEqual(['T-01', 'T-02', 'T-03']);
    const t1 = tasks[0];
    expect(t1.title).toBe('Add parser');
    expect(t1.acs).toEqual(['AC-01', 'AC-02']);
    expect(t1.filesAffected).toEqual(['src/a.ts', 'src/a.test.ts']);
    expect(t1.test).toBe('npx vitest run src/a.test.ts | tail -3');
    expect(tasks[2].test).toBeUndefined();
    expect(tasks[2].dependencies).toEqual(['T-02']);
  });

  it('still parses the legacy same-line and multi-line forms', () => {
    const dir = mkInc([
      '# Tasks',
      '### T-001: Legacy same-line',
      '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed',
      '### T-002: Legacy multi-line',
      '**User Story**: US-001',
      '**Satisfies ACs**: AC-US1-02',
      '**Status**: [ ] pending',
      '**Test Plan**:',
      '- [ ] Given x → When y → Then z',
      '**Files Affected**:',
      '- `src/x.ts`',
    ].join('\n'));
    const tasks = getAllTasks(parseTasksWithUSLinks(path.join(dir, 'tasks.md')));
    expect(tasks[0]).toMatchObject({ id: 'T-001', status: 'completed', satisfiesACs: ['AC-US1-01'], acs: ['AC-US1-01'] });
    expect(tasks[1]).toMatchObject({ id: 'T-002', status: 'pending', filesAffected: ['src/x.ts'] });
    expect(tasks[1].hasStateLine).toBeUndefined(); // BDD sub-checkbox is not a state line
  });
});

describe('loadTaskBoard + nextTask', () => {
  it('ledger wins; legacy checkbox is the fallback; next skips held Files and unmet deps', () => {
    const dir = mkInc(TASKS_20);
    const board0 = loadTaskBoard(dir);
    expect(board0.counts).toMatchObject({ total: 3, open: 3, done: 0 });
    expect(nextTask(board0)?.id).toBe('T-01');

    appendEvent(ledgerPath(dir), { t: 'T-01', e: 'claim', by: 'codex@b', at: new Date().toISOString() });
    const board1 = loadTaskBoard(dir);
    expect(board1.tasks[0].state).toMatchObject({ status: 'claimed', by: 'codex@b' });
    // T-02 is free (no file overlap), T-03 depends on T-02.
    expect(nextTask(board1, 'claude@a')?.id).toBe('T-02');

    appendEvent(ledgerPath(dir), { t: 'T-02', e: 'claim', by: 'claude@a', at: new Date().toISOString() });
    const board2 = loadTaskBoard(dir);
    expect(nextTask(board2, 'other@c')).toBeUndefined(); // T-03 blocked by dep
  });

  it('reports Files overlap with another agent\'s live claim', () => {
    const dir = mkInc(`# T\n### T-01 A\n- Files: src/x.ts | Test: -\n### T-02 B\n- Files: src/x.ts, src/y.ts | Test: -\n`);
    appendEvent(ledgerPath(dir), { t: 'T-01', e: 'claim', by: 'codex@b', at: new Date().toISOString() });
    const board = loadTaskBoard(dir);
    expect(fileOverlaps(board, board.tasks[1], 'claude@a')).toEqual(['T-01']);
    expect(fileOverlaps(board, board.tasks[1], 'codex@b')).toEqual([]);
  });

  it('normalizes typed task ids', () => {
    expect(normalizeTaskId('1', ['T-01', 'T-02'])).toBe('T-01');
    expect(normalizeTaskId('t-2', ['T-01', 'T-02'])).toBe('T-02');
    expect(normalizeTaskId('T-003', ['T-003'])).toBe('T-003');
    expect(normalizeTaskId('9', ['T-01'])).toBeUndefined();
  });
});

describe('renderTasksMd', () => {
  it('inserts state lines after the field line, flips legacy Status, upserts SW:BOARD, idempotent', () => {
    const dir = mkInc(TASKS_20 + `\n### T-004: Legacy\n**Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending\n`);
    const now = new Date().toISOString();
    appendEvent(ledgerPath(dir), { t: 'T-01', e: 'done', by: 'codex@b', at: now, evidence: 'npm test → exit 0 | HEAD abc1234' });
    appendEvent(ledgerPath(dir), { t: 'T-02', e: 'claim', by: 'claude@a', at: now });
    appendEvent(ledgerPath(dir), { t: 'T-004', e: 'done', by: 'anton', at: now, evidence: 'manual' });
    const board = loadTaskBoard(dir);
    const once = renderTasksMd(fs.readFileSync(path.join(dir, 'tasks.md'), 'utf-8'), board);
    expect(once).toContain(BOARD_BEGIN);
    expect(once).toMatch(/### T-01 Add parser\n- AC: .*\n- \[x\] done by codex@b/);
    expect(once).toMatch(/### T-02 Wire CLI\n- AC: .*\n- \[ \] claimed by claude@a/);
    expect(once).toMatch(/### T-03 Docs\n- AC: .*\n- \[ \] open/);
    expect(once).toContain('**Status**: [x] completed');
    const twice = renderTasksMd(once, loadTaskBoard(dir));
    expect(twice).toBe(once);
    // Re-parsing the rendered file yields the same completion picture for legacy counters.
    fs.writeFileSync(path.join(dir, 'tasks.md'), twice);
    const reparsed = getAllTasks(parseTasksWithUSLinks(path.join(dir, 'tasks.md')));
    expect(reparsed.map((t) => t.status)).toEqual(['completed', 'pending', 'pending', 'completed']);
  });
});

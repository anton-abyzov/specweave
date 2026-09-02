/**
 * Task-id grammar + AC traceability regressions (2.0 release proofs).
 *
 * Two silent-drop classes shipped past a green suite:
 *
 *  1. `### T-001a` / `### T-001b` (the 1.x split-task convention, 37 headings
 *     across 7 increments in the SpecWeave repo alone) never matched the task
 *     header regex, so those tasks vanished from `task list` and the reported
 *     progress was wrong in BOTH numerator and denominator — with no warning.
 *  2. The 2.0 field line `- AC: AC-01, AC-02` was parsed into `acs` but only
 *     mirrored into `satisfiesACs` for `AC-US1-01`-shaped ids, and every
 *     traceability consumer keys off `satisfiesACs` — so the design's own AC
 *     format read as an untraceable orphan task at closure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseTasksWithUSLinks, getAllTasks } from '../../../src/generators/spec/task-parser.js';
import { loadTaskBoard, normalizeTaskId, compareTaskIds } from '../../../src/core/tasks/task-board.js';
import { validateACCoverage } from '../../../src/validators/ac-coverage-validator.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-task-grammar-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

function writeTasks(content: string): string {
  const p = path.join(dir, 'tasks.md');
  fs.writeFileSync(p, content);
  return p;
}

const LEGACY_SUFFIX_TASKS = [
  '# Tasks',
  '',
  '### T-001a: [RED] Bash test fixture for watchdog.sh',
  '**Status**: [x] completed',
  '',
  '### T-001b: [GREEN] Implement crawl-worker/watchdog files',
  '**Status**: [x] completed',
  '',
  '### T-002: Plain legacy task',
  '**Status**: [ ] pending',
  '',
  '### T-01E: External import',
  '**Status**: [ ] pending',
  '',
].join('\n');

describe('task id grammar', () => {
  it('parses letter-suffixed ids (T-001a / T-001b) alongside T-NNN and T-NNE', () => {
    const tasks = getAllTasks(parseTasksWithUSLinks(writeTasks(LEGACY_SUFFIX_TASKS)));
    expect(tasks.map((t) => t.id).sort()).toEqual(['T-001a', 'T-001b', 'T-002', 'T-01E']);
    expect(tasks.filter((t) => t.status === 'completed')).toHaveLength(2);
  });

  it('reports the same tasks through the board (both parsers share one grammar)', () => {
    writeTasks(LEGACY_SUFFIX_TASKS);
    const board = loadTaskBoard(dir);
    expect(board.counts.total).toBe(4);
    expect(board.counts.done).toBe(2);
    expect(board.tasks.map((t) => t.id)).toEqual(['T-001a', 'T-001b', 'T-01E', 'T-002']);
  });

  it('warns about a `### T-…` heading it cannot read instead of dropping it silently', () => {
    const warnings: string[] = [];
    const p = writeTasks(['# Tasks', '', '### T-01 Fine', '- AC: AC-01', '', '### T-nope: broken', ''].join('\n'));
    const tasks = getAllTasks(parseTasksWithUSLinks(p, { onWarning: (w) => warnings.push(w) }));
    expect(tasks.map((t) => t.id)).toEqual(['T-01']);
    expect(warnings.join('\n')).toMatch(/skipped unparseable task heading "### T-nope: broken"/);
  });

  it('orders suffixed ids after their base id', () => {
    expect(['T-001b', 'T-002', 'T-001', 'T-001a'].sort(compareTaskIds)).toEqual([
      'T-001',
      'T-001a',
      'T-001b',
      'T-002',
    ]);
  });

  it('normalizes a user-typed suffixed id', () => {
    const known = ['T-001a', 'T-001b', 'T-002'];
    expect(normalizeTaskId('t-001a', known)).toBe('T-001a');
    expect(normalizeTaskId('T-1b', known)).toBe('T-001b');
    expect(normalizeTaskId('2', known)).toBe('T-002');
    expect(normalizeTaskId('T-009', known)).toBeUndefined();
  });
});

describe('AC traceability for the 2.0 field line', () => {
  it('mirrors plain AC-01 ids into satisfiesACs', () => {
    const p = writeTasks(
      ['# Tasks', '', '### T-01 Build it', '- AC: AC-01, AC-02 | Files: src/a.ts | Test: npm test', ''].join('\n'),
    );
    const [task] = getAllTasks(parseTasksWithUSLinks(p));
    expect(task.acs).toEqual(['AC-01', 'AC-02']);
    expect(task.satisfiesACs).toEqual(['AC-01', 'AC-02']);
  });

  it('still mirrors 1.x AC-US1-01 ids', () => {
    const p = writeTasks(
      ['# Tasks', '', '### T-01 Build it', '- AC: AC-US1-01 | Files: src/a.ts | Test: npm test', ''].join('\n'),
    );
    const [task] = getAllTasks(parseTasksWithUSLinks(p));
    expect(task.satisfiesACs).toEqual(['AC-US1-01']);
  });

  it('reads the legacy **Satisfies ACs** field with plain AC ids too', () => {
    const p = writeTasks(
      ['# Tasks', '', '### T-001: Build it', '**Satisfies ACs**: AC-01, AC-02 | **Status**: [x] completed', ''].join('\n'),
    );
    const [task] = getAllTasks(parseTasksWithUSLinks(p));
    expect(task.satisfiesACs).toEqual(['AC-01', 'AC-02']);
  });

  it('does not report a design-format task as an orphan in AC coverage', () => {
    fs.writeFileSync(
      path.join(dir, 'spec.md'),
      ['---', 'increment: 0002-trace', 'title: Trace', '---', '', '# Trace', '', '- [x] AC-01: it works', ''].join('\n'),
    );
    writeTasks(
      ['# Tasks', '', '### T-01 Build it', '- AC: AC-01 | Files: src/a.ts | Test: npm test', ''].join('\n'),
    );
    const report = validateACCoverage(dir, { logger: { log: () => {} } as never });
    expect(report.orphanTasks).toEqual([]);
  });
});

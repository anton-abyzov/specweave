/**
 * 3.0 one-file increments: task definitions in spec.md `## Tasks`, state only
 * in ledger.jsonl, AC completion derived from the ledger, and `task next` /
 * `task claim` printing the AC text so the agent need not reread spec.md.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadTaskBoard } from '../../../../src/core/tasks/task-board.js';
import { tasksFileFor } from '../../../../src/core/tasks/tasks-source.js';
import { appendEvent, ledgerPath } from '../../../../src/core/tasks/ledger.js';
import { deriveAcStatus, readSpecAcs } from '../../../../src/core/tasks/verify-runner.js';
import { taskCommand } from '../../../../src/cli/commands/task.js';

const SPEC = `# Login form

## Problem

Users cannot log in.

## Acceptance Criteria

- [ ] AC-01: Form shows email and password fields
- [ ] AC-02: Wrong password shows an error
- [x] AC-03: Checked by hand

## Approach

Add src/login.ts.

## Tasks

### T-01 Build the form
- AC: AC-01 | Files: src/login.ts | Test: npm test -- login

### T-02 Error message
- AC: AC-02 | Files: src/error.ts | Test: npm test -- error
`;

const tmp: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function mkProject(): { root: string; inc: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'one-file-'));
  tmp.push(root);
  const inc = path.join(root, '.specweave', 'increments', '0001-login');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ version: '2.0', project: { name: 'demo' } }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-login', status: 'active', type: 'feature', created: new Date().toISOString() }));
  fs.writeFileSync(path.join(inc, 'spec.md'), SPEC);
  return { root, inc };
}

function captureStdout(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { chunks.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return () => chunks.join('');
}

describe('one-file increments', () => {
  it('reads task definitions from spec.md when there is no tasks.md', () => {
    const { inc } = mkProject();
    expect(tasksFileFor(inc)).toBe(path.join(inc, 'spec.md'));
    const board = loadTaskBoard(inc);
    expect(board.tasks.map((t) => t.id)).toEqual(['T-01', 'T-02']);
    expect(board.tasks[0].filesAffected).toEqual(['src/login.ts']);
  });

  it('keeps a legacy tasks.md authoritative when it exists', () => {
    const { inc } = mkProject();
    fs.writeFileSync(path.join(inc, 'tasks.md'), '### T-09 Legacy\n- AC: AC-01 | Files: a.ts | Test: -\n');
    expect(tasksFileFor(inc)).toBe(path.join(inc, 'tasks.md'));
    expect(loadTaskBoard(inc).tasks.map((t) => t.id)).toEqual(['T-09']);
  });

  it('meets an AC when every task covering it is done, or when it is ticked by hand', () => {
    const { inc } = mkProject();
    appendEvent(ledgerPath(inc), { t: 'T-01', e: 'claim', by: 'a@h', at: new Date().toISOString() });
    appendEvent(ledgerPath(inc), { t: 'T-01', e: 'done', by: 'a@h', at: new Date().toISOString(), evidence: 'abc123' });
    const acs = deriveAcStatus(readSpecAcs(inc), loadTaskBoard(inc));
    expect(acs.map((a) => [a.id, a.done, a.via])).toEqual([
      ['AC-01', true, 'ledger'],
      ['AC-02', false, undefined],
      ['AC-03', true, 'checkbox'],
    ]);
  });

  it('never meets an AC that no task covers and nobody ticked', () => {
    const { inc } = mkProject();
    fs.writeFileSync(path.join(inc, 'spec.md'), SPEC.replace('- [x] AC-03', '- [ ] AC-03'));
    const acs = deriveAcStatus(readSpecAcs(inc), loadTaskBoard(inc));
    expect(acs.find((a) => a.id === 'AC-03')?.done).toBe(false);
  });

  it('task next prints the AC text and task done leaves spec.md untouched', async () => {
    const { root, inc } = mkProject();
    const read = captureStdout();
    expect(await taskCommand('next', undefined, undefined, { cwd: root, agent: 'a@h' })).toBe(0);
    expect(read()).toContain('AC-01: Form shows email and password fields');

    const before = fs.readFileSync(path.join(inc, 'spec.md'), 'utf-8');
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'manual check' })).toBe(0);
    expect(fs.readFileSync(path.join(inc, 'spec.md'), 'utf-8')).toBe(before);
    expect(fs.existsSync(path.join(inc, 'tasks.md'))).toBe(false);
  });
});

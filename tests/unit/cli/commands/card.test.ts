import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { cardCommand, cardsCommand } from '../../../../src/cli/commands/card.js';
import { taskCommand } from '../../../../src/cli/commands/task.js';
import { readLedger } from '../../../../src/core/tasks/ledger.js';
import { branchSlug } from '../../../../src/core/tasks/branch-cards.js';

let root: string;
let stdout: string[];
let stderr: string[];
const AGENT = 'claude@test';

function writeIncrement(id: string, status = 'active'): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status, title: 'Login form' }));
  fs.writeFileSync(path.join(dir, 'spec.md'), [
    '# Login form', '', '## Acceptance Criteria', '- [ ] AC-01: Sign in works', '',
    '## Tasks', '',
    '### T-01 Sign in', '- AC: AC-01 | Files: login.js | Test: none', '',
    '### T-02 Error message', '- AC: AC-01 | Files: error.js', '',
  ].join('\n'));
  return dir;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-card-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s: any) => { stdout.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((s: any) => { stderr.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

const opts = (extra: Record<string, unknown> = {}) => ({ cwd: root, agent: AGENT, branch: 'feat/login', ...extra });

describe('task claim|done|block --line --link', () => {
  it('stores line and link on the ledger events', async () => {
    const dir = writeIncrement('0001-login');
    expect(await taskCommand('claim', 'T-01', undefined, opts({ line: 'Wiring sign-in' }))).toBe(0);
    expect(await taskCommand('done', 'T-01', undefined, opts({ evidence: 'checked', line: 'Wired sign-in', link: 'https://github.com/o/r/pull/3' }))).toBe(0);
    expect(await taskCommand('block', 'T-02', undefined, opts({ reason: 'needs copy', line: 'Waiting on copy' }))).toBe(0);
    const events = readLedger(path.join(dir, 'ledger.jsonl')).events.filter((e) => e.t !== '*');
    expect(events.map((e) => [e.e, e.line, e.link])).toEqual([
      ['claim', 'Wiring sign-in', undefined],
      ['done', 'Wired sign-in', 'https://github.com/o/r/pull/3'],
      ['block', 'Waiting on copy', undefined],
    ]);
  });

  it('truncates a long --line with a warning', async () => {
    const dir = writeIncrement('0001-login');
    expect(await taskCommand('claim', 'T-01', undefined, opts({ line: 'y'.repeat(140) }))).toBe(0);
    expect(stderr.join('')).toContain('warning: --line is longer than 100 characters');
    const claim = readLedger(path.join(dir, 'ledger.jsonl')).events.find((e) => e.e === 'claim')!;
    expect(claim.line).toHaveLength(100);
  });

  it('done accepts --link as evidence when the task has no Test command', async () => {
    writeIncrement('0001-login');
    expect(await taskCommand('done', 'T-02', undefined, opts({ link: 'https://github.com/o/r/pull/4' }))).toBe(0);
  });
});

describe('cards --md', () => {
  it('prints header, blank line, then one line per card in ledger order', async () => {
    writeIncrement('0001-login');
    await cardCommand('start', 'T-01', undefined, opts({ line: 'Wiring sign-in' }));
    await cardCommand('done', 'T-01', undefined, opts({ evidence: 'ok', line: 'Wired sign-in', link: 'https://github.com/o/r/pull/3' }));
    await cardCommand('wait', 'T-02', undefined, opts({ line: 'Waiting on copy' }));
    stdout = [];
    expect(await cardsCommand(undefined, opts({ md: true }))).toBe(0);
    expect(stdout.join('')).toBe([
      '0001-login Login form',
      '',
      '✓ Wired sign-in (https://github.com/o/r/pull/3)',
      '⏸ Waiting on copy',
      '',
    ].join('\n'));
  });

  it('card list on an increment is task list', async () => {
    writeIncrement('0001-login');
    expect(await cardCommand('list', undefined, undefined, opts())).toBe(0);
    expect(stdout.join('')).toContain('| Task | State |');
  });
});

describe('branch-keyed cards', () => {
  it('card add/start/done/wait write .specweave/cards/<branch-slug>.jsonl with C-NN ids', async () => {
    expect(await cardCommand('add', 'Fix the redirect', undefined, opts())).toBe(0);
    expect(await cardCommand('add', 'Ship the docs', undefined, opts())).toBe(0);
    expect(await cardCommand('add', 'Tidy logs', undefined, opts())).toBe(0);
    expect(await cardCommand('start', 'C-02', undefined, opts({ line: 'Shipping the docs' }))).toBe(0);
    expect(await cardCommand('done', 'C-01', undefined, opts({ line: 'Fixed the redirect', link: 'https://github.com/o/r/pull/5' }))).toBe(0);
    expect(await cardCommand('wait', 'c3', undefined, opts({ reason: 'needs a log sample' }))).toBe(0);
    const file = path.join(root, '.specweave', 'cards', 'feat-login.jsonl');
    expect(fs.existsSync(file)).toBe(true);
    expect(readLedger(file).events.filter((e) => e.e === 'note').map((e) => e.t)).toEqual(['C-01', 'C-02', 'C-03']);
    stdout = [];
    expect(await cardsCommand(undefined, opts({ md: true }))).toBe(0);
    expect(stdout.join('')).toBe([
      'Cards on feat/login',
      '',
      '✓ Fixed the redirect (https://github.com/o/r/pull/5)',
      '✱ Shipping the docs',
      '⏸ Tidy logs',
      '',
    ].join('\n'));
  });

  it('refuses an unknown card id', async () => {
    expect(await cardCommand('start', 'C-07', undefined, opts())).toBe(1);
    expect(stderr.join('')).toContain('Card C-07 not found');
  });

  it('slugs branch names', () => {
    expect(branchSlug('inc/0933-Cards')).toBe('inc-0933-cards');
    expect(branchSlug(undefined)).toBe('no-branch');
  });
});

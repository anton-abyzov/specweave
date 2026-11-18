import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { taskCommand } from '../../../../src/cli/commands/task.js';
import { cardCommand } from '../../../../src/cli/commands/card.js';
import { readLedger } from '../../../../src/core/tasks/ledger.js';
import { loadTaskBoard } from '../../../../src/core/tasks/task-board.js';

let root: string;
let stderr: string[];
const AGENT = 'claude@test';
const SQUEEZED = 'New offline37profileattestation valid;113/148 exactartifactcopies recovered,35unresolved.';

function writeIncrement(id: string): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status: 'active', title: 'Import' }));
  fs.writeFileSync(path.join(dir, 'spec.md'), [
    '# Import', '', '## Acceptance Criteria', '- [ ] AC-01: Import works', '',
    '## Tasks', '',
    '### T-01 Import', '- AC: AC-01 | Files: import.js | Test: none', '',
    '### T-02 Report', '- AC: AC-01 | Files: report.js', '',
  ].join('\n'));
  return dir;
}

const ledgerLines = (dir: string): string => {
  const file = path.join(dir, 'ledger.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-reason-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation((s: any) => { stderr.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

const opts = (extra: Record<string, unknown> = {}) => ({ cwd: root, agent: AGENT, branch: 'feat/import', commit: false, ...extra });

describe('block and skip reasons are readable when written', () => {
  it.each(['block', 'skip'])('%s refuses glued words with exit 2 and appends nothing', async (action) => {
    const dir = writeIncrement('0001-import');
    const before = ledgerLines(dir);
    expect(await taskCommand(action, 'T-01', undefined, opts({ reason: SQUEEZED }))).toBe(2);
    expect(ledgerLines(dir)).toBe(before);
    const message = stderr.join('');
    expect(message).toContain('"offline37profileattestation"');
    expect(message).toContain('"35unresolved"');
    expect(message).toContain('one short plain sentence');
    expect(message).toContain('backticks');
    expect(message).toContain('Nothing was recorded');
  });

  it('block stores the reason with whitespace collapsed and the space after , and ; added', async () => {
    const dir = writeIncrement('0001-import');
    expect(await taskCommand('block', 'T-01', undefined, opts({ reason: '113/148 copies recovered;35 left,\n  waiting on the `loader,v2` fix' }))).toBe(0);
    const block = readLedger(path.join(dir, 'ledger.jsonl')).events.find((e) => e.e === 'block');
    expect(block?.note).toBe('113/148 copies recovered; 35 left, waiting on the `loader,v2` fix');
    expect(stderr.join('')).toBe('');
  });

  it('skip stores the normalized reason; --note is checked like --reason', async () => {
    const dir = writeIncrement('0001-import');
    expect(await taskCommand('skip', 'T-02', undefined, opts({ note: 'covered by T-01,no separate report' }))).toBe(0);
    const skip = readLedger(path.join(dir, 'ledger.jsonl')).events.find((e) => e.e === 'skip');
    expect(skip?.note).toBe('covered by T-01, no separate report');
    expect(await taskCommand('block', 'T-01', undefined, opts({ note: SQUEEZED }))).toBe(2);
  });

  it('a long reason is stored whole with a warning', async () => {
    const dir = writeIncrement('0001-import');
    const long = 'The import waits on the vendor export because the current file has no team ids. '.repeat(4).trim();
    expect(long.length).toBeGreaterThan(280);
    expect(await taskCommand('block', 'T-01', undefined, opts({ reason: long }))).toBe(0);
    expect(readLedger(path.join(dir, 'ledger.jsonl')).events.find((e) => e.e === 'block')?.note).toBe(long);
    expect(stderr.join('')).toMatch(/warning: the reason is \d+ characters/);
  });

  it('card wait on a T-NN card goes through the same check', async () => {
    const dir = writeIncrement('0001-import');
    expect(await cardCommand('wait', 'T-01', undefined, opts({ reason: SQUEEZED }))).toBe(2);
    expect(ledgerLines(dir)).toBe('');
  });

  it('card wait on a C-NN card refuses glued words and keeps the card file unchanged', async () => {
    expect(await cardCommand('add', 'Tidy logs', undefined, opts())).toBe(0);
    const file = path.join(root, '.specweave', 'cards', 'feat-import.jsonl');
    const before = fs.readFileSync(file, 'utf8');
    expect(await cardCommand('wait', 'C-01', undefined, opts({ reason: SQUEEZED }))).toBe(2);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    expect(await cardCommand('wait', 'C-01', undefined, opts({ reason: 'needs a log sample;ask ops' }))).toBe(0);
    expect(readLedger(file).events.find((e) => e.e === 'block')?.note).toBe('needs a log sample; ask ops');
  });

  it('loading a ledger never applies the rules: an old glued reason still shows as written', () => {
    const dir = writeIncrement('0001-import');
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), JSON.stringify({ t: 'T-01', e: 'block', by: AGENT, at: '2026-10-26T01:54:39.803Z', note: SQUEEZED }) + '\n');
    const t1 = loadTaskBoard(dir).tasks.find((t) => t.id === 'T-01');
    expect(t1?.state.status).toBe('blocked');
    expect(t1?.state.note).toBe(SQUEEZED);
  });
});

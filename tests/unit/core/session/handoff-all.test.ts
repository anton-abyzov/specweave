import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real git processes; a loaded CI runner needs more than the 10 s default.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildHandoffIndex,
  writeHandoffIndex,
  readLatestIndex,
  renderPickupAll,
  parseWaitLines,
  readWaits,
  INDEX_MARKER,
} from '../../../../src/core/session/handoff-all.js';
import { handoffCommand } from '../../../../src/cli/commands/handoff.js';
import { pickupCommand } from '../../../../src/cli/commands/pickup.js';
import { readLedger } from '../../../../src/core/tasks/ledger.js';

let base: string;
let root: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

function writeIncrement(id: string, opts: { status?: string; ledger?: object[]; handoff?: string } = {}): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status: opts.status ?? 'active' }));
  fs.writeFileSync(path.join(dir, 'spec.md'), [
    '---', `title: "Title ${id.slice(0, 4)}"`, '---', `# Title ${id.slice(0, 4)}`, '', '## Acceptance Criteria',
    '- [ ] AC-01: First', '- [ ] AC-02: Second', '', '## Tasks', '',
    '### T-01 One', '- AC: AC-01 | Files: a.js | Test: npm test', '',
    '### T-02 Two', '- AC: AC-02 | Files: b.js | Test: npm test', '',
  ].join('\n'));
  if (opts.ledger?.length) fs.writeFileSync(path.join(dir, 'ledger.jsonl'), opts.ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  if (opts.handoff) fs.writeFileSync(path.join(dir, 'handoff.md'), opts.handoff);
  return dir;
}

async function capture<T>(fn: () => Promise<T>): Promise<{ result: T; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const o = process.stdout.write;
  const e = process.stderr.write;
  process.stdout.write = ((c: string) => { out.push(String(c)); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((c: string) => { err.push(String(c)); return true; }) as typeof process.stderr.write;
  try { return { result: await fn(), out: out.join(''), err: err.join('') }; } finally { process.stdout.write = o; process.stderr.write = e; }
}

function initRepo(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'develop');
  git(dir, 'config', 'user.email', 'dev@example.com');
  git(dir, 'config', 'user.name', 'dev');
  git(dir, 'config', 'commit.gpgsign', 'false');
}

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-handoff-all-')));
  root = path.join(base, 'ws');
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => { process.exitCode = 0; fs.rmSync(base, { recursive: true, force: true }); });

describe('parseWaitLines', () => {
  it('reads "Waits on" lines, bold variants and a "Waiting on" section, and ignores "nothing"', () => {
    const text = [
      '# Handoff', 'Waits on: Anton typed go for the cutover', '- **Waiting on Anton:** pricing yes',
      'Waits on: nothing', '', '## Waiting on a person', '- Cloudflare token rotation', '- n/a', '', '## Next', '- not a wait',
    ].join('\n');
    expect(parseWaitLines(text)).toEqual(['Anton typed go for the cutover', 'Anton: pricing yes', 'Cloudflare token rotation']);
  });
});

describe('readWaits', () => {
  it('lists wait events after the last clearing one, plus handoff.md lines', () => {
    const dir = writeIncrement('0001-a', {
      ledger: [
        { t: '*', e: 'wait', by: 'claude@mbp', at: ago(60), note: 'old question' },
        { t: '*', e: 'wait', by: 'claude@mbp', at: ago(50), note: 'resolved' },
        { t: '*', e: 'wait', by: 'claude@mbp', at: ago(40), note: 'Anton: domain switch go' },
      ],
      handoff: 'Waiting on: DNS access\n',
    });
    expect(readWaits(dir)).toEqual(['Anton: domain switch go', 'DNS access']);
  });

  it('a wait event does not change task state', () => {
    const dir = writeIncrement('0001-a', { ledger: [{ t: '*', e: 'wait', by: 'x@y', at: ago(1), note: 'q' }] });
    expect(readLedger(path.join(dir, 'ledger.jsonl')).malformed).toBe(0);
  });
});

describe('buildHandoffIndex', () => {
  it('has one row per active increment with tasks, open ACs, last activity, waits and a resume prompt', async () => {
    writeIncrement('0001-login', {
      ledger: [
        { t: 'T-01', e: 'claim', by: 'codex@mbp', at: ago(30) },
        { t: 'T-01', e: 'done', by: 'codex@mbp', at: ago(20), evidence: 'npm test exit 0' },
      ],
    });
    writeIncrement('0002-cutover', { ledger: [{ t: '*', e: 'wait', by: 'claude@mbp', at: ago(5), note: 'Anton: typed go' }] });
    writeIncrement('0003-done', { status: 'completed' });

    const index = await buildHandoffIndex(root, { agent: 'claude@mbp', reason: 'switching accounts' });
    expect(index.rows.map((r) => r.id)).toEqual(['0001-login', '0002-cutover']);
    expect(index.repos).toBeUndefined(); // no repositories/ folder
    const login = index.rows[0];
    expect(login).toMatchObject({ title: 'Title 0001', tasksDone: 1, tasksTotal: 2, openAcs: ['AC-02'], totalAcs: 2, waits: [] });
    expect(Date.now() - Date.parse(login.lastActivityAt!)).toBeLessThan(21 * 60000);
    expect(login.resumePrompt).toContain('Pick up increment 0001 "Title 0001" in ');
    expect(login.resumePrompt).toContain('run `specweave pickup 0001`');
    const cut = index.rows[1];
    expect(cut.waits).toEqual(['Anton: typed go']);
    expect(cut.resumePrompt).toContain('It waits on Anton: typed go');
  });

  it('drops a leading id from the title', async () => {
    const dir = writeIncrement('0728-academy');
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id: '0728-academy', status: 'active', title: '0728 — Academy programs' }));
    const index = await buildHandoffIndex(root, { agent: 'claude@mbp' });
    expect(index.rows[0].title).toBe('Academy programs');
  });

  it('uses the full id in the pickup command when the short id names two folders', async () => {
    writeIncrement('0767-hockey');
    writeIncrement('0767-basketball', { status: 'planned' });
    const index = await buildHandoffIndex(root, { agent: 'claude@mbp' });
    expect(index.rows[0].resumePrompt).toContain('run `specweave pickup 0767-hockey`');
  });

  it('maps nested checkouts with local-only work to increments by id and puts them in the resume prompt', async () => {
    writeIncrement('0927-club-site');
    writeIncrement('0928-cms');
    const repo = path.join(root, 'repositories', 'acme', 'web-club0927');
    initRepo(repo);
    git(repo, 'checkout', '-q', '-b', 'feat/club-sites-0927');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'x');

    const index = await buildHandoffIndex(root, { agent: 'claude@mbp', prLookup: false });
    expect(index.repos!.flagged).toHaveLength(1);
    expect(index.repos!.flagged[0]).toMatchObject({ path: 'repositories/acme/web-club0927', branch: 'feat/club-sites-0927', dirty: 1, noRemote: true, increments: ['0927'] });
    const row = index.rows.find((r) => r.id === '0927-club-site')!;
    expect(row.repos).toEqual(['repositories/acme/web-club0927']);
    expect(row.resumePrompt).toContain('Local-only work first: repositories/acme/web-club0927 (feat/club-sites-0927, 1 uncommitted, no remote branch)');
    expect(index.rows.find((r) => r.id === '0928-cms')!.repos).toEqual([]);
  });
});

describe('writeHandoffIndex', () => {
  it('writes <date>-INDEX.md and index.json, actionable rows first, and keeps a keep block', async () => {
    writeIncrement('0001-a', { ledger: [{ t: '*', e: 'wait', by: 'x@y', at: ago(1), note: 'Anton: yes on price' }] });
    writeIncrement('0002-b', { ledger: [{ t: '*', e: 'note', by: 'x@y', at: ago(2), note: 'n' }] });
    const first = await writeHandoffIndex(root, { agent: 'claude@mbp', now: new Date('2026-10-03T12:00:00Z') });
    expect(first.written).toBe(true);
    expect(path.basename(first.mdPath)).toBe(`${first.index.date}-INDEX.md`);
    const md = fs.readFileSync(first.mdPath, 'utf8');
    expect(md).toContain(INDEX_MARKER);
    expect(md.indexOf('## Actionable now')).toBeLessThan(md.indexOf('| 0002 Title 0002 |'));
    expect(md.indexOf('## Waiting on a person')).toBeLessThan(md.indexOf('| 0001 Title 0001 |'));
    expect(JSON.parse(fs.readFileSync(first.jsonPath, 'utf8')).rows).toHaveLength(2);

    fs.writeFileSync(first.mdPath, md.replace('## Actionable now', '<!-- keep -->\nRule 1: one thread per account.\n<!-- /keep -->\n\n## Actionable now'));
    const second = await writeHandoffIndex(root, { agent: 'claude@mbp', now: new Date('2026-10-03T13:00:00Z') });
    expect(second.mdPath).toBe(first.mdPath);
    expect(fs.readFileSync(second.mdPath, 'utf8')).toContain('<!-- keep -->\nRule 1: one thread per account.\n<!-- /keep -->');
  });

  it('never overwrites a hand-written INDEX of the same name', async () => {
    writeIncrement('0001-a');
    const now = new Date('2026-10-03T12:00:00Z');
    const probe = await writeHandoffIndex(root, { dryRun: true, now });
    fs.mkdirSync(path.dirname(probe.mdPath), { recursive: true });
    fs.writeFileSync(probe.mdPath, '# My own index\n');
    const res = await writeHandoffIndex(root, { now });
    expect(path.basename(res.mdPath)).toBe(`${res.index.date}-INDEX.auto.md`);
    expect(fs.readFileSync(probe.mdPath, 'utf8')).toBe('# My own index\n');
  });

  it('--dry-run writes nothing', async () => {
    writeIncrement('0001-a');
    const res = await writeHandoffIndex(root, { dryRun: true });
    expect(res.written).toBe(false);
    expect(fs.existsSync(path.join(root, '.specweave', 'handoffs'))).toBe(false);
    expect(res.markdown).toContain('# Handoff index,');
  });

  it('scrubs secrets from titles and waits', async () => {
    // Built at runtime so secret scanners do not flag this test file.
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789AB'].join('_');
    writeIncrement('0001-a', { ledger: [{ t: '*', e: 'wait', by: 'x@y', at: ago(1), note: `rotate ${token}` }] });
    const res = await writeHandoffIndex(root, { dryRun: true });
    expect(res.markdown).not.toContain(token);
    expect(JSON.stringify(res.index)).not.toContain(token);
  });
});

describe('specweave handoff --all / pickup --all', () => {
  it('works with several active increments, writes no ledger events, and pickup --all lists actionable first', async () => {
    const a = writeIncrement('0001-a', { ledger: [{ t: '*', e: 'wait', by: 'x@y', at: ago(1), note: 'Anton: go' }] });
    writeIncrement('0002-b');
    const ledgerBefore = fs.readFileSync(path.join(a, 'ledger.jsonl'), 'utf8');

    const { out } = await capture(() => handoffCommand({ all: true, reason: 'switching accounts', cwd: root }));
    expect(process.exitCode ?? 0).toBe(0);
    expect(out).toContain('Indexed 2 active increments (1 actionable, 1 waiting on a person).');
    expect(fs.readFileSync(path.join(a, 'ledger.jsonl'), 'utf8')).toBe(ledgerBefore);
    expect(fs.existsSync(path.join(root, '.specweave', 'increments', '0002-b', 'ledger.jsonl'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.specweave', 'increments', '0002-b', 'handoff.md'))).toBe(false);

    const picked = await capture(() => pickupCommand({ all: true, cwd: root }));
    expect(picked.result).toBe(0);
    const text = picked.out;
    expect(text.indexOf('Actionable now (1):')).toBeLessThan(text.indexOf('0002 Title 0002 · tasks 0/2'));
    expect(text.indexOf('Waiting on a person (1):')).toBeLessThan(text.indexOf('0001 Title 0001 · tasks 0/2'));
    expect(text.indexOf('0002 Title 0002')).toBeLessThan(text.indexOf('0001 Title 0001'));
    expect(text).toContain('Waits on: Anton: go');
    expect(text).toContain('switching accounts');
  });

  it('--all --dry-run prints the index and writes nothing', async () => {
    writeIncrement('0001-a');
    const { out } = await capture(() => handoffCommand({ all: true, dryRun: true, cwd: root }));
    expect(out).toContain('# Handoff index,');
    expect(out).toContain(INDEX_MARKER);
    expect(fs.existsSync(path.join(root, '.specweave', 'handoffs'))).toBe(false);
  });

  it('rejects an increment id together with --all', async () => {
    writeIncrement('0001-a');
    const { err } = await capture(() => handoffCommand({ all: true, incrementId: '0001', cwd: root }));
    expect(process.exitCode).toBe(1);
    expect(err).toContain('--all');
  });

  it('pickup --all without an index says how to make one', () => {
    expect(renderPickupAll(root, readLatestIndex(root))).toContain('specweave handoff --all');
  });
});

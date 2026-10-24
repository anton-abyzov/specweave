import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { reopenIncrement, ReopenRefused } from '../../../../src/core/increment/reopen.js';
import { reopenCommand } from '../../../../src/cli/commands/reopen.js';
import { MetadataManager } from '../../../../src/core/increment/metadata-manager.js';
import { IncrementStatus, isValidTransition } from '../../../../src/core/types/increment-metadata.js';

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

const HOUR = 3_600_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

function workspace(config: Record<string, unknown> = {}): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-reopen-')));
  roots.push(root);
  fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'ws' }, ...config }));
  return root;
}

const SPEC_BODY = `# Public competition presentation

## Tasks

### T-01 Source
- AC: AC-01 | Files: a.ts | Test: true

### T-02 Release
- AC: AC-01 | Files: b.ts | Test: true

### T-03 Live check
- AC: AC-01 | Files: c.ts | Test: true
`;

interface IncOpts {
  status?: string;
  extra?: Record<string, unknown>;
  ledger?: Array<Record<string, string>>;
  frontmatter?: boolean;
}

function increment(root: string, id: string, opts: IncOpts = {}): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(path.join(dir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    id, status: opts.status ?? 'completed', type: 'feature', created: iso(48 * HOUR), lastActivity: iso(24 * HOUR),
    ...(opts.status === undefined || opts.status === 'completed'
      ? { approvedAt: '2026-10-20T10:00:00.000Z', closeReason: 'source shipped', readyForReviewAt: '2026-10-20T09:00:00.000Z' }
      : {}),
    ...opts.extra,
  }, null, 2));
  const spec = opts.frontmatter ? `---\nstatus: ${opts.status ?? 'completed'}\n---\n${SPEC_BODY}` : SPEC_BODY;
  fs.writeFileSync(path.join(dir, 'spec.md'), spec);
  const ledger = opts.ledger ?? [
    { t: 'T-01', e: 'claim', by: 'ps23-main', at: iso(30 * HOUR) },
    { t: 'T-01', e: 'done', by: 'ps23-main', at: iso(29 * HOUR), evidence: 'abc123' },
  ];
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'reports', 'verify.json'), JSON.stringify({ ok: true, at: '2026-10-20T08:00:00.000Z' }));
  return dir;
}

function snapshot(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files[path.relative(dir, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return files;
}

const meta = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));

function refusal(fn: () => unknown): ReopenRefused {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ReopenRefused);
    return e as ReopenRefused;
  }
  throw new Error('expected a refusal');
}

describe('specweave reopen (AC-01, AC-02)', () => {
  it('moves a completed increment to planned and keeps its closure, ledger and reports', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23', {
      frontmatter: true,
      ledger: [
        { t: 'T-01', e: 'claim', by: 'ps23-main', at: iso(30 * HOUR) },
        { t: 'T-01', e: 'done', by: 'ps23-main', at: iso(29 * HOUR), evidence: 'abc123' },
        { t: 'T-02', e: 'block', by: 'ps23-main', at: iso(5 * HOUR), note: 'waits on Arena #366' },
        { t: 'T-03', e: 'claim', by: 'ps23-main', at: iso(4 * HOUR) },
      ],
    });
    const before = snapshot(dir);

    const result = reopenIncrement({
      incrementId: '1009', reason: 'source-only closure; release and qualification still open',
      workspace: root, env: { SPECWEAVE_AGENT: 'ps23-main' }, now: new Date('2026-10-23T22:00:00.000Z'),
    });

    expect(result).toMatchObject({
      id: '1009-ps23', root, from: 'completed', to: 'planned', by: 'ps23-main', unchanged: false,
      previous: { approvedAt: '2026-10-20T10:00:00.000Z', closeReason: 'source shipped', readyForReviewAt: '2026-10-20T09:00:00.000Z' },
    });
    expect(result.unfinished).toEqual([
      { task: 'T-02', status: 'blocked', by: 'ps23-main' },
      { task: 'T-03', status: 'stale', by: 'ps23-main' },
    ]);

    const m = meta(dir);
    expect(m.status).toBe('planned');
    expect(m.approvedAt).toBeUndefined();
    expect(m.closeReason).toBeUndefined();
    expect(m.readyForReviewAt).toBeUndefined();
    expect(m.reopened).toEqual([{
      from: 'completed', to: 'planned', at: '2026-10-23T22:00:00.000Z', by: 'ps23-main',
      reason: 'source-only closure; release and qualification still open',
      approvedAt: '2026-10-20T10:00:00.000Z', closeReason: 'source shipped', readyForReviewAt: '2026-10-20T09:00:00.000Z',
    }]);

    const after = snapshot(dir);
    expect(after['ledger.jsonl']).toBe(before['ledger.jsonl']);
    expect(after[path.join('reports', 'verify.json')]).toBe(before[path.join('reports', 'verify.json')]);
    expect(after['spec.md']).toBe(`---\nstatus: planned\n---\n${SPEC_BODY}`);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    // Never active: the active-increment state is not created.
    expect(fs.existsSync(path.join(root, '.specweave', 'state', 'active-increment.json'))).toBe(false);
  });

  it('leaves a 3.0 spec without frontmatter byte-identical', () => {
    const root = workspace();
    const dir = increment(root, '0042-x');
    reopenIncrement({ incrementId: '0042', reason: 'r', workspace: root, env: { SPECWEAVE_AGENT: 'a' } });
    expect(fs.readFileSync(path.join(dir, 'spec.md'), 'utf8')).toBe(SPEC_BODY);
  });

  it('keeps completed → planned out of the general transition graph', () => {
    expect(isValidTransition(IncrementStatus.COMPLETED, IncrementStatus.PLANNED)).toBe(false);
    const root = workspace();
    increment(root, '0043-y');
    expect(() => MetadataManager.updateStatus('0043-y', IncrementStatus.PLANNED, undefined, root)).toThrow(/Invalid status transition/);
  });
});

describe('refusals change nothing (AC-03, AC-04)', () => {
  const env = { SPECWEAVE_AGENT: 'ps23-main' };

  it('needs a reason', () => {
    const root = workspace();
    increment(root, '1009-ps23');
    const before = snapshot(root);
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: '  ', workspace: root, env })).code).toBe('no-reason');
    expect(snapshot(root)).toEqual(before);
  });

  it('needs an explicit workspace', () => {
    const root = workspace();
    increment(root, '1009-ps23');
    const before = snapshot(root);
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', env })).code).toBe('no-workspace');
    cwd.mockRestore();
    expect(snapshot(root)).toEqual(before);
  });

  it('rejects a workspace that does not hold the increment (wrong root)', () => {
    const owner = workspace();
    const other = workspace();
    increment(owner, '1009-ps23');
    const before = [snapshot(owner), snapshot(other)];
    const e = refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: other, env }));
    expect(e.code).toBe('not-found');
    expect(e.message).toContain(other);
    expect([snapshot(owner), snapshot(other)]).toEqual(before);
  });

  it('rejects an increment folder that resolves outside the workspace', () => {
    const owner = workspace();
    const other = workspace();
    const dir = increment(owner, '1009-ps23');
    fs.symlinkSync(dir, path.join(other, '.specweave', 'increments', '1009-ps23'), 'dir');
    const before = snapshot(owner);
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: other, env })).code).toBe('outside-workspace');
    expect(snapshot(owner)).toEqual(before);
  });

  it.each(['active', 'planned', 'paused', 'abandoned'])('rejects a %s increment', (status) => {
    const root = workspace();
    increment(root, '1009-ps23', { status });
    const before = snapshot(root);
    const e = refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env }));
    expect(e.code).toBe('not-completed');
    if (status === 'abandoned') expect(e.message).toContain('specweave resume');
    expect(snapshot(root)).toEqual(before);
  });

  it('rejects tasks blocked, claimed or stale under another agent and names them', () => {
    const root = workspace();
    increment(root, '1009-ps23', {
      ledger: [
        { t: 'T-01', e: 'block', by: 'ps23-main', at: iso(5 * HOUR), note: 'waits' },
        { t: 'T-02', e: 'claim', by: 'ps23-main', at: iso(10 * HOUR) },
        { t: 'T-03', e: 'claim', by: 'codex@m3', at: iso(0.1 * HOUR) },
      ],
    });
    const before = snapshot(root);
    const e = refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env: { SPECWEAVE_AGENT: 'claude@m4' } }));
    expect(e.code).toBe('foreign-owner');
    expect(e.owners).toEqual([
      { task: 'T-01', status: 'blocked', by: 'ps23-main' },
      { task: 'T-02', status: 'stale', by: 'ps23-main' },
      { task: 'T-03', status: 'claimed', by: 'codex@m3' },
    ]);
    expect(e.message).toContain('specweave task release');
    expect(snapshot(root)).toEqual(before);
  });

  it('a holder of every open task may reopen; another holder still refuses it', () => {
    const root = workspace();
    increment(root, '1009-ps23', {
      ledger: [
        { t: 'T-01', e: 'block', by: 'ps23-main', at: iso(5 * HOUR), note: 'waits' },
        { t: 'T-02', e: 'claim', by: 'codex@m3', at: iso(0.1 * HOUR) },
      ],
    });
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env })).owners)
      .toEqual([{ task: 'T-02', status: 'claimed', by: 'codex@m3' }]);
  });

  it('a refusal leaves legacy config limits alone (no migration write)', () => {
    const root = workspace({ limits: { maxActiveIncrements: 1, hardCap: 2 } });
    increment(root, '1009-ps23', { status: 'active' });
    const before = snapshot(root);
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env })).code).toBe('not-completed');
    expect(snapshot(root)).toEqual(before);
  });

  it.each(['metadata.json', 'spec.md', 'ledger.jsonl'])('refuses a symlinked %s and writes nothing', (name) => {
    const root = workspace();
    const outside = workspace();
    const dir = increment(root, '1009-ps23');
    const target = path.join(outside, name);
    fs.renameSync(path.join(dir, name), target);
    fs.symlinkSync(target, path.join(dir, name));
    const before = [snapshot(root), snapshot(outside)];
    expect(refusal(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env })).code).toBe('outside-workspace');
    expect([snapshot(root), snapshot(outside)]).toEqual(before);
  });
});

describe('capacity and repeats (AC-05)', () => {
  it('reopens to planned even when the workspace is over its active limit', () => {
    const root = workspace({ limits: { activeIncrements: 1 } });
    increment(root, '0950-a', { status: 'active' });
    increment(root, '0952-b', { status: 'active' });
    const dir = increment(root, '1009-ps23');
    const result = reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env: { SPECWEAVE_AGENT: 'ps23-main' } });
    expect(meta(dir).status).toBe('planned');
    expect(result.active).toEqual({ count: 2, limit: 1 });
  });

  it('a second reopen is a no-op that exits 0', async () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23');
    const env = { SPECWEAVE_AGENT: 'ps23-main' };
    reopenIncrement({ incrementId: '1009', reason: 'first', workspace: root, env });
    const before = snapshot(dir);
    const again = reopenIncrement({ incrementId: '1009', reason: 'second', workspace: root, env });
    expect(again).toMatchObject({ unchanged: true, reason: 'first' });
    expect(snapshot(dir)).toEqual(before);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    expect(await reopenCommand('1009', { reason: 'second', workspace: root, env })).toBe(0);
    expect(snapshot(dir)).toEqual(before);
  });
});

describe('transaction safety (AC-02, AC-04)', () => {
  const env = { SPECWEAVE_AGENT: 'ps23-main' };

  it('changes only the frontmatter status line, even without a final newline', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23');
    const spec = '---\r\ntitle: "x: y"\r\nstatus: completed\r\nowner: ps23-main\r\n---\r\n# Body\r\n\r\n---\r\nstatus: not frontmatter';
    fs.writeFileSync(path.join(dir, 'spec.md'), spec);
    reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env });
    expect(fs.readFileSync(path.join(dir, 'spec.md'), 'utf8')).toBe(spec.replace('status: completed', 'status: planned'));
  });

  it('keeps incomplete legacy metadata as written: no schema repair, only the reopen fields change', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23');
    const legacy = { id: '1009-ps23', status: 'done', approvedAt: '2026-10-20T10:00:00.000Z', custom: { keep: [1, 2] } };
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(legacy) + '\n');
    fs.writeFileSync(path.join(dir, 'spec.md'), '---\nstatus: done\nbroken: [\n---\n' + SPEC_BODY);
    reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env, now: new Date('2026-10-23T22:00:00.000Z') });
    const m = meta(dir);
    expect(Object.keys(m)).toEqual(['id', 'status', 'custom', 'lastActivity', 'updated', 'reopened']);
    expect(m).toMatchObject({ id: '1009-ps23', status: 'planned', custom: { keep: [1, 2] } });
    expect(m.reopened[0]).toMatchObject({ approvedAt: '2026-10-20T10:00:00.000Z', by: 'ps23-main' });
    expect(fs.readFileSync(path.join(dir, 'spec.md'), 'utf8')).toBe('---\nstatus: planned\nbroken: [\n---\n' + SPEC_BODY);
  });

  it('a ledger write between the checks and the commit aborts and restores spec.md', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23', { frontmatter: true });
    const before = snapshot(root);
    const e = refusal(() => reopenIncrement({
      incrementId: '1009', reason: 'r', workspace: root, env,
      beforeMetadataWrite: () => fs.appendFileSync(path.join(dir, 'ledger.jsonl'), JSON.stringify({ t: 'T-02', e: 'claim', by: 'codex@m3', at: new Date().toISOString() }) + '\n'),
    }));
    expect(e.code).toBe('changed');
    const after = snapshot(root);
    expect(after[path.join('.specweave', 'increments', '1009-ps23', 'spec.md')]).toBe(before[path.join('.specweave', 'increments', '1009-ps23', 'spec.md')]);
    expect(after[path.join('.specweave', 'increments', '1009-ps23', 'metadata.json')]).toBe(before[path.join('.specweave', 'increments', '1009-ps23', 'metadata.json')]);
    expect(meta(dir).status).toBe('completed');
  });

  it('a failed metadata write restores spec.md and releases the lock', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23', { frontmatter: true });
    const before = snapshot(root);
    expect(() => reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env, beforeMetadataWrite: () => { throw new Error('disk full'); } }))
      .toThrow('disk full');
    expect(snapshot(root)).toEqual(before);
    expect(fs.existsSync(path.join(dir, '.reopen.lock'))).toBe(false);
  });

  it('a second reopen while one holds the lock is refused; the first audit is kept', () => {
    const root = workspace();
    const dir = increment(root, '1009-ps23');
    let inner: ReopenRefused | undefined;
    reopenIncrement({
      incrementId: '1009', reason: 'first', workspace: root, env,
      beforeMetadataWrite: () => { inner = refusal(() => reopenIncrement({ incrementId: '1009', reason: 'second', workspace: root, env })); },
    });
    expect(inner?.code).toBe('busy');
    expect(meta(dir).reopened.map((r: { reason: string }) => r.reason)).toEqual(['first']);
    expect(fs.existsSync(path.join(dir, '.reopen.lock'))).toBe(false);
  });

  it('never follows a planted temp-file symlink out of the workspace', () => {
    const root = workspace();
    const outside = workspace();
    const dir = increment(root, '1009-ps23', { frontmatter: true });
    const evidence = path.join(outside, 'evidence.json');
    fs.writeFileSync(evidence, 'external evidence');
    for (const name of ['metadata.json.tmp', 'spec.md.tmp']) fs.symlinkSync(evidence, path.join(dir, name));
    reopenIncrement({ incrementId: '1009', reason: 'r', workspace: root, env });
    expect(fs.readFileSync(evidence, 'utf8')).toBe('external evidence');
    expect(fs.lstatSync(path.join(dir, 'metadata.json')).isFile()).toBe(true);
    expect(meta(dir).status).toBe('planned');
    expect(fs.readdirSync(dir).filter((n) => n.endsWith('.tmp')).sort()).toEqual(['metadata.json.tmp', 'spec.md.tmp']);
  });
});

describe('CLI (AC-05, AC-06)', () => {
  it('prints the separate start step, and JSON with the audit fields', async () => {
    const root = workspace();
    increment(root, '1009-ps23');
    const lines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { lines.push(String(s)); return true; });
    expect(await reopenCommand('1009', { reason: 'r', workspace: root, env: { SPECWEAVE_AGENT: 'ps23-main' } })).toBe(0);
    expect(lines.join('')).toContain('specweave start 1009-ps23');

    const other = workspace();
    increment(other, '1010-q');
    lines.length = 0;
    expect(await reopenCommand('1010', { reason: 'r', json: true, workspace: other, env: { SPECWEAVE_AGENT: 'ps23-main' } })).toBe(0);
    const json = JSON.parse(lines.join(''));
    expect(Object.keys(json)).toEqual(expect.arrayContaining(['id', 'root', 'from', 'to', 'at', 'by', 'reason', 'previous', 'unfinished']));
    expect(json).toMatchObject({ id: '1010-q', root: other, from: 'completed', to: 'planned' });
  });

  it('exits 1 with a JSON error on a refusal', async () => {
    const root = workspace();
    increment(root, '1009-ps23', { status: 'active' });
    const lines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { lines.push(String(s)); return true; });
    expect(await reopenCommand('1009', { reason: 'r', json: true, workspace: root, env: {} })).toBe(1);
    expect(JSON.parse(lines.join(''))).toMatchObject({ error: 'not-completed' });
  });

  it('runs through bin/specweave.js with --workspace, and refuses without it', () => {
    const bin = path.resolve('bin/specweave.js');
    if (!fs.existsSync(path.resolve('dist/src/cli/commands/reopen.js'))) throw new Error('dist/ is missing: run `npm run build` before this test');
    const root = workspace();
    const dir = increment(root, '1009-ps23');
    const env = { ...process.env, SPECWEAVE_AGENT: 'ps23-main', SPECWEAVE_WORKSPACE: '' };
    delete env.SPECWEAVE_WORKSPACE;

    const without = spawnSync(process.execPath, [bin, 'reopen', '1009', '--reason', 'r', '--json'], { cwd: root, env, encoding: 'utf8' });
    expect(without.status).toBe(1);
    expect(JSON.parse(without.stdout)).toMatchObject({ error: 'no-workspace' });
    expect(meta(dir).status).toBe('completed');

    const ok = spawnSync(process.execPath, [bin, '--workspace', root, 'reopen', '1009', '--reason', 'r', '--json'], { cwd: root, env, encoding: 'utf8' });
    expect(ok.status, ok.stderr).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ id: '1009-ps23', to: 'planned', by: 'ps23-main' });
    expect(meta(dir).status).toBe('planned');
  });
});

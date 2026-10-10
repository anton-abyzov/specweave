import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { listPendingHandoffs, matchHandoff, readBranch, renderHandoffList } from '../../../../src/core/session/handoff-list.js';
import {
  checkpointDirectory, clearSessionHandoff, markSessionHandoff, summaryTitle, SESSION_HANDOFF_FILE,
} from '../../../../src/core/session/session-checkpoint.js';
import { sameIncrement } from '../../../../src/core/session/handoff-remote.js';
import { pickupCommand, handoffListCommand } from '../../../../src/cli/commands/pickup.js';
import { needsSessionHandoff, usageGuardCommand } from '../../../../src/cli/commands/auto-handoff.js';
import { writeSettings } from '../../../../src/core/session/usage-guard.js';
import { readIncrementEvents } from '../../../../src/core/tasks/ledger.js';

let root: string;
let home: string;

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

function writeIncrement(id: string, title: string, ledger: object[] = [], status = 'active'): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status, title }));
  fs.writeFileSync(path.join(dir, 'spec.md'), `# ${title}\n`);
  if (ledger.length) fs.writeFileSync(path.join(dir, 'ledger.jsonl'), ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return dir;
}

const handoff = (min: number, note = 'usage limit reached') => ({ t: '*', e: 'handoff', by: 'claude@m4', at: ago(min), note });
const pickup = (min: number) => ({ t: '*', e: 'pickup', by: 'codex@m4', at: ago(min) });

/** A worktree inside the project, with a `.git` file the way `git worktree add` writes it. */
function writeWorktree(name: string, branch: string): string {
  const gitDir = path.join(root, '.git', 'worktrees', name);
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, 'HEAD'), `ref: refs/heads/${branch}\n`);
  const dir = path.join(root, '.claude', 'worktrees', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.git'), `gitdir: ${gitDir}\n`);
  return fs.realpathSync(dir);
}

/** What the checkpoint worker leaves behind for a session, plus the limit-hit mark. */
function writeSessionHandoff(sessionId: string, cwd: string, opts: { min: number; title?: string; mark?: boolean }): string {
  const dir = checkpointDirectory({ session_id: sessionId, cwd }, { home })!;
  const gen = path.join(dir, 'snapshot-1');
  fs.mkdirSync(gen, { recursive: true });
  fs.writeFileSync(path.join(gen, 'handoff.md'), '# Local checkpoint — x\n\n## Where I left off\n\nWired the coordinator-only flow. Tests next.\n\n## Done / Pending\n');
  fs.writeFileSync(path.join(gen, 'handoff.diff'), '');
  fs.writeFileSync(path.join(dir, 'current.json'), JSON.stringify({
    version: 1, sessionId, cwd, savedAt: ago(opts.min), docPath: path.join(gen, 'handoff.md'), diffPath: path.join(gen, 'handoff.diff'),
    ...(opts.title ? { title: opts.title } : {}),
  }));
  if (opts.mark !== false) markSessionHandoff({ session_id: sessionId, cwd }, { by: 'claude@m4', reason: 'usage limit reached', at: ago(opts.min) }, { home });
  return dir;
}

async function capture(fn: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const o = vi.spyOn(process.stdout, 'write').mockImplementation((c) => { out.push(String(c)); return true; });
  const e = vi.spyOn(process.stderr, 'write').mockImplementation((c) => { err.push(String(c)); return true; });
  try { return { code: await fn(), out: out.join(''), err: err.join('') }; } finally { o.mockRestore(); e.mockRestore(); }
}

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hlist-')));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hlist-home-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

describe('listPendingHandoffs', () => {
  it('lists increments whose last handoff has no pickup, newest first, by their four-digit number', () => {
    writeIncrement('0874-studio-release', 'Studio release tested on the Mac', [handoff(120)]);
    writeIncrement('0880-memory-import', 'Project memory and routines', [handoff(30, 'out of tokens')]);
    writeIncrement('0881-done-already', 'Picked up', [handoff(60), pickup(50)]);
    writeIncrement('0882-closed', 'Closed', [handoff(10)], 'completed');
    const pending = listPendingHandoffs(root, { home });
    expect(pending.map((h) => h.id)).toEqual(['0880', '0874']);
    expect(pending[0]).toMatchObject({ kind: 'increment', title: 'Project memory and routines', by: 'claude@m4', reason: 'out of tokens', incrementId: '0880-memory-import' });
  });

  it('uses the full folder name when two increments share a number', () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(20)]);
    writeIncrement('0874-handoff-ids', 'Handoff ids', [handoff(10)]);
    expect(listPendingHandoffs(root, { home }).map((h) => h.id)).toEqual(['0874-handoff-ids', '0874-studio-release']);
  });

  it('lists a session that handed off from a worktree, named after the worktree, until it is picked up', () => {
    const wt = writeWorktree('studio-coordinator-routing', 'codex/studio-routing');
    writeSessionHandoff('s-1', wt, { min: 5, title: 'Coordinator-only flow is built' });
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    const [first, second] = listPendingHandoffs(root, { home });
    expect(first).toMatchObject({ id: 'studio-coordinator-routing', kind: 'session', title: 'Coordinator-only flow is built', branch: 'codex/studio-routing', checkout: wt });
    expect(second.id).toBe('0874');
    expect(renderHandoffList(root, listPendingHandoffs(root, { home }))).toContain('.claude/worktrees/studio-coordinator-routing (branch codex/studio-routing)');
  });

  it('takes an older checkpoint\'s title from its document and skips sessions without the mark or outside the project', () => {
    const wt = writeWorktree('t3-cleanup', 'claude/t3-cleanup');
    writeSessionHandoff('s-2', wt, { min: 5 });
    writeSessionHandoff('s-3', writeWorktree('still-working', 'x'), { min: 3, mark: false });
    const elsewhere = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-other-')));
    writeSessionHandoff('s-4', elsewhere, { min: 2 });
    try {
      const pending = listPendingHandoffs(root, { home });
      expect(pending.map((h) => h.id)).toEqual(['t3-cleanup']);
      expect(pending[0].title).toBe('Wired the coordinator-only flow.');
    } finally { fs.rmSync(elsewhere, { recursive: true, force: true }); }
  });

  it('gives two sessions in same-named folders distinct ids, the older keeping the plain name', () => {
    const a = path.join(root, 'repositories', 'a', 'specweave');
    const b = path.join(root, 'repositories', 'b', 'specweave');
    for (const d of [a, b]) { fs.mkdirSync(d, { recursive: true }); fs.mkdirSync(path.join(d, '.git')); }
    writeSessionHandoff('aaaa1111', fs.realpathSync(a), { min: 30 });
    writeSessionHandoff('bbbb2222', fs.realpathSync(b), { min: 5 });
    expect(listPendingHandoffs(root, { home }).map((h) => h.id)).toEqual(['specweave-bbbb', 'specweave']);
  });
});

describe('matchHandoff', () => {
  beforeEach(() => {
    writeIncrement('0874-studio-release', 'Studio release tested on the Mac', [handoff(60)]);
    writeIncrement('0880-memory-import', 'Project memory and routines', [handoff(30)]);
    writeSessionHandoff('s-1', writeWorktree('studio-coordinator-routing', 'codex/studio-routing'), { min: 5, title: 'Coordinator-only flow' });
  });

  it('finds one by id, by a short or padded number, by folder name and by title words', () => {
    const pending = listPendingHandoffs(root, { home });
    const id = (q: string) => { const m = matchHandoff(pending, q); return m.kind === 'one' ? m.handoff.id : m.kind; };
    expect(id('0874')).toBe('0874');
    expect(id('874')).toBe('0874');
    expect(id('0880-memory-import')).toBe('0880');
    expect(id('studio-coordinator-routing')).toBe('studio-coordinator-routing');
    expect(id('the studio release')).toBe('0874');
    expect(id('"memory"')).toBe('0880');
    expect(id('nothing like this')).toBe('none');
  });

  it('returns every candidate when the words fit several', () => {
    const m = matchHandoff(listPendingHandoffs(root, { home }), 'studio');
    expect(m.kind).toBe('several');
    expect(m.kind === 'several' && m.candidates.map((h) => h.id)).toEqual(['studio-coordinator-routing', '0874']);
  });
});

describe('specweave pickup with several pending handoffs', () => {
  it('takes the newest when none is named, records it, and lists the others', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    writeIncrement('0880-memory-import', 'Memory import', [handoff(30)]);
    const first = await capture(() => pickupCommand({ cwd: root, agent: 'codex@m4', home }));
    expect(first.code).toBe(0);
    expect(first.out).toContain('Picking up the newest of 2 pending handoffs: 0880  Memory import');
    expect(first.out).toContain('Also pending (1), for another session:');
    expect(first.out).toContain('  0874  Studio release');
    expect(readIncrementEvents(path.join(root, '.specweave/increments/0880-memory-import/ledger.jsonl'), ['pickup'])).toHaveLength(1);

    // The next session's plain "pick up" gets the one left.
    const second = await capture(() => pickupCommand({ cwd: root, agent: 'claude@m4', home }));
    expect(second.out).toContain('Picking up handoff: 0874  Studio release');
    expect(second.out).not.toContain('Also pending');
    expect(listPendingHandoffs(root, { home })).toEqual([]);
  });

  it('takes the one named, by id or title words, and leaves the newer one pending', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    writeIncrement('0880-memory-import', 'Memory import', [handoff(30)]);
    const r = await capture(() => pickupCommand({ cwd: root, incrementId: 'studio release', agent: 'codex@m4', home }));
    expect(r.out).toContain('Picking up handoff: 0874  Studio release');
    expect(r.out).toContain('Increment 0874-studio-release');
    expect(listPendingHandoffs(root, { home }).map((h) => h.id)).toEqual(['0880']);
  });

  it('asks instead of guessing when the name fits several, and changes nothing', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    writeIncrement('0880-studio-memory', 'Studio memory', [handoff(30)]);
    const r = await capture(() => pickupCommand({ cwd: root, incrementId: 'studio', agent: 'codex@m4', home }));
    expect(r.code).toBe(2);
    expect(r.out).toContain('"studio" matches 2 pending handoffs; nothing was picked up');
    expect(listPendingHandoffs(root, { home })).toHaveLength(2);
  });

  it('picks up a session handoff: points at its checkout, marks it taken, and leaves increments alone', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    const wt = writeWorktree('studio-coordinator-routing', 'codex/studio-routing');
    writeSessionHandoff('s-1', wt, { min: 5, title: 'Coordinator-only flow' });
    const r = await capture(() => pickupCommand({ cwd: root, incrementId: 'studio-coordinator-routing', agent: 'codex@m4', home }));
    expect(r.out).toContain('Picking up handoff: studio-coordinator-routing  Coordinator-only flow');
    expect(r.out).toContain('Continue in .claude/worktrees/studio-coordinator-routing (branch codex/studio-routing)');
    expect(r.out).toContain('Read the handoff first:');
    expect(listPendingHandoffs(root, { home }).map((h) => h.id)).toEqual(['0874']);
  });

  it('--no-apply shows the choice without taking it', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    await capture(() => pickupCommand({ cwd: root, agent: 'codex@m4', home, apply: false }));
    expect(listPendingHandoffs(root, { home })).toHaveLength(1);
  });

  it('a name that matches nothing pending still picks up that increment, and an unknown one fails with the list', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    writeIncrement('0890-quiet', 'Quiet one');
    const ok = await capture(() => pickupCommand({ cwd: root, incrementId: '0890', agent: 'codex@m4', home }));
    expect(ok.code).toBe(0);
    expect(ok.out).toContain('Increment 0890-quiet');
    const bad = await capture(() => pickupCommand({ cwd: root, incrementId: 'zzz', agent: 'codex@m4', home }));
    expect(bad.code).toBe(1);
    expect(bad.err).toContain('Nothing pending or in this project matches "zzz"');
    expect(bad.err).toContain('0874  Studio release');
  });

  it('handoff list prints ids and where each one lives, and JSON on request', async () => {
    writeIncrement('0874-studio-release', 'Studio release', [handoff(60)]);
    const text = await capture(() => handoffListCommand({ cwd: root, home }));
    expect(text.out).toContain('1 pending handoff, newest first:');
    expect(text.out).toContain('0874  Studio release · claude@m4 · 1h ago · usage limit reached');
    const json = await capture(() => handoffListCommand({ cwd: root, home, json: true }));
    expect(JSON.parse(json.out)[0]).toMatchObject({ id: '0874', kind: 'increment' });
  });
});

describe('a session that hits the limit inside a shared project', () => {
  it('hands off through its own checkpoint from a worktree or with several increments active', () => {
    const wt = writeWorktree('studio-routing', 'codex/x');
    expect(needsSessionHandoff(root, { session_id: 's', cwd: wt })).toBe(true);
    // A plain subfolder is the same checkout.
    fs.mkdirSync(path.join(root, 'src'));
    writeIncrement('0874-a', 'A');
    expect(needsSessionHandoff(root, { session_id: 's', cwd: path.join(root, 'src') })).toBe(false);
    writeIncrement('0875-b', 'B');
    expect(needsSessionHandoff(root, { session_id: 's', cwd: root })).toBe(true);
  });

  it('the StopFailure hook marks the session instead of failing on several active increments', async () => {
    writeSettings({ at: 95, mode: 'suggest' }, home);
    writeIncrement('0874-a', 'A');
    writeIncrement('0875-b', 'B');
    const input = JSON.stringify({ session_id: 'limit-1', cwd: root, error: 'rate_limit' });
    await capture(async () => usageGuardCommand({ home, input, limitHit: true, env: {} }));
    const mark = JSON.parse(fs.readFileSync(path.join(checkpointDirectory({ session_id: 'limit-1', cwd: root }, { home })!, SESSION_HANDOFF_FILE), 'utf8'));
    expect(mark).toMatchObject({ version: 1, reason: expect.stringContaining('usage limit reached') });
    expect(fs.existsSync(path.join(root, '.specweave/increments/0874-a/ledger.jsonl'))).toBe(false);
  });

  it('drops the mark once the same session works again, not right after the limit', () => {
    const input = { session_id: 'back-1', cwd: root };
    const dir = checkpointDirectory(input, { home })!;
    const now = Date.now();
    markSessionHandoff(input, { reason: 'usage limit reached' }, { home, now });
    clearSessionHandoff(input, { home, now: now + 60_000 });
    expect(fs.existsSync(path.join(dir, SESSION_HANDOFF_FILE))).toBe(true);
    clearSessionHandoff(input, { home, now: now + 20 * 60_000 });
    expect(fs.existsSync(path.join(dir, SESSION_HANDOFF_FILE))).toBe(false);
  });
});

describe('helpers', () => {
  it('summaryTitle keeps the first sentence of the last message, without markdown', () => {
    expect(summaryTitle('## Done\n**Merged #45** and imported memory. Next: release.')).toBe('Merged #45 and imported memory.');
    expect(summaryTitle('')).toBeUndefined();
    expect(summaryTitle('x'.repeat(150))?.length).toBe(100);
  });

  it('readBranch reads a worktree branch without Git', () => {
    expect(readBranch(writeWorktree('w', 'feat/y'))).toBe('feat/y');
    expect(readBranch(root)).toBeUndefined();
  });

  it('sameIncrement matches a pushed handoff to the increment asked for', () => {
    expect(sameIncrement('0874-studio-release', '0874')).toBe(true);
    expect(sameIncrement('0874-studio-release', '874')).toBe(true);
    expect(sameIncrement('0874-studio-release', '0874-studio-release')).toBe(true);
    expect(sameIncrement('0874-studio-release', '0880')).toBe(false);
    expect(sameIncrement(undefined, '0874')).toBe(false);
  });
});

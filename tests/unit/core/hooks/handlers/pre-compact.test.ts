/**
 * PreCompact handler: writes a handoff only when an increment is active,
 * within a 5 s budget, never blocks compaction, always returns `{}`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { handle, handoffIncrement, writeAutoHandoff } from '../../../../../src/core/hooks/handlers/pre-compact.js';
import { studioThreadBindingFile } from '../../../../../src/core/tasks/studio-thread-binding.js';
import { workSessionFile } from '../../../../../src/core/tasks/work-session.js';
import { createContext } from '../../../../../src/core/hooks/handlers/utils.js';

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  execFileSync('git', ['checkout', '-q', '-b', 'main'], { cwd: root });
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: root });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

function mkActive(root: string, ...ids: string[]): void {
  for (const id of ids) {
    const d = path.join(root, '.specweave', 'increments', id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'metadata.json'), JSON.stringify({ id, status: 'active', type: 'feature', created: new Date().toISOString() }));
    fs.writeFileSync(path.join(d, 'spec.md'), `# ${id}\n\n- [ ] AC-01 x\n`);
    fs.writeFileSync(path.join(d, 'tasks.md'), '### T-001: a\n**Status**: [ ] pending\n');
  }
  fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids }));
}

/** Any handoff doc the builder may write. */
function handoffDocs(root: string): string[] {
  const candidates = [
    path.join(root, '.specweave', 'state', 'handoff-latest.md'),
    path.join(root, 'HANDOFF.md'),
    path.join(root, '.handoff', 'HANDOFF.md'),
  ];
  try {
    for (const id of fs.readdirSync(path.join(root, '.specweave', 'increments'))) {
      candidates.push(path.join(root, '.specweave', 'increments', id, 'handoff.md'));
    }
  } catch { /* none */ }
  return candidates.filter((c) => fs.existsSync(c)).map((c) => fs.readFileSync(c, 'utf-8'));
}

describe('pre-compact', () => {
  let repo = '';
  afterEach(() => {
    delete process.env.SPECWEAVE_HOOK_DRY_RUN;
    if (repo) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('returns {} and writes nothing when no increment is active', async () => {
    repo = mkRepo();
    expect(await handle({}, createContext(repo))).toEqual({});
    expect(handoffDocs(repo)).toEqual([]);
  });

  it('writes a handoff for the active increment and honors the agent reason', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    expect(await handle({ reason: 'out of subscription tokens' }, createContext(repo))).toEqual({});
    const docs = handoffDocs(repo);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.join('\n')).toContain('out of subscription tokens');
  });

  it('uses the default reason when the agent supplies none', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    await handle({}, createContext(repo));
    expect(handoffDocs(repo).join('\n')).toContain('auto: pre-compact');
  });

  it('picks the first active increment when several are active (no ambiguity error)', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one', '0002-two');
    expect(await writeAutoHandoff(createContext(repo), {}, 'auto: pre-compact')).toBe(true);
    expect(handoffDocs(repo).join('\n')).toContain('0001-one');
  });

  describe('handoffIncrement with several active increments', () => {
    let home = '';
    afterEach(() => {
      if (home) fs.rmSync(home, { recursive: true, force: true });
      home = '';
    });
    const write = (file: string, body: object) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(body));
    };

    it("uses the SpecWithCode thread's bound increment, not the first active one", () => {
      repo = mkRepo();
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-home-'));
      write(studioThreadBindingFile('thread-b', home), { version: 1, threadId: 'thread-b', incrementId: '0002-two', root: repo });
      const env = { SPECWEAVE_STUDIO_THREAD_ID: 'thread-b' };
      expect(handoffIncrement(['0001-one', '0002-two'], repo, {}, { env, home })).toBe('0002-two');
    });

    it("prefers the session's work marker over the thread binding", () => {
      repo = mkRepo();
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-home-'));
      write(workSessionFile('sess-1', home), { version: 1, sessionId: 'sess-1', kind: 'increment', incrementId: '0003-three', root: repo });
      write(studioThreadBindingFile('thread-b', home), { version: 1, threadId: 'thread-b', incrementId: '0002-two', root: repo });
      const env = { SPECWEAVE_STUDIO_THREAD_ID: 'thread-b' };
      expect(handoffIncrement(['0001-one', '0002-two', '0003-three'], repo, { session_id: 'sess-1' }, { env, home })).toBe('0003-three');
    });

    it('falls back to the first active increment when the binding is closed, foreign or absent', () => {
      repo = mkRepo();
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-home-'));
      const other = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-other-'));
      try {
        write(studioThreadBindingFile('foreign', home), { version: 1, incrementId: '0002-two', root: other });
        write(studioThreadBindingFile('closed', home), { version: 1, incrementId: '0009-done', root: repo });
        const active = ['0001-one', '0002-two'];
        expect(handoffIncrement(active, repo, {}, { env: { SPECWEAVE_STUDIO_THREAD_ID: 'foreign' }, home })).toBe('0001-one');
        expect(handoffIncrement(active, repo, {}, { env: { SPECWEAVE_STUDIO_THREAD_ID: 'closed' }, home })).toBe('0001-one');
        expect(handoffIncrement(active, repo, {}, { env: {}, home })).toBe('0001-one');
      } finally {
        fs.rmSync(other, { recursive: true, force: true });
      }
    });

    it('skips a marker or binding whose root is not a string', () => {
      repo = mkRepo();
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-home-'));
      write(workSessionFile('sess-bad', home), { version: 1, sessionId: 'sess-bad', kind: 'increment', incrementId: '0003-three', root: { a: 1 } });
      write(studioThreadBindingFile('bad', home), { version: 1, incrementId: '0002-two', root: 7 });
      write(studioThreadBindingFile('good', home), { version: 1, incrementId: '0002-two', root: repo });
      const active = ['0001-one', '0002-two', '0003-three'];
      expect(handoffIncrement(active, repo, { session_id: 'sess-bad' }, { env: { SPECWEAVE_STUDIO_THREAD_ID: 'bad' }, home })).toBe('0001-one');
      expect(handoffIncrement(active, repo, { session_id: 'sess-bad' }, { env: { SPECWEAVE_STUDIO_THREAD_ID: 'good' }, home })).toBe('0002-two');
    });

    it("writes the handoff for the thread's increment end to end", async () => {
      repo = mkRepo();
      mkActive(repo, '0001-one', '0002-two');
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-home-'));
      write(studioThreadBindingFile('thread-b', home), { version: 1, threadId: 'thread-b', incrementId: '0002-two', root: repo });
      // os.homedir() reads HOME on POSIX and USERPROFILE on Windows.
      const keys = ['HOME', 'USERPROFILE', 'SPECWEAVE_STUDIO_THREAD_ID'] as const;
      const saved = keys.map((k) => process.env[k]);
      process.env.HOME = home;
      process.env.USERPROFILE = home;
      process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread-b';
      try {
        expect(await writeAutoHandoff(createContext(repo), {}, 'auto: pre-compact')).toBe(true);
      } finally {
        keys.forEach((k, i) => {
          if (saved[i] === undefined) delete process.env[k];
          else process.env[k] = saved[i];
        });
      }
      const docs = handoffDocs(repo).join('\n');
      expect(docs).toContain('0002-two');
      expect(docs).not.toContain('0001-one');
    });
  });

  it('abandons the write when the budget is exceeded and still returns {}', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    const ctx = createContext(repo);
    vi.resetModules();
    vi.doMock('../../../../../src/core/session/work-handoff.js', () => ({
      buildWorkHandoff: () => new Promise((resolve) => setTimeout(() => resolve({ docPath: 'slow' }), 300)),
    }));
    try {
      const slow = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
      expect(await slow.writeAutoHandoff(ctx, {}, 'auto: pre-compact', 20)).toBe(false);
      expect(await slow.handle({}, ctx)).toEqual({});
    } finally {
      vi.doUnmock('../../../../../src/core/session/work-handoff.js');
      vi.resetModules();
    }
    const log = fs.readFileSync(path.join(ctx.logsDir, 'hooks.jsonl'), 'utf8');
    expect(log).toContain('abandoned after 20 ms budget');
  });

  it('SPECWEAVE_HOOK_DRY_RUN=1 skips the write (doctor dry-run)', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    process.env.SPECWEAVE_HOOK_DRY_RUN = '1';
    expect(await handle({}, createContext(repo))).toEqual({});
    expect(handoffDocs(repo)).toEqual([]);
  });

  it('never breaks compaction when the builder cannot run', async () => {
    const bogus = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-bogus-'));
    try {
      fs.mkdirSync(path.join(bogus, '.specweave', 'increments', '0001-x'), { recursive: true });
      fs.writeFileSync(path.join(bogus, '.specweave', 'increments', '0001-x', 'metadata.json'), '{"status":"active"}');
      expect(await handle({}, createContext(bogus))).toEqual({});
    } finally {
      fs.rmSync(bogus, { recursive: true, force: true });
    }
  });
});

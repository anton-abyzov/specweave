/**
 * `specweave small-fix` in a SpecWithCode thread with no session id (Codex,
 * Pi): the marker is keyed `studio-<thread>` and the log names the thread.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { smallFixCommand, readSmallFixes } from '../../../../src/cli/commands/small-fix.js';
import { readWorkSession } from '../../../../src/core/tasks/work-session.js';

let root: string;
let home: string;
let savedHome: Record<string, string | undefined>;
let stdout: string;

beforeEach(() => {
  savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-small-fix-')));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-small-fix-home-'));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  stdout = '';
  vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string) => {
    stdout += chunk;
    return true;
  }) as typeof process.stdout.write);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const [k, v] of Object.entries(savedHome)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

describe('small-fix (1001 AC-02)', () => {
  it('with only the thread id set, writes a thread-keyed marker and logs the thread', () => {
    const env = { SPECWEAVE_STUDIO_THREAD_ID: 'thread:abc', SPECWEAVE_AGENT: 'codex@test' };
    expect(smallFixCommand('fix a typo', { cwd: root, env })).toBe(0);
    expect(stdout).toContain('Small fix recorded for this SpecWithCode thread: fix a typo');
    expect(readSmallFixes(root)).toMatchObject([{ reason: 'fix a typo', thread: 'thread:abc' }]);
    expect(readSmallFixes(root)[0]).not.toHaveProperty('session');
    expect(readWorkSession('studio-thread:abc', home)).toMatchObject({ kind: 'small-fix', root, incrementId: null });
    expect(fs.existsSync(path.join(home, '.specweave', 'sessions', 'studio-thread_abc.json'))).toBe(true);
  });

  it('with a session id and a thread, writes only the session marker', () => {
    const env = { SPECWEAVE_STUDIO_THREAD_ID: 't1', SPECWEAVE_SESSION_ID: 'sess-1', SPECWEAVE_AGENT: 'claude@test' };
    expect(smallFixCommand('one line', { cwd: root, env })).toBe(0);
    expect(stdout).toContain('Small fix recorded for session sess-1');
    expect(readSmallFixes(root)).toMatchObject([{ session: 'sess-1', thread: 't1' }]);
    expect(readWorkSession('sess-1', home)?.kind).toBe('small-fix');
    // A thread marker here would outlive the session's later increment work.
    expect(readWorkSession('studio-t1', home)).toBeNull();
  });

  it('with neither, logs the fix and says the session cannot be exempted', () => {
    expect(smallFixCommand('no ids', { cwd: root, env: { SPECWEAVE_AGENT: 'x@test' } })).toBe(0);
    expect(stdout).toContain('cannot exempt this session');
    expect(readSmallFixes(root)[0]).not.toHaveProperty('thread');
    expect(fs.existsSync(path.join(home, '.specweave', 'sessions'))).toBe(false);
  });
});

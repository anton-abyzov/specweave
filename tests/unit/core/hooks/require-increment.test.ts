import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { handle } from '../../../../src/core/hooks/handlers/pre-tool-use.js';
import type { HookContext, HookInput } from '../../../../src/core/hooks/handlers/types.js';
import { smallFixCommand, readSmallFixes } from '../../../../src/cli/commands/small-fix.js';
import { requireIncrementCommand } from '../../../../src/cli/commands/require-increment.js';
import { requireIncrementMessage } from '../../../../src/core/hooks/handlers/require-increment.js';
import { appendEvent } from '../../../../src/core/tasks/ledger.js';
import { recordIncrementWork } from '../../../../src/core/tasks/work-session.js';

const KEYS = ['HOME', 'USERPROFILE', 'SPECWEAVE_STUDIO_THREAD_ID', 'CLAUDE_CODE_SESSION_ID', 'CODEX_SESSION_ID', 'SPECWEAVE_SESSION_ID', 'SPECWEAVE_AGENT'];
let saved: Record<string, string | undefined>;
let root: string;
let home: string;
let context: HookContext;

function setMode(mode?: string): void {
  fs.writeFileSync(
    path.join(root, '.specweave', 'config.json'),
    JSON.stringify(mode ? { project: { name: 'demo' }, planning: { requireIncrement: mode } } : { project: { name: 'demo' } }),
  );
}
function edit(file: string, session = 'sess-a', tool = 'Edit'): HookInput {
  return { session_id: session, cwd: root, tool_name: tool, tool_input: { file_path: path.join(root, file), old_string: 'a', new_string: 'b' } };
}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-')));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-home-'));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.SPECWEAVE_AGENT = 'claude@test';
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  context = {
    projectRoot: root,
    stateDir: path.join(root, '.specweave', 'state'),
    logsDir: path.join(root, '.specweave', 'logs'),
    configPath: path.join(root, '.specweave', 'config.json'),
    timestamp: '2026-10-22T12:00:00Z',
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

describe('required-increment guard (AC-03)', () => {
  it('off (the default) changes nothing', async () => {
    setMode();
    expect(await handle(edit('src/a.ts'), context)).toEqual({});
  });

  it('enforce denies an unplanned edit and names the commands that unblock it', async () => {
    setMode('enforce');
    const result = await handle(edit('src/a.ts'), context);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('specweave create-increment');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('specweave small-fix');
    // Every edit tool is gated, NotebookEdit through notebook_path.
    const nb = await handle({ session_id: 'sess-a', cwd: root, tool_name: 'NotebookEdit', tool_input: { notebook_path: 'x.ipynb' } }, context);
    expect(nb.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('enforce passes planning files, files outside the project, and sessions with work', async () => {
    setMode('enforce');
    expect(await handle(edit('.specweave/increments/0001-x/spec.md'), context)).toEqual({});
    const outside = { session_id: 'sess-a', cwd: root, tool_name: 'Write', tool_input: { file_path: path.join(home, 'notes.md'), content: 'x' } };
    expect(await handle(outside, context)).toEqual({});

    // A claim in this session (ledger append) unblocks it.
    process.env.SPECWEAVE_SESSION_ID = 'sess-a';
    appendEvent(path.join(root, '.specweave', 'increments', '0001-x', 'ledger.jsonl'), { t: 'T-01', e: 'claim', by: 'claude@test', at: '2026-10-22T12:00:00Z' });
    expect(await handle(edit('src/a.ts', 'sess-a'), context)).toEqual({});
    // Another session (hook input and environment) is still blocked.
    delete process.env.SPECWEAVE_SESSION_ID;
    expect((await handle(edit('src/a.ts', 'sess-b'), context)).hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('a bound SpecWithCode thread counts as planned work', async () => {
    setMode('enforce');
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:t1';
    appendEvent(path.join(root, '.specweave', 'increments', '0002-y', 'ledger.jsonl'), { t: '*', e: 'note', by: 'claude@test', at: '2026-10-22T12:00:00Z', note: 'x' });
    expect(await handle(edit('src/a.ts', 'sess-z'), context)).toEqual({});
  });

  it('a thread small fix stops exempting once the thread worked an increment that then closed', async () => {
    setMode('enforce');
    const inc = path.join(root, '.specweave', 'increments', '0002-y');
    const closeIt = () => {
      fs.mkdirSync(inc, { recursive: true });
      fs.writeFileSync(path.join(inc, 'metadata.json'), '{"status":"completed"}');
    };
    // A Claude thread: the session marker is the only one written.
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:claude';
    process.env.SPECWEAVE_SESSION_ID = 'sess-c';
    expect(smallFixCommand('typo', { cwd: root })).toBe(0);
    expect(fs.existsSync(path.join(home, '.specweave', 'sessions', 'studio-thread_claude.json'))).toBe(false);
    expect(await handle(edit('src/a.ts', 'sess-c'), context)).toEqual({});
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(inc, 'metadata.json'), '{"status":"active"}');
    recordIncrementWork(inc, { e: 'claim', t: 'T-01' }, { sessionId: 'sess-c', home });
    closeIt();
    expect((await handle(edit('src/a.ts', 'sess-c'), context)).hookSpecificOutput?.permissionDecision).toBe('deny');

    // A Codex thread (no session id): its thread marker gives way to the increment work.
    delete process.env.SPECWEAVE_SESSION_ID;
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:codex';
    expect(smallFixCommand('typo', { cwd: root })).toBe(0);
    expect(await handle(edit('src/a.ts', ''), context)).toEqual({});
    fs.writeFileSync(path.join(inc, 'metadata.json'), '{"status":"active"}');
    recordIncrementWork(inc, { e: 'claim', t: 'T-01' }, { home });
    closeIt();
    expect((await handle(edit('src/a.ts', ''), context)).hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('remind warns once per session', async () => {
    setMode('remind');
    const first = await handle(edit('src/a.ts'), context);
    expect(first.hookSpecificOutput?.additionalContext).toContain('planning.requireIncrement = remind');
    expect(first.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(await handle(edit('src/b.ts'), context)).toEqual({});
  });
});

function bind(thread: string, bindingRoot: string, incrementId: string): void {
  const file = path.join(home, '.specweave', 'studio', 'threads', `${thread.replace(/[^\w.-]/g, '_')}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, threadId: thread, incrementId, root: bindingRoot, taskId: null, event: 'claim', at: '2026-10-22T12:00:00Z' }));
}
function openIncrementIn(projectRoot: string, id: string): void {
  fs.mkdirSync(path.join(projectRoot, '.specweave', 'increments', id), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.specweave', 'increments', id, 'metadata.json'), '{"status":"active"}');
}

describe('SpecWithCode worktrees outside the project (1001 AC-01, AC-02)', () => {
  let outside: string;
  let worktree: string;
  beforeEach(() => {
    // root is an umbrella; repositories/org/app is a nested repo whose linked
    // worktree lives outside it, like ~/.specwithcode/<machine>/worktrees/*.
    const app = path.join(root, 'repositories', 'org', 'app');
    fs.mkdirSync(path.join(app, '.git', 'worktrees', 'wt'), { recursive: true });
    outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-wt-')));
    worktree = path.join(outside, 'wt');
    fs.mkdirSync(path.join(worktree, 'src'), { recursive: true });
    fs.writeFileSync(path.join(worktree, '.git'), `gitdir: ${app}/.git/worktrees/wt\n`);
    openIncrementIn(root, '0001-open');
  });
  afterEach(() => fs.rmSync(outside, { recursive: true, force: true }));

  function wtEdit(session = 'sess-wt'): HookInput {
    return { session_id: session, cwd: worktree, tool_name: 'Edit', tool_input: { file_path: path.join(worktree, 'src', 'a.ts'), old_string: 'a', new_string: 'b' } };
  }
  const denied = async (input: HookInput) => (await handle(input, context)).hookSpecificOutput?.permissionDecision === 'deny';

  it('passes an edit in the worktree when the thread is bound to an open increment in the umbrella', async () => {
    setMode('enforce');
    expect(await denied(wtEdit())).toBe(true);
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:wt';
    expect(await denied(wtEdit())).toBe(true);
    bind('thread:wt', root, '0001-open');
    expect(await handle(wtEdit(), context)).toEqual({});
  });

  it('denies when the binding belongs to an unrelated repository', async () => {
    setMode('enforce');
    const other = path.join(outside, 'other');
    openIncrementIn(other, '0001-open');
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:wt';
    bind('thread:wt', other, '0001-open');
    expect(await denied(wtEdit())).toBe(true);
  });

  it('a standalone project worktree with its own .specweave matches a binding to the main checkout', async () => {
    setMode('enforce');
    const app = path.join(root, 'repositories', 'org', 'app');
    fs.mkdirSync(path.join(worktree, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(worktree, '.specweave', 'config.json'), JSON.stringify({ planning: { requireIncrement: 'enforce' } }));
    openIncrementIn(app, '0002-app');
    const wtContext = { ...context, projectRoot: worktree, stateDir: path.join(worktree, '.specweave', 'state'), configPath: path.join(worktree, '.specweave', 'config.json') };
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:wt';
    expect((await handle(wtEdit(), wtContext)).hookSpecificOutput?.permissionDecision).toBe('deny');
    bind('thread:wt', app, '0002-app');
    expect(await handle(wtEdit(), wtContext)).toEqual({});
  });

  it('small-fix from the worktree with only the thread id exempts the thread in this project only', async () => {
    setMode('enforce');
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:fix';
    expect(smallFixCommand('rename a variable', { cwd: worktree })).toBe(0);
    expect(readSmallFixes(root)).toMatchObject([{ reason: 'rename a variable', thread: 'thread:fix' }]);
    expect(await handle(wtEdit('no-session-marker'), context)).toEqual({});

    // The same thread's small fix recorded for another project does not count.
    const other = path.join(outside, 'other');
    fs.mkdirSync(path.join(other, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(other, '.specweave', 'config.json'), '{}');
    process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:elsewhere';
    expect(smallFixCommand('elsewhere', { cwd: other })).toBe(0);
    expect(await denied(wtEdit('no-session-marker'))).toBe(true);
  });
});

describe('small-fix and require-increment commands (AC-04)', () => {
  it('small-fix exempts the session and logs the exemption', async () => {
    setMode('enforce');
    expect(smallFixCommand('', { cwd: root })).toBe(1);
    process.env.SPECWEAVE_SESSION_ID = 'sess-fix';
    expect(smallFixCommand('typo in README', { cwd: root })).toBe(0);
    expect(readSmallFixes(root)).toMatchObject([{ reason: 'typo in README', session: 'sess-fix', by: 'claude@test' }]);
    expect(await handle(edit('README.md', 'sess-fix', 'Write'), context)).toEqual({});
  });

  it('require-increment sets the mode and installs, then removes, only its own hook group', () => {
    setMode();
    const settings = path.join(root, '.claude', 'settings.json');
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    const bashGuard = { matcher: 'Bash', hooks: [{ type: 'command', command: 'node "/pkg/plugins/specweave/hooks/run.mjs" pre-tool-use', timeout: 10 }] };
    fs.writeFileSync(settings, JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, hooks: { PreToolUse: [bashGuard] } }));

    expect(requireIncrementCommand('enforce', { cwd: root, packageDir: '/pkg' })).toBe(0);
    expect(JSON.parse(fs.readFileSync(context.configPath, 'utf8')).planning.requireIncrement).toBe('enforce');
    let written = JSON.parse(fs.readFileSync(settings, 'utf8'));
    expect(written.permissions).toEqual({ allow: ['Bash(ls)'] });
    expect(written.hooks.PreToolUse.map((g: any) => g.matcher)).toEqual(['Bash', 'Edit|Write|MultiEdit|NotebookEdit']);

    expect(requireIncrementCommand('off', { cwd: root, packageDir: '/pkg' })).toBe(0);
    written = JSON.parse(fs.readFileSync(settings, 'utf8'));
    expect(written.hooks.PreToolUse).toEqual([bashGuard]);
    expect(requireIncrementCommand('sometimes', { cwd: root })).toBe(1);
  });
});

describe('require-increment wording', () => {
  it('remind recommends an increment and never asks to retry a blocked edit', () => {
    const remind = requireIncrementMessage('remind');
    expect(remind).toMatch(/^Recommended, not required/);
    expect(remind).toMatch(/does not need one, carry on/);
    expect(remind).not.toMatch(/retry the edit/);
    expect(requireIncrementMessage('enforce')).toMatch(/requires an increment.*Then retry the edit\.$/);
  });
});

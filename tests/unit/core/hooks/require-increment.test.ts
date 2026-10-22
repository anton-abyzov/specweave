import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { handle } from '../../../../src/core/hooks/handlers/pre-tool-use.js';
import type { HookContext, HookInput } from '../../../../src/core/hooks/handlers/types.js';
import { smallFixCommand, readSmallFixes } from '../../../../src/cli/commands/small-fix.js';
import { requireIncrementCommand } from '../../../../src/cli/commands/require-increment.js';
import { appendEvent } from '../../../../src/core/tasks/ledger.js';

const KEYS = ['HOME', 'USERPROFILE', 'SPECWEAVE_STUDIO_THREAD_ID', 'CLAUDE_CODE_SESSION_ID', 'SPECWEAVE_SESSION_ID', 'SPECWEAVE_AGENT'];
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

  it('remind warns once per session', async () => {
    setMode('remind');
    const first = await handle(edit('src/a.ts'), context);
    expect(first.hookSpecificOutput?.additionalContext).toContain('planning.requireIncrement = remind');
    expect(first.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(await handle(edit('src/b.ts'), context)).toEqual({});
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

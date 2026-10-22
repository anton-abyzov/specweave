/**
 * `specweave require-increment` also writes the edit hook group into the
 * user's `~/.claude/settings.json`, so Claude sessions in SpecWithCode
 * worktrees outside the project load it; `off` removes both entries.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { requireIncrementCommand } from '../../../../src/cli/commands/require-increment.js';

const EDIT = 'Edit|Write|MultiEdit|NotebookEdit';
let root: string;
let home: string;
let stdout: string;

const settings = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
const matchers = (dir: string) => (settings(dir).hooks?.PreToolUse ?? []).map((g: { matcher?: string }) => g.matcher);

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-cmd-')));
  home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-cmd-home-')));
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
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

describe('require-increment user-level hook (1001 AC-03)', () => {
  it('enforce writes the user and project entries and keeps existing user hooks; off removes both', () => {
    const userHook = { matcher: 'Bash', hooks: [{ type: 'command', command: 'my-audit.sh' }] };
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ model: 'opus', hooks: { PreToolUse: [userHook], Stop: [{ hooks: [] }] } }));

    expect(requireIncrementCommand('enforce', { cwd: root, packageDir: '/pkg', home })).toBe(0);
    expect(matchers(root)).toEqual([EDIT]);
    expect(matchers(home)).toEqual(['Bash', EDIT]);
    const user = settings(home);
    expect(user.model).toBe('opus');
    expect(user.hooks.PreToolUse[0]).toEqual(userHook);
    expect(user.hooks.Stop).toEqual([{ hooks: [] }]);
    // Tagged, so the launcher guards only opted-in projects from the user entry.
    expect(user.hooks.PreToolUse[1].hooks[0].command).toBe(`node "${path.join('/pkg', 'plugins', 'specweave', 'hooks', 'run.mjs')}" pre-tool-use --scope user`);
    expect(settings(root).hooks.PreToolUse[0].hooks[0].command).toBe(`node "${path.join('/pkg', 'plugins', 'specweave', 'hooks', 'run.mjs')}" pre-tool-use`);
    expect(stdout).toContain(`Claude Code edit hook: installed (${path.join(root, '.claude', 'settings.json')})`);
    expect(stdout).toContain(`Claude Code user edit hook: installed (${path.join(home, '.claude', 'settings.json')})`);

    // Idempotent: a second run neither duplicates nor reorders.
    expect(requireIncrementCommand('remind', { cwd: root, packageDir: '/pkg', home })).toBe(0);
    expect(matchers(home)).toEqual(['Bash', EDIT]);

    stdout = '';
    expect(requireIncrementCommand(undefined, { cwd: root, home })).toBe(0);
    expect(stdout).toContain('planning.requireIncrement: remind');
    expect(stdout).toContain(`Claude Code user edit hook: installed (${path.join(home, '.claude', 'settings.json')})`);

    expect(requireIncrementCommand('off', { cwd: root, packageDir: '/pkg', home })).toBe(0);
    expect(settings(home).hooks.PreToolUse).toEqual([userHook]);
    expect(settings(home).model).toBe('opus');
    expect(settings(root).hooks?.PreToolUse ?? []).toEqual([]);
    expect(fs.existsSync(path.join(root, '.specweave', 'state', 'require-increment.enabled'))).toBe(false);
  });

  it('creates the user settings file when absent and reports a malformed one without touching it', () => {
    expect(requireIncrementCommand('remind', { cwd: root, packageDir: '/pkg', home })).toBe(0);
    expect(matchers(home)).toEqual([EDIT]);

    const broken = '{ not json';
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'), broken);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    expect(requireIncrementCommand('enforce', { cwd: root, packageDir: '/pkg', home })).toBe(1);
    expect(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8')).toBe(broken);
    expect(matchers(root)).toEqual([EDIT]);
  });
});

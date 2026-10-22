/**
 * A SpecWithCode thread works in a linked worktree outside the project. Its
 * planning state resolves to the main checkout's umbrella, but handoff,
 * pickup and cards must read and push the worktree's own branch and diff.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real git processes; a loaded CI runner needs more than the 10 s default.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildWorkHandoff } from '../../../../src/core/session/work-handoff.js';
import { pickupCommand } from '../../../../src/cli/commands/pickup.js';
import { cardCommand } from '../../../../src/cli/commands/card.js';

let base: string;
let umb: string;
let wt: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function initRepo(dir: string, remote: string): void {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'dev@example.com');
  git(dir, 'config', 'user.name', 'dev');
  git(dir, 'config', 'commit.gpgsign', 'false');
  git(base, 'init', '-q', '--bare', '-b', 'main', remote);
  git(dir, 'remote', 'add', 'origin', remote);
}

function commitAll(dir: string, msg: string): void {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', msg);
}

function captureStdout(): { text: () => string; restore: () => void } {
  let out = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    out += String(chunk);
    return true;
  });
  return { text: () => out, restore: () => spy.mockRestore() };
}

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-wt-git-')));
  umb = path.join(base, 'umb');
  initRepo(umb, path.join(base, 'umb.git'));
  fs.mkdirSync(path.join(umb, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(umb, '.specweave', 'config.json'), '{}');
  fs.writeFileSync(path.join(umb, '.gitignore'), 'repositories/\n');
  fs.writeFileSync(path.join(umb, 'README.md'), 'umbrella\n');
  commitAll(umb, 'umbrella');

  const app = path.join(umb, 'repositories', 'o', 'app');
  initRepo(app, path.join(base, 'app.git'));
  fs.writeFileSync(path.join(app, 'a.txt'), 'one\n');
  commitAll(app, 'app');
  git(app, 'push', '-q', '-u', 'origin', 'main');

  wt = path.join(base, 'wt');
  git(app, 'worktree', 'add', '-q', '-b', 'feat', wt);
  fs.writeFileSync(path.join(wt, 'a.txt'), 'one\ntwo from the worktree\n');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(base, { recursive: true, force: true });
});

describe('Git runs in the thread worktree while planning resolves to the umbrella', () => {
  it('handoff names the worktree branch, carries its diff and pushes it, not the umbrella', async () => {
    const result = await buildWorkHandoff(wt, { reason: 'test', push: true, agent: 'tester' });

    expect(result.isSpecWeave).toBe(true);
    expect(result.docPath.startsWith(umb)).toBe(true);
    expect(result.docMarkdown).toContain('feat');
    expect(result.docMarkdown).not.toMatch(/branch main\b/);
    expect(fs.readFileSync(result.diffPath, 'utf8')).toContain('two from the worktree');

    expect(result.push?.branch).toBe('feat');
    expect(git(base, '--git-dir', path.join(base, 'app.git'), 'branch', '--list', 'feat')).toContain('feat');
    expect(git(base, '--git-dir', path.join(base, 'umb.git'), 'for-each-ref', '--format=%(refname)')).toBe('');
  });

  it('pickup shows the worktree branch state', async () => {
    const out = captureStdout();
    try {
      await pickupCommand({ cwd: wt, apply: false, agent: 'tester', home: base });
    } finally {
      out.restore();
    }
    expect(out.text()).toMatch(/Branch: feat\b/);
    expect(out.text()).toContain('1 uncommitted file');
  });

  it('card add keys branch cards by the worktree branch', async () => {
    const out = captureStdout();
    try {
      await cardCommand('add', 'check the worktree', undefined, { cwd: wt, agent: 'tester' });
    } finally {
      out.restore();
    }
    expect(out.text()).toContain('on feat:');
  });
});

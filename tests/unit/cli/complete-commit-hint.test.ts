import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, execSync } from 'child_process';
import { commitHint } from '../../../src/cli/commands/complete.js';

const tmp: string[] = [];
afterEach(() => {
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function repo(config: Record<string, unknown>, name?: string): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'complete hint-'));
  tmp.push(parent);
  const root = name ? path.join(parent, name) : parent;
  if (name) fs.mkdirSync(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  const inc = path.join(root, '.specweave', 'increments', '0001-login');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-login', status: 'completed' }));
  return root;
}

function runHint(hint: string, root: string, cwd: string, shell?: string): void {
  const lines = hint.split('\n');
  const useProjectRoot = lines[0] === `Open a shell in the project folder: ${root}`;
  if (useProjectRoot) lines.shift();
  const heading = lines.shift()!;
  if (heading.startsWith('Commit it: ')) lines.unshift(heading.slice('Commit it: '.length));
  else expect(heading).toBe('Run one line at a time. Continue only if the first succeeds.');
  expect(lines.length).toBeGreaterThan(0);
  const env = {
    ...process.env, SW_HINT: 'wrong-folder',
    GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
  };
  for (const line of lines) {
    execSync(line, { cwd: useProjectRoot ? root : cwd, env, shell });
  }
}

describe('complete: commit hint', () => {
  it('names the folder and a NNNN: close commit limited to that folder', () => {
    const root = repo({ version: '2.0' });
    const add = 'git add -- .specweave/increments/0001-login';
    const commit = 'git commit -m "0001: close" -- .specweave/increments/0001-login';
    expect(commitHint(root, '0001-login')).toBe(process.platform === 'win32'
      ? `Run one line at a time. Continue only if the first succeeds.\n${add}\n${commit}`
      : `Commit it: ${add} && ${commit}`);
  });

  it('shows even with autoCommitIncrement on, since complete itself never commits', () => {
    const root = repo({ version: '2.0', git: { autoCommitIncrement: true } });
    expect(commitHint(root, '0001-login')).toContain('git commit -m "0001: close"');
  });

  it('commits the umbrella increment when invoked in a nested Git repository', () => {
    const root = repo({ version: '2.0' });
    const sub = path.join(root, 'src');
    fs.mkdirSync(sub);
    execFileSync('git', ['init', '-q'], { cwd: sub });
    fs.writeFileSync(path.join(root, 'unrelated.txt'), 'staged work');
    execFileSync('git', ['add', '--', 'unrelated.txt'], { cwd: root });
    execFileSync('git', ['config', 'core.hooksPath', path.join(root, 'no-hooks')], { cwd: root });
    const hint = commitHint(root, '0001-login', sub)!;
    runHint(hint, root, sub);
    expect(execFileSync('git', ['show', '--format=', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim())
      .toBe('.specweave/increments/0001-login/metadata.json');
    expect(execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }).trim())
      .toBe('unrelated.txt');
  });

  it('says nothing when the folder is already committed, or outside git', () => {
    const root = repo({ version: '2.0' });
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', `core.hooksPath=${path.join(root, 'no-hooks')}`, 'commit', '-q', '-m', '0001: close'], { cwd: root });
    expect(commitHint(root, '0001-login')).toBeUndefined();
    expect(commitHint(path.join(os.tmpdir(), 'no-such-dir-complete-hint'), '0001-login')).toBeUndefined();
  });
});

describe.skipIf(process.platform !== 'win32')('Windows commit hint shells', () => {
  const shells = ['cmd.exe', 'powershell.exe', 'pwsh.exe'];
  const roots = ['plain', 'spaces & café', "apostrophe's", '$SW_HINT', '`SW_HINT', '%SW_HINT%', '!SW_HINT!'];

  it.each(shells.flatMap((shell) => roots.map((name) => [shell, name])))(
    '%s commits only the intended increment from workspace %s',
    (shell, name) => {
      const root = repo({ version: '2.0' }, name);
      const sibling = path.join(path.dirname(root), 'linked checkout');
      fs.mkdirSync(sibling);
      execFileSync('git', ['init', '-q'], { cwd: sibling });
      execFileSync('git', ['config', 'core.hooksPath', path.join(root, 'no-hooks')], { cwd: root });
      fs.writeFileSync(path.join(root, 'unrelated.txt'), 'leave staged');
      execFileSync('git', ['add', '--', 'unrelated.txt'], { cwd: root });

      const hint = commitHint(root, '0001-login', sibling)!;
      const needsProjectRoot = /[$%`!]/.test(name);
      expect(hint.startsWith('Open a shell in the project folder: ')).toBe(needsProjectRoot);
      runHint(hint, root, sibling, shell);
      const gitOutput = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
      expect(gitOutput(['show', '--format=', '--name-only', 'HEAD'])).toBe('.specweave/increments/0001-login/metadata.json');
      expect(gitOutput(['diff', '--cached', '--name-only'])).toBe('unrelated.txt');
    },
  );
});

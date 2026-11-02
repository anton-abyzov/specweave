import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { commitHint } from '../../../src/cli/commands/complete.js';

const tmp: string[] = [];
afterEach(() => {
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function repo(config: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'complete-hint-'));
  tmp.push(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  const inc = path.join(root, '.specweave', 'increments', '0001-login');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-login', status: 'completed' }));
  return root;
}

describe('complete: commit hint', () => {
  it('names the folder and a NNNN: close commit limited to that folder', () => {
    const root = repo({ version: '2.0' });
    expect(commitHint(root, '0001-login')).toBe(
      'Commit it: git add .specweave/increments/0001-login && git commit -m "0001: close" -- .specweave/increments/0001-login',
    );
  });

  it('shows even with autoCommitIncrement on, since complete itself never commits', () => {
    const root = repo({ version: '2.0', git: { autoCommitIncrement: true } });
    expect(commitHint(root, '0001-login')).toContain('git commit -m "0001: close"');
  });

  it('gives the path relative to the folder the user is in', () => {
    const root = repo({ version: '2.0' });
    const sub = path.join(root, 'src');
    fs.mkdirSync(sub);
    expect(commitHint(root, '0001-login', sub)).toContain('git add ../.specweave/increments/0001-login');
  });

  it('says nothing when the folder is already committed, or outside git', () => {
    const root = repo({ version: '2.0' });
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', '0001: close'], { cwd: root });
    expect(commitHint(root, '0001-login')).toBeUndefined();
    expect(commitHint(path.join(os.tmpdir(), 'no-such-dir-complete-hint'), '0001-login')).toBeUndefined();
  });
});

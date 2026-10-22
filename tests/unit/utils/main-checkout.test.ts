/**
 * mainCheckoutOf: a linked Git worktree resolves to its main checkout from the
 * `.git` file alone. The hook launcher and worker inline the same function
 * (they may import only node builtins); the parity test runs those copies on
 * the same fixtures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mainCheckoutOf } from '../../../src/utils/main-checkout.js';

const hooksDir = path.join(process.cwd(), 'plugins', 'specweave', 'hooks');

/** The inline copy from a hook script, evaluated without running the script. */
function inlineCopy(file: string): (dir: string) => string | null {
  const source = fs.readFileSync(path.join(hooksDir, file), 'utf8');
  const start = source.indexOf('const WORKTREE_GITDIR');
  const fn = source.indexOf('function mainCheckoutOf(dir) {', start);
  const end = source.indexOf('\n}\n', fn);
  expect(start).toBeGreaterThan(-1);
  expect(fn).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(fn);
  const body = source.slice(start, end + 3);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('path', 'statSync', 'readFileSync', `${body}\nreturn mainCheckoutOf;`)(path, fs.statSync, fs.readFileSync);
}

let base = '';
const cases: Record<string, { dir: string; expected: string | null }> = {};

function gitFile(dir: string, body: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.git'), body);
}

beforeAll(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-main-checkout-')));
  const main = path.join(base, 'umbrella', 'repositories', 'org', 'app');
  fs.mkdirSync(path.join(main, '.git', 'worktrees', 'wt'), { recursive: true });

  const wt = path.join(base, 'worktrees', 'wt');
  gitFile(wt, `gitdir: ${main}/.git/worktrees/wt\n`);
  fs.mkdirSync(path.join(wt, 'src', 'deep'), { recursive: true });
  const relative = path.join(base, 'umbrella', 'side');
  gitFile(relative, 'gitdir: ../repositories/org/app/.git/worktrees/side/\r\n');
  const submodule = path.join(main, 'vendor', 'lib');
  gitFile(submodule, 'gitdir: ../../.git/modules/vendor/lib\n');
  const submoduleWorktree = path.join(base, 'worktrees', 'subwt');
  gitFile(submoduleWorktree, `gitdir: ${main}/.git/modules/lib/worktrees/subwt\n`);
  const garbage = path.join(base, 'worktrees', 'garbage');
  gitFile(garbage, 'not a gitdir line\n');
  const plain = path.join(base, 'plain', 'src');
  fs.mkdirSync(plain, { recursive: true });

  Object.assign(cases, {
    worktree: { dir: wt, expected: main },
    nestedInWorktree: { dir: path.join(wt, 'src', 'deep'), expected: main },
    missingDirInWorktree: { dir: path.join(wt, 'not', 'there'), expected: main },
    relativeGitdir: { dir: relative, expected: path.join(base, 'umbrella', 'repositories', 'org', 'app') },
    mainCheckout: { dir: main, expected: null },
    submoduleLink: { dir: submodule, expected: null },
    submoduleWorktree: { dir: submoduleWorktree, expected: null },
    garbageGitFile: { dir: garbage, expected: null },
    noGitAbove: { dir: plain, expected: null },
  });
});

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

describe('mainCheckoutOf (AC-01)', () => {
  it('resolves a worktree, including relative gitdir lines, and ignores submodules and ordinary checkouts', () => {
    for (const [name, { dir, expected }] of Object.entries(cases)) {
      expect({ name, result: mainCheckoutOf(dir) }).toEqual({ name, result: expected });
    }
  });

  it.each(['run.mjs', 'run-worker.mjs'])('the inline copy in %s returns the same results', (file) => {
    const inline = inlineCopy(file);
    for (const [name, { dir }] of Object.entries(cases)) {
      expect({ name, result: inline(dir) }).toEqual({ name, result: mainCheckoutOf(dir) });
    }
  });
});

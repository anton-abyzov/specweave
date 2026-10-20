import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findNestedCheckouts, NESTED_DEPTH } from '../../../../src/core/session/nested-repos.js';

let root: string;
let outside: string;

function repo(rel: string, kind: 'dir' | 'file' = 'dir') {
  const dir = path.join(root, rel);
  fs.mkdirSync(dir, { recursive: true });
  if (kind === 'dir') fs.mkdirSync(path.join(dir, '.git'));
  else fs.writeFileSync(path.join(dir, '.git'), 'gitdir: /elsewhere/.git/worktrees/x\n');
  return dir;
}

const rels = (list: string[]) => list.map((p) => path.relative(root, p).split(path.sep).join('/'));

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  if (outside) fs.rmSync(outside, { recursive: true, force: true });
});

function mkRoot() {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-nested-')));
  outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-outside-')));
}

describe('findNestedCheckouts layouts (0964 AC-01, AC-02)', () => {
  it('a plain single repository has no nested checkouts', () => {
    mkRoot();
    fs.mkdirSync(path.join(root, '.git'));
    fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
    expect(findNestedCheckouts(root)).toEqual([]);
  });

  it('finds the repositories/<org>/<repo> umbrella layout', () => {
    mkRoot();
    repo('repositories/acme/api');
    repo('repositories/acme/web');
    repo('repositories/solo');
    expect(rels(findNestedCheckouts(root))).toEqual(['repositories/acme/api', 'repositories/acme/web', 'repositories/solo']);
  });

  it('finds checkouts nested under arbitrary names', () => {
    mkRoot();
    fs.mkdirSync(path.join(root, '.git'));
    repo('services/billing');
    repo('frontend');
    repo('a/b/deep');
    expect(rels(findNestedCheckouts(root))).toEqual(['a/b/deep', 'frontend', 'services/billing']);
  });

  it('counts a .git file (worktree or submodule) as a checkout', () => {
    mkRoot();
    repo('work/0042-x', 'file');
    expect(rels(findNestedCheckouts(root))).toEqual(['work/0042-x']);
  });

  it('stops at the first checkout and skips dot and dependency folders', () => {
    mkRoot();
    repo('outer');
    repo('outer/inner');
    repo('node_modules/pkg');
    repo('.cache/thing');
    repo('dist/copy');
    expect(rels(findNestedCheckouts(root))).toEqual(['outer']);
  });

  it(`does not look deeper than ${NESTED_DEPTH} levels`, () => {
    mkRoot();
    repo('a/b/c/too-deep');
    expect(findNestedCheckouts(root)).toEqual([]);
  });

  it('never follows a symlink out of the root, and lists a linked checkout inside once', () => {
    mkRoot();
    fs.mkdirSync(path.join(outside, 'escaped', '.git'), { recursive: true });
    fs.symlinkSync(path.join(outside, 'escaped'), path.join(root, 'link-out'));
    repo('real/repo');
    fs.symlinkSync(path.join(root, 'real'), path.join(root, 'alias'));
    expect(rels(findNestedCheckouts(root))).toEqual(['real/repo']);
    expect(findNestedCheckouts(root).map((p) => fs.realpathSync(p))).toEqual([path.join(root, 'real', 'repo')]);
  });

  it('returns nothing for a missing root', () => {
    mkRoot();
    expect(findNestedCheckouts(path.join(root, 'gone'))).toEqual([]);
  });
});

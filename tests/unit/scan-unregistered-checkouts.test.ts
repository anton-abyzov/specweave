import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanUnregisteredCheckouts, scanWorkspaceRepos } from '../../src/cli/helpers/init/path-utils.js';

describe('scanUnregisteredCheckouts', () => {
  let root: string;
  const clone = (...parts: string[]) => fs.mkdirSync(path.join(root, ...parts, '.git'), { recursive: true });
  const unregistered = () => scanUnregisteredCheckouts(root, scanWorkspaceRepos(root));

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-unregistered-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('names nothing in a folder that is not a checkout: the scan lists every nested clone there', () => {
    clone('api');
    clone('services', 'web');
    expect(scanWorkspaceRepos(root)!.repos.map((repo) => repo.name)).toEqual(['api', 'web']);
    expect(unregistered()).toEqual([]);
  });

  it('names clones outside repositories/ in a checkout folder, as POSIX paths', () => {
    clone();
    clone('repositories', 'acme', 'api');
    clone('services', 'web');
    clone('tools', 'x', 'lib');
    expect(unregistered()).toEqual(['services/web', 'tools/x/lib']);
  });

  it('leaves out registered repositories, submodules and linked worktrees', () => {
    clone();
    clone('services', 'web');
    clone('services', 'api');
    fs.mkdirSync(path.join(root, 'libs', 'sub'), { recursive: true });
    fs.writeFileSync(path.join(root, 'libs', 'sub', '.git'), 'gitdir: ../../.git/modules/sub\n');
    fs.mkdirSync(path.join(root, 'wt'), { recursive: true });
    fs.writeFileSync(path.join(root, 'wt', '.git'), `gitdir: ${path.join(root, '.git', 'worktrees', 'wt')}\n`);
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.specweave', 'config.json'),
      JSON.stringify({ workspace: { name: 'w', repos: [{ id: 'web', path: 'services/web', prefix: 'WEB' }] } }),
    );
    expect(unregistered()).toEqual(['services/api']);
  });

  it('names clones below a folder that sits inside a checkout', () => {
    clone();
    clone('packages', 'tool', 'fixtures', 'repo-a');
    const tool = path.join(root, 'packages', 'tool');
    expect(scanWorkspaceRepos(tool)).toBeNull();
    expect(scanUnregisteredCheckouts(tool, null)).toEqual(['fixtures/repo-a']);
  });

  it('returns nothing for an empty or missing folder', () => {
    expect(scanUnregisteredCheckouts(root, null)).toEqual([]);
    expect(scanUnregisteredCheckouts(path.join(root, 'missing'), null)).toEqual([]);
  });
});

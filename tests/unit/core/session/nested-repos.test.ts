import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real git processes; a loaded CI runner needs more than the 10 s default.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  findNestedCheckouts,
  inspectCheckout,
  matchIncrementIds,
  parseStatusV2,
  scanNestedRepos,
  ghPrLookup,
} from '../../../../src/core/session/nested-repos.js';

let base: string;
let root: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function initRepo(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'develop');
  git(dir, 'config', 'user.email', 'dev@example.com');
  git(dir, 'config', 'user.name', 'dev');
  git(dir, 'config', 'commit.gpgsign', 'false');
}

function commit(dir: string, file: string, msg: string): void {
  fs.writeFileSync(path.join(dir, file), msg + '\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', msg);
}

/** A nested repo with a bare origin, `develop` pushed and tracking. */
function pushedRepo(name: string): string {
  const remote = path.join(base, 'remotes', `${name}.git`);
  fs.mkdirSync(path.dirname(remote), { recursive: true });
  git(base, 'init', '-q', '--bare', '-b', 'develop', remote);
  const dir = path.join(root, 'repositories', 'acme', name);
  initRepo(dir);
  git(dir, 'remote', 'add', 'origin', remote);
  commit(dir, 'README.md', 'init');
  git(dir, 'push', '-q', '-u', 'origin', 'develop');
  return dir;
}

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-nested-')));
  root = path.join(base, 'umbrella');
  initRepo(root);
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  fs.writeFileSync(path.join(root, '.gitignore'), 'repositories/\n');
  commit(root, 'README.md', 'umbrella');
  git(base, 'init', '-q', '--bare', '-b', 'develop', 'umbrella.git');
  git(root, 'remote', 'add', 'origin', path.join(base, 'umbrella.git'));
  git(root, 'push', '-q', '-u', 'origin', 'develop');
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

describe('parseStatusV2', () => {
  it('reads branch, upstream, ahead and the changed-file count', () => {
    const s = parseStatusV2([
      '# branch.oid 1234567890abcdef', '# branch.head feat/x', '# branch.upstream origin/feat/x', '# branch.ab +2 -1',
      '1 .M N... 100644 100644 100644 a b src/a.ts', '? new.txt', '',
    ].join('\n'));
    expect(s).toEqual({ branch: 'feat/x', detached: false, upstream: 'origin/feat/x', ahead: 2, dirty: 2, oid: '1234567890abcdef' });
  });

  it('reports a detached HEAD', () => {
    expect(parseStatusV2('# branch.oid abc\n# branch.head (detached)\n').detached).toBe(true);
  });
});

describe('matchIncrementIds', () => {
  it('matches a 4-digit id in a path or branch, not inside a longer number', () => {
    expect(matchIncrementIds('ec-club-0927 feat/club-sites-0927', ['0927', '0928'])).toEqual(['0927']);
    expect(matchIncrementIds('build-109270', ['0927'])).toEqual([]);
  });
});

describe('findNestedCheckouts', () => {
  it('finds repositories/<org>/<repo> checkouts and worktree folders beside them', () => {
    const main = pushedRepo('api');
    git(main, 'worktree', 'add', '-q', '-b', 'feat/x', path.join(root, 'repositories', 'acme', 'api-wt-x'));
    fs.mkdirSync(path.join(root, 'repositories', 'acme', 'not-a-repo'), { recursive: true });
    const found = findNestedCheckouts(root).map((p) => path.relative(root, p));
    expect(found).toEqual(['repositories/acme/api', 'repositories/acme/api-wt-x']);
  });
});

describe('inspectCheckout', () => {
  it('counts uncommitted files and commits ahead of the upstream', async () => {
    const dir = pushedRepo('api');
    commit(dir, 'a.txt', 'local commit');
    fs.writeFileSync(path.join(dir, 'dirty.txt'), 'x');
    fs.writeFileSync(path.join(dir, 'README.md'), 'changed');
    const s = await inspectCheckout(dir, root, []);
    expect(s).toMatchObject({ display: 'repositories/acme/api', branch: 'develop', dirty: 2, ahead: 1, upstream: 'origin/develop', noRemote: false });
    expect(s!.reasons).toEqual(['dirty', 'ahead']);
    expect(s!.lastCommitAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('flags a branch with no remote and counts commits that are on no remote', async () => {
    const dir = pushedRepo('web');
    git(dir, 'checkout', '-q', '-b', 'feat/club-sites-0927');
    commit(dir, 'b.txt', 'unpushed');
    const s = await inspectCheckout(dir, root, ['0927']);
    expect(s).toMatchObject({ branch: 'feat/club-sites-0927', noRemote: true, ahead: 1, dirty: 0, incrementIds: ['0927'] });
    expect(s!.reasons).toEqual(['ahead', 'no remote']);
  });

  it('leaves a clean, pushed checkout unflagged', async () => {
    const s = await inspectCheckout(pushedRepo('clean'), root, []);
    expect(s!.reasons).toEqual([]);
  });

  it('returns null for a folder that is not a Git checkout', async () => {
    expect(await inspectCheckout(path.join(base, 'remotes'), root, [])).toBeNull();
  });
});

describe('scanNestedRepos', () => {
  it('lists only checkouts with local-only work, includes worktrees outside repositories/, and never writes', async () => {
    pushedRepo('clean');
    const api = pushedRepo('api');
    fs.writeFileSync(path.join(api, 'dirty.txt'), 'x');
    // A worktree that lives outside repositories/, named after increment 0042.
    const outside = path.join(base, 'work', '0042-api');
    git(api, 'worktree', 'add', '-q', '-b', 'fix/thing', outside);
    commit(outside, 'c.txt', 'worktree commit');
    const before = git(api, 'for-each-ref', '--format=%(refname) %(objectname)');

    const lookups: string[] = [];
    const scan = await scanNestedRepos(root, {
      incrementIds: ['0042'],
      prLookup: async (_cwd, branch) => {
        lookups.push(branch);
        return branch === 'develop' ? { number: 7, url: 'https://github.com/acme/api/pull/7', state: 'OPEN', isDraft: false } : undefined;
      },
    });

    expect(scan.scanned).toBe(4); // umbrella root, clean, api, the outside worktree
    const byPath = Object.fromEntries(scan.flagged.map((s) => [s.display, s]));
    expect(Object.keys(byPath).sort()).toEqual([outside, 'repositories/acme/api'].sort());
    expect(byPath['repositories/acme/api'].pr).toEqual({ number: 7, url: 'https://github.com/acme/api/pull/7', state: 'OPEN', isDraft: false });
    expect(byPath[outside]).toMatchObject({ branch: 'fix/thing', noRemote: true, ahead: 1, incrementIds: ['0042'] });
    expect(lookups.sort()).toEqual(['develop', 'fix/thing']);
    // Read-only: refs unchanged, the dirty file still uncommitted.
    expect(git(api, 'for-each-ref', '--format=%(refname) %(objectname)')).toBe(before);
    expect(git(api, 'status', '--porcelain')).toContain('dirty.txt');
  });

  it('flags the workspace root when it has local-only work', async () => {
    fs.writeFileSync(path.join(root, 'notes.md'), 'x');
    const scan = await scanNestedRepos(root, { prLookup: false });
    expect(scan.flagged.map((s) => s.display)).toEqual(['.']);
  });

  it('skips the PR column silently when the lookup throws', async () => {
    const api = pushedRepo('api');
    fs.writeFileSync(path.join(api, 'dirty.txt'), 'x');
    const scan = await scanNestedRepos(root, { includeRoot: false, prLookup: async () => { throw new Error('gh not signed in'); } });
    expect(scan.flagged).toHaveLength(1);
    expect(scan.flagged[0].pr).toBeUndefined();
  });
});

describe('ghPrLookup', () => {
  const savedPath = process.env.PATH;
  afterEach(() => { process.env.PATH = savedPath; });

  it('asks gh for the open PR of the branch and reads its JSON', async () => {
    const bin = path.join(base, 'bin');
    fs.mkdirSync(bin);
    const log = path.join(base, 'gh-args.txt');
    fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\necho "$@" > "${log}"\necho '[{"number":12,"url":"https://github.com/acme/web/pull/12","state":"OPEN","isDraft":true}]'\n`, { mode: 0o755 });
    process.env.PATH = `${bin}${path.delimiter}${savedPath}`;
    const pr = await ghPrLookup(root, 'feat/x');
    expect(pr).toEqual({ number: 12, url: 'https://github.com/acme/web/pull/12', state: 'OPEN', isDraft: true });
    expect(fs.readFileSync(log, 'utf8').trim()).toBe('pr list --head feat/x --json number,url,state,isDraft --limit 1');
  });

  it('returns undefined when gh fails', async () => {
    const bin = path.join(base, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    process.env.PATH = `${bin}${path.delimiter}${savedPath}`;
    expect(await ghPrLookup(root, 'feat/x')).toBeUndefined();
  });
});

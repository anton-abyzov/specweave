/**
 * Opt-in auto-commit of an increment's own spec.md, ledger.jsonl and
 * metadata.json, in temporary git repos with their own hooks folder.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  autoCommitIncrement,
  autoCommitSubject,
  isAutoCommitSubject,
  readAutoCommitConfig,
} from '../../../../src/core/increment/auto-commit.js';

const INC_ID = '0042-login-form';
const INC = `.specweave/increments/${INC_ID}`;

let base: string;
let repo: string;
let hooks: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function write(rel: string, content: string, root = repo) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}

function config(gitBlock?: Record<string, unknown>) {
  write('.specweave/config.json', JSON.stringify({ version: '2.0', ...(gitBlock ? { git: gitBlock } : {}) }));
}

function hook(name: string, body: string) {
  const file = path.join(hooks, name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
}

function writeIncrement(root = repo) {
  write(`${INC}/spec.md`, '# Login form\n', root);
  write(`${INC}/metadata.json`, JSON.stringify({ id: INC_ID, status: 'active' }), root);
  write(`${INC}/ledger.jsonl`, '{"t":"T-01","e":"claim"}\n', root);
  write(`${INC}/evidence/thread-dump.json`, '{"secret":"live"}', root);
  write(`${INC}/evidence/screen.png`, 'binary', root);
  write(`${INC}/reports/task-T-01.txt`, '$ npm test', root);
}

const run = (req: Partial<Parameters<typeof autoCommitIncrement>[2]> = {}) =>
  autoCommitIncrement(repo, path.join(repo, INC), { incrementId: INC_ID, action: 'done', tasks: ['T-01'], ...req });

const headFiles = () => git(repo, 'show', '--name-only', '--format=', 'HEAD').split('\n').filter(Boolean).sort();
const headSubject = () => git(repo, 'log', '-1', '--format=%s');
const commitCount = () => Number(git(repo, 'rev-list', '--count', 'HEAD'));
const staged = () => git(repo, 'diff', '--cached', '--name-only').split('\n').filter(Boolean);

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-autocommit-')));
  repo = path.join(base, 'repo');
  hooks = path.join(base, 'hooks');
  fs.mkdirSync(repo);
  fs.mkdirSync(hooks);
  git(repo, 'init', '-q', '-b', 'develop');
  git(repo, 'config', 'user.email', 'dev@example.com');
  git(repo, 'config', 'user.name', 'dev');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'config', 'core.hooksPath', hooks);
  write('README.md', 'demo\n');
  write('.gitignore', '.specweave/state/\n');
  config({ autoCommitIncrement: true });
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'init');
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

describe('config', () => {
  it('is off without a git block and off unless the value is exactly true', () => {
    config();
    expect(readAutoCommitConfig(repo)).toEqual({ commit: false, push: false });
    config({ autoCommitIncrement: 'yes', autoPushIncrement: 1 });
    expect(readAutoCommitConfig(repo)).toEqual({ commit: false, push: false });
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    expect(readAutoCommitConfig(repo)).toEqual({ commit: true, push: true });
  });

  it('makes no commit by default', () => {
    config();
    git(repo, 'commit', '-qam', 'config off');
    writeIncrement();
    const before = commitCount();
    expect(run().status).toBe('off');
    expect(commitCount()).toBe(before);
    expect(git(repo, 'status', '--porcelain', '--', INC)).toContain(`?? ${INC}/`);
  });

  it('--no-commit skips the commit while the key is on', () => {
    writeIncrement();
    const before = commitCount();
    expect(run({ commit: false }).status).toBe('off');
    expect(commitCount()).toBe(before);
  });
});

describe('commit', () => {
  it('commits a new untracked increment folder without evidence/ or reports/', () => {
    writeIncrement();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.warnings).toEqual([]);
    expect(headFiles()).toEqual([`${INC}/ledger.jsonl`, `${INC}/metadata.json`, `${INC}/spec.md`]);
    expect(headSubject()).toBe('0042: done T-01');
    expect(git(repo, 'log', '-1', '--format=%B')).toBe('0042: done T-01');
    const left = git(repo, 'status', '--porcelain', '--untracked-files=all');
    expect(left).toContain(`?? ${INC}/evidence/thread-dump.json`);
    expect(left).toContain(`?? ${INC}/evidence/screen.png`);
    expect(left).toContain(`?? ${INC}/reports/task-T-01.txt`);
    expect(git(repo, 'ls-files', '--', `${INC}/evidence`, `${INC}/reports`)).toBe('');
  });

  it('leaves an unrelated staged file staged and out of the commit', () => {
    writeIncrement();
    run();
    write('src/feature.ts', 'export const x = 1;\n');
    git(repo, 'add', 'src/feature.ts');
    write('README.md', 'demo\nmore\n');
    git(repo, 'add', 'README.md');
    fs.appendFileSync(path.join(repo, INC, 'ledger.jsonl'), '{"t":"T-01","e":"done"}\n');

    const r = run();
    expect(r.status).toBe('committed');
    expect(headFiles()).toEqual([`${INC}/ledger.jsonl`]);
    expect(staged().sort()).toEqual(['README.md', 'src/feature.ts']);
  });

  it('never adds a gitignored candidate', () => {
    write('.gitignore', '.specweave/state/\n.specweave/increments/*/ledger.jsonl\n');
    git(repo, 'commit', '-qam', 'ignore ledgers');
    writeIncrement();
    expect(run().status).toBe('committed');
    expect(headFiles()).toEqual([`${INC}/metadata.json`, `${INC}/spec.md`]);
    expect(git(repo, 'ls-files', '--', `${INC}/ledger.jsonl`)).toBe('');
  });

  it('filters an ignored file in a non-ASCII folder', () => {
    write('.gitignore', '.specweave/state/\n.specweave/increments/*/ledger.jsonl\n');
    git(repo, 'commit', '-qam', 'ignore ledgers');
    const dir = '.specweave/increments/0043-проект';
    write(`${dir}/spec.md`, '# Проект\n');
    write(`${dir}/ledger.jsonl`, '{}\n');
    const r = autoCommitIncrement(repo, path.join(repo, dir), { incrementId: '0043-проект', action: 'create' });
    expect(r.status).toBe('committed');
    expect(git(repo, '-c', 'core.quotePath=false', 'show', '--name-only', '--format=', 'HEAD')).toBe(`${dir}/spec.md`);
    expect(staged()).toEqual([]);
  });

  it('reports nothing when the folder is ignored or unchanged', () => {
    writeIncrement();
    run();
    expect(run().status).toBe('nothing');
    write('.gitignore', '.specweave/increments/0099-*/\n');
    git(repo, 'commit', '-qam', 'ignore 0099');
    write('.specweave/increments/0099-private/spec.md', '# private\n');
    const r = autoCommitIncrement(repo, path.join(repo, '.specweave/increments/0099-private'), { incrementId: '0099-private', action: 'create' });
    expect(r.status).toBe('nothing');
  });

  it('commits handoff.md only when the repo already tracks it', () => {
    writeIncrement();
    write(`${INC}/handoff.md`, 'first\n');
    run({ action: 'handoff', tasks: [] });
    expect(headFiles()).not.toContain(`${INC}/handoff.md`);
    git(repo, 'add', `${INC}/handoff.md`);
    git(repo, 'commit', '-qm', 'track handoff');
    write(`${INC}/handoff.md`, 'second\n');
    fs.appendFileSync(path.join(repo, INC, 'ledger.jsonl'), '{"t":"_","e":"handoff"}\n');
    const r = run({ action: 'handoff', tasks: [] });
    expect(r.status).toBe('committed');
    expect(headSubject()).toBe('0042: handoff');
    expect(headFiles()).toEqual([`${INC}/handoff.md`, `${INC}/ledger.jsonl`]);
  });

  it('includes a superseded increment folder passed in alsoDirs', () => {
    writeIncrement();
    write('.specweave/increments/0041-old/metadata.json', '{"status":"abandoned"}');
    write('.specweave/increments/0041-old/evidence/x.json', '{}');
    run({ action: 'create', tasks: [], alsoDirs: [path.join(repo, '.specweave/increments/0041-old')] });
    expect(headSubject()).toBe('0042: create increment');
    expect(headFiles()).toContain('.specweave/increments/0041-old/metadata.json');
    expect(headFiles()).not.toContain('.specweave/increments/0041-old/evidence/x.json');
  });

  it('runs the repo hooks', () => {
    hook('pre-commit', `echo ran > "${path.join(base, 'hook-ran')}"`);
    writeIncrement();
    expect(run().status).toBe('committed');
    expect(fs.existsSync(path.join(base, 'hook-ran'))).toBe(true);
  });
});

describe('failures stay warnings', () => {
  it('a failing pre-commit hook makes no commit and restores the index', () => {
    hook('pre-commit', 'echo "blocked by policy" >&2; exit 1');
    writeIncrement();
    write('src/other.ts', 'x\n');
    git(repo, 'add', 'src/other.ts');
    const before = git(repo, 'rev-parse', 'HEAD');
    const r = run();
    expect(r.status).toBe('failed');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('blocked by policy');
    expect(r.warnings[0]).toContain('the ledger is saved');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(before);
    expect(staged()).toEqual(['src/other.ts']);
    expect(git(repo, 'status', '--porcelain', '--', `${INC}/spec.md`)).toBe(`?? ${INC}/spec.md`);
  });

  it('never stages a deletion when another lane committed the file meanwhile', () => {
    // The hook plays a second lane: it commits spec.md through its own index, then fails ours.
    const spec = `${INC}/spec.md`;
    hook('pre-commit', [
      `export GIT_INDEX_FILE="${path.join(base, 'other-index')}"`,
      'git read-tree HEAD',
      `git update-index --add --cacheinfo 100644,$(git hash-object -w ${spec}),${spec}`,
      'git update-ref HEAD "$(git commit-tree "$(git write-tree)" -p HEAD -m "other lane")"',
      'exit 1',
    ].join('\n'));
    writeIncrement();
    const r = run();
    expect(r.status).toBe('failed');
    expect(headSubject()).toBe('other lane');
    expect(git(repo, 'diff', '--cached', '--name-status')).not.toContain(`D\t${spec}`);
    expect(git(repo, 'status', '--porcelain', '--', spec)).toBe('');
  });

  it('skips a detached HEAD', () => {
    writeIncrement();
    git(repo, 'checkout', '-q', '--detach');
    const r = run();
    expect(r.status).toBe('skipped');
    expect(r.warnings[0]).toContain('detached HEAD');
  });

  it.each([
    ['index.lock', 'index.lock'],
    ['MERGE_HEAD', 'merge is in progress'],
    ['rebase-merge', 'rebase is in progress'],
    ['CHERRY_PICK_HEAD', 'cherry-pick is in progress'],
  ])('skips while %s exists', (marker, words) => {
    writeIncrement();
    const file = path.join(repo, '.git', marker);
    if (marker === 'rebase-merge') fs.mkdirSync(file);
    else fs.writeFileSync(file, marker === 'index.lock' ? '' : git(repo, 'rev-parse', 'HEAD'));
    const before = commitCount();
    const r = run();
    expect(r.status).toBe('skipped');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain(words);
    expect(commitCount()).toBe(before);
  });

  it('skips outside git', () => {
    const plain = path.join(base, 'plain');
    fs.mkdirSync(plain);
    fs.mkdirSync(path.join(plain, '.specweave'));
    fs.writeFileSync(path.join(plain, '.specweave/config.json'), JSON.stringify({ git: { autoCommitIncrement: true } }));
    writeIncrement(plain);
    const r = autoCommitIncrement(plain, path.join(plain, INC), { incrementId: INC_ID, action: 'claim', tasks: ['T-01'] });
    expect(r.status).toBe('skipped');
    expect(r.warnings[0]).toContain('not a git repository');
  });
});

describe('push', () => {
  let remote: string;
  beforeEach(() => {
    remote = path.join(base, 'remote.git');
    git(base, 'init', '-q', '--bare', '-b', 'develop', remote);
    git(repo, 'remote', 'add', 'origin', remote);
    git(repo, 'push', '-q', '-u', 'origin', 'develop');
  });
  const remoteHead = () => git(remote, 'rev-parse', 'refs/heads/develop');

  it('is off by default', () => {
    writeIncrement();
    const before = remoteHead();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.pushed).toBeUndefined();
    expect(remoteHead()).toBe(before);
  });

  it('fast-forwards the upstream when autoPushIncrement is on', () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'commit', '-qam', 'push on');
    git(repo, 'push', '-q');
    writeIncrement();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.pushed).toBe('origin/develop');
    expect(r.warnings).toEqual([]);
    expect(remoteHead()).toBe(git(repo, 'rev-parse', 'HEAD'));
  });

  it('does not push when the caller says so', () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'commit', '-qam', 'push on');
    git(repo, 'push', '-q');
    writeIncrement();
    const before = remoteHead();
    expect(run({ push: false }).pushed).toBeUndefined();
    expect(remoteHead()).toBe(before);
  });

  it('warns instead of pushing a diverged branch', () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'commit', '-qam', 'push on');
    git(repo, 'push', '-q');
    const other = path.join(base, 'other');
    git(base, 'clone', '-q', remote, other);
    git(other, 'config', 'user.email', 'o@example.com');
    git(other, 'config', 'user.name', 'o');
    git(other, 'config', 'core.hooksPath', hooks);
    write('OTHER.md', 'x\n', other);
    git(other, 'add', 'OTHER.md');
    git(other, 'commit', '-qm', 'other');
    git(other, 'push', '-q');
    git(repo, 'fetch', '-q');
    writeIncrement();
    const theirs = remoteHead();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.pushed).toBeUndefined();
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('diverged');
    expect(remoteHead()).toBe(theirs);
  });

  const pushOn = () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'commit', '-qam', 'push on');
    git(repo, 'push', '-q');
  };

  it('never pushes a branch that tracks a differently named branch', () => {
    pushOn();
    // `git worktree add -b feat/x <path> origin/develop` tracks origin/develop.
    git(repo, 'checkout', '-q', '-b', 'feat/x', '--track', 'origin/develop');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'unreviewed feature work');
    writeIncrement();
    const before = remoteHead();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.pushed).toBeUndefined();
    expect(r.warnings[0]).toContain('tracks origin/develop, a different branch');
    expect(remoteHead()).toBe(before);
  });

  it('never pushes to a local upstream', () => {
    pushOn();
    git(repo, 'checkout', '-q', '-b', 'side', '--track', 'develop');
    writeIncrement();
    const local = git(repo, 'rev-parse', 'refs/heads/develop');
    const r = run();
    expect(r.pushed).toBeUndefined();
    expect(r.warnings[0]).toContain('no upstream on a remote');
    expect(git(repo, 'rev-parse', 'refs/heads/develop')).toBe(local);
  });

  it('never publishes other unpushed commits', () => {
    pushOn();
    write('notes.md', 'hand-written\n');
    git(repo, 'add', 'notes.md');
    git(repo, 'commit', '-qm', '0042: hand commit');
    writeIncrement();
    const before = remoteHead();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.pushed).toBeUndefined();
    expect(r.warnings[0]).toContain('1 other unpushed commit on develop');
    expect(remoteHead()).toBe(before);
  });

  it('pushes earlier auto-commits along with this one', () => {
    pushOn();
    writeIncrement();
    run({ push: false });
    fs.appendFileSync(path.join(repo, INC, 'ledger.jsonl'), '{"t":"T-01","e":"done"}\n');
    const r = run({ action: 'done' });
    expect(r.pushed).toBe('origin/develop');
    expect(remoteHead()).toBe(git(repo, 'rev-parse', 'HEAD'));
  });

  it('warns when the branch has no upstream', () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'commit', '-qam', 'push on');
    git(repo, 'checkout', '-q', '-b', 'feature');
    writeIncrement();
    const r = run();
    expect(r.status).toBe('committed');
    expect(r.warnings[0]).toContain('no upstream');
  });
});

const caseInsensitive = (() => {
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-CaseProbe-'));
  try { return fs.existsSync(probe.toLowerCase()) || fs.existsSync(probe.toUpperCase()); } finally { fs.rmSync(probe, { recursive: true, force: true }); }
})();

describe('paths', () => {
  it.skipIf(!caseInsensitive)('commits when the increment path is typed in another letter case', () => {
    const typed = path.join(path.dirname(repo), path.basename(repo).toUpperCase(), INC);
    writeIncrement();
    const r = autoCommitIncrement(repo, typed, { incrementId: INC_ID, action: 'claim', tasks: ['T-01'] });
    expect(r.status).toBe('committed');
    expect(headFiles()).toEqual([`${INC}/ledger.jsonl`, `${INC}/metadata.json`, `${INC}/spec.md`]);
  });

  it('commits through a symlinked path to the repo', () => {
    const link = path.join(base, 'link');
    fs.symlinkSync(repo, link);
    writeIncrement();
    const r = autoCommitIncrement(link, path.join(link, INC), { incrementId: INC_ID, action: 'claim', tasks: ['T-01'] });
    expect(r.status).toBe('committed');
    expect(headFiles()).toContain(`${INC}/spec.md`);
  });
});

describe('subject', () => {
  it('is one line under 72 characters and recognizable', () => {
    expect(autoCommitSubject('1058-specweave-auto-commit', 'claim', ['T-02'])).toBe('1058: claim T-02');
    expect(autoCommitSubject('1058-x', 'create')).toBe('1058: create increment');
    const many = Array.from({ length: 30 }, (_, i) => `T-${String(i + 1).padStart(2, '0')}`);
    const s = autoCommitSubject('1058-x', 'release', many);
    expect(s.length).toBeLessThan(72);
    expect(s).toMatch(/^1058: release T-01, .* and \d+ more$/);
    for (const subject of ['1058: claim T-02', '1058: create increment', '1058: handoff', s]) {
      expect(isAutoCommitSubject(subject)).toBe(true);
    }
    expect(isAutoCommitSubject('1058: add the auto-commit helper')).toBe(false);
    expect(isAutoCommitSubject('1058: done with the refactor')).toBe(false);
  });
});

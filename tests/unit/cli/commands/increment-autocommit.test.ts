/**
 * `git.autoCommitIncrement` through the real commands: task claim/done/
 * release/block/skip, create-increment and handoff, in temporary git repos.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { taskCommand } from '../../../../src/cli/commands/task.js';
import { createIncrementCommand } from '../../../../src/cli/commands/create-increment.js';
import { buildWorkHandoff } from '../../../../src/core/session/work-handoff.js';
import { handoffCommand } from '../../../../src/cli/commands/handoff.js';

const INC_ID = '0042-login-form';
const INC = `.specweave/increments/${INC_ID}`;
const SPEC = `# Login form

## Problem

Users cannot log in.

## Acceptance Criteria

- [ ] AC-01: Form shows email and password fields
- [ ] AC-02: Wrong password shows an error

## Tasks

### T-01 Build the form
- AC: AC-01 | Files: src/login.ts | Test: true

### T-02 Error message
- AC: AC-02 | Files: src/error.ts | Test: true

### T-03 Polish
- AC: AC-02 | Files: src/polish.ts | Test: true
`;

let base: string;
let repo: string;
let hooks: string;
let stdout: string[];
let stderr: string[];
const savedEnv: Record<string, string | undefined> = {};

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function write(rel: string, content: string) {
  fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
  fs.writeFileSync(path.join(repo, rel), content);
}

function config(gitBlock?: Record<string, unknown>) {
  write('.specweave/config.json', JSON.stringify({ version: '2.0', project: { name: 'demo' }, ...(gitBlock ? { git: gitBlock } : {}) }));
  git(repo, 'add', '.specweave/config.json');
  git(repo, 'commit', '-qm', 'config');
}

const task = (action: string, a?: string, opts: Record<string, unknown> = {}) =>
  taskCommand(action, a, INC_ID, { cwd: repo, agent: 'tester', ...opts });

const subjects = () => git(repo, 'log', '--format=%s').split('\n');
const headFiles = () => git(repo, 'show', '--name-only', '--format=', 'HEAD').split('\n').filter(Boolean).sort();
const ledger = (): Array<{ t: string; e: string; evidence?: string }> =>
  fs.readFileSync(path.join(repo, INC, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const events = () => ledger().map((e) => `${e.e} ${e.t}`);

beforeEach(() => {
  for (const k of ['CLAUDE_CODE_SESSION_ID', 'CODEX_SESSION_ID', 'SPECWEAVE_SESSION_ID', 'SPECWEAVE_AGENT']) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-autocommit-cli-')));
  repo = path.join(base, 'repo');
  hooks = path.join(base, 'hooks');
  fs.mkdirSync(repo);
  fs.mkdirSync(hooks);
  git(repo, 'init', '-q', '-b', 'develop');
  git(repo, 'config', 'user.email', 'dev@example.com');
  git(repo, 'config', 'user.name', 'dev');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'config', 'core.hooksPath', hooks);
  write('.gitignore', '.specweave/state/\n.specweave/logs/\n');
  write('src/login.ts', 'export {};\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', '0042: build the login form');
  write(`${INC}/spec.md`, SPEC);
  write(`${INC}/metadata.json`, JSON.stringify({ id: INC_ID, status: 'active', type: 'feature', created: new Date().toISOString() }));
  write(`${INC}/evidence/thread-dump.json`, '{"live":"thread"}');

  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { stdout.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((c: any) => { stderr.push(String(c)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(base, { recursive: true, force: true });
});

describe('task commands', () => {
  it('commit nothing by default', async () => {
    config();
    const before = subjects().length;
    expect(await task('claim', 'T-01')).toBe(0);
    expect(await task('done', 'T-01', { evidence: 'ok' })).toBe(0);
    expect(subjects().length).toBe(before);
    expect(git(repo, 'status', '--porcelain', '--', INC)).toContain(`?? ${INC}/`);
  });

  it('commit each recorded action with a NNNN: <action> T-xx subject', { timeout: 30_000 }, async () => {
    config({ autoCommitIncrement: true });
    expect(await task('claim', 'T-01')).toBe(0);
    expect(subjects()[0]).toBe('0042: claim T-01');
    expect(headFiles()).toEqual([`${INC}/ledger.jsonl`, `${INC}/metadata.json`, `${INC}/spec.md`]);

    expect(await task('done', 'T-01', { run: 'true' })).toBe(0);
    expect(subjects()[0]).toBe('0042: done T-01');
    expect(await task('block', 'T-02', { reason: 'waiting on design' })).toBe(0);
    expect(subjects()[0]).toBe('0042: block T-02');
    expect(await task('release', 'T-02')).toBe(0);
    expect(subjects()[0]).toBe('0042: release T-02');
    expect(await task('skip', 'T-03', { reason: 'not needed' })).toBe(0);
    expect(subjects()[0]).toBe('0042: skip T-03');
    expect(await task('claim', 'T-02')).toBe(0);
    expect(await taskCommand('release', INC_ID, undefined, { cwd: repo, agent: 'tester', allMine: true })).toBe(0);
    expect(subjects()[0]).toBe('0042: release T-02');

    // The --run log and the evidence folder stay out of git.
    expect(git(repo, 'ls-files', '--', `${INC}/reports`, `${INC}/evidence`)).toBe('');
    expect(fs.existsSync(path.join(repo, INC, 'reports', 'task-T-01.txt'))).toBe(true);
    expect(git(repo, 'status', '--porcelain', '--', `${INC}/ledger.jsonl`)).toBe('');
    expect(stdout.join('')).toContain('Committed ');
  });

  it('--no-commit skips the commit and keeps the ledger write', async () => {
    config({ autoCommitIncrement: true });
    const before = subjects().length;
    expect(await task('done', 'T-01', { evidence: 'ok', commit: false })).toBe(0);
    expect(subjects().length).toBe(before);
    expect(events()).toContain('done T-01');
  });

  it('leave an unrelated staged file staged', async () => {
    config({ autoCommitIncrement: true });
    write('src/error.ts', 'export const e = 1;\n');
    git(repo, 'add', 'src/error.ts');
    expect(await task('claim', 'T-02')).toBe(0);
    expect(headFiles()).not.toContain('src/error.ts');
    expect(git(repo, 'diff', '--cached', '--name-only')).toBe('src/error.ts');
  });

  it('a failing hook is one warning, exit 0, ledger kept', async () => {
    config({ autoCommitIncrement: true });
    fs.writeFileSync(path.join(hooks, 'pre-commit'), '#!/bin/sh\necho "secret scan failed" >&2\nexit 1\n');
    fs.chmodSync(path.join(hooks, 'pre-commit'), 0o755);
    const before = git(repo, 'rev-parse', 'HEAD');
    expect(await task('done', 'T-01', { evidence: 'ok' })).toBe(0);
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(before);
    expect(events()).toContain('done T-01');
    const warnings = stderr.join('').split('\n').filter((l) => l.startsWith('warning:') && l.includes('not committed'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('secret scan failed');
  });

  it('a detached HEAD is skipped with a warning, exit 0', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'checkout', '-q', '--detach');
    expect(await task('claim', 'T-01')).toBe(0);
    expect(events()).toContain('claim T-01');
    expect(stderr.join('')).toContain('detached HEAD');
  });

  it('done evidence and the traceability check look past auto-commits', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'unrelated tidy-up');
    const work = git(repo, 'rev-parse', '--short', 'HEAD');
    expect(await task('claim', 'T-01')).toBe(0);
    stderr.length = 0;
    expect(await task('done', 'T-01', { evidence: 'tests pass' })).toBe(0);
    const done = ledger().find((e) => e.e === 'done');
    expect(done?.evidence).toContain(`HEAD ${work}`);
    expect(stderr.join('')).toContain('HEAD subject "unrelated tidy-up" does not mention 0042');
  });

  it('evidence still names the work commit behind more than 50 auto-commits', { timeout: 60_000 }, async () => {
    config({ autoCommitIncrement: true });
    const work = git(repo, 'rev-parse', '--short', 'HEAD');
    for (let i = 0; i < 55; i++) git(repo, 'commit', '-q', '--allow-empty', '-m', `0042: claim T-0${(i % 3) + 1}`);
    stderr.length = 0;
    expect(await task('done', 'T-01', { evidence: 'tests pass' })).toBe(0);
    expect(ledger().find((e) => e.e === 'done')?.evidence).toContain(`HEAD ${work}`);
    // The warning names the work commit ("config"), never an auto-commit subject.
    expect(stderr.join('')).toContain('HEAD subject "config"');
    expect(stderr.join('')).not.toContain('HEAD subject "0042: claim');
  });

  it('a work commit whose body quotes an auto-commit subject still counts', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'commit', '-q', '--allow-empty', '-m', '0042: squash the form work', '-m', '0042: done T-09');
    const work = git(repo, 'rev-parse', '--short', 'HEAD');
    git(repo, 'commit', '-q', '--allow-empty', '-m', '0042: claim T-01');
    expect(await task('done', 'T-01', { evidence: 'tests pass' })).toBe(0);
    expect(ledger().find((e) => e.e === 'done')?.evidence).toContain(`HEAD ${work}`);
  });

  it('JSON output carries the commit', async () => {
    config({ autoCommitIncrement: true });
    expect(await task('done', 'T-01', { evidence: 'ok', json: true })).toBe(0);
    const parsed = JSON.parse(stdout.join('').trim().split('\n').pop()!);
    expect(parsed.commit).toMatchObject({ status: 'committed', subject: '0042: done T-01' });
  });
});

describe('create-increment', () => {
  it('commits the new folder when on, and nothing when off', async () => {
    config({ autoCommitIncrement: true });
    await createIncrementCommand({ title: 'Password reset', projectRoot: repo });
    const created = fs.readdirSync(path.join(repo, '.specweave/increments')).find((d) => d.endsWith('-password-reset'))!;
    const num = created.split('-')[0];
    expect(subjects()[0]).toBe(`${num}: create increment`);
    expect(headFiles().every((f) => f.startsWith(`.specweave/increments/${created}/`))).toBe(true);
    expect(headFiles()).toContain(`.specweave/increments/${created}/spec.md`);
    expect(headFiles()).toContain(`.specweave/increments/${created}/metadata.json`);

    const before = subjects().length;
    await createIncrementCommand({ title: 'Remember me', projectRoot: repo, commit: false });
    expect(subjects().length).toBe(before);
  });
});

describe('handoff', () => {
  let remote: string;
  beforeEach(() => {
    remote = path.join(base, 'remote.git');
    git(base, 'init', '-q', '--bare', '-b', 'develop', remote);
    git(repo, 'remote', 'add', 'origin', remote);
    git(repo, 'push', '-q', '-u', 'origin', 'develop');
  });

  it('commits the ledger before its branch push, which carries the commit', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'push', '-q');
    const result = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester', reason: 'out of tokens' });
    expect(result.commit?.status).toBe('committed');
    expect(subjects()[0]).toBe('0042: handoff');
    expect(headFiles()).toEqual([`${INC}/ledger.jsonl`, `${INC}/metadata.json`, `${INC}/spec.md`]);
    expect(git(remote, 'rev-parse', 'refs/heads/develop')).toBe(git(repo, 'rev-parse', 'HEAD'));
  });

  it('--no-push keeps the commit local; --no-commit makes none', async () => {
    config({ autoCommitIncrement: true, autoPushIncrement: true });
    git(repo, 'push', '-q');
    const pushedBefore = git(remote, 'rev-parse', 'refs/heads/develop');
    const local = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester', push: false });
    expect(local.commit?.status).toBe('committed');
    expect(local.commit?.pushed).toBeUndefined();
    expect(git(remote, 'rev-parse', 'refs/heads/develop')).toBe(pushedBefore);

    const head = git(repo, 'rev-parse', 'HEAD');
    const none = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester', push: false, commit: false });
    expect(none.commit?.status).toBe('off');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head);
  });

  it('skips the commit when the branch push would land it on a differently named upstream', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'push', '-q');
    git(repo, 'checkout', '-q', '-b', 'feat/x', '--track', 'origin/develop');
    const before = git(remote, 'rev-parse', 'refs/heads/develop');
    const head = git(repo, 'rev-parse', 'HEAD');
    const result = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester' });
    expect(result.commit?.status).toBe('skipped');
    expect(result.commit?.warnings[0]).toContain('feat/x tracks origin/develop, a different branch');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head);
    expect(git(remote, 'rev-parse', 'refs/heads/develop')).toBe(before);
  });

  it('skips the commit on a differently named upstream when a tag shares the branch name', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'push', '-q');
    git(repo, 'tag', 'feat/x');
    git(repo, 'checkout', '-q', '-b', 'feat/x', '--track', 'origin/develop');
    const before = git(remote, 'rev-parse', 'refs/heads/develop');
    const head = git(repo, 'rev-parse', 'HEAD');
    const result = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester' });
    expect(result.commit?.status).toBe('skipped');
    expect(result.commit?.warnings[0]).toContain('feat/x tracks origin/develop, a different branch');
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head);
    expect(git(remote, 'rev-parse', 'refs/heads/develop')).toBe(before);
  });

  it('skips the commit when a second merge value names the branch itself', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'push', '-q');
    git(repo, 'checkout', '-q', '-b', 'feat/x', '--track', 'origin/develop');
    git(repo, 'config', '--add', 'branch.feat/x.merge', 'refs/heads/feat/x');
    const before = git(remote, 'rev-parse', 'refs/heads/develop');
    const result = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester' });
    expect(result.commit?.status).toBe('skipped');
    expect(git(remote, 'rev-parse', 'refs/heads/develop')).toBe(before);
  });

  it('handoff --json still prints commit warnings on stderr', async () => {
    config({ autoCommitIncrement: true });
    git(repo, 'checkout', '-q', '--detach');
    await handoffCommand({ incrementId: INC_ID, cwd: repo, json: true, push: false });
    expect(stderr.join('')).toMatch(/^warning: 0042-login-form files not committed: detached HEAD/m);
    expect(() => JSON.parse(stdout.join(''))).not.toThrow();
  });

  it('a checkpoint never commits', async () => {
    config({ autoCommitIncrement: true });
    const head = git(repo, 'rev-parse', 'HEAD');
    const r = await buildWorkHandoff(repo, { incrementId: INC_ID, agent: 'tester', checkpoint: true });
    expect(r.commit).toBeUndefined();
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head);
  });
});

describe('bin/specweave.js', () => {
  it('passes --no-commit through to the task command', () => {
    const bin = path.resolve('bin/specweave.js');
    if (!fs.existsSync(path.resolve('dist/src/cli/commands/task.js'))) throw new Error('dist/ is missing: run `npm run build` before this test');
    config({ autoCommitIncrement: true });
    const before = subjects().length;
    const env = { ...process.env, SPECWEAVE_AGENT: 'tester' };
    const off = spawnSync(process.execPath, [bin, 'task', 'claim', 'T-01', INC_ID, '--no-commit'], { cwd: repo, encoding: 'utf8', env });
    expect(off.status).toBe(0);
    expect(subjects().length).toBe(before);
    const on = spawnSync(process.execPath, [bin, 'task', 'done', 'T-01', INC_ID, '--evidence', 'ok'], { cwd: repo, encoding: 'utf8', env });
    expect(on.status).toBe(0);
    expect(subjects()[0]).toBe('0042: done T-01');
  });
});

/**
 * Opt-in commit of an increment's own bookkeeping files right after the CLI
 * writes them, so specs, ledgers and claims reach other machines with a plain
 * `git pull` instead of drifting as untracked folders.
 *
 * Off unless `.specweave/config.json` sets `git.autoCommitIncrement: true`;
 * `--no-commit` turns it off for one command. Only `spec.md`, `ledger.jsonl`
 * and `metadata.json` at the top of the increment folder (plus `handoff.md`
 * when the repo already tracks it) are committed, through a pathspec
 * (`git commit --only -- <paths>`), so anything else staged in a shared index
 * stays staged and out of the commit. The names are fixed files, so
 * `evidence/` and `reports/` can never match, and ignored files are never
 * added. The repo's hooks run.
 *
 * Every failure is one warning: the ledger write already happened and is the
 * source of truth, and the ledger is cumulative, so the next successful
 * command commits whatever this one missed.
 *
 * `git.autoPushIncrement: true` then pushes the branch to its upstream with a
 * plain (fast-forward only) push, through the upstream's remote as git config
 * has it, so the remote URL (HTTPS or SSH) is whatever the checkout uses.
 *
 * @module core/increment/auto-commit
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/** Always committed when present. */
export const AUTO_COMMIT_FILES = ['spec.md', 'ledger.jsonl', 'metadata.json'] as const;
/** Committed only when the repo already tracks them (handoff docs are often gitignored). */
export const TRACKED_ONLY_FILES = ['handoff.md'] as const;

/** Subjects stay under 72 characters. */
const SUBJECT_LIMIT = 71;
const COMMIT_TIMEOUT_MS = 120_000;
const PUSH_TIMEOUT_MS = 60_000;

export interface AutoCommitConfig {
  commit: boolean;
  push: boolean;
}

/** `git.autoCommitIncrement` / `git.autoPushIncrement`, both off unless exactly `true`. */
export function readAutoCommitConfig(projectRoot: string): AutoCommitConfig {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf-8')) as {
      git?: { autoCommitIncrement?: unknown; autoPushIncrement?: unknown };
    };
    return { commit: cfg.git?.autoCommitIncrement === true, push: cfg.git?.autoPushIncrement === true };
  } catch {
    return { commit: false, push: false };
  }
}

export interface AutoCommitRequest {
  /** Increment folder name; its number starts the subject. */
  incrementId: string;
  /** claim, done, skip, block, release, create or handoff. */
  action: 'claim' | 'done' | 'skip' | 'block' | 'release' | 'create' | 'handoff';
  /** Task ids the action recorded. */
  tasks?: string[];
  /** `--no-commit` passes false. */
  commit?: boolean;
  /** false: never push here (the caller pushes, or `--no-push`). Default: `git.autoPushIncrement`. */
  push?: boolean;
  /** Other increment folders the command changed (an increment it superseded). */
  alsoDirs?: string[];
}

export interface AutoCommitResult {
  /** `off`: not enabled. `nothing`: no change to commit. `skipped`: the repo state does not allow it. */
  status: 'off' | 'nothing' | 'committed' | 'skipped' | 'failed';
  sha?: string;
  subject?: string;
  /** Repo-relative paths in the commit. */
  files?: string[];
  /** `origin/develop` when the push went through. */
  pushed?: string;
  warnings: string[];
}

const ACTION_SUBJECT = /^\d{3,}[A-Za-z]?: (?:(?:claim|done|skip|block|release) T-[\w.-]+(?:, T-[\w.-]+)*(?: and \d+ more)?|create increment|handoff)$/;

/** Is this a subject {@link autoCommitIncrement} writes? */
export function isAutoCommitSubject(subject: string): boolean {
  return ACTION_SUBJECT.test(subject.trim());
}

/** `1058: done T-02`, `1058: release T-01, T-03`, `1058: create increment`, `1058: handoff`. */
export function autoCommitSubject(incrementId: string, action: AutoCommitRequest['action'], tasks: string[] = []): string {
  const num = incrementId.match(/^\d{3,}[A-Za-z]?(?=-|$)/)?.[0] ?? incrementId.replace(/[^\w.-]/g, '').slice(0, 20);
  const head = `${num}: ${action === 'create' ? 'create increment' : action}`;
  const ids = tasks.map((t) => t.replace(/[^\w.-]/g, '')).filter(Boolean);
  if (!ids.length) return head;
  for (let shown = ids.length; shown > 0; shown--) {
    const rest = ids.length - shown;
    const subject = `${head} ${ids.slice(0, shown).join(', ')}${rest ? ` and ${rest} more` : ''}`;
    if (subject.length <= SUBJECT_LIMIT) return subject;
  }
  return head;
}

interface GitRun {
  code: number;
  out: string;
  err: string;
}

function runGit(cwd: string, args: string[], timeout = COMMIT_TIMEOUT_MS): GitRun {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
  });
  if (r.error) return { code: -1, out: '', err: r.error.message };
  return { code: r.status ?? -1, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

/** Top of the checkout holding `dir`, or null outside Git. */
export function gitTopFor(dir: string): string | null {
  let start: string;
  try { start = fs.realpathSync(dir); } catch { return null; }
  const r = runGit(start, ['rev-parse', '--show-toplevel']);
  if (r.code !== 0 || !r.out) return null;
  try { return fs.realpathSync(r.out); } catch { return r.out; }
}

/** Commit (and optionally push) the increment's own files. Never throws. */
export function autoCommitIncrement(projectRoot: string, incDir: string, req: AutoCommitRequest): AutoCommitResult {
  const cfg = readAutoCommitConfig(projectRoot);
  if (!cfg.commit || req.commit === false) return { status: 'off', warnings: [] };
  try {
    return commitIncrementFiles(incDir, req, cfg.push && req.push !== false);
  } catch (e) {
    return { status: 'failed', warnings: [`${req.incrementId} files not committed (${(e as Error).message}); the ledger is saved`] };
  }
}

function commitIncrementFiles(incDir: string, req: AutoCommitRequest, push: boolean): AutoCommitResult {
  const notCommitted = (status: 'skipped' | 'failed', why: string): AutoCommitResult => ({
    status,
    warnings: [`${req.incrementId} files not committed: ${why}; the ledger is saved, commit it later`],
  });

  const top = gitTopFor(incDir);
  if (!top) return notCommitted('skipped', 'not a git repository');
  const git = (args: string[], timeout?: number) => runGit(top, args, timeout);

  // A repo mid-operation must not get a commit in the middle of it.
  const markers: Array<[string, string]> = [
    ['index.lock', 'another git process holds index.lock'],
    ['MERGE_HEAD', 'a merge is in progress'],
    ['rebase-merge', 'a rebase is in progress'],
    ['rebase-apply', 'a rebase or am is in progress'],
    ['CHERRY_PICK_HEAD', 'a cherry-pick is in progress'],
    ['REVERT_HEAD', 'a revert is in progress'],
    ['BISECT_LOG', 'a bisect is in progress'],
  ];
  const paths = git(['rev-parse', '--path-format=absolute', ...markers.flatMap(([m]) => ['--git-path', m])]);
  if (paths.code !== 0) return notCommitted('skipped', `git rev-parse failed (${firstLine(paths.err)})`);
  const located = paths.out.split('\n');
  for (let i = 0; i < markers.length; i++) {
    if (located[i] && fs.existsSync(located[i])) return notCommitted('skipped', markers[i][1]);
  }
  const branch = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (branch.code !== 0 || !branch.out) return notCommitted('skipped', 'detached HEAD');
  if (git(['rev-parse', '--verify', '--quiet', 'HEAD']).code !== 0) return notCommitted('skipped', 'no commits yet');

  // Fixed file names at the top of each increment folder.
  const candidates: string[] = [];
  const trackedOnly: string[] = [];
  for (const dir of [incDir, ...(req.alsoDirs ?? [])]) {
    let real: string;
    try { real = fs.realpathSync(dir); } catch { continue; }
    const rel = path.relative(top, real);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    const add = (list: string[], name: string) => {
      const file = path.join(real, name);
      const st = fs.lstatSync(file, { throwIfNoEntry: false });
      if (st?.isFile()) list.push(path.relative(top, file).split(path.sep).join('/'));
    };
    for (const name of AUTO_COMMIT_FILES) add(candidates, name);
    for (const name of TRACKED_ONLY_FILES) add(trackedOnly, name);
  }
  const all = [...candidates, ...trackedOnly];
  if (!all.length) return { status: 'nothing', warnings: [] };

  const listed = git(['ls-files', '-z', '--', ...all]);
  if (listed.code !== 0) return notCommitted('failed', `git ls-files failed (${firstLine(listed.err)})`);
  const tracked = new Set(listed.out.split('\0').filter(Boolean));
  const untracked = candidates.filter((p) => !tracked.has(p));
  // check-ignore exits 1 when nothing is ignored, 0 when something is.
  const ignoredRun = untracked.length ? git(['check-ignore', '--', ...untracked]) : { code: 1, out: '', err: '' };
  if (ignoredRun.code > 1 || ignoredRun.code < 0) return notCommitted('failed', `git check-ignore failed (${firstLine(ignoredRun.err)})`);
  const ignored = new Set(ignoredRun.out.split('\n').filter(Boolean));
  const fresh = untracked.filter((p) => !ignored.has(p));
  const known = all.filter((p) => tracked.has(p));

  // What `--only` commits: the working-tree content of these paths against HEAD.
  const changed = known.length ? git(['diff', '--quiet', 'HEAD', '--', ...known]).code === 1 : false;
  if (!fresh.length && !changed) return { status: 'nothing', warnings: [] };

  const files = [...known, ...fresh];
  if (fresh.length) {
    const added = git(['add', '--', ...fresh]);
    if (added.code !== 0) return notCommitted('failed', `git add failed (${firstLine(added.err)})`);
  }
  const subject = autoCommitSubject(req.incrementId, req.action, req.tasks);
  const commit = git(['commit', '--only', '--quiet', '-m', subject, '--', ...files]);
  if (commit.code !== 0) {
    // Leave the index as the command found it.
    if (fresh.length) git(['rm', '--cached', '--quiet', '--', ...fresh]);
    const why = firstLine(commit.err) || firstLine(commit.out) || `exit ${commit.code}`;
    return notCommitted('failed', `git commit failed (${why})`);
  }
  const sha = git(['rev-parse', '--short', 'HEAD']).out || undefined;
  const result: AutoCommitResult = { status: 'committed', sha, subject, files, warnings: [] };
  if (push) pushToUpstream(git, branch.out, result);
  return result;
}

/** Plain push of HEAD to the branch's upstream, only when it is strictly ahead. */
function pushToUpstream(git: (args: string[], timeout?: number) => GitRun, branch: string, result: AutoCommitResult): void {
  const notPushed = (why: string) => result.warnings.push(`${result.subject ?? 'increment commit'} not pushed: ${why}`);
  const remote = git(['config', '--get', `branch.${branch}.remote`]).out;
  const merge = git(['config', '--get', `branch.${branch}.merge`]).out;
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).out;
  if (!remote || !merge || !upstream) {
    notPushed(`${branch} has no upstream (set one with \`git push -u\`)`);
    return;
  }
  if (git(['merge-base', '--is-ancestor', '@{u}', 'HEAD']).code !== 0) {
    notPushed(`${branch} has diverged from ${upstream}; pull first`);
    return;
  }
  const pushed = git(['push', '--quiet', remote, `HEAD:${merge}`], PUSH_TIMEOUT_MS);
  if (pushed.code !== 0) {
    notPushed(`git push failed (${firstLine(pushed.err) || `exit ${pushed.code}`})`);
    return;
  }
  result.pushed = upstream;
}

/** One line for the user, or undefined when nothing happened. */
export function describeAutoCommit(r: AutoCommitResult): string | undefined {
  if (r.status !== 'committed') return undefined;
  return `Committed${r.sha ? ` ${r.sha}` : ''} "${r.subject}"${r.pushed ? `, pushed to ${r.pushed}` : ''}`;
}

function firstLine(text: string): string {
  return text.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 160) ?? '';
}

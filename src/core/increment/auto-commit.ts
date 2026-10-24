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
 * has it, so the remote URL (HTTPS or SSH) is whatever the checkout uses. It
 * pushes only to a same-named branch on a real remote, and only when every
 * unpushed commit is one of these auto-commits, so it never publishes other
 * work or lands a feature branch on the branch it was cut from.
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
  /**
   * The caller pushes the branch to its upstream right after (`handoff`):
   * commit only when that upstream is a same-named branch on a remote, or when
   * there is none yet (the caller then pushes to a same-named branch).
   */
  callerPushesBranch?: boolean;
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

/**
 * Subjects {@link autoCommitIncrement} writes, as a POSIX extended regex that
 * `git log -E --grep` and JavaScript read the same way.
 */
export const AUTO_COMMIT_SUBJECT_ERE =
  '^[0-9]{3,}[A-Za-z]?: (((claim|done|skip|block|release) T-[A-Za-z0-9_.-]+(, T-[A-Za-z0-9_.-]+)*( and [0-9]+ more)?)|create increment|handoff)$';
const ACTION_SUBJECT = new RegExp(AUTO_COMMIT_SUBJECT_ERE);

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

/**
 * Literal pathspec, so a folder named with `*`, `?` or `[` never matches its
 * neighbours. Per path rather than GIT_LITERAL_PATHSPECS, which the repo's
 * hooks would inherit.
 */
const literal = (paths: string[]): string[] => paths.map((p) => `:(literal)${p}`);

interface GitRun {
  code: number;
  out: string;
  err: string;
}

/** Inherited pathspec modes would reinterpret the `:(literal)` paths (check-ignore refuses magic). */
const PATHSPEC_ENV = ['GIT_LITERAL_PATHSPECS', 'GIT_GLOB_PATHSPECS', 'GIT_NOGLOB_PATHSPECS', 'GIT_ICASE_PATHSPECS'];

function runGit(cwd: string, args: string[], timeout = COMMIT_TIMEOUT_MS, input?: string): GitRun {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
  for (const name of PATHSPEC_ENV) delete env[name];
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    ...(input === undefined ? { stdio: ['ignore', 'pipe', 'pipe'] as const } : { input, stdio: ['pipe', 'pipe', 'pipe'] as const }),
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env,
  });
  if (r.error) return { code: -1, out: '', err: r.error.message };
  return { code: r.status ?? -1, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

/**
 * Top of the checkout holding `dir` and `dir`'s path inside it, both as Git
 * spells them (symlinks resolved, on-disk letter case), or null outside Git.
 */
function gitLocate(dir: string): { top: string; prefix: string } | null {
  const r = runGit(dir, ['rev-parse', '--show-toplevel', '--show-prefix']);
  if (r.code !== 0) return null;
  const [top, prefix = ''] = r.out.split('\n');
  return top ? { top, prefix } : null;
}

/** Top of the checkout holding `dir`, or null outside Git. */
export function gitTopFor(dir: string): string | null {
  return gitLocate(dir)?.top ?? null;
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

  const located = gitLocate(incDir);
  if (!located) return notCommitted('skipped', 'not a git repository');
  const top = located.top;
  const git = (args: string[], timeout?: number, input?: string) => runGit(top, args, timeout, input);

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
  const markerPaths = paths.out.split('\n');
  for (let i = 0; i < markers.length; i++) {
    if (markerPaths[i] && fs.existsSync(markerPaths[i])) return notCommitted('skipped', markers[i][1]);
  }
  // The full ref: `--short` gives `heads/<name>` when a tag or remote shares the name.
  const head = git(['symbolic-ref', '--quiet', 'HEAD']);
  if (head.code !== 0 || !head.out.startsWith('refs/heads/')) return notCommitted('skipped', 'detached HEAD');
  const branch = head.out.slice('refs/heads/'.length);
  if (git(['rev-parse', '--verify', '--quiet', 'HEAD']).code !== 0) return notCommitted('skipped', 'no commits yet');
  if (req.callerPushesBranch) {
    const problem = upstreamProblem(git, branch);
    if (problem) return notCommitted('skipped', `${problem}, and the handoff push would carry the commit there`);
  }

  // Fixed file names at the top of each increment folder.
  const candidates: string[] = [];
  const trackedOnly: string[] = [];
  for (const dir of [incDir, ...(req.alsoDirs ?? [])]) {
    // Git names the folder inside the repo, so case and symlinks match its index.
    const at = dir === incDir ? located : gitLocate(dir);
    if (!at || at.top !== top) continue;
    const add = (list: string[], name: string) => {
      const st = fs.lstatSync(path.join(dir, name), { throwIfNoEntry: false });
      if (st?.isFile()) list.push(`${at.prefix}${name}`);
    };
    for (const name of AUTO_COMMIT_FILES) add(candidates, name);
    for (const name of TRACKED_ONLY_FILES) add(trackedOnly, name);
  }
  const all = [...candidates, ...trackedOnly];
  if (!all.length) return { status: 'nothing', warnings: [] };

  const listed = git(['ls-files', '-z', '--', ...literal(all)]);
  if (listed.code !== 0) return notCommitted('failed', `git ls-files failed (${firstLine(listed.err)})`);
  const tracked = new Set(listed.out.split('\0').filter(Boolean));
  const untracked = candidates.filter((p) => !tracked.has(p));
  // check-ignore exits 1 when nothing is ignored, 0 when something is; -z keeps non-ASCII paths unquoted.
  const ignoredRun = untracked.length ? git(['check-ignore', '-z', '--stdin'], undefined, untracked.map((p) => `${p}\0`).join('')) : { code: 1, out: '', err: '' };
  if (ignoredRun.code > 1 || ignoredRun.code < 0) return notCommitted('failed', `git check-ignore failed (${firstLine(ignoredRun.err)})`);
  const ignored = new Set(ignoredRun.out.split('\0').filter(Boolean));
  const fresh = untracked.filter((p) => !ignored.has(p));
  const known = all.filter((p) => tracked.has(p));

  // What `--only` commits: the working-tree content of these paths against HEAD.
  const changed = known.length ? git(['diff', '--quiet', 'HEAD', '--', ...literal(known)]).code === 1 : false;
  if (!fresh.length && !changed) return { status: 'nothing', warnings: [] };

  const files = [...known, ...fresh];
  if (fresh.length) {
    const added = git(['add', '--', ...literal(fresh)]);
    if (added.code !== 0) {
      const why = `git add failed (${firstLine(added.err)})`;
      return notCommitted('failed', unstage(git, fresh) ? why : `${why}, and ${fresh.join(', ')} may stay staged`);
    }
  }
  const subject = autoCommitSubject(req.incrementId, req.action, req.tasks);
  const commit = git(['commit', '--only', '--quiet', '-m', subject, '--', ...literal(files)]);
  if (commit.code !== 0) {
    const why = firstLine(commit.err) || firstLine(commit.out) || `exit ${commit.code}`;
    // Leave the index as the command found it; another lane may hold the lock briefly.
    if (fresh.length && !unstage(git, fresh)) {
      return notCommitted('failed', `git commit failed (${why}), and ${fresh.join(', ')} stay staged (git reset failed)`);
    }
    return notCommitted('failed', `git commit failed (${why})`);
  }
  const sha = git(['rev-parse', '--short', 'HEAD']).out || undefined;
  const result: AutoCommitResult = { status: 'committed', sha, subject, files, warnings: [] };
  if (push) pushToUpstream(git, branch, result);
  return result;
}

/**
 * Put the index entries of files `git add` staged back to HEAD, retrying
 * briefly on a held lock. `reset` rather than `rm --cached`: when another lane
 * committed the same file in the meantime, the entry matches HEAD instead of
 * becoming a staged deletion.
 */
function unstage(git: (args: string[]) => GitRun, files: string[]): boolean {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    if (git(['reset', '--quiet', '--', ...literal(files)]).code === 0) return true;
  }
  return false;
}

/**
 * Plain push of HEAD to the branch's upstream. Only to a same-named branch on
 * a real remote that is also where git would push, and only when every
 * unpushed commit is an auto-commit; anything else is a warning.
 */
function pushToUpstream(git: (args: string[], timeout?: number) => GitRun, branch: string, result: AutoCommitResult): void {
  const notPushed = (why: string) => result.warnings.push(`${result.subject ?? 'increment commit'} not pushed: ${why}`);
  const up = upstreamOf(git, branch);
  if (!up || up.remote === '.') {
    notPushed(`${branch} has no upstream on a remote (set one with \`git push -u\`)`);
    return;
  }
  const mismatch = upstreamProblem(git, branch);
  if (mismatch) {
    notPushed(`${mismatch}; push it yourself`);
    return;
  }
  const pushRemote = git(['config', '--get', `branch.${branch}.pushRemote`]).out || git(['config', '--get', 'remote.pushDefault']).out;
  if (pushRemote && pushRemote !== up.remote) {
    notPushed(`${branch} pushes to ${pushRemote}, not its upstream ${up.remote}; push it yourself`);
    return;
  }
  if (git(['rev-parse', '--verify', '--quiet', '@{u}']).code !== 0) {
    notPushed(`${up.short} has not been fetched; fetch first`);
    return;
  }
  if (git(['merge-base', '--is-ancestor', '@{u}', 'HEAD']).code !== 0) {
    notPushed(`${branch} has diverged from ${up.short}; pull first`);
    return;
  }
  const others = unpushedOthers(git);
  if (others !== 0) {
    notPushed(others > 0
      ? `${others} other unpushed commit${others === 1 ? '' : 's'} on ${branch} would go with it; push yourself`
      : 'could not list the unpushed commits');
    return;
  }
  const pushed = git(['push', '--quiet', up.remote, `HEAD:${up.merge}`], PUSH_TIMEOUT_MS);
  if (pushed.code !== 0) {
    notPushed(`git push failed (${firstLine(pushed.err) || `exit ${pushed.code}`})`);
    return;
  }
  result.pushed = up.short;
}

/** An increment's bookkeeping file, in `_archive`/`_abandoned`/`_paused` too. */
const BOOKKEEPING_PATH = /(^|\/)\.specweave\/increments\/(_[a-z]+\/)?[^/]+\/(spec\.md|ledger\.jsonl|metadata\.json|handoff\.md)$/;

/**
 * Unpushed commits that are not auto-commits, or -1 when they cannot be
 * listed. An auto-commit has an auto subject and touches only increment
 * bookkeeping files, so a code commit titled `0042: done T-02` still counts.
 * `--no-renames` lists a rename's source path too.
 */
function unpushedOthers(git: (args: string[]) => GitRun): number {
  const log = git(['-c', 'core.quotePath=false', '-c', 'log.showSignature=false', 'log', '--no-renames', '--format=%x00%s', '--name-only', '@{u}..HEAD']);
  if (log.code !== 0) return -1;
  return log.out.split('\0').slice(1).filter((entry) => {
    const [subject = '', ...rest] = entry.split('\n');
    const files = rest.filter(Boolean);
    return !(isAutoCommitSubject(subject) && files.length && files.every((f) => BOOKKEEPING_PATH.test(f)));
  }).length;
}

/**
 * Why `handoff` should hold its branch push: the branch is ahead of a local
 * or differently named upstream by auto-commits alone, so the push would land
 * only this bookkeeping there. Undefined otherwise, including when other
 * commits are unpushed (the branch push is then the user's, as before).
 */
export function autoCommitPushHold(dir: string): string | undefined {
  const at = gitLocate(dir);
  if (!at) return undefined;
  const git = (args: string[]) => runGit(at.top, args);
  const head = git(['symbolic-ref', '--quiet', 'HEAD']);
  if (head.code !== 0 || !head.out.startsWith('refs/heads/')) return undefined;
  const branch = head.out.slice('refs/heads/'.length);
  const problem = upstreamProblem(git, branch);
  // Without a resolvable `@{u}` the handoff pushes to a same-named branch.
  if (!problem || git(['rev-parse', '--verify', '--quiet', '@{u}']).code !== 0) return undefined;
  const ahead = Number(git(['rev-list', '--count', '@{u}..HEAD']).out || '0');
  if (!ahead || unpushedOthers(git) !== 0) return undefined;
  return `${problem}, and only increment auto-commits are unpushed; push them yourself`;
}

/**
 * The branch's upstream as git resolves `@{u}` (and so `pushHandoff`): the
 * first `merge` value, none when half set. `config --get` would read the last.
 * `tracking` is the remote-tracking ref, empty when no fetch refspec maps it.
 */
function upstreamOf(git: (args: string[]) => GitRun, branch: string): { remote: string; merge: string; short: string; tracking: string } | null {
  const ref = `refs/heads/${branch}`;
  const r = git(['for-each-ref', '--format=%(refname)%00%(upstream:remotename)%00%(upstream:remoteref)%00%(upstream:short)%00%(upstream)', ref]);
  for (const line of r.out.split('\n')) {
    const [name, remote = '', merge = '', short = '', tracking = ''] = line.split('\0');
    if (name === ref) return remote && merge ? { remote, merge, short, tracking } : null;
  }
  return null;
}

/**
 * Why pushing `branch` to its upstream would land it somewhere else: a local
 * upstream, a differently named branch, or a fetch refspec that files it under
 * another name (`pushHandoff` pushes to the name it reads off `@{u}`).
 * Undefined when it is a same-named branch on a remote, or when there is no
 * upstream at all.
 */
function upstreamProblem(git: (args: string[]) => GitRun, branch: string): string | undefined {
  const up = upstreamOf(git, branch);
  if (!up) return undefined;
  if (up.remote === '.') return `${branch} tracks the local branch ${up.short}`;
  if (up.merge !== `refs/heads/${branch}`) return `${branch} tracks ${up.short}, a different branch`;
  if (up.tracking !== `refs/remotes/${up.remote}/${branch}`) {
    return `${branch}'s upstream is fetched as ${up.short || 'no remote-tracking branch'}, not ${up.remote}/${branch}`;
  }
  return undefined;
}

/** One line for the user, or undefined when nothing happened. */
export function describeAutoCommit(r: AutoCommitResult): string | undefined {
  if (r.status !== 'committed') return undefined;
  return `Committed${r.sha ? ` ${r.sha}` : ''} "${r.subject}"${r.pushed ? `, pushed to ${r.pushed}` : ''}`;
}

function firstLine(text: string): string {
  return text.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 160) ?? '';
}

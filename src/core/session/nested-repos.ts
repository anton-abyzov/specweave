/**
 * Nested-repo scan for `specweave handoff --all` (read-only).
 *
 * An umbrella workspace keeps product code in its own Git checkouts under
 * `repositories/<org>/<repo>`, usually gitignored by the umbrella, so the
 * umbrella's own `git status` never sees them. This module lists every
 * checkout there (plus the worktrees Git knows about for each, wherever they
 * live, and the workspace root itself) and reports the ones holding work that
 * exists only on this machine: uncommitted files, commits ahead of the
 * upstream, or a branch with no remote.
 *
 * Nothing here writes: no fetch, no commit, no push. `gh pr list` is asked
 * for the open PR of each flagged branch when `gh` is installed; when it is
 * not, or it fails, the PR column stays empty.
 *
 * @module core/session/nested-repos
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PullRequestInfo {
  number: number;
  url: string;
  state: string;
  isDraft: boolean;
}

export interface CheckoutState {
  /** Absolute path of the checkout. */
  path: string;
  /** Path for display: relative to the workspace root when inside it. */
  display: string;
  /** Branch name, or `(detached)`. */
  branch: string;
  detached: boolean;
  /** Short sha of HEAD ('' in an empty repo). */
  sha: string;
  /** Changed, staged and untracked files. */
  dirty: number;
  /** Commits not on the upstream (or on no remote at all when there is no upstream). */
  ahead: number;
  /** `origin/x` style upstream, when one is set and still exists. */
  upstream?: string;
  /** The branch has no upstream and no remote-tracking branch of the same name. */
  noRemote: boolean;
  /** ISO time of the last commit. */
  lastCommitAt?: string;
  /** Open PR for the branch, when `gh` found one. */
  pr?: PullRequestInfo;
  /** 4-digit increment ids found in the path or branch name. */
  incrementIds: string[];
  /** Why it is listed: dirty, ahead, no remote. Empty when the checkout is safe. */
  reasons: string[];
}

export type PrLookup = (cwd: string, branch: string) => Promise<PullRequestInfo | undefined>;

export interface ScanOptions {
  /** 4-digit ids of the increments to map checkouts to. */
  incrementIds?: string[];
  /** Look up PRs (default: `gh pr list` when gh is installed). `false` skips it. */
  prLookup?: PrLookup | false;
  /** Parallel Git processes (default 8). */
  concurrency?: number;
  /** Include the workspace root checkout itself (default true). */
  includeRoot?: boolean;
}

export interface NestedRepoScan {
  /** Every checkout found, flagged or not. */
  scanned: number;
  /** Checkouts with local-only work, sorted by path. */
  flagged: CheckoutState[];
}

const GIT_TIMEOUT_MS = 15000;
const GH_TIMEOUT_MS = 15000;

function run(cmd: string, args: string[], cwd: string, timeout = GIT_TIMEOUT_MS): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, {
      cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
    }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

const git = (cwd: string, args: string[]) => run('git', args, cwd);

/** A directory is a checkout when it has a `.git` folder or a `.git` file (worktree). */
function isCheckout(dir: string): boolean {
  try { return fs.existsSync(path.join(dir, '.git')); } catch { return false; }
}

function listDirs(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => path.join(dir, d.name));
  } catch { return []; }
}

function real(p: string): string {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

/** `repositories/<org>/<repo>` checkouts (and a checkout directly at `repositories/<repo>`). */
export function findNestedCheckouts(root: string): string[] {
  const base = path.join(root, 'repositories');
  const found: string[] = [];
  for (const first of listDirs(base)) {
    if (isCheckout(first)) { found.push(first); continue; }
    for (const second of listDirs(first)) if (isCheckout(second)) found.push(second);
  }
  return found.sort();
}

/** Worktrees Git records for a checkout (absolute paths, the checkout itself included). */
async function listWorktrees(dir: string): Promise<string[]> {
  const out = await git(dir, ['worktree', 'list', '--porcelain']);
  if (!out) return [];
  return out.split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length).trim()).filter(Boolean);
}

/** Increment ids (4 digits, not part of a longer number) that appear in the text. */
export function matchIncrementIds(text: string, ids: string[]): string[] {
  return ids.filter((id) => new RegExp(`(?<!\\d)${id}(?!\\d)`).test(text));
}

/** Parse `git status --porcelain=v2 --branch` into branch, upstream, ahead and dirty count. */
export function parseStatusV2(out: string): { branch: string; detached: boolean; upstream?: string; ahead?: number; dirty: number; oid?: string } {
  let branch = '';
  let upstream: string | undefined;
  let ahead: number | undefined;
  let oid: string | undefined;
  let dirty = 0;
  for (const line of out.split('\n')) {
    if (!line) continue;
    if (line.startsWith('# branch.head ')) branch = line.slice('# branch.head '.length).trim();
    else if (line.startsWith('# branch.upstream ')) upstream = line.slice('# branch.upstream '.length).trim();
    else if (line.startsWith('# branch.oid ')) oid = line.slice('# branch.oid '.length).trim();
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+)\s+-(\d+)/);
      if (m) ahead = Number(m[1]);
    } else if (!line.startsWith('#')) dirty++;
  }
  const detached = branch === '(detached)' || branch === '';
  return { branch: detached ? '(detached)' : branch, detached, upstream, ahead, dirty, oid: oid === '(initial)' ? undefined : oid };
}

/** State of one checkout. Returns null when it is not a readable Git checkout. */
export async function inspectCheckout(dir: string, root: string, incrementIds: string[] = []): Promise<CheckoutState | null> {
  const status = await git(dir, ['status', '--porcelain=v2', '--branch']);
  if (status === null) return null;
  const s = parseStatusV2(status);
  const hasHead = !!s.oid;
  let upstream = s.upstream;
  let ahead = s.ahead;
  let noRemote = false;

  if (upstream && ahead === undefined) upstream = undefined; // upstream configured but gone
  if (!upstream && !s.detached) {
    const tracking = hasHead ? await git(dir, ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${s.branch}`]) : null;
    if (tracking) {
      const n = await git(dir, ['rev-list', '--count', `refs/remotes/origin/${s.branch}..HEAD`]);
      ahead = n ? Number(n.trim()) || 0 : 0;
    } else {
      noRemote = true;
    }
  }
  if (ahead === undefined) {
    // No upstream to compare with: count the commits that are on no remote at all.
    const n = hasHead ? await git(dir, ['rev-list', '--count', 'HEAD', '--not', '--remotes']) : null;
    ahead = n ? Number(n.trim()) || 0 : 0;
  }
  const last = hasHead ? (await git(dir, ['log', '-1', '--format=%cI']))?.trim() : undefined;

  const reasons: string[] = [];
  if (s.dirty) reasons.push('dirty');
  if (ahead) reasons.push('ahead');
  if (noRemote) reasons.push('no remote');

  const rel = path.relative(root, dir);
  const display = !rel ? '.' : rel.startsWith('..') || path.isAbsolute(rel) ? dir : rel.split(path.sep).join('/');
  return {
    path: dir,
    display,
    branch: s.branch,
    detached: s.detached,
    sha: s.oid ? s.oid.slice(0, 7) : '',
    dirty: s.dirty,
    ahead,
    upstream,
    noRemote,
    lastCommitAt: last || undefined,
    incrementIds: matchIncrementIds(`${path.basename(dir)} ${s.detached ? '' : s.branch}`, incrementIds),
    reasons,
  };
}

/** `gh pr list --head <branch>` in the checkout; undefined when gh is missing, fails or finds none. */
export const ghPrLookup: PrLookup = async (cwd, branch) => {
  const out = await run('gh', ['pr', 'list', '--head', branch, '--json', 'number,url,state,isDraft', '--limit', '1'], cwd, GH_TIMEOUT_MS);
  if (!out) return undefined;
  try {
    const list = JSON.parse(out) as PullRequestInfo[];
    const pr = Array.isArray(list) ? list[0] : undefined;
    return pr && typeof pr.number === 'number' && typeof pr.url === 'string'
      ? { number: pr.number, url: pr.url, state: String(pr.state ?? ''), isDraft: !!pr.isDraft }
      : undefined;
  } catch { return undefined; }
};

async function ghAvailable(cwd: string): Promise<boolean> {
  return (await run('gh', ['--version'], cwd, 5000)) !== null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Scan the workspace root, every nested checkout and their worktrees.
 * Read-only; never throws for a single unreadable checkout.
 */
export async function scanNestedRepos(root: string, opts: ScanOptions = {}): Promise<NestedRepoScan> {
  const concurrency = opts.concurrency ?? 8;
  const ids = opts.incrementIds ?? [];
  const nested = findNestedCheckouts(root);

  // Worktrees recorded by each main checkout, wherever they live (e.g. ../work/0042-x).
  const trees = await mapLimit(nested, concurrency, listWorktrees);
  const seen = new Set<string>();
  const all: string[] = [];
  const add = (p: string) => {
    const key = real(p);
    if (seen.has(key) || !fs.existsSync(p)) return;
    seen.add(key);
    all.push(p);
  };
  if (opts.includeRoot !== false && isCheckout(root)) add(root);
  for (const p of nested) add(p);
  for (const list of trees) for (const p of list) add(p);
  // The root's own worktrees (e.g. `work/0042-x` beside the umbrella).
  if (opts.includeRoot !== false && isCheckout(root)) for (const p of await listWorktrees(root)) add(p);

  const states = (await mapLimit(all, concurrency, (p) => inspectCheckout(p, root, ids))).filter((s): s is CheckoutState => !!s);
  const flagged = states.filter((s) => s.reasons.length > 0);

  const lookup = opts.prLookup === false ? undefined : opts.prLookup ?? ((await ghAvailable(root)) ? ghPrLookup : undefined);
  if (lookup) {
    await mapLimit(flagged.filter((s) => !s.detached), Math.min(concurrency, 4), async (s) => {
      try { s.pr = await lookup(s.path, s.branch); } catch { /* skip silently */ }
    });
  }

  flagged.sort((a, b) => (a.display === '.' ? -1 : b.display === '.' ? 1 : a.display.localeCompare(b.display)));
  return { scanned: states.length, flagged };
}

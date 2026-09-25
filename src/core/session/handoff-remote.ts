/**
 * Handoff through the Git remote, so "hand off" and "pick up" work across
 * tools, machines, accounts and cloud sessions with no pasted prompt.
 *
 * Hand off ({@link pushHandoff}):
 *   1. Push the current branch when it has no upstream or is ahead of it.
 *   2. Build a snapshot commit of the whole working tree (tracked and
 *      untracked, minus ignored files) through a private index, on top of
 *      HEAD, with trailers saying who handed off, from which branch and why.
 *   3. Force-push it to `specweave-handoff` (the latest handoff) and
 *      `wip/<branch>`. The user's index, working tree and branch are untouched.
 *
 * Pick up ({@link applyHandoff}): fetch `specweave-handoff`, fast-forward the
 * current branch to the handed-off commit, and apply the uncommitted edits on
 * top, only when the working tree is clean and the history allows it. Every
 * other case is reported in words and changes nothing.
 *
 * @module core/session/handoff-remote
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { HandoffPushInfo } from './handoff-doc-format.js';

export const HANDOFF_REF = 'specweave-handoff';
export const PICKUPS_FILE = '.specweave/state/pickups.txt';

const NETWORK_TIMEOUT_MS = 60_000;

export function wipRefFor(branch: string): string {
  return `wip/${branch}`;
}

type Git = (args: string[], extraEnv?: NodeJS.ProcessEnv) => string;

function gitRunner(repoRoot: string): { git: Git; tryGit: (args: string[], extraEnv?: NodeJS.ProcessEnv) => string | null } {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' };
  const git: Git = (args, extraEnv = {}) =>
    execFileSync('git', args, {
      cwd: repoRoot, env: { ...env, ...extraEnv }, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'], timeout: NETWORK_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024,
    }).trim();
  const tryGit = (args: string[], extraEnv?: NodeJS.ProcessEnv): string | null => {
    try { return git(args, extraEnv); } catch { return null; }
  };
  return { git, tryGit };
}

/** Tree of the working tree as `git add -A` would stage it, without touching the real index. */
function workingTreeId(git: Git): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-handoff-index-'));
  try {
    const indexPath = git(['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    const privateIndex = path.join(tmp, 'index');
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, privateIndex);
      // Keep the index's mtime: git rehashes files changed in the same second
      // as the index was written only when it can see that second.
      const { atime, mtime } = fs.statSync(indexPath);
      fs.utimesSync(privateIndex, atime, mtime);
    }
    const withIndex = { GIT_INDEX_FILE: privateIndex };
    git(['add', '-A', '--', '.'], withIndex);
    return git(['write-tree'], withIndex);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

export interface HandoffMeta {
  by: string;
  at: string;
  increment?: string;
  reason?: string;
}

export interface PushOptions {
  remote?: string;
  /** The user asked for the push; report every reason it could not happen. */
  explicit?: boolean;
}

export function pushHandoff(repoRoot: string, meta: HandoffMeta, opts: PushOptions = {}): HandoffPushInfo {
  const remote = opts.remote ?? 'origin';
  const warnings: string[] = [];
  const quiet = (why: string): HandoffPushInfo => ({ warnings: opts.explicit ? [why] : [], skipped: why });
  const { git, tryGit } = gitRunner(repoRoot);

  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') return quiet('not a git repository');
  if (tryGit(['remote', 'get-url', remote]) === null) return quiet(`no "${remote}" remote`);
  const branch = tryGit(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (!branch) return { warnings: ['detached HEAD; check out a branch to hand off'] };
  const head = tryGit(['rev-parse', 'HEAD']);
  if (!head) return { warnings: ['no commits yet; commit once before handing off'] };

  const info: HandoffPushInfo = { warnings };

  // 1. The branch itself.
  const upstream = tryGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const ahead = upstream ? Number(tryGit(['rev-list', '--count', `${upstream}..HEAD`]) ?? '0') : undefined;
  if (!upstream || (ahead ?? 0) > 0) {
    try {
      if (upstream) {
        const slash = upstream.indexOf('/');
        git(['push', upstream.slice(0, slash), `HEAD:refs/heads/${upstream.slice(slash + 1)}`]);
      } else {
        git(['push', '-u', remote, branch]);
      }
      info.branch = branch;
    } catch (e) {
      warnings.push(`branch push failed (${firstLine(e)}); push it yourself`);
    }
  }

  // 2 + 3. Snapshot commit with trailers, pushed to the well-known ref.
  try {
    const tree = workingTreeId(git);
    const identity = tryGit(['config', 'user.email']) ? {} : {
      GIT_AUTHOR_NAME: 'SpecWeave handoff', GIT_AUTHOR_EMAIL: 'handoff@specweave.local',
      GIT_COMMITTER_NAME: 'SpecWeave handoff', GIT_COMMITTER_EMAIL: 'handoff@specweave.local',
    };
    const message = [
      `SpecWeave handoff from ${meta.by}`,
      '',
      `Handoff-Branch: ${branch}`,
      `Handoff-By: ${meta.by}`,
      `Handoff-At: ${meta.at}`,
      ...(meta.increment ? [`Handoff-Increment: ${meta.increment}`] : []),
      ...(meta.reason ? [`Handoff-Reason: ${oneLine(meta.reason)}`] : []),
    ].join('\n');
    const commit = git(['commit-tree', '--no-gpg-sign', tree, '-p', head, '-m', message], identity);
    const wip = wipRefFor(branch);
    git(['push', '--force', remote, `${commit}:refs/heads/${HANDOFF_REF}`, `${commit}:refs/heads/${wip}`]);
    info.handoffRef = HANDOFF_REF;
    info.snapshot = commit;
    // This checkout already has the work; its own pickup must not re-apply it.
    rememberPickup(repoRoot, commit);
    if (tree !== git(['rev-parse', 'HEAD^{tree}'])) info.wipRef = wip;
  } catch (e) {
    warnings.push(`handoff snapshot push failed (${firstLine(e)}); the handoff doc and diff are still local`);
  }
  return info;
}

export interface PickupApplyResult {
  status: 'none' | 'applied' | 'here' | 'already' | 'dirty' | 'diverged' | 'failed';
  /** Plain-language summary for the user (empty for `none`). */
  message: string;
  snapshot?: string;
  meta?: Partial<HandoffMeta> & { branch?: string };
  /** Commits the current branch moved forward by. */
  fastForwarded?: number;
  /** Files changed by the applied uncommitted edits. */
  editedFiles?: number;
}

/** Read the `Handoff-*` trailers of a snapshot commit. */
export function readHandoffMeta(message: string): Partial<HandoffMeta> & { branch?: string } {
  const field = (name: string) => message.match(new RegExp(`^Handoff-${name}: (.+)$`, 'm'))?.[1]?.trim();
  return { branch: field('Branch'), by: field('By'), at: field('At'), increment: field('Increment'), reason: field('Reason') };
}

export interface ApplyOptions {
  remote?: string;
  /** Only report what would happen. */
  dryRun?: boolean;
}

export function applyHandoff(repoRoot: string, opts: ApplyOptions = {}): PickupApplyResult {
  const remote = opts.remote ?? 'origin';
  const { git, tryGit } = gitRunner(repoRoot);
  const none: PickupApplyResult = { status: 'none', message: '' };

  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') return none;
  if (tryGit(['remote', 'get-url', remote]) === null) return none;
  const tracking = `refs/remotes/${remote}/${HANDOFF_REF}`;
  // A fetch failure (offline, no such ref) falls back to what was fetched before.
  tryGit(['fetch', '--quiet', '--no-tags', remote, `+refs/heads/${HANDOFF_REF}:${tracking}`]);
  const snapshot = tryGit(['rev-parse', '--verify', '--quiet', `${tracking}^{commit}`]);
  if (!snapshot) return none;

  const meta = readHandoffMeta(git(['log', '-1', '--format=%B', snapshot]));
  const who = `${meta.by ?? 'someone'}${meta.at ? ` ${ago(meta.at)}` : ''}${meta.reason ? ` (${meta.reason})` : ''}`;
  const base: Pick<PickupApplyResult, 'snapshot' | 'meta'> = { snapshot, meta };
  if (pickedUp(repoRoot).includes(snapshot)) return { ...base, status: 'already', message: '' };
  const remember = () => { if (!opts.dryRun) rememberPickup(repoRoot, snapshot); };

  const parent = git(['rev-parse', `${snapshot}^`]);
  const snapTree = git(['rev-parse', `${snapshot}^{tree}`]);
  if (workingTreeId(git) === snapTree) {
    remember();
    return { ...base, status: 'here', message: `The last handoff, from ${who}, is already this checkout.` };
  }

  let dirty = git(['status', '--porcelain']);
  if (dirty && !opts.dryRun) {
    // Edits that are exactly a handoff made or picked up here are already in
    // the new handoff's history: set them aside (stashed, never deleted).
    const here = workingTreeId(git);
    const known = pickedUp(repoRoot).some((sha) => tryGit(['rev-parse', `${sha}^{tree}`]) === here);
    if (known && tryGit(['stash', 'push', '--include-untracked', '-m', `specweave pickup: edits already handed off (${snapshot.slice(0, 7)})`]) !== null) {
      dirty = git(['status', '--porcelain']);
    }
  }
  if (dirty) {
    return {
      ...base, status: 'dirty',
      message: `A handoff from ${who} is waiting, but this checkout has uncommitted changes, so nothing was applied. Commit or stash them, then run \`specweave pickup\` again.`,
    };
  }

  const head = tryGit(['rev-parse', 'HEAD']);
  const isAncestor = (a: string, b: string) => tryGit(['merge-base', '--is-ancestor', a, b]) !== null;
  let fastForwarded = 0;
  if (head !== parent) {
    if (!head || isAncestor(head, parent)) {
      fastForwarded = head ? Number(git(['rev-list', '--count', `${head}..${parent}`])) : Number(git(['rev-list', '--count', parent]));
      if (!opts.dryRun) {
        try {
          git(head ? ['merge', '--ff-only', '--quiet', parent] : ['reset', '--hard', '--quiet', parent]);
        } catch (e) {
          return { ...base, status: 'failed', message: `Could not fast-forward to the handoff (${firstLine(e)}).` };
        }
      }
    } else if (!isAncestor(parent, head)) {
      return {
        ...base, status: 'diverged',
        message: `A handoff from ${who} is on branch ${meta.branch ?? '(unknown)'}, which has diverged from this branch. Merge it first (\`git merge ${remote}/${meta.branch ?? HANDOFF_REF}\`), then run \`specweave pickup\` again.`,
      };
    }
  }

  let editedFiles = 0;
  const parentTree = git(['rev-parse', `${parent}^{tree}`]);
  if (snapTree !== parentTree) {
    editedFiles = git(['diff', '--name-only', parent, snapshot]).split('\n').filter(Boolean).length;
    if (!opts.dryRun) {
      try {
        git(['cherry-pick', '--no-commit', snapshot]);
        // Leave the edits unstaged, the way the previous session had them.
        git(['reset', '--quiet']);
      } catch (e) {
        tryGit(['cherry-pick', '--abort']);
        return { ...base, status: 'failed', fastForwarded, message: `Could not apply the handed-off edits (${firstLine(e)}).` };
      }
    }
  }
  remember();
  const parts = [
    fastForwarded ? `moved this branch forward ${fastForwarded} commit${fastForwarded === 1 ? '' : 's'}` : '',
    editedFiles ? `applied ${editedFiles} uncommitted file${editedFiles === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return {
    ...base, status: 'applied', fastForwarded, editedFiles,
    message: `Picked up the handoff from ${who}${parts.length ? `: ${parts.join(', ')}` : ''}.`,
  };
}

function pickedUp(repoRoot: string): string[] {
  try { return fs.readFileSync(path.join(repoRoot, PICKUPS_FILE), 'utf8').split('\n').filter(Boolean); } catch { return []; }
}

/** Mark a snapshot as present in this checkout (made here or already applied). */
export function rememberPickup(repoRoot: string, snapshot: string): void {
  try {
    const file = path.join(repoRoot, PICKUPS_FILE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, snapshot + '\n');
  } catch { /* best effort */ }
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function ago(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function firstLine(e: unknown): string {
  const err = e as { stderr?: string | Buffer; message?: string };
  const text = (err.stderr ? String(err.stderr) : '') || err.message || String(e);
  return text.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 160) ?? 'unknown error';
}

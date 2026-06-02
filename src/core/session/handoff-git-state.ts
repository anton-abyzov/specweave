/**
 * Handoff Git State Capture
 *
 * Captures the cheap, deterministic git facts the handoff doc needs (branch,
 * short sha, porcelain status, diff --stat) AND dumps the FULL working-tree +
 * staged diff to a sibling `.diff` file. The full diff is captured for free via
 * git — no LLM tokens are spent — and is the key in-flight-fidelity artifact:
 * it lets the resuming agent see exactly what was changed but not yet committed.
 *
 * In a non-git directory every field degrades to empty and no error is thrown,
 * so the non-SpecWeave fallback path still works on plain folders.
 *
 * Part of increment 0867: Cross-Tool Work Handoff (AC-US4-01..04).
 *
 * @module core/session/handoff-git-state
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Captured git state for the handoff doc.
 */
export interface GitState {
  /** Whether `repoRoot` is inside a git work tree at all. */
  isGitRepo: boolean;
  /** Current branch name (empty if detached or non-git). */
  branch: string;
  /** Short commit SHA of HEAD (empty if no commits / non-git). */
  shortSha: string;
  /** `git status --porcelain` output (empty when clean or non-git). */
  statusPorcelain: string;
  /** Combined `git diff --stat` (working) + `git diff --cached --stat` (staged). */
  diffStat: string;
  /** True when there are working-tree or staged changes. */
  hasUncommittedChanges: boolean;
}

/**
 * Run a git command, returning trimmed stdout or `null` on any failure.
 *
 * Uses execFileSync with an argument array (no shell) so paths and refs are
 * never re-interpreted by a shell.
 */
function git(repoRoot: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024, // diffs can be large
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Capture git state for `repoRoot` and dump the full uncommitted diff to
 * `diffOutputPath`.
 *
 * The diff file always contains `git diff HEAD` (working-tree vs last commit)
 * concatenated with `git diff --cached` (staged vs HEAD). When the repo is
 * clean — or before the first commit — the file is written empty so callers can
 * unconditionally link to it.
 *
 * @param repoRoot - Absolute path to the candidate repository root.
 * @param diffOutputPath - Absolute path where the full diff is written.
 * @returns The captured {@link GitState}; all-empty + `isGitRepo:false` when
 *          `repoRoot` is not a git work tree (no throw).
 */
export function captureGitState(repoRoot: string, diffOutputPath: string): GitState {
  const empty: GitState = {
    isGitRepo: false,
    branch: '',
    shortSha: '',
    statusPorcelain: '',
    diffStat: '',
    hasUncommittedChanges: false,
  };

  const insideWorkTree = git(repoRoot, ['rev-parse', '--is-inside-work-tree']);
  if (insideWorkTree !== 'true') {
    // Still write an empty diff file so the doc's link target exists.
    safeWriteDiff(diffOutputPath, '');
    return empty;
  }

  const branch = git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']) ?? '';
  const shortSha = git(repoRoot, ['rev-parse', '--short', 'HEAD']) ?? '';
  const statusPorcelain = git(repoRoot, ['status', '--porcelain']) ?? '';

  // Intent-to-add every untracked file so `git diff` includes its FULL body,
  // not just a `??` porcelain line. Without this, brand-new uncommitted files —
  // the most common in-flight-work case — would be captured as a filename only,
  // breaking the spec's "exact uncommitted edits" promise (AC-US4-01/02).
  // `add -N` records intent only (no content staged) but it DOES add an index
  // entry, so we MUST revert it afterward to leave the user's real index exactly
  // as we found it — a handoff is a read-only capture and must not silently
  // change `git status`, `git stash`, or `git commit -a` behavior.
  const intentAdded = stageIntentToAddUntracked(repoRoot, statusPorcelain);

  // `git diff HEAD` covers working-tree vs HEAD; if there is no HEAD yet
  // (no commits), fall back to plain `git diff` so brand-new repos still work.
  const hasHead = shortSha !== '';
  const workingDiff =
    (hasHead ? git(repoRoot, ['diff', 'HEAD']) : git(repoRoot, ['diff'])) ?? '';
  const stagedDiff = (hasHead ? git(repoRoot, ['diff', '--cached']) : '') ?? '';

  const workingStat =
    (hasHead ? git(repoRoot, ['diff', '--stat', 'HEAD']) : git(repoRoot, ['diff', '--stat'])) ?? '';
  const stagedStat = (hasHead ? git(repoRoot, ['diff', '--cached', '--stat']) : '') ?? '';

  // Restore the index: drop the intent-to-add entries we created so the user's
  // staging area is byte-identical to its pre-handoff state.
  unstageIntentToAdd(repoRoot, hasHead, intentAdded);

  const diffStat = [workingStat, stagedStat].filter(Boolean).join('\n');

  const fullDiff = [workingDiff, stagedDiff].filter(Boolean).join('\n');
  safeWriteDiff(diffOutputPath, fullDiff);

  const hasUncommittedChanges = statusPorcelain.length > 0;

  return {
    isGitRepo: true,
    branch,
    shortSha,
    statusPorcelain,
    diffStat,
    hasUncommittedChanges,
  };
}

/**
 * Intent-to-add every untracked file from a porcelain status so its content
 * shows up in `git diff`. Parses `??`-prefixed porcelain lines and runs a
 * single `git add -N -- <paths...>`. Never throws — a failure here only means
 * untracked bodies are omitted, which must not abort the handoff.
 *
 * `add -N` (intent-to-add) records that a path will be tracked but stages NO
 * content. It DOES create an index entry, so the caller MUST pass the returned
 * paths to {@link unstageIntentToAdd} once the diff has been captured to leave
 * the user's real index untouched.
 *
 * @returns The untracked paths that were intent-to-added (empty if none).
 */
function stageIntentToAddUntracked(repoRoot: string, statusPorcelain: string): string[] {
  if (!statusPorcelain) return [];
  const untracked = statusPorcelain
    .split('\n')
    .filter((line) => line.startsWith('??'))
    // Porcelain format is `XY <path>`; for untracked the path starts at col 3.
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
  if (untracked.length === 0) return [];
  // `--` guards against any path that looks like a flag.
  git(repoRoot, ['add', '-N', '--', ...untracked]);
  return untracked;
}

/**
 * Revert the intent-to-add entries created by {@link stageIntentToAddUntracked}
 * so the user's index is restored to its pre-handoff state. After this the
 * affected files are untracked (`??`) again, exactly as before the capture.
 *
 * `git reset -- <paths>` clears the index entries when a HEAD exists. Before the
 * first commit there is no HEAD, so `git reset` would fail; `git rm --cached
 * --force -- <paths>` removes the intent entries in that case. Never throws — a
 * failed revert must not abort the handoff (worst case: the index keeps the
 * intent entries, which is the pre-fix behavior).
 */
function unstageIntentToAdd(repoRoot: string, hasHead: boolean, paths: string[]): void {
  if (paths.length === 0) return;
  if (hasHead) {
    git(repoRoot, ['reset', '--quiet', '--', ...paths]);
  } else {
    git(repoRoot, ['rm', '--cached', '--force', '--quiet', '--', ...paths]);
  }
}

/**
 * Write the diff file, creating the parent dir; never throws.
 */
function safeWriteDiff(diffOutputPath: string, content: string): void {
  try {
    fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true });
    fs.writeFileSync(diffOutputPath, content, 'utf-8');
  } catch {
    // Best-effort: a failed diff dump must not abort the handoff.
  }
}

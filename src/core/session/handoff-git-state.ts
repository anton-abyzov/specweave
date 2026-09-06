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
import * as os from 'os';

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

/** Total Git budget leaves headroom below PreCompact's five-second budget. */
export const GIT_CAPTURE_BUDGET_MS = 3500;

/** Capture through a private index; an interrupted hook never stages user files. */
export function captureGitState(repoRoot: string, diffOutputPath: string): GitState {
  const empty: GitState = {
    isGitRepo: false, branch: '', shortSha: '', statusPorcelain: '',
    diffStat: '', hasUncommittedChanges: false,
  };
  const deadline = Date.now() + GIT_CAPTURE_BUDGET_MS;
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  function git(args: string[], trim = true): string | null {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    try {
      const result = execFileSync('git', args, {
        cwd: repoRoot, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024, timeout: remaining, killSignal: 'SIGKILL',
      });
      return trim ? result.trim() : result;
    } catch { return null; }
  }
  let temporary: string | undefined;
  try {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
      safeWriteDiff(diffOutputPath, '');
      return empty;
    }
    const indexPath = git(['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    if (!indexPath) { safeWriteDiff(diffOutputPath, ''); return empty; }
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-handoff-index-'));
    const privateIndex = path.join(temporary, 'index');
    if (fs.existsSync(indexPath)) fs.copyFileSync(indexPath, privateIndex);
    Object.assign(env, { GIT_INDEX_FILE: privateIndex });

    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) ?? '';
    const shortSha = git(['rev-parse', '--short', 'HEAD']) ?? '';
    const statusPorcelain = git(['status', '--porcelain']) ?? '';
    // NUL-delimited paths handle spaces, quotes, Unicode and embedded newlines.
    const untracked = (git(['ls-files', '--others', '--exclude-standard', '-z'], false) ?? '')
      .split('\0').filter(Boolean);
    if (untracked.length) git(['add', '-N', '--', ...untracked]);
    const hasHead = shortSha !== '';
    const working = ['diff', '--no-ext-diff', '--no-textconv', ...(hasHead ? ['HEAD'] : [])];
    const staged = ['diff', '--no-ext-diff', '--no-textconv', '--cached'];
    const workingDiff = git(working) ?? '';
    const stagedDiff = (hasHead ? git(staged) : '') ?? '';
    const workingStat = git([...working, '--stat']) ?? '';
    const stagedStat = (hasHead ? git([...staged, '--stat']) : '') ?? '';
    safeWriteDiff(diffOutputPath, [workingDiff, stagedDiff].filter(Boolean).join('\n'));
    return {
      isGitRepo: true, branch, shortSha, statusPorcelain,
      diffStat: [workingStat, stagedStat].filter(Boolean).join('\n'),
      hasUncommittedChanges: statusPorcelain.length > 0,
    };
  } catch {
    safeWriteDiff(diffOutputPath, '');
    return empty;
  } finally {
    if (temporary) try { fs.rmSync(temporary, { recursive: true, force: true }); } catch { /* best effort */ }
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

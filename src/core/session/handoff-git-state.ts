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
  /** Upstream branch (`origin/feature`), empty when none is configured. */
  upstream?: string;
  /** Commits on HEAD not yet on the upstream (undefined without an upstream). */
  ahead?: number;
  /** Set when the written diff was cut at `maxDiffBytes`. */
  diffCap?: DiffCap;
}

/** What a capped diff file holds compared with the whole diff. */
export interface DiffCap {
  shownBytes: number;
  totalBytes: number;
  shownFiles: number;
  totalFiles: number;
}

/**
 * Cap for automatic (PreCompact) handoffs. The session goes on working and the
 * edits stay in the checkout, so a 10.8 MB dump only costs disk and scrub time.
 */
export const AUTO_HANDOFF_DIFF_CAP_BYTES = 1024 * 1024;

/** The command that prints what a capped diff left out. */
export const FULL_DIFF_COMMAND = 'git diff HEAD';

/**
 * Keep whole per-file sections, in order, while they fit in `maxBytes`; when
 * even the first does not fit, keep its lines up to the cap. Cuts only at line
 * ends, so the secret scrub still sees every kept line whole. A footer names
 * what was left out and how to see it.
 */
export function capDiff(diff: string, maxBytes: number): { text: string; cap?: DiffCap } {
  const totalBytes = Buffer.byteLength(diff, 'utf8');
  if (totalBytes <= maxBytes) return { text: diff };
  const sections = diff.split(/^(?=diff --git )/m);
  const kept: string[] = [];
  let shownBytes = 0;
  for (const section of sections) {
    const size = Buffer.byteLength(section, 'utf8');
    if (shownBytes + size > maxBytes) break;
    kept.push(section);
    shownBytes += size;
  }
  const totalFiles = sections.filter((x) => x.startsWith('diff --git ')).length;
  const shownFiles = kept.filter((x) => x.startsWith('diff --git ')).length;
  let partial = '';
  if (!kept.length) {
    const head = Buffer.from(diff, 'utf8').subarray(0, maxBytes);
    partial = head.subarray(0, head.lastIndexOf(0x0a) + 1).toString('utf8');
    shownBytes = Buffer.byteLength(partial, 'utf8');
  }
  const cap: DiffCap = { shownBytes, totalBytes, shownFiles, totalFiles };
  const footer = [
    `# SpecWeave: diff capped at ${shownBytes} of ${totalBytes} bytes; ${shownFiles} of ${totalFiles} files shown whole${partial ? ', the first one cut at a line end' : ''}.`,
    `# The edits are still in the checkout: run \`${FULL_DIFF_COMMAND}\` there for tracked files and \`git status --porcelain\` for untracked ones.`,
  ].join('\n');
  const body = partial || kept.join('');
  return { text: `${body}${body.endsWith('\n') || !body ? '' : '\n'}${footer}\n`, cap };
}

/**
 * SpecWeave's own bookkeeping, excluded from the handoff diff and the "files
 * touched" list: the next agent reads it through `specweave pickup`, and in a
 * measured handoff it was 97% of the diff. spec.md and plan.md stay in, since
 * edits to them are real work.
 */
export const BOOKKEEPING_PATHSPECS: readonly string[] = [
  ':(exclude,glob).specweave/increments/*/ledger.jsonl',
  ':(exclude,glob).specweave/increments/*/metadata.json',
  ':(exclude,glob).specweave/increments/*/reports/**',
  ':(exclude,glob).specweave/increments/*/handoff.md',
  ':(exclude,glob).specweave/increments/*/handoff.diff',
  ':(exclude,glob).specweave/intents/**',
  ':(exclude,glob).specweave/state/**',
  ':(exclude,glob).specweave/logs/**',
];

/** Total Git budget leaves headroom below PreCompact's five-second budget. */
export const GIT_CAPTURE_BUDGET_MS = 3500;

/** Capture through a private index; an interrupted hook never stages user files. */
export function captureGitState(repoRoot: string, diffOutputPath: string, opts: { strict?: boolean; maxDiffBytes?: number } = {}): GitState {
  const empty: GitState = {
    isGitRepo: false, branch: '', shortSha: '', statusPorcelain: '',
    diffStat: '', hasUncommittedChanges: false,
  };
  const deadline = Date.now() + GIT_CAPTURE_BUDGET_MS;
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  function git(args: string[], trim = true, required = true): string | null {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      if (opts.strict) throw new Error('checkpoint Git capture budget exceeded');
      return null;
    }
    try {
      const result = execFileSync('git', args, {
        cwd: repoRoot, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024, timeout: remaining, killSignal: 'SIGKILL',
      });
      return trim ? result.trim() : result;
    } catch (error) {
      // Missing HEAD/upstream are normal. Timeouts and required commands are not.
      if (opts.strict && (required || (error as { status?: number }).status !== 128 ||
        (error as { signal?: string }).signal || typeof (error as NodeJS.ErrnoException).code === 'string')) {
        throw new Error('checkpoint Git capture failed');
      }
      return null;
    }
  }
  function writeDiff(content: string): void {
    if (!opts.strict) { safeWriteDiff(diffOutputPath, content); return; }
    fs.mkdirSync(path.dirname(diffOutputPath), { recursive: true });
    fs.writeFileSync(diffOutputPath, content, 'utf8');
  }
  let temporary: string | undefined;
  try {
    if (git(['rev-parse', '--is-inside-work-tree'], true, fs.existsSync(path.join(repoRoot, '.git'))) !== 'true') {
      writeDiff('');
      return empty;
    }
    const indexPath = git(['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    if (!indexPath) { writeDiff(''); return empty; }
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-handoff-index-'));
    const privateIndex = path.join(temporary, 'index');
    if (fs.existsSync(indexPath)) fs.copyFileSync(indexPath, privateIndex);
    Object.assign(env, { GIT_INDEX_FILE: privateIndex });

    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], true, false) ?? '';
    const shortSha = git(['rev-parse', '--short', 'HEAD'], true, false) ?? '';
    const scope = ['--', '.', ...BOOKKEEPING_PATHSPECS];
    const statusPorcelain = git(['status', '--porcelain', ...scope]) ?? '';
    // NUL-delimited paths handle spaces, quotes, Unicode and embedded newlines.
    const untracked = (git(['ls-files', '--others', '--exclude-standard', '-z'], false) ?? '')
      .split('\0').filter(Boolean);
    if (untracked.length) git(['add', '-N', '--', ...untracked]);
    const hasHead = shortSha !== '';
    const working = ['diff', '--no-ext-diff', '--no-textconv', ...(hasHead ? ['HEAD'] : [])];
    const staged = ['diff', '--no-ext-diff', '--no-textconv', '--cached'];
    const workingDiff = git([...working, ...scope]) ?? '';
    const stagedDiff = (hasHead ? git([...staged, ...scope]) : '') ?? '';
    const workingStat = git([...working, '--stat', ...scope]) ?? '';
    const stagedStat = (hasHead ? git([...staged, '--stat', ...scope]) : '') ?? '';
    const whole = [workingDiff, stagedDiff].filter(Boolean).join('\n');
    const { text: diffText, cap: diffCap } = opts.maxDiffBytes ? capDiff(whole, opts.maxDiffBytes) : { text: whole, cap: undefined };
    writeDiff(diffText);
    const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], true, false) ?? '';
    const aheadRaw = upstream ? git(['rev-list', '--count', `${upstream}..HEAD`]) : null;
    if (opts.strict && Date.now() > deadline) throw new Error('checkpoint Git capture budget exceeded');
    return {
      isGitRepo: true, branch, shortSha, statusPorcelain,
      diffStat: [workingStat, stagedStat].filter(Boolean).join('\n'),
      hasUncommittedChanges: statusPorcelain.length > 0,
      upstream,
      ahead: aheadRaw !== null && aheadRaw !== '' ? Number(aheadRaw) : undefined,
      ...(diffCap ? { diffCap } : {}),
    };
  } catch (error) {
    if (opts.strict) throw error;
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

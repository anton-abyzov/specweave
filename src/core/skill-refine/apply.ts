/**
 * Apply an approved diff to a SKILL.md file, commit the change, and record
 * the event in the ledger.
 *
 * AC-US2-04: writes the diff AND runs `git commit -m "refine(<skill>): <rationale>"`.
 *            NEVER pushes.
 * AC-US2-05: records the refinement in `.specweave/state/skill-refinements.json`.
 *
 * Git operations go through `execFileNoThrow` so arguments cannot be shell-
 * interpolated. If any step fails the SKILL.md is restored from the pre-diff
 * snapshot and no ledger entry is written.
 *
 * @module core/skill-refine/apply
 */

import { promises as fs } from 'fs';
import { mkdtemp, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, relative } from 'path';
import {
  execFileNoThrow,
  type ExecResult,
} from '../../utils/execFileNoThrow';
import { appendApplied, type RefinementLedgerEntry } from './ledger';

export interface ApplyOptions {
  /** Absolute path to the SKILL.md being refined. */
  skillPath: string;
  /** Unified diff from Haiku (or user-edited). */
  diff: string;
  /** Haiku-generated rationale (goes into commit message + ledger). */
  rationale: string;
  /** Signal IDs that motivated this refinement (for ledger provenance). */
  signalIds: string[];
  /** Target skill slug (e.g. `sw:architect`) — used in commit message + ledger. */
  targetSkill: string;
  /** Absolute path to `.specweave/state/skill-refinements.json`. */
  ledgerPath: string;
  /** Absolute path to the git repo that holds `skillPath`. */
  repoRoot: string;
  /** Optional override — defaults to `git config user.email` then 'unknown'. */
  author?: string;
  /** Injection seam for tests. Defaults to the real execFileNoThrow. */
  runGit?: (args: string[], cwd: string) => Promise<ExecResult>;
}

export interface ApplyResult {
  commitSha: string;
  ledgerEntry: RefinementLedgerEntry;
}

/**
 * Apply the diff + commit + record. Throws on any step failure; callers
 * translate the error into user-facing text.
 */
export async function applyRefinement(opts: ApplyOptions): Promise<ApplyResult> {
  if (!opts.diff.trim()) {
    throw new Error('applyRefinement: diff is empty — nothing to apply.');
  }

  const runGit = opts.runGit ?? ((args, cwd) => execFileNoThrow('git', args, { cwd }));

  // Snapshot SKILL.md for rollback.
  const snapshot = await fs.readFile(opts.skillPath, 'utf-8').catch(() => '');
  const hadFile = snapshot.length > 0;

  const patchPath = await writePatchTempfile(opts.diff);

  try {
    // Apply relative to the repo root so --- a/... / +++ b/... paths resolve.
    const apply = await runGit(
      ['apply', '--whitespace=nowarn', patchPath],
      opts.repoRoot,
    );
    if (!apply.success) {
      throw new Error(`git apply failed: ${apply.stderr || apply.stdout || 'unknown'}`);
    }

    // Stage only the target SKILL.md — never blanket-stage the repo.
    const relSkill = relative(opts.repoRoot, opts.skillPath);
    const add = await runGit(['add', '--', relSkill], opts.repoRoot);
    if (!add.success) {
      throw new Error(`git add failed: ${add.stderr || 'unknown'}`);
    }

    const commit = await runGit(
      [
        'commit',
        '-m',
        `refine(${opts.targetSkill}): ${truncateFirstLine(opts.rationale)}`,
      ],
      opts.repoRoot,
    );
    if (!commit.success) {
      throw new Error(`git commit failed: ${commit.stderr || commit.stdout || 'unknown'}`);
    }

    const revParse = await runGit(['rev-parse', 'HEAD'], opts.repoRoot);
    const commitSha = (revParse.stdout || '').trim() || 'unknown';

    const author =
      opts.author ?? (await resolveGitAuthor(opts.repoRoot, runGit));

    const ledgerEntry = await appendApplied(opts.ledgerPath, {
      targetSkill: opts.targetSkill,
      author,
      signalIds: opts.signalIds,
      diffSha: commitSha,
      rationale: opts.rationale,
    });

    return { commitSha, ledgerEntry };
  } catch (err) {
    // Restore pre-apply snapshot — never leave SKILL.md in a half-applied state.
    if (hadFile) {
      await fs.writeFile(opts.skillPath, snapshot, 'utf-8').catch(() => undefined);
    }
    throw err;
  } finally {
    await unlink(patchPath).catch(() => undefined);
  }
}

async function writePatchTempfile(diff: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'skill-refine-patch-'));
  const path = join(dir, 'diff.patch');
  // Ensure trailing newline — git apply is picky otherwise.
  const body = diff.endsWith('\n') ? diff : diff + '\n';
  await writeFile(path, body, 'utf-8');
  return path;
}

async function resolveGitAuthor(
  repoRoot: string,
  runGit: (args: string[], cwd: string) => Promise<ExecResult>,
): Promise<string> {
  const res = await runGit(['config', 'user.email'], repoRoot);
  if (res.success && res.stdout.trim()) return res.stdout.trim();
  return 'unknown';
}

function truncateFirstLine(text: string, max = 72): string {
  const firstLine = text.split('\n')[0] ?? '';
  return firstLine.length <= max ? firstLine : firstLine.slice(0, max - 1) + '…';
}

// helper for apply.ts consumers (re-exported for convenience)
export { dirname };

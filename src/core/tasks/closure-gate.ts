/**
 * Closure gate for `specweave complete` (2.0).
 *
 * The ONLY blocking check: `reports/verify.json` must exist with `ok: true`,
 * unless the caller supplies `--reason` (stored as metadata.closeReason).
 * Grill / code-review / judge-llm / rubric reports are optional evidence and
 * never block. A missing review, or a `fix first` verdict in the newest one,
 * produces a one-line notice.
 *
 * @module core/tasks/closure-gate
 */

import * as fs from 'fs';
import * as path from 'path';
import { readVerifyReport, describeUncheckedAcs, specDeclaresAcs } from './verify-runner.js';
import { loadTaskBoard } from './task-board.js';
import { parseVerdict } from '../review/reviewer.js';

export interface ClosureGateResult {
  ok: boolean;
  /** Blocking errors (empty when ok). */
  errors: string[];
  /** Non-blocking notices — things the reader may want to act on. */
  notices: string[];
  /**
   * Purely informational results. A PASSING verify belongs here, not in
   * `notices`: printing "verify ok" under a "⚠️ Warnings" header made a green
   * closure read like a problem report.
   */
  info: string[];
}

export function checkClosureGate(incrementDir: string, incrementId: string, opts: { reason?: string } = {}): ClosureGateResult {
  const errors: string[] = [];
  const notices: string[] = [];
  const info: string[] = [];
  const verify = readVerifyReport(incrementDir);
  const reason = opts.reason?.trim();

  if (!verify) {
    if (!reason) {
      errors.push(`reports/verify.json missing — run \`specweave verify ${incrementId}\` first, or pass --reason "<why closing without it>"`);
    } else {
      notices.push(`closing without verify.json — reason: ${reason}`);
    }
  } else if (!verify.ok) {
    // Say WHY it is not ok: failing commands and/or unticked acceptance
    // criteria. "not ok (failed)" sent people hunting for a broken test that
    // did not exist when the real blocker was 0 of 2 ACs.
    const parts: string[] = [];
    const failed = verify.commands.filter((c) => c.exit !== 0).map((c) => `${c.cmd} (exit ${c.exit})`).join(', ');
    if (failed) parts.push(failed);
    const unchecked = describeUncheckedAcs(verify.acs);
    if (unchecked) parts.push(unchecked);
    const why = parts.join('; ') || 'failed';
    if (!reason) {
      errors.push(`verify.json is not ok (${why}) — fix and re-run \`specweave verify ${incrementId}\`, or pass --reason`);
    } else {
      notices.push(`closing with failed verify (${why}) — reason: ${reason}`);
    }
  } else {
    info.push(`verify ok (${verify.ranAt}; ${verify.commands.length} command(s); ACs ${verify.acs.done}/${verify.acs.total})`);
    // Accepted skips close an AC without verifying it: name every one.
    const accepted = (verify.acs.items ?? []).filter((a) => a.acceptance === 'skipped-accepted').map((a) => a.id);
    if (accepted.length) info.push(`skipped (accepted), not verified: ${accepted.join(', ')} — see reports/verify.md`);
    const uncovered = (verify.acs.items ?? []).filter((a) => a.uncovered).map((a) => a.id);
    if (uncovered.length) notices.push(`${uncovered.join(', ')} closed by accepted skips with no task citing them — check no task cites them in a form the parser does not read`);
    // An `ok` report that still has open ACs can only come from a spec with no
    // AC lines at all, or a hand-edited verify.json. Say so out loud.
    const unchecked = describeUncheckedAcs(verify.acs);
    if (unchecked) notices.push(`${unchecked} — verify.json still reports ok; check reports/verify.json`);
  }

  // 0933: an increment with no acceptance criteria has no definition of done.
  if (fs.existsSync(path.join(incrementDir, 'spec.md')) && !specDeclaresAcs(incrementDir)) {
    if (!reason) {
      errors.push('spec.md declares no acceptance criteria — add `- [ ] AC-01: …` lines, or pass --reason "<why closing without them>"');
    } else {
      notices.push(`spec.md declares no acceptance criteria — closing anyway, reason: ${reason}`);
    }
  }

  try {
    const board = loadTaskBoard(incrementDir);
    const open = board.tasks.filter((t) => t.state.status !== 'done' && t.state.status !== 'skipped');
    if (open.length) notices.push(`${open.length} task(s) not done: ${open.map((t) => `${t.id} (${t.state.status})`).join(', ')}`);
  } catch {
    // tasks.md unreadable → nothing to add
  }

  notices.push(...reviewNotices(incrementDir));

  return { ok: errors.length === 0, errors, notices, info };
}

/**
 * Review notices: none on file, a `fix first` verdict in the newest
 * `reports/review*.md`, or no cross-model review while `review.crossModel` is on.
 */
function reviewNotices(incrementDir: string): string[] {
  const reportsDir = path.join(incrementDir, 'reports');
  const reviews = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir)
        .filter((f) => /^review(-[A-Za-z0-9._-]+)?\.md$/.test(f))
        .map((f) => ({ f, mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
    : [];
  if (!reviews.length) return ['no reports/review.md or review-<reviewer>.md — run sw-review (or `specweave review` for another model) before shipping user-facing work'];
  const notices: string[] = [];
  const newest = fs.readFileSync(path.join(reportsDir, reviews[0].f), 'utf8');
  if (parseVerdict(newest) === 'fix first') notices.push(`reports/${reviews[0].f} says fix first — fix its critical and high findings and review again`);
  if (crossModelRequired(incrementDir) && !reviews.some((r) => r.f.startsWith('review-'))) {
    notices.push('review.crossModel is on but no cross-model review is on file — run `specweave review`');
  }
  return notices;
}

function crossModelRequired(incrementDir: string): boolean {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(incrementDir, '..', '..', 'config.json'), 'utf-8')) as { review?: { crossModel?: unknown } };
    return cfg.review?.crossModel === true;
  } catch {
    return false;
  }
}

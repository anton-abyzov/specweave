/**
 * Closure gate for `specweave complete` (2.0).
 *
 * The ONLY blocking check: `reports/verify.json` must exist with `ok: true`,
 * unless the caller supplies `--reason` (stored as metadata.closeReason).
 * Grill / code-review / judge-llm / rubric reports are optional evidence and
 * never block. A missing `reports/review.md` produces a one-line notice.
 *
 * @module core/tasks/closure-gate
 */

import * as fs from 'fs';
import * as path from 'path';
import { readVerifyReport, describeUncheckedAcs } from './verify-runner.js';
import { loadTaskBoard } from './task-board.js';

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
    // An `ok` report that still has open ACs can only come from a spec with no
    // AC lines at all, or a hand-edited verify.json. Say so out loud.
    const unchecked = describeUncheckedAcs(verify.acs);
    if (unchecked) notices.push(`${unchecked} — verify.json still reports ok; check reports/verify.json`);
    if (verify.acs.total === 0) notices.push('spec.md declares no acceptance criteria — nothing was verified against');
  }

  try {
    const board = loadTaskBoard(incrementDir);
    const open = board.tasks.filter((t) => t.state.status !== 'done' && t.state.status !== 'skipped');
    if (open.length) notices.push(`${open.length} task(s) not done: ${open.map((t) => `${t.id} (${t.state.status})`).join(', ')}`);
  } catch {
    // tasks.md unreadable → nothing to add
  }

  if (!fs.existsSync(path.join(incrementDir, 'reports', 'review.md'))) {
    notices.push('no reports/review.md — consider running sw:review before shipping user-facing work');
  }

  return { ok: errors.length === 0, errors, notices, info };
}

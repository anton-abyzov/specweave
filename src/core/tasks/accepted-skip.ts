/**
 * Accepted skips — each AC's acceptance from spec.md, its tasks and the
 * ledger's `accept-skip` events.
 *
 * A person may accept skipping a named check of an AC that cannot be run (no
 * license, no installation). The ledger keeps who, when, why and their
 * authorization (see core/tasks/ledger.ts). An accepted skip is never
 * verification: it does not tick the AC, does not count toward `acs.done`,
 * and leaves every other requirement of the AC as it was.
 *
 *   met               ticked in spec.md, or met by its tasks, with no waiver
 *   mixed             met the same way, plus at least one accepted skip
 *   skipped-accepted  not met, at least one accepted skip, and no task that
 *                     cites the AC is still open, claimed, blocked or stale
 *   open              anything else; its accepted skips are still listed
 *
 * The ledger has no per-check pass receipt, so "every remaining check is
 * waived" is read as "nothing that covers the AC is unresolved". An AC that
 * no task cites has nothing to check that against, so a skipped-accepted one
 * is marked `uncovered`: `ac accept-skip` refuses it without `--uncovered`,
 * and verify names it (a task may cite the AC in a form the parser ignores).
 *
 * @module core/tasks/accepted-skip
 */

import type { AcceptedSkip } from './ledger.js';
import type { TaskBoard } from './task-board.js';
import type { AcEntry } from './verify-runner.js';

export type AcAcceptance = 'met' | 'mixed' | 'skipped-accepted' | 'open';

/** One accepted skip as the JSON outputs show it (the AC is the parent). */
export type AcWaiver = Omit<AcceptedSkip, 'ac'>;

export interface AcAcceptanceEntry extends AcEntry {
  acceptance: AcAcceptance;
  waivers: AcWaiver[];
  /** Skipped-accepted with no task citing the AC: the waivers alone closed it. */
  uncovered?: true;
}

/** How every surface labels a skipped-accepted AC. */
export const ACCEPTED_SKIP_LABEL = 'Accepted skip (not verified)';

const TERMINAL = new Set(['done', 'skipped']);

/**
 * Add `acceptance` and `waivers` to ACs already passed through deriveAcStatus.
 * `skips` defaults to the board's fold; pass the ledger's own list when there
 * is no board (an increment without tasks).
 */
export function deriveAcAcceptance(acs: AcEntry[], board: TaskBoard | null, skips: AcceptedSkip[] = board?.fold.acceptedSkips ?? []): AcAcceptanceEntry[] {
  return acs.map((a) => {
    const waivers = skips
      .filter((s) => s.ac === a.id.toUpperCase())
      .map(({ ac: _ac, ...w }) => w);
    const unresolved = (a.tasks ?? []).some((t) => !TERMINAL.has(t.status));
    const acceptance: AcAcceptance = a.done
      ? waivers.length ? 'mixed' : 'met'
      : waivers.length && !unresolved ? 'skipped-accepted' : 'open';
    const uncovered = acceptance === 'skipped-accepted' && !(a.tasks ?? []).length;
    return { ...a, acceptance, waivers, ...(uncovered ? { uncovered: true as const } : {}) };
  });
}

/** Whether an AC lets the increment close: met (alone or mixed) or skipped-accepted. */
export function acCloses(a: { done: boolean; acceptance?: AcAcceptance }): boolean {
  return a.done || a.acceptance === 'skipped-accepted';
}

/** ACs that still keep the increment from closing: neither met nor skipped-accepted. */
export function acsLeftToClose(acs: AcEntry[], board: TaskBoard | null): AcAcceptanceEntry[] {
  return deriveAcAcceptance(acs, board).filter((a) => !acCloses(a));
}

/** JSON shape of an AC for `task list --json` and `pickup --json`. */
export function acJson(a: AcAcceptanceEntry) {
  return { id: a.id, text: a.text, done: a.done, via: a.via ?? 'none', acceptance: a.acceptance, tasks: a.tasks ?? [], waivers: a.waivers, ...(a.uncovered ? { uncovered: true } : {}) };
}

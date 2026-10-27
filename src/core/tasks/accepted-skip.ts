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
 * waived" is read as "nothing that covers the AC is unresolved".
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
}

const TERMINAL = new Set(['done', 'skipped']);

/** Add `acceptance` and `waivers` to ACs already passed through deriveAcStatus. */
export function deriveAcAcceptance(acs: AcEntry[], board: TaskBoard | null): AcAcceptanceEntry[] {
  const skips = board?.fold.acceptedSkips ?? [];
  return acs.map((a) => {
    const waivers = skips
      .filter((s) => s.ac === a.id.toUpperCase())
      .map(({ ac: _ac, ...w }) => w);
    const unresolved = (a.tasks ?? []).some((t) => !TERMINAL.has(t.status));
    const acceptance: AcAcceptance = a.done
      ? waivers.length ? 'mixed' : 'met'
      : waivers.length && !unresolved ? 'skipped-accepted' : 'open';
    return { ...a, acceptance, waivers };
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
  return { id: a.id, text: a.text, done: a.done, via: a.via ?? 'none', acceptance: a.acceptance, tasks: a.tasks ?? [], waivers: a.waivers };
}

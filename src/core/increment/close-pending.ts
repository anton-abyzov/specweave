/**
 * Close-pending markers: increments whose last task was finished through the
 * CLI and that are not closed yet.
 *
 * `specweave task done` / `task skip` writes one when the board turns
 * all-terminal. The Stop hook reads the file to remind the session that
 * finished the work to verify and close (once per session), and drops an
 * entry once its increment is no longer active or the entry is older than
 * CLOSE_PENDING_MAX_AGE_MS (pickup's "/sw:done" hint covers it from then on).
 * The hook supervisor (plugins/specweave/hooks/run.mjs) only checks that the
 * file exists, so an empty marker is deleted rather than left behind.
 *
 * Every function here is best-effort: bookkeeping must never fail a command.
 *
 * @module core/increment/close-pending
 */

import * as fs from 'fs';
import * as path from 'path';

/** File name under `.specweave/state/`; run.mjs checks the same name. */
export const CLOSE_PENDING_FILE = 'close-pending.json';

/** After a day, the session that finished the work is gone; pickup takes over. */
export const CLOSE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ClosePendingEntry {
  /** When the last task turned done or skipped. */
  at: string;
  /** Sessions already reminded, so each is reminded once. */
  nudged?: string[];
}

export type ClosePending = Record<string, ClosePendingEntry>;

export function closePendingPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', CLOSE_PENDING_FILE);
}

/** The steps that close an increment, in the order the loop runs them. */
export function closeChain(id: string): string {
  return `specweave verify ${id}, a fresh-context review (sw-review in a subagent or new session), then specweave complete ${id}`;
}

export function readClosePending(projectRoot: string): ClosePending {
  try {
    const parsed = JSON.parse(fs.readFileSync(closePendingPath(projectRoot), 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: ClosePending = {};
    for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const { at, nudged } = entry as Record<string, unknown>;
      if (typeof at !== 'string') continue;
      out[id] = {
        at,
        ...(Array.isArray(nudged) ? { nudged: nudged.filter((s): s is string => typeof s === 'string') } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** Write the markers atomically; no entries removes the file. */
export function writeClosePending(projectRoot: string, data: ClosePending): void {
  const file = closePendingPath(projectRoot);
  try {
    if (Object.keys(data).length === 0) {
      fs.rmSync(file, { force: true });
      return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
  } catch { /* bookkeeping only */ }
}

/** Record that `id` has every task done or skipped and still needs closing. */
export function markClosePending(projectRoot: string, id: string, now: Date = new Date()): void {
  const data = readClosePending(projectRoot);
  // A fresh finish (say, a task added and done after an earlier close nudge)
  // reminds every session again.
  data[id] = { at: now.toISOString() };
  writeClosePending(projectRoot, data);
}

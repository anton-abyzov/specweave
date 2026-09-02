/**
 * Increment resolution shared by `task`, `verify`, `handoff`.
 *
 * - explicit id: short (`0874`) or full slug, via resolveIncrementId
 * - omitted: the SINGLE increment whose metadata.json status is in flight —
 *   anything that is not terminal or parked (so `planned`/`planning`,
 *   `active`, `in-progress`, `ready_for_review` all qualify; `completed`,
 *   `abandoned`, `archived`, `superseded`, `paused`, `backlog` do not)
 *   (2+ → error listing candidates; 0 → error). metadata.json is read directly
 *   (never lazily created).
 *
 * @module core/tasks/resolve-increment
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { loadTaskBoard } from './task-board.js';

export interface ResolvedIncrement {
  id: string;
  dir: string;
}

export class IncrementResolutionError extends Error {
  constructor(message: string, public readonly candidates: string[] = []) {
    super(message);
    this.name = 'IncrementResolutionError';
  }
}

/**
 * Statuses that are TERMINAL (or explicitly parked) — an increment in one of
 * these is never auto-resolved as "the increment I am working on".
 *
 * Everything else counts as work in flight, including the status a freshly
 * created increment carries (`planning` in 1.x, `planned` in 2.0). Before
 * 2.0 the set was an allow-list of `active`-ish values, so `task next`,
 * `verify` and `handoff` all failed immediately after `create-increment`
 * (the documented loop step 1 → step 2) and `handoff` silently fell back to
 * the un-tracked `.handoff/HANDOFF.md`.
 */
const TERMINAL_STATUSES = new Set([
  'completed',
  'complete',
  'done',
  'abandoned',
  'cancelled',
  'canceled',
  'archived',
  'superseded',
  'paused',
  'backlog',
]);

/** True when `status` is a work-in-flight status (see {@link TERMINAL_STATUSES}). */
export function isInFlightStatus(status: string | undefined): boolean {
  if (!status) return false;
  return !TERMINAL_STATUSES.has(status.trim().toLowerCase());
}

export function incrementsDir(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'increments');
}

/** Ids of increments whose metadata.json status is work-in-flight (read-only scan). */
export function listActiveIncrementIds(projectRoot: string): string[] {
  const dir = incrementsDir(projectRoot);
  if (!fs.existsSync(dir)) return [];
  const ids: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!/^\d{4}/.test(entry)) continue;
    const meta = path.join(dir, entry, 'metadata.json');
    if (!fs.existsSync(meta)) continue;
    try {
      const status = (JSON.parse(fs.readFileSync(meta, 'utf-8')) as { status?: string }).status;
      if (isInFlightStatus(status)) ids.push(entry);
    } catch {
      // unreadable metadata → not a candidate
    }
  }
  return ids.sort();
}

export function resolveIncrement(projectRoot: string, id?: string): ResolvedIncrement {
  if (id) {
    const resolved = resolveIncrementId(id, projectRoot);
    if (resolved === null) throw new IncrementResolutionError(`No increment found matching "${id}"`);
    if (Array.isArray(resolved)) {
      throw new IncrementResolutionError(
        `Ambiguous increment id "${id}":\n${resolved.map((r) => `  - ${r}`).join('\n')}`,
        resolved,
      );
    }
    return { id: resolved, dir: path.join(incrementsDir(projectRoot), resolved) };
  }
  const active = listActiveIncrementIds(projectRoot);
  if (active.length === 1) return { id: active[0], dir: path.join(incrementsDir(projectRoot), active[0]) };
  if (active.length === 0) {
    throw new IncrementResolutionError('No active increment. Pass an id (e.g. `specweave task list 0874`).');
  }
  throw new IncrementResolutionError(
    `Several active increments — pass one explicitly:\n${active.map((a) => `  - ${a}`).join('\n')}`,
    active,
  );
}

/** Lease hours from config (`tasks.leaseHours`), default 2. */
export function readLeaseHours(projectRoot: string): number {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf-8')) as {
      tasks?: { leaseHours?: number };
    };
    const h = cfg.tasks?.leaseHours;
    return typeof h === 'number' && h > 0 ? h : 2;
  } catch {
    return 2;
  }
}

/**
 * Active increments whose task board is finished (every task done or skipped,
 * and at least one task exists). This is the candidate set for
 * `specweave complete --all --reason "…"`.
 */
export function listTaskCompleteIncrementIds(projectRoot: string, leaseHours?: number): string[] {
  const dir = incrementsDir(projectRoot);
  return listActiveIncrementIds(projectRoot).filter((id) => {
    try {
      const board = loadTaskBoard(path.join(dir, id), { leaseHours });
      return board.counts.total > 0 && board.counts.done + board.counts.skipped === board.counts.total;
    } catch {
      return false;
    }
  });
}

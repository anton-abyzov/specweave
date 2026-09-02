/**
 * Increment resolution shared by `task`, `verify`, `handoff`.
 *
 * - explicit id: short (`0874`) or full slug, via resolveIncrementId
 * - omitted: the SINGLE increment whose metadata.json status is in flight
 *   (`active`, `in-progress`, `ready_for_review`). When nothing is in flight we
 *   fall back to the single `planned`/`backlog` increment, so an increment that
 *   has not been started yet still resolves (`task claim` starts it).
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

/** Statuses that count as "work in flight" for id resolution. */
const ACTIVE_STATUSES = new Set(['active', 'in-progress', 'ready_for_review', 'ready-for-review']);

/**
 * Statuses that are "not started yet". These resolve only when NOTHING is in
 * flight, so `specweave task next` works right after `create-increment
 * --planned` (and on 1.x increments that still say `planning`) instead of
 * dead-ending on "No active increment".
 */
const STARTABLE_STATUSES = new Set(['planned', 'planning', 'backlog']);

export function incrementsDir(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'increments');
}

function listIncrementIdsWithStatus(projectRoot: string, statuses: Set<string>): string[] {
  const dir = incrementsDir(projectRoot);
  if (!fs.existsSync(dir)) return [];
  const ids: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!/^\d{4}/.test(entry)) continue;
    const meta = path.join(dir, entry, 'metadata.json');
    if (!fs.existsSync(meta)) continue;
    try {
      const status = (JSON.parse(fs.readFileSync(meta, 'utf-8')) as { status?: string }).status;
      if (status && statuses.has(status.trim().toLowerCase())) ids.push(entry);
    } catch {
      // unreadable metadata → not a candidate
    }
  }
  return ids.sort();
}

/** Ids of increments whose metadata.json says `active` (read-only scan). */
export function listActiveIncrementIds(projectRoot: string): string[] {
  return listIncrementIdsWithStatus(projectRoot, ACTIVE_STATUSES);
}

/** Ids of increments that exist but have not been started (`planned`/`backlog`). */
export function listStartableIncrementIds(projectRoot: string): string[] {
  return listIncrementIdsWithStatus(projectRoot, STARTABLE_STATUSES);
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
  if (active.length > 1) {
    throw new IncrementResolutionError(
      `Several active increments — pass one explicitly:\n${active.map((a) => `  - ${a}`).join('\n')}`,
      active,
    );
  }

  // Nothing in flight: fall back to a single not-started increment.
  const startable = listStartableIncrementIds(projectRoot);
  if (startable.length === 1) {
    return { id: startable[0], dir: path.join(incrementsDir(projectRoot), startable[0]) };
  }
  if (startable.length > 1) {
    throw new IncrementResolutionError(
      `No active increment, and several are planned — pass one explicitly:\n${startable
        .map((a) => `  - ${a}`)
        .join('\n')}`,
      startable,
    );
  }
  throw new IncrementResolutionError(
    'No active increment. Create one with `specweave create-increment "<title>"`, ' +
      'or pass an id (e.g. `specweave task list 0001`).',
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

/**
 * Move a not-started increment (`planned`/`planning`/`backlog`) to `active`.
 *
 * Claiming a task IS starting the increment, so the CLI owns this transition —
 * the skills forbid hand-editing metadata.json, and before 2.0 there was no
 * command that performed it at all.
 *
 * Returns a one-line note when it transitioned, `undefined` when the increment
 * was already in flight (or metadata.json is missing/unreadable).
 */
export function ensureIncrementStarted(incrementDir: string): string | undefined {
  const metaPath = path.join(incrementDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) return undefined;
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return undefined; // corrupt metadata is not this command's problem
  }
  const status = typeof meta.status === 'string' ? meta.status.trim().toLowerCase() : '';
  if (!STARTABLE_STATUSES.has(status)) return undefined;
  meta.status = 'active';
  meta.lastActivity = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  return `Started ${path.basename(incrementDir)} (${status} → active)`;
}

/**
 * Increment resolution shared by `task`, `verify`, `handoff`.
 *
 * - explicit id: short (`0874`) or full slug, via resolveIncrementId
 * - omitted: the SINGLE increment whose metadata.json status is `active`
 *   (2+ → error listing candidates; 0 → error). metadata.json is read directly
 *   (never lazily created).
 *
 * @module core/tasks/resolve-increment
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';

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

export function incrementsDir(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'increments');
}

/** Ids of increments whose metadata.json says `active` (read-only scan). */
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
      if (status === 'active' || status === 'in-progress') ids.push(entry);
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

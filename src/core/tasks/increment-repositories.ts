/**
 * `metadata.repositories`: the repositories an increment changes (see
 * {@link IncrementMetadata.repositories}). Derived from task `Files` owners
 * and merged with entries a user declared. Raw read-modify-write of
 * metadata.json, like `touchIncrementUpdated`: it never validates, transitions
 * or syncs.
 *
 * @module core/tasks/increment-repositories
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TaskBoard } from './task-board.js';
import type { IncrementMetadata } from '../types/increment-metadata.js';
import { registeredRepositoryEntries, resolveFileOwner, toProjectPath, type RepositoryEntry } from './strict-close.js';

/** Owners of the board's `Files` entries, as project-relative paths. Unresolvable entries are skipped. */
export function deriveIncrementRepositories(root: string, board: TaskBoard, repos = registeredRepositoryEntries(root)): string[] {
  const owners = new Set<string>();
  for (const task of board.tasks) {
    for (const file of task.filesAffected ?? []) {
      const owner = resolveFileOwner(root, file, repos);
      if (owner && 'owner' in owner) owners.add(owner.owner);
    }
  }
  return [...owners].sort();
}

/** A registered id stays an id; anything else becomes a project-relative POSIX path. */
export function normalizeRepositoryRef(root: string, ref: string, repos: RepositoryEntry[] = registeredRepositoryEntries(root)): string {
  const value = ref.trim();
  if (!value) throw new Error('Repository entry is empty');
  if (repos.some((repo) => repo.id === value)) return value;
  if (path.posix.isAbsolute(value.replace(/\\/g, '/')) || path.win32.isAbsolute(value)) {
    throw new Error(`Declare the repository relative to the project root or by registered id: ${ref}`);
  }
  const rel = toProjectPath(root, value);
  if (!rel) throw new Error('The project root is implied; list only other repositories');
  return rel;
}

export function readIncrementRepositories(incrementDir: string): string[] {
  const meta = readMeta(incrementDir);
  const list = meta?.repositories;
  return Array.isArray(list) ? list.filter((r): r is string => typeof r === 'string' && !!r.trim()) : [];
}

/**
 * Write `repositories` as the union of `declared` and the board's Files
 * owners. Entries naming the same repository (id and path) collapse to one.
 * Returns the list written, or undefined when metadata.json is missing or
 * unchanged.
 */
export function writeIncrementRepositories(root: string, incrementDir: string, declared: string[], board?: TaskBoard): string[] | undefined {
  const meta = readMeta(incrementDir);
  if (!meta) return undefined;
  const repos = registeredRepositoryEntries(root);
  const pathOf = (ref: string) => repos.find((repo) => repo.id === ref)?.path ?? ref;
  const byPath = new Map<string, string>();
  for (const ref of [...declared.map((r) => normalizeRepositoryRef(root, r, repos)), ...(board ? deriveIncrementRepositories(root, board, repos) : [])]) {
    const key = pathOf(ref);
    if (!byPath.has(key)) byPath.set(key, ref);
  }
  const next = [...byPath.values()].sort();
  const current = Array.isArray(meta.repositories) ? meta.repositories : [];
  if (JSON.stringify(current) === JSON.stringify(next)) return undefined;
  if (next.length) meta.repositories = next;
  else delete meta.repositories;
  const file = path.join(incrementDir, 'metadata.json');
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  fs.renameSync(`${file}.tmp`, file);
  return next;
}

/** Add the board's Files owners to `repositories`. Best-effort: never fails a task command. */
export function refreshIncrementRepositories(root: string, incrementDir: string, board: TaskBoard): void {
  try {
    writeIncrementRepositories(root, incrementDir, readIncrementRepositories(incrementDir), board);
  } catch { /* A malformed hand-declared entry must not block task bookkeeping. */ }
}

function readMeta(incrementDir: string): (Partial<IncrementMetadata> & Record<string, unknown>) | undefined {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(incrementDir, 'metadata.json'), 'utf-8'));
    return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : undefined;
  } catch { return undefined; }
}

/**
 * Supersede: mark an increment as replaced by a newer one.
 *
 * `specweave create-increment --supersedes NNNN` records the relationship on
 * both sides: the new increment gets `supersedes: <old id>`, the old one moves
 * to `abandoned` with `closeReason: "superseded by <new id>"`.
 *
 * @module core/tasks/supersede
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { IncrementStatus } from '../types/increment-metadata.js';

export interface SupersedeResult {
  ok: boolean;
  /** Full folder name of the superseded increment (when resolved). */
  resolved?: string;
  message: string;
}

function metadataPath(projectRoot: string, incrementId: string): string {
  return path.join(projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
}

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function writeJson(file: string, value: unknown): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, file);
}

/**
 * Abandon `oldIdInput` (short or full id) in favour of `newIncrementId`, and
 * record `supersedes` on the new increment's metadata. Idempotent: re-running
 * on an already-abandoned increment only refreshes the closeReason.
 */
export function supersedeIncrement(projectRoot: string, oldIdInput: string, newIncrementId: string): SupersedeResult {
  const resolved = resolveIncrementId(oldIdInput, projectRoot);
  if (resolved === null) {
    return { ok: false, message: `--supersedes: no increment matches "${oldIdInput}"` };
  }
  if (Array.isArray(resolved)) {
    return { ok: false, message: `--supersedes: "${oldIdInput}" is ambiguous (${resolved.join(', ')})` };
  }
  if (resolved === newIncrementId) {
    return { ok: false, message: `--supersedes: an increment cannot supersede itself (${resolved})` };
  }

  const oldFile = metadataPath(projectRoot, resolved);
  const oldMeta = readJson(oldFile);
  if (!oldMeta) {
    return { ok: false, resolved, message: `--supersedes: ${resolved} has no readable metadata.json` };
  }

  const now = new Date().toISOString();
  const reason = `superseded by ${newIncrementId}`;
  oldMeta.status = IncrementStatus.ABANDONED;
  oldMeta.closeReason = reason;
  oldMeta.abandonedReason = reason;
  oldMeta.abandonedAt = (oldMeta.abandonedAt as string) || now;
  oldMeta.lastActivity = now;
  writeJson(oldFile, oldMeta);

  const newFile = metadataPath(projectRoot, newIncrementId);
  const newMeta = readJson(newFile);
  if (newMeta) {
    newMeta.supersedes = resolved;
    newMeta.lastActivity = now;
    writeJson(newFile, newMeta);
  }

  return { ok: true, resolved, message: `${resolved} → abandoned (${reason})` };
}

/** Record `parent` on an increment's metadata (no change on the parent side). */
export function setParentIncrement(projectRoot: string, incrementId: string, parentInput: string): SupersedeResult {
  const resolved = resolveIncrementId(parentInput, projectRoot);
  if (resolved === null) return { ok: false, message: `--parent: no increment matches "${parentInput}"` };
  if (Array.isArray(resolved)) return { ok: false, message: `--parent: "${parentInput}" is ambiguous (${resolved.join(', ')})` };
  if (resolved === incrementId) return { ok: false, message: `--parent: an increment cannot be its own parent (${resolved})` };

  const file = metadataPath(projectRoot, incrementId);
  const meta = readJson(file);
  if (!meta) return { ok: false, resolved, message: `--parent: ${incrementId} has no readable metadata.json` };
  meta.parent = resolved;
  meta.lastActivity = new Date().toISOString();
  writeJson(file, meta);
  return { ok: true, resolved, message: `parent: ${resolved}` };
}

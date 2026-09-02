/**
 * `metadata.updated` bookkeeping.
 *
 * The 2.0 metadata shape carries `updated` — "when did this increment last
 * move". Before this, the only timestamp was `lastActivity`, and it was
 * touched exclusively by status transitions: a whole session of `task claim` /
 * `task done` / `task skip` left it frozen at the creation time, so `status`
 * and any staleness heuristic read as "nothing happened here in days".
 *
 * Ledger appends go through {@link touchIncrementUpdated}, which is a raw
 * read-modify-write of metadata.json (NOT MetadataManager) on purpose: it must
 * not validate, must not transition, must not fire sync triggers, and must
 * never make a task command fail.
 *
 * @module core/tasks/increment-updated
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Stamp `updated` (and the legacy `lastActivity` mirror) on the increment's
 * metadata.json. Best-effort: any error is swallowed — losing a timestamp must
 * never lose a ledger event.
 *
 * @param incrementDir - increment folder (the one holding metadata.json)
 * @param at - ISO timestamp to stamp (defaults to now)
 * @returns true when metadata.json was rewritten
 */
export function touchIncrementUpdated(incrementDir: string, at: string = new Date().toISOString()): boolean {
  const metaPath = path.join(incrementDir, 'metadata.json');
  try {
    if (!fs.existsSync(metaPath)) return false;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, unknown>;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
    meta.updated = at;
    meta.lastActivity = at;
    const tmp = `${metaPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, metaPath);
    return true;
  } catch {
    return false;
  }
}

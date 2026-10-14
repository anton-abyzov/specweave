/** Resolve a full ID, exact numeric alias, or immutable UUID without prefix guessing. */
import * as fs from 'fs';
import * as path from 'path';
import { compareIncrementIds, matchIncrementIds, parseIncrementId } from './increment-id-validator.js';

export function resolveIncrementId(incrementId: string, projectRoot: string): string | string[] | null {
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  let entries: string[];
  try {
    entries = fs.readdirSync(incrementsDir)
      .filter((entry) => parseIncrementId(entry, { allowLegacy: true }) && fs.statSync(path.join(incrementsDir, entry)).isDirectory());
  } catch { return null; }
  const exact = entries.find((entry) => entry === incrementId);
  if (exact) return exact;
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(incrementId);
  const matches = !uuid ? matchIncrementIds(entries, incrementId) : entries.filter((entry) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(incrementsDir, entry, 'metadata.json'), 'utf8')).uuid?.toLowerCase() === incrementId.toLowerCase();
    } catch { return false; }
  }).sort(compareIncrementIds);
  return matches.length === 0 ? null : matches.length === 1 ? matches[0] : matches;
}

/**
 * State directory cleanup utility (v1.0.254)
 *
 * Removes orphaned marker files from .specweave/state/ that accumulate
 * over time and are never cleaned up. These don't cause functional issues
 * but contribute to state directory bloat.
 *
 * Called from session-start hook to run once per session.
 *
 * @module utils/state-cleanup
 */

import * as fs from 'fs';
import * as path from 'path';

/** Patterns of orphaned marker files to clean up */
const ORPHAN_PATTERNS = [
  /^\.prev-status-/,
  /^\.github-sync-/,
  /^\.living-specs-/,
];

/** Files older than this (in ms) are eligible for cleanup */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Remove orphaned state marker files older than 7 days.
 *
 * @param stateDir - Path to .specweave/state/ directory
 * @returns Number of files removed
 */
export function cleanOrphanedStateFiles(stateDir: string): number {
  if (!fs.existsSync(stateDir)) return 0;

  let removed = 0;
  const now = Date.now();

  try {
    const entries = fs.readdirSync(stateDir);
    for (const entry of entries) {
      // Check if filename matches any orphan pattern
      const isOrphan = ORPHAN_PATTERNS.some(pattern => pattern.test(entry));
      if (!isOrphan) continue;

      const filePath = path.join(stateDir, entry);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        const age = now - stat.mtimeMs;
        if (age > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch {
        // Skip files we can't stat or delete
      }
    }
  } catch {
    // Directory read failed — not critical
  }

  return removed;
}

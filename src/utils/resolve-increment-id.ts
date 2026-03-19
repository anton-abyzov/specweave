/**
 * Resolve Increment ID Utility
 *
 * Resolves a potentially short increment ID (e.g., "0589") to the full
 * directory name (e.g., "0589-cli-complete-improvements") by matching
 * against .specweave/increments/ entries.
 *
 * Supports:
 * - Exact match: "0589-cli-complete-improvements" → same
 * - Prefix match: "0589" → "0589-cli-complete-improvements"
 * - Ambiguous match: "0573" → ["0573-fix-a", "0573-fix-b"]
 * - No match: "9999" → null
 *
 * @module utils/resolve-increment-id
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve a potentially short increment ID to the full directory name.
 *
 * @param incrementId - Short or full increment ID
 * @param projectRoot - Project root directory containing .specweave/
 * @returns Full increment directory name (string), array of matches (string[]) if ambiguous, or null if not found
 */
export function resolveIncrementId(
  incrementId: string,
  projectRoot: string
): string | string[] | null {
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  if (!fs.existsSync(incrementsDir)) {
    return null;
  }

  // Check for exact match first
  const exactPath = path.join(incrementsDir, incrementId);
  if (fs.existsSync(exactPath)) {
    return incrementId;
  }

  // Try prefix match
  let entries: string[];
  try {
    entries = fs.readdirSync(incrementsDir);
  } catch {
    return null;
  }

  const matches = entries.filter((e) => e.startsWith(incrementId));

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // Ambiguous — multiple matches
  return matches.sort();
}

/**
 * Shared semver comparison utility for plugin version directory sorting.
 *
 * Handles non-numeric segments (e.g., "1.0.0-beta") by treating NaN as 0,
 * and sorts in descending order so the latest version comes first.
 *
 * @since 1.0.540
 */

/**
 * Parse a version segment to a number, returning 0 for NaN values.
 */
function safeParseInt(segment: string): number {
  const n = Number(segment);
  return isNaN(n) ? 0 : n;
}

/**
 * Compare two semver-like version strings in descending order.
 * Returns negative if `a` should come first (a > b).
 *
 * Handles:
 * - Standard semver: "1.0.0", "2.3.1"
 * - Non-numeric segments: "1.0.0-beta" → NaN segment treated as 0
 * - Missing segments: "1.0" vs "1.0.0" → missing treated as 0
 */
export function compareSemverDesc(a: string, b: string): number {
  const ap = a.split('.').map(safeParseInt);
  const bp = b.split('.').map(safeParseInt);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const diff = (bp[i] || 0) - (ap[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

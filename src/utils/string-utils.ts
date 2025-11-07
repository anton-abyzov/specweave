/**
 * String Utilities
 *
 * Utilities for string manipulation and formatting
 */

/**
 * Convert a string to kebab-case (lowercase with hyphens)
 *
 * Examples:
 * - "Platform Engineering Team" → "platform-engineering-team"
 * - "FRONTEND" → "frontend"
 * - "League Scheduler Team" → "league-scheduler-team"
 *
 * @param str - Input string to slugify
 * @returns Kebab-case string suitable for folder names
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

/**
 * Parse comma-separated values and trim whitespace
 *
 * Examples:
 * - "Team A, Team B, Team C" → ["Team A", "Team B", "Team C"]
 * - "FRONTEND,BACKEND,QA" → ["FRONTEND", "BACKEND", "QA"]
 *
 * @param input - Comma-separated string
 * @returns Array of trimmed strings (empty strings removed)
 */
export function parseCommaSeparated(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Convert kebab-case to Title Case
 *
 * Examples:
 * - "platform-engineering-team" → "Platform Engineering Team"
 * - "frontend" → "Frontend"
 *
 * @param str - Kebab-case string
 * @returns Title Case string
 */
export function unslugify(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

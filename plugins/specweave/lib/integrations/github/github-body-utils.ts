/**
 * Shared utilities for GitHub issue body fingerprinting, extraction,
 * and normalization. Used by the AC comment poster and feature sync
 * to deduplicate progress comments and skip no-op edits.
 *
 * Fingerprint format: `<!-- sw-progress:N/M -->` (HTML comment,
 * invisible in rendered Markdown, consistent with JIRA fingerprint
 * pattern in jira-status-sync.ts).
 *
 * @module github-body-utils
 */

/**
 * Build an HTML comment fingerprint for the current AC progress state.
 *
 * @param completed - Number of completed acceptance criteria
 * @param total - Total number of acceptance criteria
 * @returns HTML comment string, e.g. `<!-- sw-progress:3/5 -->`
 */
export function buildFingerprint(completed: number, total: number): string {
  return `<!-- sw-progress:${completed}/${total} -->`;
}

/**
 * Extract the progress fingerprint value from a block of text.
 * Returns the `N/M` portion if found, or `null` if no fingerprint is present.
 *
 * @param text - Text to search (e.g. a GitHub comment body)
 * @returns The fingerprint value like `"3/5"`, or `null`
 */
export function extractFingerprint(text: string): string | null {
  const match = text.match(/<!-- sw-progress:(\d+\/\d+) -->/);
  return match ? match[1] : null;
}

/**
 * Normalize a GitHub issue body for comparison purposes.
 * - Strips trailing whitespace from each line
 * - Collapses multiple consecutive blank lines into a single blank line
 * - Trims leading/trailing whitespace from the entire body
 *
 * @param body - Raw issue body text
 * @returns Normalized body string
 */
export function normalizeIssueBody(body: string): string {
  return body
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

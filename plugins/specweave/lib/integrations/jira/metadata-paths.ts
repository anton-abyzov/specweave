/**
 * Canonical Metadata Paths for JIRA Issue Keys
 *
 * Single source of truth for reading/writing JIRA issue keys in metadata.
 * All plugin files MUST use these helpers instead of direct property access.
 *
 * Canonical path: external_sync.jira.issueKey
 * Legacy paths (read-only fallback): jira.issue, jira.issueKey
 *
 * @module metadata-paths
 */

/** Canonical dot-path for JIRA issue key in metadata */
export const CANONICAL_JIRA_KEY_PATH = 'external_sync.jira.issueKey';

/**
 * Read JIRA issue key from metadata, checking canonical path first
 * then falling back to legacy paths for backward compatibility.
 */
export function readIssueKey(metadata: any): string | null {
  if (!metadata) return null;

  // Canonical path (preferred)
  const canonical = metadata?.external_sync?.jira?.issueKey;
  if (canonical) return canonical;

  // Legacy path: .jira.issue
  const legacyIssue = metadata?.jira?.issue;
  if (legacyIssue) return legacyIssue;

  // Legacy path: .jira.issueKey
  const legacyKey = metadata?.jira?.issueKey;
  if (legacyKey) return legacyKey;

  return null;
}

/**
 * Write JIRA issue key to the canonical metadata path.
 * Creates intermediate objects if needed.
 */
export function writeIssueKey(metadata: any, key: string): any {
  if (!metadata) metadata = {};
  if (!metadata.external_sync) metadata.external_sync = {};
  if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
  metadata.external_sync.jira.issueKey = key;
  return metadata;
}

/**
 * Migrate legacy metadata paths to canonical path.
 * Reads from legacy, writes to canonical, optionally cleans up legacy keys.
 */
export function migrateToCanonical(metadata: any, cleanup: boolean = false): any {
  if (!metadata) return metadata;

  const existingKey = readIssueKey(metadata);
  if (!existingKey) return metadata;

  // Write to canonical
  writeIssueKey(metadata, existingKey);

  // Optionally remove legacy paths
  if (cleanup) {
    if (metadata.jira?.issue) delete metadata.jira.issue;
    if (metadata.jira?.issueKey) delete metadata.jira.issueKey;
    if (metadata.jira && Object.keys(metadata.jira).length === 0) {
      delete metadata.jira;
    }
  }

  return metadata;
}

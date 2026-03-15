/**
 * Branch Name Builder
 *
 * Composes git branch names for increment branches with optional
 * external ticket key prefix (JIRA/ADO).
 *
 * @module core/cicd/branch-utils
 */

import { resolveExternalBranchPrefix } from '../../sync/pr-linker.js';

export interface BranchNameOptions {
  /** Branch name prefix. Default: 'sw/' */
  branchPrefix?: string;
  /** Include external ticket key as prefix. Default: false */
  includeExternalKey?: boolean;
}

/**
 * Build branch name for an increment, optionally prefixed with external ticket key.
 *
 * When includeExternalKey is true and metadata contains a JIRA/ADO reference:
 *   - JIRA: "PROJ-123/sw/0521-smart-linking"
 *   - ADO:  "AB#123/sw/0521-smart-linking"
 *
 * Otherwise falls back to standard format: "sw/0521-smart-linking"
 *
 * @param incrementId - Increment ID (e.g., "0521-smart-linking")
 * @param metadata - Increment metadata.json contents (or null)
 * @param options - Branch naming options from GitConfig
 */
export function buildBranchName(
  incrementId: string,
  metadata: any | null,
  options: BranchNameOptions = {}
): string {
  const prefix = options.branchPrefix ?? 'sw/';
  const baseName = `${prefix}${incrementId}`;

  if (!options.includeExternalKey || !metadata) {
    return baseName;
  }

  const externalKey = resolveExternalBranchPrefix(metadata);
  if (!externalKey) {
    return baseName;
  }

  return `${externalKey}/${baseName}`;
}

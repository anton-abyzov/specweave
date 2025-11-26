/**
 * Sync Metadata Management
 *
 * Tracks last import timestamps per platform to support incremental imports
 * and prevent duplicate imports.
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';

/**
 * Platform-specific sync metadata
 */
export interface PlatformSyncMetadata {
  /** Timestamp of last successful import */
  lastImport: string;

  /** Total items imported in last sync */
  lastImportCount?: number;

  /** Total items skipped as duplicates in last sync */
  lastSkippedCount?: number;

  /** Last sync result (success, partial, failed) */
  lastSyncResult?: 'success' | 'partial' | 'failed';
}

/**
 * Sync metadata for all platforms
 */
export interface SyncMetadata {
  /** GitHub sync metadata */
  github?: PlatformSyncMetadata;

  /** JIRA sync metadata */
  jira?: PlatformSyncMetadata;

  /** Azure DevOps sync metadata */
  ado?: PlatformSyncMetadata;

  /** Last updated timestamp */
  lastUpdated?: string;
}

/**
 * Default sync metadata file path relative to project root
 */
export const SYNC_METADATA_FILE = '.specweave/sync-metadata.json';

/**
 * Load sync metadata from file
 *
 * @param projectRoot - Project root directory
 * @returns Sync metadata or empty object if file doesn't exist
 */
export function loadSyncMetadata(projectRoot: string): SyncMetadata {
  const metadataPath = path.join(projectRoot, SYNC_METADATA_FILE);

  if (!fs.existsSync(metadataPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content) as SyncMetadata;
  } catch (error: any) {
    throw new Error(`Failed to load sync metadata from ${metadataPath}: ${error.message}`);
  }
}

/**
 * Validate that projectRoot is a valid SpecWeave project
 * CRITICAL: Prevents creating .specweave/ in wrong directories
 *
 * @param projectRoot - Directory to validate
 * @throws Error if not a valid SpecWeave project
 */
function validateProjectRoot(projectRoot: string): void {
  const specweavePath = path.join(projectRoot, '.specweave');

  // .specweave/ must already exist - we should NEVER create it from sync code
  if (!fs.existsSync(specweavePath)) {
    throw new Error(
      `SAFETY CHECK FAILED: Cannot write sync metadata to ${projectRoot}\n` +
        `.specweave/ folder does not exist. This is likely a bug - sync code ` +
        `received wrong projectRoot (possibly process.cwd() from wrong directory).\n` +
        `Expected: A directory with existing .specweave/ folder.\n` +
        `Got: ${projectRoot}`
    );
  }

  // Additional check: must be a directory, not a file
  const stats = fs.statSync(specweavePath);
  if (!stats.isDirectory()) {
    throw new Error(
      `SAFETY CHECK FAILED: ${specweavePath} exists but is not a directory`
    );
  }
}

/**
 * Update sync metadata for a platform
 *
 * @param projectRoot - Project root directory
 * @param platform - Platform to update (github, jira, ado)
 * @param metadata - Platform-specific metadata to update
 */
export function updateSyncMetadata(
  projectRoot: string,
  platform: 'github' | 'jira' | 'ado',
  metadata: PlatformSyncMetadata
): void {
  // CRITICAL: Validate projectRoot before writing anything
  validateProjectRoot(projectRoot);

  const metadataPath = path.join(projectRoot, SYNC_METADATA_FILE);

  // Load existing metadata
  const existingMetadata = loadSyncMetadata(projectRoot);

  // Update platform-specific metadata
  const updatedMetadata: SyncMetadata = {
    ...existingMetadata,
    [platform]: metadata,
    lastUpdated: new Date().toISOString(),
  };

  // Directory already validated to exist, but ensure subdirectory exists
  const metadataDir = path.dirname(metadataPath);
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }

  // Write updated metadata
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to write sync metadata to ${metadataPath}: ${error.message}`);
  }
}

/**
 * Get last import timestamp for a platform
 *
 * @param projectRoot - Project root directory
 * @param platform - Platform to query
 * @returns ISO timestamp of last import, or undefined if never imported
 */
export function getLastImportTimestamp(
  projectRoot: string,
  platform: 'github' | 'jira' | 'ado'
): string | undefined {
  const metadata = loadSyncMetadata(projectRoot);
  return metadata[platform]?.lastImport;
}

/**
 * Check if platform has been imported before
 *
 * @param projectRoot - Project root directory
 * @param platform - Platform to check
 * @returns True if platform has been imported at least once
 */
export function hasPlatformBeenImported(
  projectRoot: string,
  platform: 'github' | 'jira' | 'ado'
): boolean {
  const timestamp = getLastImportTimestamp(projectRoot, platform);
  return timestamp !== undefined;
}

/**
 * Clear sync metadata for a platform (useful for testing or reset)
 *
 * @param projectRoot - Project root directory
 * @param platform - Platform to clear
 */
export function clearPlatformMetadata(
  projectRoot: string,
  platform: 'github' | 'jira' | 'ado'
): void {
  // CRITICAL: Validate projectRoot before writing anything
  validateProjectRoot(projectRoot);

  const metadataPath = path.join(projectRoot, SYNC_METADATA_FILE);
  const existingMetadata = loadSyncMetadata(projectRoot);

  // Remove platform metadata
  const { [platform]: _, ...remainingMetadata } = existingMetadata;

  // Write updated metadata
  const updatedMetadata: SyncMetadata = {
    ...remainingMetadata,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');
}

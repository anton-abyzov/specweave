/**
 * ImportState - State persistence for resumable imports
 *
 * Features:
 * - Save/load import progress
 * - 24-hour TTL for stale state cleanup
 * - Error tracking for retry logic
 *
 * @module core/progress/import-state
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdirpSync } from '../../utils/fs-native.js';
import { getProjectRoot } from '../../utils/find-project-root.js';

/**
 * Import error record
 */
export interface ImportError {
  /** Item identifier (e.g., project key) */
  id: string;
  /** Error message */
  error: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Import state structure
 */
export interface ImportState {
  /** Total number of items to import */
  total: number;
  /** Number of items completed (success + failed) */
  completed: number;
  /** Number of successful imports */
  succeeded: number;
  /** Number of failed imports */
  failed: number;
  /** Array of import errors */
  errors: ImportError[];
  /** Timestamp when state was saved */
  timestamp: number;
  /** Whether import was canceled by user */
  canceled: boolean;
  /** Optional: Last successfully processed item ID */
  lastProcessedId?: string;
}

/**
 * Get import state file path
 *
 * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
 * accessing wrong .specweave folder when CWD != project root.
 *
 * @param projectRoot Project root directory
 * @returns Path to import-state.json
 */
function getStateFilePath(projectRoot: string = getProjectRoot()): string {
  return join(projectRoot, '.specweave', 'cache', 'import-state.json');
}

/**
 * Save import state to disk
 *
 * @param state Import state to save
 * @param projectRoot Project root directory
 */
export async function saveImportState(
  state: ImportState,
  projectRoot: string = getProjectRoot()
): Promise<void> {
  const stateFilePath = getStateFilePath(projectRoot);
  const cacheDir = join(projectRoot, '.specweave', 'cache');

  // Ensure cache directory exists
  mkdirpSync(cacheDir);

  // Add timestamp
  const stateWithTimestamp: ImportState = {
    ...state,
    timestamp: Date.now(),
  };

  // Write to file
  await fs.writeFile(stateFilePath, JSON.stringify(stateWithTimestamp, null, 2), 'utf-8');
}

/**
 * Load import state from disk with TTL validation
 *
 * @param projectRoot Project root directory
 * @param ttlMs Time-to-live in milliseconds (default: 24 hours)
 * @returns Import state if valid, null if expired or missing
 */
export async function loadImportState(
  projectRoot: string = getProjectRoot(),
  ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<ImportState | null> {
  const stateFilePath = getStateFilePath(projectRoot);

  // Check if file exists
  if (!existsSync(stateFilePath)) {
    return null;
  }

  try {
    // Read and parse file
    const content = await fs.readFile(stateFilePath, 'utf-8');
    const state: ImportState = JSON.parse(content);

    // Validate TTL
    const age = Date.now() - state.timestamp;
    if (age > ttlMs) {
      // State is expired, delete it
      await deleteImportState(projectRoot);
      return null;
    }

    return state;
  } catch (error) {
    // Invalid JSON or read error
    return null;
  }
}

/**
 * Delete import state file
 *
 * @param projectRoot Project root directory
 */
export async function deleteImportState(projectRoot: string = getProjectRoot()): Promise<void> {
  const stateFilePath = getStateFilePath(projectRoot);

  if (existsSync(stateFilePath)) {
    await fs.unlink(stateFilePath);
  }
}

/**
 * Check if import state exists (without loading)
 *
 * @param projectRoot Project root directory
 * @returns true if state file exists
 */
export function hasImportState(projectRoot: string = getProjectRoot()): boolean {
  const stateFilePath = getStateFilePath(projectRoot);
  return existsSync(stateFilePath);
}

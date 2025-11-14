/**
 * Status Line Types (Simplified)
 *
 * Ultra-simple status line with cached progress.
 * Shows: [increment-name] ████░░░░ X/Y tasks (Z open)
 */

export interface StatusLineCache {
  /** Current active/in-progress increment (null if none) */
  current: CurrentIncrement | null;

  /** Total number of open increments (active/in-progress/planning) */
  openCount: number;

  /** ISO timestamp of last cache update */
  lastUpdate: string;
}

export interface CurrentIncrement {
  /** Increment ID (e.g., "0031-external-tool-status-sync") */
  id: string;

  /** Short name (e.g., "external-tool-status-sync") */
  name: string;

  /** Number of completed tasks */
  completed: number;

  /** Total number of tasks */
  total: number;

  /** Completion percentage (0-100) */
  percentage: number;
}

export interface StatusLineConfig {
  /** Enable status line rendering */
  enabled: boolean;

  /** Maximum age of cache before showing stale warning (ms) */
  maxCacheAge: number;

  /** Width of progress bar (characters) */
  progressBarWidth: number;

  /** Maximum length for increment name */
  maxNameLength: number;
}

export const DEFAULT_STATUS_LINE_CONFIG: StatusLineConfig = {
  enabled: true,
  maxCacheAge: 30000, // 30 seconds (much longer, simpler)
  progressBarWidth: 8,
  maxNameLength: 30,
};

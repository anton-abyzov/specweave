/**
 * Status Line Types
 *
 * Supports displaying multiple active increments (up to 2).
 * Shows: [inc-1] ████░░░░ X/Y | [inc-2] ██████░░ A/B (Z open)
 */

export interface StatusLineCache {
  /** NEW: Array of active increments (up to 2) */
  activeIncrements: CurrentIncrement[];

  /** Total number of open increments (active/in-progress/planning) */
  openCount: number;

  /** ISO timestamp of last cache update */
  lastUpdate: string;

  /**
   * DEPRECATED: Use activeIncrements[0] instead
   * Kept for backward compatibility with old code
   */
  current?: CurrentIncrement | null;

  /**
   * Optional message to display when no active increments
   * Used for user guidance when openCount === 0
   */
  message?: string;
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

/**
 * Status Line Types
 *
 * Type definitions for the fast status line caching system.
 * Supports <1ms rendering with intelligent cache invalidation.
 */

export interface StatusLineCache {
  /** Active increment ID (e.g., "0017-sync-architecture-fix") */
  incrementId: string;

  /** Short increment name (e.g., "sync-architecture-fix") */
  incrementName: string;

  /** Total number of tasks in tasks.md */
  totalTasks: number;

  /** Number of completed tasks ([x]) */
  completedTasks: number;

  /** Completion percentage (0-100) */
  percentage: number;

  /** Current task being worked on */
  currentTask: TaskInfo | null;

  /** ISO timestamp of last cache update */
  lastUpdate: string;

  /** Unix timestamp of tasks.md mtime (for invalidation) */
  lastModified: number;
}

export interface TaskInfo {
  /** Task ID (e.g., "T-016") */
  id: string;

  /** Task title (e.g., "Update documentation") */
  title: string;
}

export interface StatusLineConfig {
  /** Enable status line rendering */
  enabled: boolean;

  /** Maximum age of cache before forcing refresh (ms) */
  maxCacheAge: number;

  /** Width of progress bar (characters) */
  progressBarWidth: number;

  /** Maximum length for increment name */
  maxIncrementNameLength: number;

  /** Maximum length for task title */
  maxTaskTitleLength: number;

  /** Show progress bar */
  showProgressBar: boolean;

  /** Show percentage */
  showPercentage: boolean;

  /** Show current task */
  showCurrentTask: boolean;
}

export const DEFAULT_STATUS_LINE_CONFIG: StatusLineConfig = {
  enabled: true,
  maxCacheAge: 5000, // 5 seconds
  progressBarWidth: 8,
  maxIncrementNameLength: 20,
  maxTaskTitleLength: 30,
  showProgressBar: true,
  showPercentage: true,
  showCurrentTask: true,
};

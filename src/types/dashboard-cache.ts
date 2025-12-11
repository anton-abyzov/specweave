/**
 * Type definitions for Dashboard Cache system
 *
 * Pre-computed state cache for O(1) status command reads.
 * Updated incrementally on file changes, not rebuilt on every query.
 *
 * @see spec.md 0117-instant-dashboard-cache
 */

/**
 * Current cache schema version
 * Increment when making breaking schema changes
 */
export const DASHBOARD_CACHE_VERSION = 1;

/**
 * Cache file location
 */
export const DASHBOARD_CACHE_PATH = '.specweave/state/dashboard.json';

/**
 * Task completion stats for an increment
 */
export interface TaskStats {
  total: number;
  completed: number;
}

/**
 * Acceptance criteria stats for an increment
 */
export interface ACStats {
  total: number;
  completed: number;
}

/**
 * Increment status values
 *
 * Note: 'planned' is a legacy typo for 'planning' - both may appear in cache
 */
export type IncrementStatus =
  | 'backlog'
  | 'planning'
  | 'planned'  // Legacy - use 'planning' for new increments
  | 'active'
  | 'paused'
  | 'ready_for_review'
  | 'completed'
  | 'abandoned';

/**
 * Increment type values
 */
export type IncrementType =
  | 'feature'
  | 'hotfix'
  | 'bug'
  | 'refactor'
  | 'experiment'
  | 'change-request';

/**
 * Priority values
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Cached data for a single increment
 */
export interface CachedIncrement {
  /** Increment status */
  status: IncrementStatus;
  /** Increment type */
  type: IncrementType;
  /** Priority level */
  priority: Priority;
  /** Task completion stats */
  tasks: TaskStats;
  /** Acceptance criteria completion stats */
  acs: ACStats;
  /** Creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActivity: string;
  /** User story IDs in this increment */
  userStories: string[];
  /** Increment title (for display) */
  title?: string;
  /** Project ID */
  project?: string;
}

/**
 * Summary counts by status
 */
export interface StatusSummary {
  total: number;
  active: number;
  paused: number;
  backlog: number;
  planning: number;   // Count of 'planning' + 'planned' (legacy)
  ready_for_review: number;
  completed: number;
  abandoned: number;
  archived: number;
}

/**
 * Counts by type
 */
export interface TypeCounts {
  feature: number;
  hotfix: number;
  bug: number;
  refactor: number;
  experiment: number;
  'change-request': number;
}

/**
 * Counts by priority
 */
export interface PriorityCounts {
  P0: number;
  P1: number;
  P2: number;
  P3: number;
}

/**
 * Summary statistics across all increments
 */
export interface DashboardSummary extends StatusSummary {
  byType: TypeCounts;
  byPriority: PriorityCounts;
}

/**
 * Background job info
 */
export interface CachedJob {
  id: string;
  type: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  startedAt: string;
  updatedAt: string;
}

/**
 * Jobs section of cache
 */
export interface JobsCache {
  running: CachedJob[];
  paused: CachedJob[];
  failed: CachedJob[];
  completedCount: number;
}

/**
 * Cost tracking section of cache
 */
export interface CostsCache {
  totalTokens: number;
  totalCost: number;
  totalSavings: number;
  byIncrement: Record<string, {
    tokens: number;
    cost: number;
    savings: number;
  }>;
}

/**
 * Source file mtimes for stale detection
 */
export interface SourceMtimes {
  [incrementId: string]: {
    metadata?: number;
    tasks?: number;
    spec?: number;
  };
}

/**
 * Complete dashboard cache structure
 */
export interface DashboardCache {
  /** Schema version for migrations */
  version: number;
  /** Last update timestamp */
  updatedAt: string;
  /** Per-increment cached data */
  increments: Record<string, CachedIncrement>;
  /** Aggregated summary statistics */
  summary: DashboardSummary;
  /** Background jobs state */
  jobs: JobsCache;
  /** Cost tracking data */
  costs: CostsCache;
  /** Source file mtimes for stale detection */
  mtimes?: SourceMtimes;
}

/**
 * Change types for incremental updates
 */
export type CacheChangeType = 'metadata' | 'tasks' | 'spec' | 'jobs';

/**
 * Create an empty dashboard cache
 */
export function createEmptyCache(): DashboardCache {
  return {
    version: DASHBOARD_CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    increments: {},
    summary: {
      total: 0,
      active: 0,
      paused: 0,
      backlog: 0,
      planning: 0,
      ready_for_review: 0,
      completed: 0,
      abandoned: 0,
      archived: 0,
      byType: {
        feature: 0,
        hotfix: 0,
        bug: 0,
        refactor: 0,
        experiment: 0,
        'change-request': 0,
      },
      byPriority: {
        P0: 0,
        P1: 0,
        P2: 0,
        P3: 0,
      },
    },
    jobs: {
      running: [],
      paused: [],
      failed: [],
      completedCount: 0,
    },
    costs: {
      totalTokens: 0,
      totalCost: 0,
      totalSavings: 0,
      byIncrement: {},
    },
  };
}

/**
 * Plugin Cache Types
 *
 * Type definitions for plugin cache health monitoring system.
 */

/**
 * Cache metadata stored in .cache-metadata.json
 */
export interface CacheMetadata {
  /** Plugin name (e.g., "sw", "sw-github") */
  pluginName: string;

  /** Plugin version (e.g., "1.0.0") */
  version: string;

  /** Git commit SHA when cache was created */
  commitSha: string;

  /** ISO 8601 timestamp of last update */
  lastUpdated: string;

  /** File checksums (relative path -> SHA256 hash) */
  checksums: Record<string, string>;
}

/**
 * Result of cache staleness detection
 */
export interface StalenessResult {
  /** Whether cache is stale */
  stale: boolean;

  /** Reason for staleness */
  reason: 'commit_changed' | 'merge_conflict' | 'syntax_error' | 'age' | 'checksum_mismatch' | 'none';

  /** Cached commit SHA (if available) */
  cacheCommit?: string;

  /** GitHub latest commit SHA (if available) */
  githubCommit?: string;

  /** Files affected by staleness */
  affectedFiles?: string[];

  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Human-readable message */
  message?: string;
}

/**
 * Cache health issue detected during validation
 */
export interface CacheHealthIssue {
  /** Issue severity */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Type of issue */
  type: 'merge_conflict' | 'syntax_error' | 'checksum_mismatch' | 'missing_file' | 'stale_commit';

  /** File path (relative to plugin cache) */
  file: string;

  /** Detailed error message */
  message: string;

  /** Suggested fix */
  suggestion: string;

  /** Line number (for merge conflicts, syntax errors) */
  line?: number;
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy = 'soft' | 'hard';

/**
 * Options for cache invalidation
 */
export interface InvalidationOptions {
  /** Strategy to use: 'soft' marks stale, 'hard' deletes */
  strategy: InvalidationStrategy;
}

/**
 * Result of cache invalidation operation
 */
export interface InvalidationResult {
  /** Whether invalidation succeeded */
  success: boolean;

  /** Error message (if failed) */
  error?: string;
}

/**
 * GitHub API rate limit information
 */
export interface GitHubRateLimit {
  /** Remaining API calls */
  remaining: number;

  /** Total API calls allowed */
  limit: number;

  /** Unix timestamp when limit resets */
  reset: number;
}

/**
 * Cached GitHub API response
 */
export interface CachedGitHubResponse<T> {
  /** Response data */
  data: T;

  /** Unix timestamp when cached */
  cachedAt: number;

  /** TTL in seconds */
  ttl: number;
}

/**
 * GitHub commit comparison result
 */
export interface CommitComparisonResult {
  /** Whether commits differ */
  different: boolean;

  /** Base commit SHA */
  baseCommit: string;

  /** Head commit SHA */
  headCommit: string;

  /** Files changed between commits */
  changedFiles: string[];

  /** Number of commits between base and head */
  commitsBehind: number;
}

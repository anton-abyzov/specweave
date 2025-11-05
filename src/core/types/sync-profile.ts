/**
 * Sync Profile Types for Multi-Project External Integration
 *
 * Supports multiple projects per provider (GitHub, JIRA, ADO, etc.)
 * with time range filtering and rate limiting protection.
 */

// ============================================================================
// Provider Types
// ============================================================================

export type SyncProvider = 'github' | 'jira' | 'ado';

export interface GitHubConfig {
  owner: string;
  repo: string;
}

export interface JiraConfig {
  domain: string;
  projectKey: string;
  issueType?: 'Epic' | 'Story' | 'Task';
}

export interface AdoConfig {
  organization: string;
  project: string;
  workItemType?: 'Epic' | 'Feature' | 'User Story';
  areaPath?: string;
  iterationPath?: string;
}

export type ProviderConfig = GitHubConfig | JiraConfig | AdoConfig;

// ============================================================================
// Time Range Types
// ============================================================================

export type TimeRangePreset = '1W' | '2W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface TimeRangeConfig {
  /** Preset time range */
  preset?: TimeRangePreset;

  /** Custom date range */
  custom?: {
    start: string;  // ISO date: "2025-10-01"
    end?: string;   // ISO date or null (ongoing)
  };
}

export interface TimeRangeEstimate {
  /** Estimated work items to sync */
  items: number;

  /** Estimated API requests */
  apiCalls: number;

  /** Estimated sync duration in minutes */
  durationMinutes: number;

  /** Rate limit impact level */
  rateLimitImpact: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum items to sync in one operation */
  maxItemsPerSync: number;

  /** Warn user when exceeding this threshold */
  warnThreshold: number;
}

export interface RateLimitStatus {
  /** Remaining requests in current window */
  remaining: number;

  /** Total limit per window */
  limit: number;

  /** When the rate limit resets (ISO timestamp) */
  resetAt: string;

  /** Percentage of limit used */
  percentUsed: number;
}

export interface ProviderRateLimits {
  github: {
    limit: 5000;
    window: '1h';
    thresholds: {
      low: 250;    // < 5% of limit
      medium: 1000; // < 20% of limit
      high: 2500;   // < 50% of limit
    };
  };
  jira: {
    limit: 100;
    window: '1m';
    thresholds: {
      low: 25;
      medium: 50;
      high: 75;
    };
  };
  ado: {
    limit: 200;
    window: '5m';
    thresholds: {
      low: 50;
      medium: 100;
      high: 150;
    };
  };
}

// ============================================================================
// Sync Profile Types
// ============================================================================

export interface SyncProfile {
  /** Provider type */
  provider: SyncProvider;

  /** Human-readable name */
  displayName: string;

  /** Optional description */
  description?: string;

  /** Provider-specific configuration */
  config: ProviderConfig;

  /** Time range configuration */
  timeRange: {
    /** Default time range for this profile */
    default: TimeRangePreset;

    /** Maximum allowed time range */
    max: TimeRangePreset;
  };

  /** Rate limiting configuration */
  rateLimits?: RateLimitConfig;

  /** Project context (for smart detection) */
  projectContext?: {
    /** Project name (e.g., "SpecWeave", "Client A Mobile") */
    name: string;

    /** Project description */
    description?: string;

    /** Keywords for auto-detection */
    keywords?: string[];

    /** Team/organization name */
    team?: string;
  };
}

export interface SyncProfiles {
  /** Active profile (default selection) */
  activeProfile?: string;

  /** All available profiles */
  profiles: Record<string, SyncProfile>;
}

// ============================================================================
// Per-Increment Sync Metadata
// ============================================================================

export interface IncrementSyncMetadata {
  /** Which profile this increment uses */
  profile: string;

  /** External issue/work item number */
  issueNumber?: number;

  /** External issue/work item key (for JIRA) */
  issueKey?: string;

  /** Direct URL to external issue */
  issueUrl?: string;

  /** Time range used for this sync */
  timeRange: TimeRangePreset | 'custom';

  /** Custom time range (if timeRange === 'custom') */
  customTimeRange?: {
    start: string;
    end?: string;
  };

  /** When sync was created */
  createdAt: string;

  /** Last successful sync timestamp */
  lastSyncAt?: string;

  /** Sync status */
  status?: 'active' | 'paused' | 'failed' | 'completed';

  /** Last sync error (if any) */
  lastError?: {
    message: string;
    timestamp: string;
    rateLimited?: boolean;
  };
}

// ============================================================================
// Project Context Types (for organizing specs per project/team)
// ============================================================================

export interface ProjectContext {
  /** Unique project identifier (kebab-case) */
  id: string;

  /** Project name */
  name: string;

  /** Project description */
  description: string;

  /** Team/organization */
  team?: string;

  /** Keywords for auto-detection */
  keywords: string[];

  /** Default sync profile for this project */
  defaultSyncProfile?: string;

  /** Project-specific specs folder */
  specsFolder: string;  // e.g., ".specweave/docs/internal/specs/specweave/"

  /** Related increments (for tracking) */
  increments?: string[];
}

// ============================================================================
// Sync Configuration (Complete)
// ============================================================================

export interface SyncConfiguration {
  /** Active profile */
  activeProfile?: string;

  /** All sync profiles */
  profiles: Record<string, SyncProfile>;

  /** Project contexts */
  projects?: Record<string, ProjectContext>;

  /** Global settings */
  settings?: {
    /** Auto-detect project from increment description */
    autoDetectProject?: boolean;

    /** Default time range for new syncs */
    defaultTimeRange?: TimeRangePreset;

    /** Enable rate limit protection */
    rateLimitProtection?: boolean;
  };
}

// ============================================================================
// Helper Types
// ============================================================================

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ProjectDetectionResult {
  /** Matched project (if any) */
  project?: ProjectContext;

  /** Confidence score (0-1) */
  confidence: number;

  /** Matched keywords */
  matchedKeywords: string[];

  /** Suggested sync profile */
  suggestedProfile?: string;
}

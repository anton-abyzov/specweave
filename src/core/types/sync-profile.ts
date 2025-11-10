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

/**
 * Sync Strategy (v0.10.0+)
 *
 * Determines how work is organized and synced:
 * - simple: One container (project/repo), no filtering (default, backward compatible)
 * - filtered: Multiple containers + sub-organizations (boards/etc) + filters (NEW)
 * - custom: Raw query (JQL/GraphQL/WIQL) for power users (NEW)
 */
export type SyncStrategy = 'simple' | 'filtered' | 'custom';

// Jira team organization strategies (DEPRECATED: use SyncStrategy instead)
export type JiraStrategy = 'project-per-team' | 'shared-project-with-components';

// ============================================================================
// Hierarchical Sync Types (v0.10.0+)
// ============================================================================

/**
 * Container filters (provider-specific)
 *
 * Filters applied to a specific container (project/repo) to narrow down synced items.
 */
export interface SyncContainerFilters {
  // Common filters (all providers)
  /** Include items with these labels */
  includeLabels?: string[];

  /** Exclude items with these labels */
  excludeLabels?: string[];

  /** Filter by assignees (email or ID) */
  assignees?: string[];

  /** Filter by status categories */
  statusCategories?: string[];

  // Jira-specific
  /** Filter by components */
  components?: string[];

  /** Filter by sprints */
  sprints?: string[];

  /** Filter by issue types (Epic, Story, Task, Bug) */
  issueTypes?: string[];

  // GitHub-specific
  /** Filter by milestones */
  milestones?: string[];

  /** Filter by states */
  states?: ('open' | 'closed')[];

  // ADO-specific
  /** Filter by area paths */
  areaPaths?: string[];

  /** Filter by iteration paths */
  iterationPaths?: string[];

  /** Filter by work item types (Epic, Feature, User Story, Bug) */
  workItemTypes?: string[];
}

/**
 * Container definition (project, repo, etc.)
 *
 * Represents a single container (Jira project, GitHub repo, ADO project) with optional sub-organizations.
 */
export interface SyncContainer {
  /**
   * Container ID
   * - Jira: Project key (e.g., "PROJECT-A")
   * - GitHub: Repository (e.g., "owner/repo-name")
   * - ADO: Project name (e.g., "Platform")
   */
  id: string;

  /**
   * Sub-organizations within the container
   * - Jira: Board names (e.g., ["Team Alpha Board", "Team Beta Board"])
   * - GitHub: Project board titles (e.g., ["Frontend Board", "UI Components"])
   * - ADO: Team board names (e.g., ["API Team Board"])
   */
  subOrganizations?: string[];

  /**
   * Filters applied to this container
   */
  filters?: SyncContainerFilters;
}

// ============================================================================
// Provider-Specific Configuration Types
// ============================================================================

/**
 * GitHub Configuration (Extended for Hierarchical Sync)
 *
 * - Simple strategy: owner + repo (backward compatible)
 * - Filtered strategy: containers array with multiple repos
 * - Custom strategy: customQuery (GitHub search syntax)
 */
export interface GitHubConfig {
  // Simple strategy (backward compatible)
  owner?: string;
  repo?: string;

  // Filtered strategy (v0.10.0+)
  containers?: SyncContainer[];

  // Custom strategy (v0.10.0+)
  customQuery?: string;
}

/**
 * Jira Configuration (Extended for Hierarchical Sync)
 *
 * Supports:
 * - Simple strategy: Single project (projectKey) - backward compatible
 * - Filtered strategy: Multiple projects + boards (containers) - NEW in v0.10.0
 * - Custom strategy: Raw JQL query (customQuery) - NEW in v0.10.0
 *
 * Backward Compatibility:
 * - Old config: { domain, projectKey } - still works (simple strategy)
 * - Old config: { domain, strategy, projects/components } - still works (deprecated, use filtered)
 * - New config: { domain, containers: [{id, subOrganizations, filters}] } - hierarchical
 */
export interface JiraConfig {
  domain: string;
  issueType?: 'Epic' | 'Story' | 'Task';

  // === Backward Compatible Fields (DEPRECATED in v0.10.0) ===

  /**
   * @deprecated Use SyncStrategy instead (simple/filtered/custom)
   * Old field: How teams are organized in Jira
   */
  strategy?: JiraStrategy;

  /**
   * @deprecated Use containers array instead
   * Strategy 1: Multiple projects (one per team)
   */
  projects?: string[];

  /**
   * @deprecated Use containers array instead
   * Strategy 2: Single project key OR shared project
   */
  projectKey?: string;

  /**
   * @deprecated Use filters in SyncContainer instead
   * Components for filtering
   */
  components?: string[];

  // === NEW: Hierarchical Sync (v0.10.0+) ===

  /**
   * Filtered strategy: Multiple projects + boards
   * Example: [
   *   {id: "PROJECT-A", subOrganizations: ["Board 1", "Board 2"], filters: {...}},
   *   {id: "PROJECT-B", subOrganizations: ["Board 3"]}
   * ]
   */
  containers?: SyncContainer[];

  /**
   * Custom strategy: Raw JQL query
   * Example: "project IN (PROJECT-A, PROJECT-B) AND labels IN (feature)"
   */
  customQuery?: string;
}

/**
 * Azure DevOps Configuration (Extended for Hierarchical Sync)
 *
 * Supports:
 * - Simple strategy: Single project (project) - backward compatible
 * - Filtered strategy: Multiple projects + area paths (containers) - NEW in v0.10.0
 * - Custom strategy: Raw WIQL query (customQuery) - NEW in v0.10.0
 *
 * Backward Compatibility:
 * - Old config: { organization, project, teams, areaPaths } - still works
 * - New config: { organization, containers: [{id, filters: {areaPaths}}] } - hierarchical
 */
export interface AdoConfig {
  organization: string;

  // === Backward Compatible Fields (DEPRECATED in v0.10.0) ===

  /**
   * @deprecated Use containers array instead
   * Single project name
   */
  project?: string;

  /**
   * @deprecated Use filters in SyncContainer instead
   * Teams within the project
   */
  teams?: string[];

  /**
   * @deprecated Use filters in SyncContainer instead
   * Area paths per team
   */
  areaPaths?: Record<string, string>;

  /**
   * @deprecated Use filters in SyncContainer instead
   */
  iterationPath?: string;

  workItemType?: 'Epic' | 'Feature' | 'User Story';

  // === NEW: Hierarchical Sync (v0.10.0+) ===

  /**
   * Filtered strategy: Multiple projects + area paths
   * Example: [
   *   {id: "Platform", filters: {areaPaths: ["Platform\\Core"], workItemTypes: ["User Story"]}},
   *   {id: "Services", filters: {areaPaths: ["Services\\API"]}}
   * ]
   */
  containers?: SyncContainer[];

  /**
   * Custom strategy: Raw WIQL query
   * Example: "SELECT * FROM WorkItems WHERE [System.TeamProject] = 'Platform' AND [System.AreaPath] UNDER 'Platform\\Core'"
   */
  customQuery?: string;
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

  /**
   * Sync strategy (v0.10.0+)
   * - simple: One container (default, backward compatible)
   * - filtered: Multiple containers + boards (NEW)
   * - custom: Raw query (NEW)
   *
   * If not specified, defaults to 'simple' for backward compatibility
   */
  strategy?: SyncStrategy;

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

// ============================================================================
// Type Guard Functions (v0.10.0+)
// ============================================================================

/**
 * Check if profile uses simple strategy (one container, backward compatible)
 */
export function isSimpleStrategy(profile: SyncProfile): boolean {
  // If strategy not specified, default to simple (backward compatibility)
  if (!profile.strategy) return true;
  return profile.strategy === 'simple';
}

/**
 * Check if profile uses filtered strategy (multiple containers + boards)
 */
export function isFilteredStrategy(profile: SyncProfile): boolean {
  return profile.strategy === 'filtered';
}

/**
 * Check if profile uses custom strategy (raw query)
 */
export function isCustomStrategy(profile: SyncProfile): boolean {
  return profile.strategy === 'custom';
}

/**
 * Check if config has hierarchical containers (Jira)
 */
export function hasJiraContainers(config: JiraConfig): boolean {
  return !!(config.containers && config.containers.length > 0);
}

/**
 * Check if config has hierarchical containers (GitHub)
 */
export function hasGitHubContainers(config: GitHubConfig): boolean {
  return !!(config.containers && config.containers.length > 0);
}

/**
 * Check if config has hierarchical containers (ADO)
 */
export function hasAdoContainers(config: AdoConfig): boolean {
  return !!(config.containers && config.containers.length > 0);
}

/**
 * Get effective strategy (defaults to 'simple' if not specified)
 */
export function getEffectiveStrategy(profile: SyncProfile): SyncStrategy {
  return profile.strategy || 'simple';
}

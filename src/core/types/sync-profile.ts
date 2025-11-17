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
 * Sync Strategy (v0.13.0+ - Simplified Two-Tier Architecture)
 *
 * Determines how work is organized and synced:
 * - intelligent: Auto-maps user stories to projects based on content analysis (default, 90% of users)
 *                Supports single project (backward compatible) OR multiple projects (auto-classify)
 * - custom: Raw query (JQL/GraphQL/WIQL) for power users (advanced, 10% of users)
 *
 * REMOVED in v0.13.0:
 * - filtered: Too complex (containers, sub-organizations, filters) → Use intelligent instead
 * - simple: Now an alias for 'intelligent' (backward compatibility)
 */
export type SyncStrategy = 'intelligent' | 'custom';

/**
 * Legacy sync strategy (backward compatibility)
 * 'simple' maps to 'intelligent' automatically
 */
export type LegacySyncStrategy = 'simple' | 'intelligent' | 'custom';

// ============================================================================
// REMOVED in v0.13.0: SyncContainerFilters and SyncContainer
// ============================================================================
//
// The "filtered" strategy with containers, sub-organizations, and complex filters
// has been removed in favor of the simpler two-tier architecture:
// - Intelligent: Auto-mapping to multiple projects (simple list: ["FE", "BE", "MOBILE"])
// - Custom: Raw queries for power users (JQL/GraphQL/WIQL)
//
// For users who need complex filtering, use the "custom" strategy with raw queries.
// This provides the same flexibility without the complex configuration overhead.
//
// Migration guide: .specweave/increments/0020-multi-project-intelligent-sync/MIGRATION-GUIDE.md
// ============================================================================

// ============================================================================
// Provider-Specific Configuration Types
// ============================================================================

/**
 * GitHub Sync Strategy (v0.18.0+ - Multi-Project Spec Sync)
 *
 * Determines how specs are synced to GitHub:
 * - project-per-spec: One GitHub Project per spec (default, current behavior)
 * - team-board: One GitHub Project per team (aggregates multiple specs)
 * - centralized: Parent repo tracks all specs (multi-repo pattern)
 * - distributed: Each team syncs to their repo (microservices)
 */
export type GitHubSyncStrategy =
  | 'project-per-spec'
  | 'team-board'
  | 'centralized'
  | 'distributed';

/**
 * GitHub Configuration (v0.13.0+ - Simplified Multi-Project Architecture)
 * ENHANCED in v0.18.0 with spec-sync strategy support
 *
 * Supports four patterns:
 * 1. Single repo (backward compatible): owner + repo
 * 2. Multiple repos (intelligent mapping): owner + repos[]
 * 3. Master + nested repos (epic-level tracking): owner + masterRepo + repos[]
 * 4. Custom query (power users): customQuery (GitHub search syntax)
 *
 * REMOVED in v0.13.0:
 * - containers: Too complex → Use repos[] instead
 */
export interface GitHubConfig {
  // Pattern 1 & 2 & 3: Owner (required for all patterns except custom)
  owner?: string;

  // Pattern 1: Single repo (backward compatible - intelligent with 1 repo)
  repo?: string;

  // Pattern 2: Multiple repos (intelligent mapping)
  // User stories auto-classified and synced to respective repos
  repos?: string[];  // ['frontend-web', 'backend-api', 'mobile-app']

  // Pattern 3: Master + nested repos (advanced)
  // Master repo contains high-level epics, nested repos contain detailed tasks
  masterRepo?: string;  // 'master-project' (epics)
  // repos[] used for nested repos when masterRepo is set

  // Settings for Pattern 3
  masterRepoLevel?: 'epic';  // Master repo level (always epic)
  nestedRepoLevel?: 'story-task';  // Nested repo level (stories and tasks)
  crossLinking?: boolean;  // Enable epic → issue cross-links

  // Intelligent mapping settings (Pattern 2 & 3)
  confidenceThreshold?: number;  // Minimum confidence for project classification (default: 0.3)

  // Pattern 4: Custom query (power users)
  customQuery?: string;  // GitHub search syntax

  // ============================================================================
  // NEW in v0.18.0: Spec-Sync Strategy Support
  // ============================================================================

  /**
   * GitHub sync strategy for specs (v0.18.0+)
   * - project-per-spec: One GitHub Project per spec (default)
   * - team-board: One GitHub Project per team
   * - centralized: Parent repo tracks all
   * - distributed: Each team syncs to their repo
   */
  githubStrategy?: GitHubSyncStrategy;

  /**
   * Team board ID (for team-board strategy)
   * - ID of the GitHub Project that aggregates all specs from this team
   */
  teamBoardId?: number;

  /**
   * Cross-team detection (for distributed strategy)
   * - Auto-detect specs that touch multiple teams
   * - Create issues in multiple repos for cross-team specs
   */
  enableCrossTeamDetection?: boolean;
}

/**
 * Jira Configuration (v0.13.0+ - Simplified Multi-Project Architecture)
 *
 * Supports three patterns:
 * 1. Single project (backward compatible): domain + projectKey
 * 2. Multiple projects (intelligent mapping): domain + projects[]
 * 3. Custom query (power users): domain + customQuery (raw JQL)
 *
 * REMOVED in v0.13.0:
 * - strategy (JiraStrategy): Deprecated → Use intelligent mapping instead
 * - components: Too granular → Use projects[] or customQuery
 * - containers: Too complex → Use projects[] instead
 *
 * Backward Compatibility:
 * - Old config: { domain, projectKey } - still works (intelligent with 1 project)
 * - Old config: { domain, projects } - still works (intelligent with N projects)
 */
export interface JiraConfig {
  domain: string;

  // Pattern 1: Single project (backward compatible - intelligent with 1 project)
  projectKey?: string;

  // Pattern 2: Multiple projects (intelligent mapping)
  // User stories auto-classified and synced to respective projects
  projects?: string[];  // ['FE', 'BE', 'MOBILE']

  // Settings for intelligent mapping
  intelligentMapping?: boolean;  // Default: true (auto-classify user stories)
  autoCreateEpics?: boolean;  // Default: true (create epic per project)
  confidenceThreshold?: number;  // Default: 0.3 (30%), range: 0.0-1.0

  // Item type mapping (optional)
  itemTypeMapping?: {
    epic: string;    // Default: 'Epic'
    story: string;   // Default: 'Story'
    task: string;    // Default: 'Task'
    subtask: string; // Default: 'Sub-task'
  };

  // Pattern 3: Custom query (power users)
  customQuery?: string;  // Raw JQL: "project IN (FE, BE) AND labels IN (sprint-42)"
}

/**
 * Azure DevOps Configuration (v0.13.0+ - Simplified Multi-Project Architecture)
 *
 * Supports four patterns:
 * 1. Single project (backward compatible): organization + project
 * 2. Multiple projects (intelligent mapping): organization + projects[]
 * 3. Single project + area paths (advanced): organization + project + areaPaths[]
 * 4. Custom query (power users): organization + customQuery (raw WIQL)
 *
 * REMOVED in v0.13.0:
 * - teams: Too granular → Use projects[] or areaPaths[]
 * - areaPaths (Record<string, string>): Changed to string[] for simpler config
 * - iterationPath: Use customQuery for complex filtering
 * - containers: Too complex → Use projects[] or areaPaths[] instead
 *
 * Backward Compatibility:
 * - Old config: { organization, project } - still works (intelligent with 1 project)
 * - Old config: { organization, project, teams } - deprecated, use areaPaths[] instead
 */
export interface AdoConfig {
  organization: string;

  // Pattern 1: Single project (backward compatible - intelligent with 1 project)
  // Pattern 3: Single project + area paths (also uses this)
  project?: string;

  // Pattern 2: Multiple projects (intelligent mapping)
  // User stories auto-classified and synced to respective projects
  projects?: string[];  // ['FE-Project', 'BE-Project', 'MOBILE-Project']

  // Pattern 3: Area paths (advanced - single project with team-based area paths)
  // Used when project is set (not projects[])
  areaPaths?: string[];  // ['FE', 'BE', 'MOBILE']

  // Settings for intelligent mapping
  intelligentMapping?: boolean;  // Default: true (auto-classify user stories)
  autoCreateEpics?: boolean;  // Default: true (create epic per project)
  confidenceThreshold?: number;  // Default: 0.3 (30%), range: 0.0-1.0

  // Work item type mapping (optional)
  workItemTypes?: {
    epic: string;    // Default: 'Epic'
    feature: string; // Default: 'Feature'
    story: string;   // Default: 'User Story'
    task: string;    // Default: 'Task'
  };

  // Pattern 4: Custom query (power users)
  customQuery?: string;  // Raw WIQL query
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

  /** Project root path (optional, for multi-project setups) */
  projectPath?: string;

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
// Type Guard Functions (v0.13.0+ - Simplified)
// ============================================================================

/**
 * Check if profile uses intelligent strategy (auto-mapping, default)
 *
 * Intelligent strategy supports:
 * - Single project/repo (backward compatible)
 * - Multiple projects/repos (auto-classification)
 */
export function isIntelligentStrategy(profile: SyncProfile): boolean {
  // If strategy not specified, default to intelligent (backward compatibility)
  if (!profile.strategy) return true;
  return profile.strategy === 'intelligent';
}

/**
 * Check if profile uses custom strategy (raw query)
 */
export function isCustomStrategy(profile: SyncProfile): boolean {
  return profile.strategy === 'custom';
}

/**
 * Check if GitHub config uses multi-repo pattern
 */
export function hasMultipleGitHubRepos(config: GitHubConfig): boolean {
  return !!(config.repos && config.repos.length > 1);
}

/**
 * Check if GitHub config uses master+nested repos pattern
 */
export function hasGitHubMasterNested(config: GitHubConfig): boolean {
  return !!(config.masterRepo && config.repos && config.repos.length > 0);
}

/**
 * Check if Jira config uses multi-project pattern
 */
export function hasMultipleJiraProjects(config: JiraConfig): boolean {
  return !!(config.projects && config.projects.length > 1);
}

/**
 * Check if ADO config uses multi-project pattern
 */
export function hasMultipleAdoProjects(config: AdoConfig): boolean {
  return !!(config.projects && config.projects.length > 1);
}

/**
 * Check if ADO config uses area path pattern (single project with area paths)
 */
export function hasAdoAreaPaths(config: AdoConfig): boolean {
  return !!(config.project && config.areaPaths && config.areaPaths.length > 0);
}

/**
 * Get effective strategy (defaults to 'intelligent' if not specified)
 *
 * Backward compatibility: 'simple' is treated as 'intelligent'
 */
export function getEffectiveStrategy(profile: SyncProfile): SyncStrategy {
  const strategy = profile.strategy as LegacySyncStrategy;

  // Backward compatibility: 'simple' → 'intelligent'
  if (strategy === 'simple' || !strategy) {
    return 'intelligent';
  }

  return strategy as SyncStrategy;
}

/**
 * DEPRECATED: Use isIntelligentStrategy() instead
 * Kept for backward compatibility only
 */
export function isSimpleStrategy(profile: SyncProfile): boolean {
  return isIntelligentStrategy(profile);
}

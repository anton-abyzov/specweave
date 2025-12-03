/**
 * Sync Profile Types for Multi-Project External Integration
 *
 * Supports multiple projects per provider (GitHub, JIRA, ADO, etc.)
 * with time range filtering and rate limiting protection.
 */

import { SyncSettings } from './sync-settings.js';

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
// Universal Hierarchy Mapping Types (v0.30.6+ - Flexible 3/4/5 Level Support)
// ============================================================================

/**
 * SpecWeave hierarchy levels for mapping external work items
 *
 * Universal hierarchy (flexible depth):
 * - epic: Top-level strategic container (EP-XXXE) → _epics/ (OPTIONAL)
 * - feature: Feature-level container (FS-XXXE) → FS-XXX/
 * - user_story: Individual user story (us-xxxe.md) - FIXED
 * - task: Task within user story (checkbox in US description) - FIXED
 * - skip: Don't import this work item type
 */
export type SpecWeaveHierarchyLevel = 'epic' | 'feature' | 'user_story' | 'task' | 'skip';

/**
 * Flexible Hierarchy Mapping Configuration (v0.30.6+)
 *
 * UNIVERSAL mapping that works with ANY external tool (ADO/JIRA/GitHub)
 * and ANY hierarchy depth (3/4/5 levels).
 *
 * **Core Principle:**
 * - User Story and Task are FIXED (always the same mapping)
 * - Container levels (Epic/Feature) are FLEXIBLE (configurable per project)
 *
 * **How it works:**
 * 1. `epicLevelTypes` - Types that become TOP containers (_epics/EP-*)
 * 2. `featureLevelTypes` - Types that become FEATURE containers (FS-*)
 * 3. User Story types → us-*.md files (automatic/defaults)
 * 4. Task types → checkboxes in parent US (automatic/defaults)
 *
 * @example ADO Scrum (3 levels: Epic → PBI → Task):
 * ```json
 * {
 *   "epicLevelTypes": [],
 *   "featureLevelTypes": ["Epic"]
 * }
 * ```
 *
 * @example ADO Agile (4 levels: Epic → Feature → US → Task):
 * ```json
 * {
 *   "epicLevelTypes": [],
 *   "featureLevelTypes": ["Epic", "Feature"]
 * }
 * ```
 *
 * @example ADO SAFe (5 levels: Capability → Epic → Feature → US → Task):
 * ```json
 * {
 *   "epicLevelTypes": ["Capability"],
 *   "featureLevelTypes": ["Epic", "Feature"]
 * }
 * ```
 *
 * @example JIRA Standard (3 levels: Epic → Story → Sub-task):
 * ```json
 * {
 *   "epicLevelTypes": [],
 *   "featureLevelTypes": ["Epic"]
 * }
 * ```
 *
 * @example JIRA SAFe (4 levels: Initiative → Epic → Story → Sub-task):
 * ```json
 * {
 *   "epicLevelTypes": ["Initiative"],
 *   "featureLevelTypes": ["Epic"]
 * }
 * ```
 */
export interface HierarchyMappingConfig {
  /**
   * Types that map to SpecWeave EPIC level (_epics/EP-*)
   *
   * These are TOP-LEVEL strategic containers.
   * Leave empty for 3-4 level hierarchies without a strategic layer.
   *
   * Examples:
   * - ADO SAFe: ["Capability"]
   * - JIRA SAFe: ["Initiative"]
   * - Standard projects: [] (no epic level)
   */
  epicLevelTypes: string[];

  /**
   * Types that map to SpecWeave FEATURE level (FS-*)
   *
   * These are feature-level containers that hold user stories.
   * Required - every project needs at least one feature-level type.
   *
   * Examples:
   * - ADO Agile: ["Epic", "Feature"]
   * - ADO Scrum: ["Epic"]
   * - JIRA: ["Epic"]
   */
  featureLevelTypes: string[];

  /**
   * Types that map to SpecWeave USER STORY level (us-*.md)
   *
   * Optional - uses sensible defaults if not provided.
   * Defaults: ["User Story", "Story", "Product Backlog Item", "Requirement", "Bug", "Issue"]
   */
  userStoryTypes?: string[];

  /**
   * Types that map to SpecWeave TASK level (checkboxes in US)
   *
   * Optional - uses sensible defaults if not provided.
   * Defaults: ["Task", "Sub-task"]
   */
  taskTypes?: string[];
}

/**
 * Default User Story types (FIXED across all tools)
 *
 * NOTE: Includes both space-separated ('User Story') and hyphenated ('user-story')
 * forms to handle different external tool conventions and internal type naming.
 */
export const DEFAULT_USER_STORY_TYPES = [
  'User Story',
  'user-story',   // Common internal/test type name
  'Story',
  'Product Backlog Item',
  'Requirement',
  'Bug',
  'Issue',
  'PBI',
];

/**
 * Default Task types (FIXED across all tools)
 */
export const DEFAULT_TASK_TYPES = [
  'Task',
  'Sub-task',
  'Subtask',
];

/**
 * Default ADO hierarchy mapping (Agile - 4 levels)
 *
 * ADO Agile: Epic → Feature → User Story → Task
 * Maps to: feature → feature → user_story → task
 *
 * NOTE: Epic becomes feature (not epic) because most ADO projects
 * don't have a strategic layer above Epic.
 */
export const DEFAULT_ADO_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],                    // No strategic layer by default
  featureLevelTypes: ['Epic', 'Feature'], // Both are feature-level containers
  // userStoryTypes and taskTypes use defaults
};

/**
 * ADO SAFe hierarchy mapping (5 levels)
 *
 * SAFe: Capability → Epic → Feature → User Story → Task
 * Maps to: epic → feature → feature → user_story → task
 */
export const ADO_SAFE_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: ['Capability'],
  featureLevelTypes: ['Epic', 'Feature'],
};

/**
 * ADO Scrum hierarchy mapping (3 levels)
 *
 * Scrum: Epic → Product Backlog Item → Task
 * Maps to: feature → user_story → task
 */
export const ADO_SCRUM_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],
  featureLevelTypes: ['Epic'],
};

/**
 * Default JIRA hierarchy mapping (3 levels)
 *
 * JIRA: Epic → Story → Sub-task
 * Maps to: feature → user_story → task
 */
export const DEFAULT_JIRA_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],
  featureLevelTypes: ['Epic'],
};

/**
 * JIRA SAFe hierarchy mapping (4 levels)
 *
 * SAFe: Initiative → Epic → Story → Sub-task
 * Maps to: epic → feature → user_story → task
 */
export const JIRA_SAFE_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: ['Initiative'],
  featureLevelTypes: ['Epic'],
};

/**
 * Default GitHub hierarchy mapping (2 levels)
 *
 * GitHub: Milestone → Issue
 * Maps to: feature → user_story
 */
export const DEFAULT_GITHUB_HIERARCHY_MAPPING: HierarchyMappingConfig = {
  epicLevelTypes: [],
  featureLevelTypes: ['Milestone'],
  userStoryTypes: ['Issue'],
};

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
 * JIRA Board → SpecWeave Project Mapping (v0.29.0+)
 * Maps a JIRA board to a SpecWeave project for team-based organization
 */
export interface JiraBoardMapping {
  /** JIRA board ID (numeric) */
  boardId: number;

  /** Board display name (e.g., "Frontend Board") */
  boardName: string;

  /** SpecWeave project ID this board maps to (e.g., "FE") */
  specweaveProject: string;

  /** Keywords for auto-classification of user stories to this board/project */
  keywords?: string[];

  /** Board type (for display purposes) */
  boardType?: 'scrum' | 'kanban' | 'simple';
}

/**
 * JIRA Board-Based Team Mapping Configuration (v0.29.0+)
 * Single JIRA project with multiple boards, each mapping to a SpecWeave project
 */
export interface JiraBoardMappingConfig {
  /** JIRA project key (e.g., "CORE") */
  projectKey: string;

  /** Board → SpecWeave project mappings */
  boards: JiraBoardMapping[];

  /** Auto-create boards if they don't exist (default: false) */
  autoCreateBoards?: boolean;
}

/**
 * Jira Configuration (v0.13.0+ - Simplified Multi-Project Architecture)
 * ENHANCED in v0.29.0 with board-based team mapping
 *
 * Supports four patterns:
 * 1. Single project (backward compatible): domain + projectKey
 * 2. Multiple projects (intelligent mapping): domain + projects[]
 * 3. Custom query (power users): domain + customQuery (raw JQL)
 * 4. NEW: Board-based teams (v0.29.0+): domain + boardMapping
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

  // Pattern 3: Custom query (power users)
  customQuery?: string;  // Raw JQL: "project IN (FE, BE) AND labels IN (sprint-42)"

  // ============================================================================
  // NEW in v0.29.0: Board-Based Team Mapping
  // ============================================================================

  /**
   * Pattern 4: Board-based teams (v0.29.0+)
   *
   * Single JIRA project with multiple boards, each board maps to a SpecWeave project.
   * Ideal for enterprise setups where teams share a JIRA project but have separate boards.
   *
   * Example:
   * ```json
   * {
   *   "boardMapping": {
   *     "projectKey": "CORE",
   *     "boards": [
   *       { "boardId": 123, "boardName": "Frontend Board", "specweaveProject": "FE" },
   *       { "boardId": 456, "boardName": "Backend Board", "specweaveProject": "BE" }
   *     ]
   *   }
   * }
   * ```
   */
  boardMapping?: JiraBoardMappingConfig;

  // ============================================================================
  // Intelligent Mapping Settings (Patterns 2 & 4)
  // ============================================================================

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
}

/**
 * ADO Area Path → SpecWeave Project Mapping (v0.29.0+)
 * Maps an ADO area path to a SpecWeave project for team-based organization
 */
export interface AdoAreaPathMapping {
  /** Full area path (e.g., "MyProduct\\Frontend" or "MyProduct\\Backend\\API") */
  areaPath: string;

  /** SpecWeave project ID this area path maps to (e.g., "FE") */
  specweaveProject: string;

  /** Keywords for auto-classification of user stories to this area/project */
  keywords?: string[];

  /** Include child area paths (default: true) */
  includeChildren?: boolean;
}

/**
 * ADO Area Path-Based Team Mapping Configuration (v0.29.0+)
 * Single ADO project with area paths mapping to SpecWeave projects
 */
export interface AdoAreaPathMappingConfig {
  /** ADO project name (e.g., "MyProduct") */
  project: string;

  /** Area path → SpecWeave project mappings */
  mappings: AdoAreaPathMapping[];

  /** Auto-create area paths if they don't exist (default: false) */
  autoCreateAreaPaths?: boolean;
}

/**
 * Azure DevOps Configuration (v0.13.0+ - Simplified Multi-Project Architecture)
 * ENHANCED in v0.29.0 with area path → SpecWeave project mapping
 *
 * Supports five patterns:
 * 1. Single project (backward compatible): organization + project
 * 2. Multiple projects (intelligent mapping): organization + projects[]
 * 3. Single project + area paths list (simple): organization + project + areaPaths[]
 * 4. Custom query (power users): organization + customQuery (raw WIQL)
 * 5. NEW: Area path mapping (v0.29.0+): organization + areaPathMapping
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

  // Pattern 3: Area paths list (simple - single project with team-based area paths)
  // Used when project is set (not projects[])
  areaPaths?: string[];  // ['FE', 'BE', 'MOBILE']

  // Pattern 4: Custom query (power users)
  customQuery?: string;  // Raw WIQL query

  // ============================================================================
  // NEW in v0.29.0: Area Path → SpecWeave Project Mapping
  // ============================================================================

  /**
   * Pattern 5: Area path mapping (v0.29.0+)
   *
   * Single ADO project with area paths, each area path maps to a SpecWeave project.
   * Ideal for enterprise setups where teams share an ADO project but use area paths.
   *
   * Example:
   * ```json
   * {
   *   "areaPathMapping": {
   *     "project": "MyProduct",
   *     "mappings": [
   *       { "areaPath": "MyProduct\\Frontend", "specweaveProject": "FE" },
   *       { "areaPath": "MyProduct\\Backend", "specweaveProject": "BE" }
   *     ]
   *   }
   * }
   * ```
   */
  areaPathMapping?: AdoAreaPathMappingConfig;

  // ============================================================================
  // Intelligent Mapping Settings (Patterns 2, 3 & 5)
  // ============================================================================

  // Settings for intelligent mapping
  intelligentMapping?: boolean;  // Default: true (auto-classify user stories)
  autoCreateEpics?: boolean;  // Default: true (create epic per project)
  confidenceThreshold?: number;  // Default: 0.3 (30%), range: 0.0-1.0

  // Work item type mapping (optional) - for EXPORT to ADO
  workItemTypes?: {
    epic: string;    // Default: 'Epic'
    feature: string; // Default: 'Feature'
    story: string;   // Default: 'User Story'
    task: string;    // Default: 'Task'
  };

  // ============================================================================
  // NEW in v0.30.5: Universal Hierarchy Mapping for IMPORT
  // ============================================================================

  /**
   * Hierarchy mapping for importing ADO work items to SpecWeave
   *
   * Maps ADO work item types to SpecWeave hierarchy levels.
   * Enables configurable 4-5 level hierarchy support.
   *
   * @example SAFe configuration:
   * ```json
   * {
   *   "hierarchyMapping": {
   *     "Capability": "epic",
   *     "Epic": "feature",
   *     "Feature": "feature",
   *     "User Story": "user_story",
   *     "Task": "task"
   *   }
   * }
   * ```
   *
   * If not provided, uses DEFAULT_ADO_HIERARCHY_MAPPING.
   */
  hierarchyMapping?: HierarchyMappingConfig;

  /**
   * How to handle orphan items (items without parents)
   *
   * - 'create-feature': Create individual FS-XXXE folders (current behavior, causes bug)
   * - 'skip': Don't import orphan items
   * - 'group': Group all orphans under _orphans/ folder (recommended)
   *
   * Default: 'group' (v0.30.5+)
   */
  orphanHandling?: 'create-feature' | 'skip' | 'group';

  /**
   * Auto-archive items older than N days on import
   *
   * Set to 0 to disable auto-archive on import (recommended for fresh imports).
   * Default: 0 (disabled in v0.30.5+, was 30 before)
   */
  autoArchiveAfterDays?: number;
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
  /**
   * Default profile (fallback when increment doesn't specify one)
   *
   * NOTE: This is a FALLBACK, not a constraint. Bulk operations (import/export/status)
   * iterate ALL profiles. Each increment can override via metadata.json.
   *
   * @since v0.31.0 - renamed from activeProfile for clarity
   */
  defaultProfile?: string;

  /**
   * @deprecated Use `defaultProfile` instead. Kept for backward compatibility.
   * If both are set, `defaultProfile` takes precedence.
   */
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
  /**
   * Default profile (fallback when increment doesn't specify one)
   * @since v0.31.0 - renamed from activeProfile
   */
  defaultProfile?: string;

  /**
   * @deprecated Use `defaultProfile` instead. Kept for backward compatibility.
   */
  activeProfile?: string;

  /** All sync profiles */
  profiles: Record<string, SyncProfile>;

  /** Project contexts */
  projects?: Record<string, ProjectContext>;

  /**
   * Global settings (v0.24.0+ - Three-Permission Architecture)
   *
   * Combines external tool permissions (SyncSettings) with global behavior settings.
   * All permission settings default to false for safety (explicit opt-in required).
   */
  settings?: SyncSettings & {
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

// ============================================================================
// NEW Type Guards (v0.29.0+ - Board/Area Path Mapping)
// ============================================================================

/**
 * Check if Jira config uses board-based team mapping (v0.29.0+)
 * Single JIRA project with multiple boards → SpecWeave projects
 */
export function hasJiraBoardMapping(config: JiraConfig): boolean {
  return !!(
    config.boardMapping &&
    config.boardMapping.projectKey &&
    config.boardMapping.boards &&
    config.boardMapping.boards.length > 0
  );
}

/**
 * Check if ADO config uses area path mapping (v0.29.0+)
 * Single ADO project with area paths → SpecWeave projects
 */
export function hasAdoAreaPathMapping(config: AdoConfig): boolean {
  return !!(
    config.areaPathMapping &&
    config.areaPathMapping.project &&
    config.areaPathMapping.mappings &&
    config.areaPathMapping.mappings.length > 0
  );
}

/**
 * Get JIRA board mapping for a SpecWeave project (v0.29.0+)
 *
 * @param config JiraConfig with boardMapping
 * @param specweaveProjectId SpecWeave project ID (e.g., "FE")
 * @returns Board mapping or undefined
 */
export function getJiraBoardForProject(
  config: JiraConfig,
  specweaveProjectId: string
): JiraBoardMapping | undefined {
  if (!hasJiraBoardMapping(config)) return undefined;

  return config.boardMapping!.boards.find(
    (b) => b.specweaveProject.toLowerCase() === specweaveProjectId.toLowerCase()
  );
}

/**
 * Get ADO area path mapping for a SpecWeave project (v0.29.0+)
 *
 * @param config AdoConfig with areaPathMapping
 * @param specweaveProjectId SpecWeave project ID (e.g., "FE")
 * @returns Area path mapping or undefined
 */
export function getAdoAreaPathForProject(
  config: AdoConfig,
  specweaveProjectId: string
): AdoAreaPathMapping | undefined {
  if (!hasAdoAreaPathMapping(config)) return undefined;

  return config.areaPathMapping!.mappings.find(
    (m) => m.specweaveProject.toLowerCase() === specweaveProjectId.toLowerCase()
  );
}

/**
 * Get all SpecWeave project IDs from JIRA board mapping (v0.29.0+)
 */
export function getJiraMappedProjects(config: JiraConfig): string[] {
  if (!hasJiraBoardMapping(config)) return [];
  return config.boardMapping!.boards.map((b) => b.specweaveProject);
}

/**
 * Get all SpecWeave project IDs from ADO area path mapping (v0.29.0+)
 */
export function getAdoMappedProjects(config: AdoConfig): string[] {
  if (!hasAdoAreaPathMapping(config)) return [];
  return config.areaPathMapping!.mappings.map((m) => m.specweaveProject);
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

// ============================================================================
// Default Profile Helpers (v0.31.0+ - Backward Compatibility)
// ============================================================================

/**
 * Get the effective default profile name from sync configuration
 *
 * Handles backward compatibility:
 * - Returns `defaultProfile` if set (preferred, v0.31.0+)
 * - Falls back to `activeProfile` if only that is set (legacy)
 * - Returns undefined if neither is set
 *
 * @param config - Sync configuration (SyncProfiles or SyncConfiguration)
 * @returns Default profile name or undefined
 *
 * @example
 * ```typescript
 * const defaultProfile = getDefaultProfile(config.sync);
 * if (defaultProfile) {
 *   const profile = config.sync.profiles[defaultProfile];
 * }
 * ```
 */
export function getDefaultProfile(
  config: Pick<SyncProfiles, 'defaultProfile' | 'activeProfile'> | undefined
): string | undefined {
  if (!config) return undefined;

  // Prefer defaultProfile (v0.31.0+), fall back to activeProfile (legacy)
  return config.defaultProfile ?? config.activeProfile;
}

/**
 * Get ALL sync profiles of a specific provider type
 *
 * Use this for bulk operations instead of just using the default profile.
 * This allows sync operations to work across ALL configured profiles.
 *
 * @param config - Sync configuration
 * @param provider - Provider type ('github', 'jira', 'ado')
 * @returns Array of [profileName, profile] tuples
 *
 * @example
 * ```typescript
 * // Sync to ALL GitHub repos, not just "active" one
 * for (const [name, profile] of getProfilesByProvider(config.sync, 'github')) {
 *   await syncToGitHub(profile);
 * }
 * ```
 */
export function getProfilesByProvider(
  config: Pick<SyncProfiles, 'profiles'> | undefined,
  provider: SyncProvider
): Array<[string, SyncProfile]> {
  if (!config?.profiles) return [];

  return Object.entries(config.profiles).filter(
    ([_, profile]) => profile.provider === provider
  );
}

/**
 * Get all configured sync profiles (all providers)
 *
 * @param config - Sync configuration
 * @returns Array of [profileName, profile] tuples
 */
export function getAllProfiles(
  config: Pick<SyncProfiles, 'profiles'> | undefined
): Array<[string, SyncProfile]> {
  if (!config?.profiles) return [];
  return Object.entries(config.profiles);
}

/**
 * Check if sync is configured for ANY profile of a given provider
 *
 * More useful than checking activeProfile for permission checks.
 *
 * @param config - Sync configuration
 * @param provider - Provider type
 * @returns true if at least one profile exists for this provider
 */
export function hasProviderConfigured(
  config: Pick<SyncProfiles, 'profiles'> | undefined,
  provider: SyncProvider
): boolean {
  return getProfilesByProvider(config, provider).length > 0;
}

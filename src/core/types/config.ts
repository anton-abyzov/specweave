/**
 * SpecWeave Configuration Types
 *
 * Type definitions for .specweave/config.json configuration file.
 */

import { SupportedLanguage, TranslationConfig } from '../i18n/types.js';
import { PluginConfig } from './plugin.js';
import { IncrementType } from './increment-metadata.js';

/**
 * WIP Limits Configuration (v0.7.0+ Simplified)
 *
 * Philosophy: Default to 1 active increment (maximum focus)
 * Allow 2 only for emergencies (hotfix interrupt)
 * Never >2 (hard cap enforced)
 */
export interface LimitsConfig {
  /** Maximum active increments at any time (default: 1 for focus) */
  maxActiveIncrements?: number;

  /** Maximum active increments with warning (default: 3, negotiable) */
  hardCap?: number;

  /** Allow 2nd active increment for hotfix/bug emergencies (default: true) */
  allowEmergencyInterrupt?: boolean;

  /** Increment type-specific behaviors */
  typeBehaviors?: {
    /** Types that can interrupt existing work (emergency scenarios) */
    canInterrupt?: (IncrementType | string)[];

    /** Auto-abandon increments after N days of inactivity */
    autoAbandonDays?: {
      /** Days before experiment auto-abandons (default: 14) */
      experiment?: number;
    };
  };

  /** Staleness warning thresholds */
  staleness?: {
    /** Warn if paused for more than N days */
    paused?: number;

    /** Warn if active for more than N days */
    active?: number;
  };
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project name */
  name?: string;

  /** Project version (semver) */
  version?: string;

  /** Project description */
  description?: string;

  /** Technology stack */
  techStack?: string[];

  /** Team name */
  team?: string;
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  /** Default adapter to use (claude, cursor, generic) */
  default?: 'claude' | 'cursor' | 'generic';

  /** Additional adapter settings */
  [key: string]: any;
}

/**
 * Multi-Project Configuration
 *
 * Defines multiple projects within the same repository.
 * Projects are DYNAMIC - no hardcoded names (backend, frontend are examples).
 *
 * Single-project mode: No multiProject config = default project "default"
 * Multi-project mode: multiProject.projects contains user-defined project names
 *
 * NOTE (v0.33.0): activeProject has been REMOVED!
 * Per-US project targeting replaces global activeProject.
 * See: 0125-cross-project-user-story-targeting
 */
export interface MultiProjectConfig {
  /** Is multi-project mode enabled? (default: false = single project "default") */
  enabled?: boolean;

  /** Project definitions (dynamic, no hardcodes) */
  projects?: Record<string, ProjectConfig>;
}

/**
 * Individual Project Configuration
 *
 * Defines a single project within multi-project mode.
 * Examples: backend, frontend, mobile, infrastructure (user-defined)
 */
export interface ProjectConfig {
  /** Project ID (e.g., 'backend', 'frontend', 'default') */
  id?: string;

  /** Human-readable project name */
  name: string;

  /** Project description */
  description?: string;

  /** Keywords for auto-detection (when user doesn't specify project) */
  keywords?: string[];

  /** Technology stack */
  techStack?: string[];

  /** Team name */
  team?: string;

  /** External tool configuration (optional project-specific overrides) */
  externalTools?: {
    github?: {
      repository?: string;  // Project-specific GitHub repo (for multi-repo setups)
    };
    jira?: {
      project?: string;     // Project-specific Jira project key
    };
    ado?: {
      project?: string;     // Project-specific ADO project name
    };
  };
}

/**
 * Testing mode options
 * - TDD: Write tests first (mission-critical systems)
 * - test-after: Implement first, test later (recommended for most)
 * - manual: Test when needed, no strict rules (flexible for startups/MVPs)
 * - none: Skip testing entirely (hackathons, experiments, prototypes)
 *
 * NOTE: This setting is advisory - stored in config but NOT strictly enforced
 * by quality gates (QualityGateDecider has hardcoded thresholds).
 * Use metadata.json per-increment override for project-specific needs.
 */
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

/**
 * Coverage target configuration
 *
 * NOTE: These are advisory targets - 0 means "no tracking".
 * Quality gates have separate hardcoded thresholds (60% fail, 80% concerns).
 */
export interface CoverageTargets {
  /** Unit test coverage target (0-100%, 0 = no tracking) */
  unit: number;

  /** Integration test coverage target (0-100%, 0 = no tracking) */
  integration: number;

  /** E2E test coverage target (0-100%, 0 = no tracking) */
  e2e: number;
}

/**
 * Testing configuration
 *
 * Controls default testing approach and coverage targets for all increments.
 * Can be overridden per-increment via metadata.json or spec.md frontmatter.
 *
 * NOTE (Reality Check): These settings are ADVISORY, not enforced:
 * - QualityGateDecider uses hardcoded thresholds (60% fail, 80% concerns)
 * - PM Agent reads these to generate metadata.json
 * - /sw:done validates AC coverage (100% required) but not code coverage
 *
 * To actually enforce coverage, configure your CI/CD (jest --coverageThreshold).
 */
/**
 * TDD Enforcement Level
 *
 * Controls how strictly TDD discipline is enforced when testMode: "TDD"
 *
 * - `strict`: BLOCKS completing GREEN task before RED task (recommended for teams)
 * - `warn`: Shows warning but allows (default - gradual adoption)
 * - `off`: No enforcement (TDD is purely self-discipline)
 *
 * @since 1.0.111
 */
export type TDDEnforcement = 'strict' | 'warn' | 'off';

export interface TestingConfig {
  /** Default testing mode for new increments */
  defaultTestMode: TestMode;

  /** Default overall coverage target (0-100%, 0 = no tracking) */
  defaultCoverageTarget: number;

  /** Specific coverage targets per test type */
  coverageTargets: CoverageTargets;

  /**
   * TDD enforcement level (only applies when testMode: "TDD")
   *
   * - `strict`: BLOCKS completing GREEN before RED
   * - `warn`: Warns but allows (default)
   * - `off`: No enforcement
   *
   * @default "warn"
   * @since 1.0.111
   */
  tddEnforcement?: TDDEnforcement;
}

/**
 * Global command deduplication configuration
 *
 * Prevents ANY command/tool from being invoked twice within a configurable time window.
 * Protects against accidental duplicate invocations (router confusion, double-clicks, etc.)
 */
export interface DeduplicationConfig {
  /** Enable global deduplication (default: true) */
  enabled?: boolean;

  /** Time window in milliseconds to check for duplicates (default: 1000ms) */
  windowMs?: number;

  /** Maximum cache entries before cleanup (default: 1000) */
  maxCacheSize?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Cleanup interval in milliseconds (default: 60000ms = 1 minute) */
  cleanupIntervalMs?: number;
}

/**
 * Archiving Configuration
 *
 * Controls how completed increments are archived to keep workspace clean
 */
export interface ArchivingConfig {
  /** Number of increments to keep in main folder (default: 10) */
  keepLast?: number;

  /** Automatically archive completed increments (default: false) */
  autoArchive?: boolean;

  /** Archive increments after N days of inactivity (default: 60) */
  archiveAfterDays?: number;

  /** Always preserve active/paused increments (default: true) */
  preserveActive?: boolean;

  /** Archive all completed increments (default: false) */
  archiveCompleted?: boolean;

  /** Archive patterns (regex) to match increment names */
  archivePatterns?: string[];

  /** Never archive these increments (by name or number) */
  preserveList?: string[];
}

/**
 * API Documentation Configuration (v1.0.58+)
 *
 * Controls API documentation generation strategy.
 * OpenAPI is the source of truth; Postman/other formats are derived.
 */
export interface ApiDocsConfig {
  /** Enable API documentation features (default: false, auto-enabled for API projects) */
  enabled?: boolean;

  /**
   * OpenAPI spec location (relative to project root)
   * @default "openapi.yaml" or "openapi.json"
   */
  openApiPath?: string;

  /**
   * Auto-generate OpenAPI from code decorators/annotations
   * Supported frameworks: NestJS, FastAPI, Express+swagger-jsdoc, Spring Boot
   * @default true (if framework detected)
   */
  autoGenerateOpenApi?: boolean;

  /**
   * Generate Postman collection from OpenAPI
   * @default true
   */
  generatePostman?: boolean;

  /**
   * Postman collection output path (relative to project root)
   * @default "postman-collection.json"
   */
  postmanPath?: string;

  /**
   * Postman environment output path (relative to project root)
   * Generated from .env file with API-relevant variables
   * @default "postman-environment.json"
   */
  postmanEnvPath?: string;

  /**
   * When to regenerate API docs:
   * - 'on-increment-done': Generate when closing increment (recommended)
   * - 'on-api-change': Generate when API files change (via hook)
   * - 'manual': Only generate on explicit command
   * @default 'on-increment-done'
   */
  generateOn?: 'on-increment-done' | 'on-api-change' | 'manual';

  /**
   * API file patterns to watch for changes (when generateOn='on-api-change')
   * @default ['routes', 'controllers', 'api']
   */
  watchPatterns?: string[];

  /**
   * Base URL for the API (used in Postman collection)
   * @default "http://localhost:3000"
   */
  baseUrl?: string;
}

/**
 * Living Docs Configuration
 *
 * Controls how Living Documentation is generated and synced
 */
export interface LivingDocsConfig {
  /** Copy-based sync configuration (v0.21.4+) */
  copyBasedSync?: {
    /** Enable copy-based sync (default: true) */
    enabled?: boolean;

    /** Auto-generate ## Implementation sections for backward compatibility (default: true) */
    autoGenerate?: boolean;
  };

  /** Three-layer sync configuration (increment → living docs → external tools) */
  threeLayerSync?: {
    /** Enable three-layer sync (default: true) */
    enabled?: boolean;

    /** Auto-sync after task completion (default: true) */
    autoSync?: boolean;
  };
}

/**
 * Child Repository Configuration (v0.31.0+)
 *
 * Defines a child repository in an umbrella/multi-repo project.
 * Used by living docs builder to detect and analyze nested repositories.
 */
export interface ChildRepoConfig {
  /** Unique identifier (usually repo name) */
  id: string;

  /** Relative path from project root */
  path: string;

  /** Display name */
  name: string;

  /** Team this repo belongs to (derived from ADO area path or folder structure) */
  team?: string;

  /** ADO area path (e.g., "Acme\\Inventory") */
  areaPath?: string;

  /** When the repo was cloned */
  clonedAt?: string;

  /** Clone status */
  status?: 'cloned' | 'failed' | 'skipped';
}

/**
 * Umbrella Repository Configuration (v0.31.0+)
 *
 * Configuration for umbrella/multi-repo projects where multiple
 * independent git repositories are cloned into subdirectories.
 * Used by living docs builder to detect and analyze each child repo.
 */
export interface UmbrellaConfig {
  /** Is umbrella mode enabled */
  enabled: boolean;

  /** Child repositories */
  childRepos: ChildRepoConfig[];

  /** Source of detection ('clone-job' | 'config' | 'git-scan') */
  detectedFrom?: string;

  /** When detection occurred */
  detectedAt?: string;
}

/**
 * External Tool Mapping for GitHub (v0.34.0+)
 *
 * Maps a SpecWeave project to a GitHub repository
 */
export interface GitHubMapping {
  /** GitHub organization or username */
  owner: string;

  /** Repository name */
  repo: string;
}

/**
 * External Tool Mapping for JIRA (v0.34.0+)
 *
 * Maps a SpecWeave project to a JIRA project/board
 */
export interface JiraMapping {
  /** JIRA project key (e.g., "BE", "FE", "MOBILE") */
  project: string;

  /** JIRA board name (optional) */
  board?: string;
}

/**
 * External Tool Mapping for Azure DevOps (v0.34.0+)
 *
 * Maps a SpecWeave project to an ADO project/area path
 */
export interface AdoMapping {
  /** ADO project name */
  project: string;

  /** ADO area path (e.g., "Mobile\\iOS") */
  areaPath?: string;
}

/**
 * Project Mapping Configuration (v0.34.0+)
 *
 * Defines external tool targets for a single SpecWeave project.
 * A project can have multiple external mappings (e.g., GitHub AND JIRA).
 */
export interface ProjectMapping {
  /** GitHub repository mapping (optional) */
  github?: GitHubMapping;

  /** JIRA project mapping (optional) */
  jira?: JiraMapping;

  /** Azure DevOps mapping (optional) */
  ado?: AdoMapping;
}

/**
 * Project Mappings (v0.34.0+)
 *
 * Maps SpecWeave project IDs to external tool configurations.
 * Used by per-US sync to route each User Story to its correct external location.
 *
 * Key: SpecWeave project ID (e.g., "frontend-app", "backend-api")
 * Value: ProjectMapping with external tool targets
 */
export type ProjectMappings = Record<string, ProjectMapping>;

/**
 * Plugin Auto-Load Configuration (v1.0.140+)
 *
 * Controls automatic plugin detection and installation.
 * Uses LLM (Claude Haiku) to analyze prompts and determine which plugins are needed.
 */
export interface PluginAutoLoadConfig {
  /**
   * Enable automatic plugin detection and installation
   *
   * When true (default): Uses Claude Haiku to analyze prompts and detect needed plugins.
   * This is more accurate than keyword matching but adds ~5-6 seconds overhead per prompt.
   *
   * When false: Disables ALL plugin detection for maximum speed (no overhead).
   * Use this if you always load all plugins upfront or want fastest response.
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Increment Assist Configuration (v1.0.141+)
 *
 * Controls intelligent increment creation suggestions.
 * Uses LLM (Claude Haiku) to analyze prompts and determine if work should be tracked
 * in a new increment, existing increment, or done as a quick fix without tracking.
 *
 * This helps enforce spec-driven development discipline by suggesting structured workflow
 * when appropriate, while allowing quick fixes to bypass overhead.
 */
export interface IncrementAssistConfig {
  /**
   * Enable increment creation suggestions
   *
   * When true (default): LLM analyzes prompts and suggests:
   * - Creating new increments for features/significant work
   * - Reopening existing increments for related fixes
   * - Proceeding without increment for quick fixes/typos
   *
   * When false: Disables increment suggestions for maximum speed.
   * Use this if you prefer manual increment management.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Suggest creating new increments for feature work
   *
   * When true (default): Suggests `/sw:increment` for new features, multi-file changes,
   * new functionality that should be spec'd and tracked.
   *
   * @default true
   */
  suggestNewIncrement?: boolean;

  /**
   * Suggest reopening existing increments for related work
   *
   * When true (default): When user mentions work related to a recent increment
   * (e.g., "the login feature is broken"), suggests reopening that increment
   * instead of creating a new one.
   *
   * @default true
   */
  suggestReopen?: boolean;

  /**
   * Minimum confidence threshold for suggestions (0.0-1.0)
   *
   * Only show increment suggestions when LLM confidence exceeds this threshold.
   * Lower = more suggestions, higher = fewer but more confident suggestions.
   *
   * @default 0.7
   */
  confidenceThreshold?: number;

  /**
   * Make increment creation MANDATORY for feature work (v1.0.160+)
   *
   * When true: High-confidence feature detection uses blocking language,
   * telling Claude it MUST create an increment before implementing.
   * This enforces spec-driven development discipline.
   *
   * When false (default): Uses advisory language ("consider creating"),
   * allowing Claude to proceed without increment if appropriate.
   *
   * Note: Even when false, confidence >= 0.85 triggers mandatory mode
   * since very high confidence indicates clear feature work.
   *
   * @default false
   */
  mandatory?: boolean;
}

/**
 * Complete SpecWeave Configuration
 *
 * Represents the structure of .specweave/config.json
 */
export interface SpecweaveConfig {
  /** Plugin configuration */
  plugins?: PluginConfig;

  /** Project metadata */
  project?: ProjectMetadata;

  /** Multi-project configuration (v1.0.0+ Universal Hierarchy) */
  multiProject?: MultiProjectConfig;

  /** Adapter configuration */
  adapters?: AdapterConfig;

  /** Testing configuration */
  testing?: TestingConfig;

  /** Primary language for generated content and CLI */
  language?: SupportedLanguage;

  /** Translation settings for multilingual support */
  translation?: TranslationConfig;

  /** WIP limits configuration */
  limits?: LimitsConfig;

  /** Global command deduplication configuration (v0.17.18+) */
  deduplication?: DeduplicationConfig;

  /** Archiving configuration for increment management */
  archiving?: ArchivingConfig;

  /** Living docs configuration (v0.21.4+) */
  livingDocs?: LivingDocsConfig;

  /** API documentation configuration (v1.0.58+) */
  apiDocs?: ApiDocsConfig;

  /** Umbrella repository configuration (v0.31.0+) */
  umbrella?: UmbrellaConfig;

  /**
   * Project Mappings (v0.34.0+)
   *
   * Maps SpecWeave project IDs to external tool targets (GitHub repos, JIRA projects, ADO areas).
   * Used for per-US sync to route each User Story to its correct external location.
   *
   * @example
   * ```json
   * {
   *   "frontend-app": {
   *     "github": { "owner": "myorg", "repo": "frontend-app" }
   *   },
   *   "backend-api": {
   *     "jira": { "project": "BE", "board": "api-team" }
   *   },
   *   "mobile-app": {
   *     "ado": { "project": "MobileApp", "areaPath": "Mobile\\iOS" }
   *   }
   * }
   * ```
   */
  projectMappings?: ProjectMappings;

  /** Plugin auto-load configuration (v1.0.140+) */
  pluginAutoLoad?: PluginAutoLoadConfig;

  /** Increment assist configuration (v1.0.141+) */
  incrementAssist?: IncrementAssistConfig;

  /** Allow additional properties */
  [key: string]: any;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<SpecweaveConfig> = {
  language: 'en',
  translation: {
    languages: ['en'],
    primary: 'en',
    method: 'auto',
    preserveFrameworkTerms: true,
  },
  adapters: {
    default: 'claude',
  },
  testing: {
    defaultTestMode: 'test-after',
    defaultCoverageTarget: 50,  // Realistic default (v1.0.9+) - 0 = no tracking
    coverageTargets: {
      unit: 55,     // Slightly higher for units
      integration: 50,
      e2e: 60,      // E2E covers critical paths
    },
  },
  limits: {
    maxActiveIncrements: 1,        // v0.7.0+: 1 active increment (maximum focus)
    hardCap: 3,                    // Soft ceiling with warning (negotiable)
    allowEmergencyInterrupt: true, // Allow hotfix/bug to interrupt
    typeBehaviors: {
      canInterrupt: [IncrementType.HOTFIX, IncrementType.BUG], // Only emergencies can interrupt
      autoAbandonDays: {
        experiment: 14,            // Auto-abandon stale experiments
      },
    },
    staleness: {
      paused: 7,                   // Warn if paused >7 days
      active: 30,                  // Warn if active >30 days
    },
  },
  deduplication: {
    enabled: true,                 // v0.17.18+: Prevent duplicate command invocations
    windowMs: 1000,                // 1 second window
    maxCacheSize: 1000,            // Keep last 1000 invocations
    debug: false,                  // Disable debug logging
    cleanupIntervalMs: 60000,      // Cleanup every minute
  },
  archiving: {
    keepLast: 5,                   // Keep last 5 increments in main folder
    autoArchive: false,            // Manual archiving by default
    archiveAfterDays: 60,          // Archive after 60 days of inactivity
    preserveActive: true,          // Never archive active/paused increments
    archiveCompleted: false,       // Don't auto-archive completed (manual control)
    archivePatterns: [],           // No patterns by default
    preserveList: [],              // No preserved increments by default
  },
  livingDocs: {
    copyBasedSync: {
      enabled: true,               // v0.21.4+: Copy-based sync (increment → living docs)
      autoGenerate: true,          // Auto-generate ## Implementation for backward compatibility
    },
    threeLayerSync: {
      enabled: true,               // Three-layer sync (increment → living docs → external)
      autoSync: true,              // Auto-sync after task completion
    },
  },
  apiDocs: {
    enabled: false,                // v1.0.58+: Opt-in, auto-enabled for detected API projects
    openApiPath: 'openapi.yaml',   // OpenAPI spec location
    autoGenerateOpenApi: true,     // Auto-generate from decorators if framework supports
    generatePostman: true,         // Generate Postman collection from OpenAPI
    postmanPath: 'postman-collection.json',
    postmanEnvPath: 'postman-environment.json', // Environment file from .env
    generateOn: 'on-increment-done', // When to regenerate (recommended: on increment close)
    watchPatterns: [               // API file patterns for change detection
      '**/routes/**',
      '**/controllers/**',
      '**/api/**',
      '**/endpoints/**',
    ],
    baseUrl: 'http://localhost:3000',
  },
  hooks: {
    post_task_completion: {
      sync_living_docs: true,      // CRITICAL: Auto-sync living docs after every task
      sync_tasks_md: true,         // Update tasks.md with completion status
      external_tracker_sync: true, // Sync to GitHub/Jira/ADO automatically
    },
  },
  sync: {
    statusSync: {
      enabled: true,
      autoSync: true,
      promptUser: true,
      conflictResolution: 'last-write-wins',
      mappings: {
        github: {
          planning: 'open',
          active: { state: 'open', labels: ['in-progress'] },
          paused: { state: 'open', labels: ['paused'] },
          completed: 'closed',
          abandoned: { state: 'closed', labels: ['wontfix'] }
        },
        jira: {
          planning: 'To Do',
          active: 'In Progress',
          paused: 'On Hold',
          completed: 'Done',
          abandoned: 'Cancelled'
        },
        ado: {
          planning: 'New',
          active: 'Active',
          paused: 'On Hold',
          completed: 'Closed',
          abandoned: 'Removed'
        }
      }
    }
  },
  pluginAutoLoad: {
    enabled: true,  // v1.0.140+: LLM-based plugin detection enabled by default
  },
  incrementAssist: {
    enabled: true,              // v1.0.141+: LLM-based increment suggestions enabled by default
    suggestNewIncrement: true,  // Suggest /sw:increment for new features
    suggestReopen: true,        // Suggest reopening related increments
    confidenceThreshold: 0.7,   // Only show suggestions above 70% confidence
    mandatory: false,           // v1.0.160+: When true, forces increment creation for features
  },
};

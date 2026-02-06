/**
 * SpecWeave Configuration Types
 *
 * Defines the structure for .specweave/config.json
 *
 * @module core/config/types
 */

import type { SyncOrchestrationConfig } from '../types/sync-config.js';
import type { PluginConfig } from '../types/plugin.js';
import { IncrementType } from '../types/increment-metadata.js';

/**
 * Repository provider types
 */
export type RepositoryProvider = 'local' | 'github' | 'bitbucket' | 'ado' | 'gitlab' | 'generic';

/**
 * Git URL format types (v1.0.7+)
 */
export type GitUrlFormat = 'ssh' | 'https';

/**
 * Issue tracker provider types
 */
export type IssueTrackerProvider = 'none' | 'jira' | 'github' | 'ado';

/**
 * Jira instance types
 */
export type JiraInstanceType = 'cloud' | 'server';

/**
 * Jira organization strategies
 */
export type JiraStrategy = 'single-project' | 'project-per-team' | 'component-based' | 'board-based';

/**
 * Sync direction types
 */
export type SyncDirection = 'import' | 'export' | 'bidirectional';

/**
 * Repository configuration
 */
export interface RepoConfig {
  name: string;
  url: string;
  path?: string;
  branch?: string;
  specweaveProject?: string;  // Maps to .specweave/docs/internal/specs/{project}/
}

/**
 * Jira project configuration
 */
export interface JiraProjectConfig {
  key: string;
  id?: string;
  name?: string;
  specweaveProject?: string;  // Maps to .specweave/docs/internal/specs/{project}/
}

/**
 * Jira board configuration
 */
export interface JiraBoardConfig {
  id: string;
  name?: string;
}

/**
 * Repository configuration section
 */
export interface RepositoryConfiguration {
  provider: RepositoryProvider;
  organization?: string;
  repos?: RepoConfig[];
  /** Git URL format preference (SSH or HTTPS) - v1.0.7+ */
  gitUrlFormat?: GitUrlFormat;
}

/**
 * Issue tracker configuration section
 */
export interface IssueTrackerConfiguration {
  provider: IssueTrackerProvider;

  // Jira-specific configuration
  domain?: string;
  instanceType?: JiraInstanceType;
  strategy?: JiraStrategy;
  projects?: JiraProjectConfig[];
  components?: string[];  // For component-based strategy
  boards?: JiraBoardConfig[];  // For board-based strategy

  // GitHub-specific configuration
  owner?: string;
  repo?: string;
  repos?: string[];  // For multi-repo strategy

  // Azure DevOps-specific configuration
  organization_ado?: string;
  project?: string;
}

/**
 * Sync profile configuration (simplified for config serialization)
 *
 * NOTE: This is a SIMPLIFIED type for config.json serialization.
 * For the full operational type with all fields (strategy, hierarchyMapping, etc.),
 * use `SyncProfile` from `../types/sync-profile.js` instead.
 *
 * @see ../types/sync-profile.ts for the full operational type
 */
export interface SyncProfile {
  provider: string;
  displayName: string;
  config: {
    owner?: string;
    repo?: string;
    domain?: string;
    projectKey?: string;
    projects?: string[];  // For multi-project Jira
    organization?: string;
    project?: string;
    monorepoProjects?: string[];  // For monorepo GitHub
  };
  timeRange: {
    default: string;
    max: string;
  };
  rateLimits?: {
    maxItemsPerSync: number;
    warnThreshold: number;
  };
}

/**
 * Sync settings
 */
export interface SyncSettings {
  canUpsertInternalItems: boolean;
  canUpdateExternalItems: boolean;
  canUpdateStatus: boolean;
  /**
   * GATE 3: Controls automatic sync on increment completion
   * When true, sync happens automatically when increment completes
   * When false, user must manually trigger sync via /specweave-github:sync
   * @default true (opt-in UX, as per ADR-0065)
   */
  autoSyncOnCompletion?: boolean;
}

/**
 * GitHub-specific configuration
 */
export interface GitHubConfig {
  /**
   * GATE 4: Enable/disable GitHub sync specifically
   * @default true (when GitHub is configured)
   */
  enabled?: boolean;
  owner?: string;
  repo?: string;
}

/**
 * Jira-specific configuration
 */
export interface JiraConfig {
  /**
   * GATE 4: Enable/disable Jira sync specifically
   * @default false (opt-in)
   */
  enabled?: boolean;
  domain?: string;
  projectKey?: string;
}

/**
 * Azure DevOps-specific configuration
 */
export interface AzureDevOpsConfig {
  /**
   * GATE 4: Enable/disable Azure DevOps sync specifically
   * @default false (opt-in)
   */
  enabled?: boolean;
  organization?: string;
  project?: string;
}

/**
 * Sync configuration section
 */
export interface SyncConfiguration {
  enabled: boolean;
  direction: SyncDirection;
  autoSync: boolean;
  includeStatus: boolean;
  autoApplyLabels: boolean;
  provider?: string;  // Exclusive provider (jira, github, ado)

  /**
   * Default profile (fallback when increment doesn't specify one)
   */
  defaultProfile?: string;

  /**
   * GATE 5: Auto-create external issues on increment creation (v1.0.19+)
   *
   * When true, automatically creates GitHub/JIRA/ADO issues when:
   * - A new increment is created (post-increment-planning hook)
   * - sync-progress runs and no issue exists
   *
   * When false (default), user must manually run:
   * - /sw-github:create for GitHub
   * - /sw-jira:create for JIRA
   * - /sw-ado:create for Azure DevOps
   *
   * @default false (opt-in for safety)
   */
  autoCreateOnIncrement?: boolean;

  settings?: SyncSettings;
  profiles?: Record<string, SyncProfile>;  // Profile configurations

  // Tool-specific configurations (GATE 4)
  github?: GitHubConfig;
  jira?: JiraConfig;
  ado?: AzureDevOpsConfig;

  /**
   * Orchestration configuration (scheduler, permissions, discrepancy, notifications)
   * Added in v0.29.0 for Unified Sync Orchestration feature
   */
  orchestration?: SyncOrchestrationConfig;
}

/**
 * Hook configuration
 */
export interface HookConfiguration {
  post_task_completion?: {
    sync_living_docs?: boolean;
    sync_tasks_md?: boolean;
    external_tracker_sync?: boolean;
  };
  post_increment_planning?: {
    auto_create_github_issue?: boolean;
  };
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  name?: string;
  version?: string;
  description?: string;
  techStack?: string[];
  team?: string;
}

/**
 * Adapter configuration
 */
export interface AdapterConfiguration {
  default: string;
}

/**
 * Status line configuration
 */
export interface StatusLineConfiguration {
  /**
   * Enable status line display
   */
  enabled: boolean;

  /**
   * Maximum age of cache before showing stale warning (ms)
   */
  maxCacheAge: number;

  /**
   * Width of progress bar (characters)
   */
  progressBarWidth: number;

  /**
   * Maximum length for increment name
   */
  maxNameLength: number;
}

/**
 * Child repo configuration for umbrella mode
 *
 * ID STRATEGY (IMPORTANT):
 * The `id` field should match the canonical name from your source of truth:
 *
 * | Scenario              | ID Source                | Example                          |
 * |-----------------------|--------------------------|----------------------------------|
 * | 1:1 Repo Mapping      | Exact repo name          | `sw-qr-menu-fe`                  |
 * | JIRA Project          | Project key (lowercase)  | `WEBAPP` → `webapp`              |
 * | ADO Project           | Project name (kebab)     | `Frontend Team` → `frontend-team`|
 * | Area Path             | Last segment (kebab)     | `Product\Web` → `web`            |
 * | Monorepo Package      | Package name             | `@acme/frontend` → `frontend`    |
 *
 * RULE: ID should be predictable from source - no arbitrary abbreviations!
 * - ✅ `id: "sw-qr-menu-fe"` (matches repo name)
 * - ❌ `id: "fe"` (arbitrary, what if 2 frontend repos?)
 */
export interface ChildRepoConfig {
  /**
   * Repo identifier - MUST match canonical source name:
   * - GitHub repo: exact repo name (e.g., 'sw-qr-menu-fe')
   * - JIRA: project key lowercase (e.g., 'webapp')
   * - ADO: project name kebab-case (e.g., 'frontend-team')
   */
  id: string;
  /** Path to repo (relative or absolute) */
  path: string;
  /**
   * User story prefix for US-{PREFIX}-001 format.
   * Can be short (FE, BE) even if id is long.
   * Example: id='sw-qr-menu-fe', prefix='FE' → US-FE-001
   */
  prefix: string;
  /** GitHub URL for this repo */
  githubUrl?: string;
  /** JIRA project key (if JIRA is source of truth for this project) */
  jiraProject?: string;
  /** ADO project name (if ADO is source of truth for this project) */
  adoProject?: string;
  /** Tech stack keywords for story routing */
  techStack?: string[];
}

/**
 * Umbrella/multi-repo configuration
 */
export interface UmbrellaConfig {
  /** Enable umbrella mode */
  enabled: boolean;
  /** Optional parent/coordination repo name */
  parentRepo?: string;
  /** Child repos with their prefixes */
  childRepos: ChildRepoConfig[];
  /** Story routing configuration */
  storyRouting?: {
    /** Enable automatic story routing by keywords */
    enabled: boolean;
    /** Default repo for cross-cutting stories */
    defaultRepo: string;
  };
}

/**
 * GitHub project mapping for per-US targeting
 * @since v0.34.0
 */
export interface GitHubProjectMapping {
  /** GitHub owner (org or user) */
  owner: string;
  /** GitHub repository name */
  repo: string;
}

/**
 * JIRA project mapping for per-US targeting
 * @since v0.34.0
 */
export interface JiraProjectMapping {
  /** JIRA project key (e.g., 'FE', 'BE', 'SECURITY') */
  project: string;
  /** Optional JIRA board name for 2-level structures */
  board?: string;
}

/**
 * ADO project mapping for per-US targeting
 * @since v0.34.0
 */
export interface AdoProjectMapping {
  /** ADO project name */
  project: string;
  /** Optional ADO area path (e.g., 'infrastructure/security') */
  areaPath?: string;
}

/**
 * External tool mappings for a single project
 * Each project can be mapped to multiple external tools
 * @since v0.34.0
 */
export interface ProjectMapping {
  /** GitHub repository mapping */
  github?: GitHubProjectMapping;
  /** JIRA project mapping */
  jira?: JiraProjectMapping;
  /** Azure DevOps project mapping */
  ado?: AdoProjectMapping;
}

/**
 * Project mappings for cross-project targeting
 * Maps SpecWeave project IDs to external tool targets
 * @since v0.34.0
 *
 * @example
 * ```json
 * {
 *   "frontend-app": {
 *     "github": { "owner": "myorg", "repo": "frontend-app" }
 *   },
 *   "backend-api": {
 *     "jira": { "project": "BE", "board": "api-team" }
 *   }
 * }
 * ```
 */
export type ProjectMappings = Record<string, ProjectMapping>;

/**
 * Backward-compatible aliases for mapping types
 * @deprecated Use GitHubProjectMapping, JiraProjectMapping, AdoProjectMapping
 */
export type GitHubMapping = GitHubProjectMapping;
export type JiraMapping = JiraProjectMapping;
export type AdoMapping = AdoProjectMapping;

/**
 * Supported languages for SpecWeave
 * Re-exported here for config type completeness
 */
export type SupportedLanguage =
  | 'en'
  | 'ru'
  | 'es'
  | 'zh'
  | 'de'
  | 'fr'
  | 'ja'
  | 'ko'
  | 'pt';

/**
 * Translation scope - what gets auto-translated
 *
 * CRITICAL: Translation can ~2x token usage
 * User MUST explicitly opt-in during init
 */
export interface TranslationScope {
  /** Auto-translate spec.md, plan.md, tasks.md after creation */
  incrementSpecs: boolean;
  /** Auto-translate living docs on update */
  livingDocs: boolean;
  /** Auto-translate GitHub/JIRA/ADO issues on sync */
  externalSync: boolean;
}

/**
 * Translation configuration
 *
 * Controls automatic translation of SpecWeave content.
 * English is always the source language (for maintainability).
 * User's configured language is the output language.
 */
export interface TranslationConfiguration {
  /**
   * Master switch for auto-translation
   * When false, user must use /sw:translate manually
   */
  enabled: boolean;

  /**
   * Enabled languages for this project
   * Always includes 'en' as source language
   */
  languages: SupportedLanguage[];

  /**
   * Primary output language for user
   * This is the language content will be translated TO
   */
  primary: SupportedLanguage;

  /**
   * Translation method
   * - 'auto': Hooks trigger translation automatically
   * - 'manual': User must run /sw:translate
   * - 'none': Translation disabled entirely
   */
  method: 'auto' | 'manual' | 'none';

  /**
   * Keep SpecWeave framework terms in English
   * e.g., increment, spec.md, tasks.md, /sw:*
   */
  preserveFrameworkTerms: boolean;

  /**
   * What to auto-translate (only when method='auto')
   */
  scope: TranslationScope;

  /**
   * Keep English originals as .en.md files
   * Safer option but uses more storage
   */
  keepEnglishOriginals: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// Interfaces consolidated from src/core/types/config.ts (0188)
// ═══════════════════════════════════════════════════════════════════

/**
 * Testing mode options
 */
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

/**
 * TDD Enforcement Level
 * @since 1.0.111
 */
export type TDDEnforcement = 'strict' | 'warn' | 'off';

/**
 * Coverage target configuration
 */
export interface CoverageTargets {
  unit: number;
  integration: number;
  e2e: number;
}

/**
 * Testing configuration
 */
export interface TestingConfig {
  defaultTestMode: TestMode;
  defaultCoverageTarget: number;
  coverageTargets: CoverageTargets;
  tddEnforcement?: TDDEnforcement;
}

/**
 * WIP Limits Configuration (v0.7.0+)
 */
export interface LimitsConfig {
  maxActiveIncrements?: number;
  hardCap?: number;
  allowEmergencyInterrupt?: boolean;
  typeBehaviors?: {
    canInterrupt?: (IncrementType | string)[];
    autoAbandonDays?: {
      experiment?: number;
    };
  };
  staleness?: {
    paused?: number;
    active?: number;
  };
}

/**
 * Global command deduplication configuration (v0.17.18+)
 */
export interface DeduplicationConfig {
  enabled?: boolean;
  windowMs?: number;
  maxCacheSize?: number;
  debug?: boolean;
  cleanupIntervalMs?: number;
}

/**
 * Archiving Configuration
 */
export interface ArchivingConfig {
  keepLast?: number;
  autoArchive?: boolean;
  archiveAfterDays?: number;
  preserveActive?: boolean;
  archiveCompleted?: boolean;
  archivePatterns?: string[];
  preserveList?: string[];
}

/**
 * Living Docs Configuration (v0.21.4+)
 */
export interface LivingDocsConfig {
  copyBasedSync?: {
    enabled?: boolean;
    autoGenerate?: boolean;
  };
  threeLayerSync?: {
    enabled?: boolean;
    autoSync?: boolean;
  };
}

/**
 * API Documentation Configuration (v1.0.58+)
 */
export interface ApiDocsConfig {
  enabled?: boolean;
  openApiPath?: string;
  autoGenerateOpenApi?: boolean;
  generatePostman?: boolean;
  postmanPath?: string;
  postmanEnvPath?: string;
  generateOn?: 'on-increment-done' | 'on-api-change' | 'manual';
  watchPatterns?: string[];
  baseUrl?: string;
}

/**
 * Plugin Auto-Load Configuration (v1.0.140+)
 */
export interface PluginAutoLoadConfig {
  enabled?: boolean;
}

/**
 * Increment Assist Configuration (v1.0.141+)
 */
export interface IncrementAssistConfig {
  enabled?: boolean;
  suggestNewIncrement?: boolean;
  suggestReopen?: boolean;
  confidenceThreshold?: number;
  mandatory?: boolean;
}

/**
 * Deep Interview Mode Configuration (v1.0.195+)
 */
export interface DeepInterviewConfig {
  enabled?: boolean;
  minQuestions?: number;
  categories?: Array<'architecture' | 'integrations' | 'ui-ux' | 'performance' | 'security' | 'edge-cases'>;
}

/**
 * Planning Configuration (v1.0.195+)
 */
export interface PlanningConfig {
  deepInterview?: DeepInterviewConfig;
}

/**
 * CI/CD Configuration (v1.0.231+)
 * Controls push strategy, auto-fix behavior, and monitoring defaults.
 * The cicd config-loader reads from this section first, then falls back to env vars.
 */
export interface CiCdConfig {
  /** Push strategy: 'direct' pushes to branch, 'pr-based' creates pull requests */
  pushStrategy: 'direct' | 'pr-based';
  /** Auto-fix configuration for CI failures */
  autoFix: {
    /** Enable automatic fix attempts on CI failure */
    enabled: boolean;
    /** Maximum retry attempts before giving up */
    maxRetries: number;
    /** Branches where auto-fix is allowed */
    allowedBranches: string[];
  };
  /** Monitoring configuration (optional, overrides env vars) */
  monitoring?: {
    /** Poll interval in milliseconds */
    pollInterval: number;
    /** Auto-notify on workflow completion */
    autoNotify: boolean;
  };
}

/**
 * Multi-Project Configuration (v1.0.0+)
 */
export interface MultiProjectConfig {
  enabled?: boolean;
  projects?: Record<string, ProjectConfig>;
}

/**
 * Individual Project Configuration
 */
export interface ProjectConfig {
  id?: string;
  name: string;
  description?: string;
  keywords?: string[];
  techStack?: string[];
  team?: string;
  externalTools?: {
    github?: { repository?: string };
    jira?: { project?: string };
    ado?: { project?: string };
  };
}

/**
 * Adapter configuration (rich version from types/config.ts)
 */
export interface AdapterConfig {
  default?: 'claude' | 'cursor' | 'generic';
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════
// End consolidated interfaces
// ═══════════════════════════════════════════════════════════════════

/**
 * Main SpecWeave configuration
 */
export interface SpecWeaveConfig {
  /**
   * Config version for migration support
   */
  version: string;

  /**
   * Project display language
   * Content will be translated TO this language if translation is enabled
   * @default 'en'
   */
  language?: SupportedLanguage;

  /**
   * Translation configuration
   * Controls automatic translation of specs, living docs, and external sync
   *
   * CRITICAL: Translation can ~2x token usage
   * User MUST explicitly opt-in during init
   */
  translation?: TranslationConfiguration;

  /**
   * Project metadata (optional, for backward compatibility)
   */
  project?: ProjectMetadata;

  /**
   * Adapter configuration (optional, for backward compatibility)
   */
  adapters?: AdapterConfiguration;

  /**
   * Hook configuration (optional)
   */
  hooks?: HookConfiguration;

  /**
   * Repository provider configuration
   */
  repository?: RepositoryConfiguration;

  /**
   * Issue tracker configuration
   */
  issueTracker?: IssueTrackerConfiguration;

  /**
   * Sync configuration
   */
  sync?: SyncConfiguration;

  /**
   * Status line configuration (optional)
   */
  statusLine?: StatusLineConfiguration;

  /**
   * Umbrella/multi-repo configuration (optional)
   */
  umbrella?: UmbrellaConfig;

  /**
   * Project mappings for cross-project targeting (v0.34.0+)
   *
   * Maps SpecWeave project IDs to external tool targets.
   * Allows per-US sync to different repos/projects.
   *
   * @example
   * ```json
   * {
   *   "frontend-app": {
   *     "github": { "owner": "myorg", "repo": "frontend-app" }
   *   },
   *   "backend-api": {
   *     "jira": { "project": "BE", "board": "api-team" }
   *   }
   * }
   * ```
   */
  projectMappings?: ProjectMappings;

  // Fields consolidated from src/core/types/config.ts (0188)

  /** Plugin configuration */
  plugins?: PluginConfig;

  /** Multi-project configuration (v1.0.0+) */
  multiProject?: MultiProjectConfig;

  /** Testing configuration */
  testing?: TestingConfig;

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

  /** Plugin auto-load configuration (v1.0.140+) */
  pluginAutoLoad?: PluginAutoLoadConfig;

  /** Increment assist configuration (v1.0.141+) */
  incrementAssist?: IncrementAssistConfig;

  /** Planning configuration including deep interview mode (v1.0.195+) */
  planning?: PlanningConfig;

  /** CI/CD configuration (v1.0.231+) */
  cicd?: CiCdConfig;

  /** Allow additional properties for forward compatibility */
  [key: string]: any;
}

/**
 * Backward-compatible alias for SpecWeaveConfig
 * @deprecated Use SpecWeaveConfig from src/core/config/types.ts instead
 */
export type SpecweaveConfig = SpecWeaveConfig;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SpecWeaveConfig = {
  version: '2.0',
  language: 'en',
  translation: {
    enabled: false,
    languages: ['en'],
    primary: 'en',
    method: 'auto',
    preserveFrameworkTerms: true,
    scope: {
      incrementSpecs: false,
      livingDocs: false,
      externalSync: false,
    },
    keepEnglishOriginals: false,
  },
  adapters: {
    default: 'claude',
  },
  repository: {
    provider: 'local',
  },
  issueTracker: {
    provider: 'none',
  },
  testing: {
    defaultTestMode: 'TDD',
    defaultCoverageTarget: 90,
    coverageTargets: {
      unit: 95,
      integration: 90,
      e2e: 100,
    },
  },
  limits: {
    maxActiveIncrements: 1,
    hardCap: 3,
    allowEmergencyInterrupt: true,
    typeBehaviors: {
      canInterrupt: [IncrementType.HOTFIX, IncrementType.BUG],
      autoAbandonDays: {
        experiment: 14,
      },
    },
    staleness: {
      paused: 7,
      active: 30,
    },
  },
  deduplication: {
    enabled: true,
    windowMs: 1000,
    maxCacheSize: 1000,
    debug: false,
    cleanupIntervalMs: 60000,
  },
  archiving: {
    keepLast: 5,
    autoArchive: false,
    archiveAfterDays: 60,
    preserveActive: true,
    archiveCompleted: false,
    archivePatterns: [],
    preserveList: [],
  },
  livingDocs: {
    copyBasedSync: {
      enabled: true,
      autoGenerate: true,
    },
    threeLayerSync: {
      enabled: true,
      autoSync: true,
    },
  },
  apiDocs: {
    enabled: false,
    openApiPath: 'openapi.yaml',
    autoGenerateOpenApi: true,
    generatePostman: true,
    postmanPath: 'postman-collection.json',
    postmanEnvPath: 'postman-environment.json',
    generateOn: 'on-increment-done',
    watchPatterns: [
      '**/routes/**',
      '**/controllers/**',
      '**/api/**',
      '**/endpoints/**',
    ],
    baseUrl: 'http://localhost:3000',
  },
  hooks: {
    post_task_completion: {
      sync_living_docs: true,
      sync_tasks_md: true,
      external_tracker_sync: true,
    },
  },
  sync: {
    enabled: false,
    direction: 'bidirectional',
    autoSync: false,
    includeStatus: true,
    autoApplyLabels: true,
  },
  statusLine: {
    enabled: true,
    maxCacheAge: 30000,
    progressBarWidth: 8,
    maxNameLength: 30,
  },
  pluginAutoLoad: {
    enabled: true,
  },
  incrementAssist: {
    enabled: true,
    suggestNewIncrement: true,
    suggestReopen: true,
    confidenceThreshold: 0.7,
    mandatory: false,
  },
  planning: {
    deepInterview: {
      enabled: false,
      minQuestions: 5,
      categories: [
        'architecture',
        'integrations',
        'ui-ux',
        'performance',
        'security',
        'edge-cases',
      ],
    },
  },
  cicd: {
    pushStrategy: 'direct',
    autoFix: {
      enabled: true,
      maxRetries: 1,
      allowedBranches: ['develop', 'main'],
    },
  },
};

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

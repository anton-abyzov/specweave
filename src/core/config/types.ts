/**
 * SpecWeave Configuration Types
 *
 * Defines the structure for .specweave/config.json
 *
 * @module core/config/types
 */

/**
 * Repository provider types
 */
export type RepositoryProvider = 'local' | 'github' | 'bitbucket' | 'ado' | 'gitlab' | 'generic';

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
 * Sync profile configuration
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
  activeProfile?: string;  // Active profile key
  settings?: SyncSettings;
  profiles?: Record<string, SyncProfile>;  // Profile configurations

  // Tool-specific configurations (GATE 4)
  github?: GitHubConfig;
  jira?: JiraConfig;
  ado?: AzureDevOpsConfig;
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
  name: string;
  version: string;
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
   * When false, user must use /specweave:translate manually
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
   * - 'manual': User must run /specweave:translate
   * - 'none': Translation disabled entirely
   */
  method: 'auto' | 'manual' | 'none';

  /**
   * Keep SpecWeave framework terms in English
   * e.g., increment, spec.md, tasks.md, /specweave:*
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
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SpecWeaveConfig = {
  version: '2.0',
  repository: {
    provider: 'local'
  },
  issueTracker: {
    provider: 'none'
  },
  sync: {
    enabled: false,
    direction: 'bidirectional',
    autoSync: false,
    includeStatus: true,
    autoApplyLabels: true
  },
  statusLine: {
    enabled: true,
    maxCacheAge: 30000, // 30 seconds
    progressBarWidth: 8,
    maxNameLength: 30
  }
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

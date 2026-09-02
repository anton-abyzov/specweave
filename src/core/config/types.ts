/**
 * SpecWeave Configuration Types
 *
 * Defines the structure for .specweave/config.json
 *
 * @module core/config/types
 */

import type { SyncOrchestrationConfig } from '../types/sync-config.js';
import type { PluginConfig } from '../types/plugin.js';
import type { AutoConfig } from '../auto/types.js';

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
   * When false, user must manually trigger sync via `specweave sync push`
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
   * - sw-github:create for GitHub
   * - sw-jira:create for JIRA
   * - sw-ado:create for Azure DevOps
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
    sync_tasks_md?: boolean;
    external_tracker_sync?: boolean;
  };
  post_increment_planning?: {
    auto_create_github_issue?: boolean;
    sync_living_docs?: boolean;
  };
  post_increment_done?: {
    sync_living_docs?: boolean;
    sync_to_github_project?: boolean;
    close_github_issue?: boolean;
    close_jira_issue?: boolean;
    close_ado_work_item?: boolean;
    /** Generic flag — applies to all providers as fallback */
    close_external_issue?: boolean;
    update_living_docs_first?: boolean;
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
/**
 * Per-child-repo GitHub sync target
 */
export interface ChildRepoGitHubSync {
  owner: string;
  repo: string;
}

/**
 * Per-child-repo Jira sync target
 */
export interface ChildRepoJiraSync {
  projectKey: string;
}

/**
 * Per-child-repo Azure DevOps sync target
 */
export interface ChildRepoAdoSync {
  organization?: string;
  project: string;
}

/**
 * Sync configuration for a child repo in umbrella mode
 */
export interface ChildRepoSyncConfig {
  github?: ChildRepoGitHubSync;
  jira?: ChildRepoJiraSync;
  ado?: ChildRepoAdoSync;
}

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
  /** Display name (defaults to id if not set) */
  name?: string;
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
  /** Repository role (frontend, backend, mobile, infra, shared, other) */
  role?: string;
  /** Per-repo sync targets for distributed sync routing */
  sync?: ChildRepoSyncConfig;
}

/**
 * Umbrella/multi-repo configuration
 */
export interface UmbrellaConfig {
  /** Enable umbrella mode */
  enabled: boolean;
  /** Optional parent/coordination repo name */
  parentRepo?: string;
  /** Umbrella project name for umbrella-scoped increments (distinct from child repos) */
  projectName?: string;
  /** Child repos with their prefixes */
  childRepos: ChildRepoConfig[];
  /** Story routing configuration */
  storyRouting?: {
    /** Enable automatic story routing by keywords */
    enabled: boolean;
    /** Default repo for cross-cutting stories */
    defaultRepo: string;
  };
  /** Sync targets for the umbrella project itself (used when project matches umbrella.projectName) */
  sync?: ChildRepoSyncConfig;
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


// ═══════════════════════════════════════════════════════════════════
// Workspace Configuration (v3.0 — replaces umbrella + multiProject)
// ═══════════════════════════════════════════════════════════════════

/**
 * Per-repo sync targets for workspace repos
 * Structurally equivalent to ChildRepoSyncConfig but without legacy field names
 */
export interface WorkspaceRepoSync {
  github?: { owner: string; repo: string; direction?: string };
  jira?: { projectKey: string; domain?: string };
  ado?: { organization?: string; project: string };
}

/**
 * A repository within a workspace
 */
export interface WorkspaceRepo {
  /** Repo identifier — MUST match canonical source name */
  id: string;
  /** Path to repo (relative or absolute). May be absent in configs parsed from JSON. */
  path?: string;
  /** User story prefix for US-{PREFIX}-001 format */
  prefix: string;
  /** Display name (defaults to id if not set) */
  name?: string;
  /** Tech stack keywords for story routing */
  techStack?: string[];
  /** Repository role (frontend, backend, mobile, infra, shared, other) */
  role?: string;
  /** Sync targets for this repo */
  sync?: WorkspaceRepoSync;
}

/**
 * Unified workspace configuration
 * Replaces umbrella, multiProject, and projectMappings
 */
export interface WorkspaceConfig {
  /** Workspace display name */
  name: string;
  /** Sync targets for the root/umbrella repo itself */
  rootRepo?: WorkspaceRepoSync;
  /** All repos in this workspace */
  repos: WorkspaceRepo[];
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
 * Coverage target configuration.
 *
 * unit/integration: Istanbul/c8 line coverage percentage (0–100).
 * e2e: percentage of written e2e tests that must pass (not line coverage —
 *      Playwright does not produce Istanbul reports). 100 = all written
 *      e2e tests must pass; lower values are not meaningful in practice.
 */
export interface CoverageTargets {
  /** Istanbul/c8 line coverage % for unit tests */
  unit: number;
  /** Istanbul/c8 line coverage % for integration tests */
  integration: number;
  /** Pass-rate % for written e2e tests (not line coverage) */
  e2e: number;
}

/**
 * Playwright browser automation configuration
 */
export interface PlaywrightConfig {
  preferCli?: boolean;
  cliFlags?: string[];
}

/**
 * Testing configuration (2.0)
 *
 * `mode`     — how tests are written for new work (TDD | test-after | manual | none).
 * `commands` — the project's verification commands, run in order by
 *              `specweave verify` (falls back to stack auto-detection when empty).
 * `coverage` — coverage/pass-rate targets used by the closure validator.
 */
export interface TestingConfig {
  mode?: TestMode;
  commands?: string[];
  coverage?: CoverageTargets;
}

/**
 * Advisory WIP limit (2.0: no hard cap)
 *
 * `activeIncrements` is a recommendation only: when more increments are
 * active than this number, SpecWeave prints ONE info note. Nothing blocks.
 * 0 disables the note. Default: 3.
 */
export interface LimitsConfig {
  activeIncrements?: number;
}







/**
 * Deep-interview policy (2.0).
 *
 * 'off'  — never prompt for a structured interview before spec.md.
 * 'warn' — the planning skill asks the interview questions and notes gaps.
 *
 * Enforcement is skill-side only: no hook blocks a write in 2.0.
 */
export type DeepInterviewMode = 'off' | 'warn';

/**
 * Planning configuration
 */
export interface PlanningConfig {
  deepInterview?: DeepInterviewMode;
}

/**
 * Git branching configuration for pr-based push strategy (v1.0.437+)
 */
export interface GitConfig {
  /** Branch name prefix for increment branches. Default: 'sw/' */
  branchPrefix?: string;
  /** Target branch for pull requests. Default: 'main' */
  targetBranch?: string;
  /** Auto-delete branch after PR merge. Default: true */
  deleteOnMerge?: boolean;
  /** Include external ticket key (JIRA/ADO) as branch prefix. Default: false */
  includeExternalKey?: boolean;
}

/**
 * Environment definition for release promotion (v1.0.437+, enterprise)
 */
export interface EnvironmentConfig {
  /** Environment name (e.g., 'dev', 'staging', 'prod') */
  name: string;
  /** Target branch for this environment */
  branch?: string;
  /** Whether manual approval is required to promote to this env */
  requiresApproval?: boolean;
}

/**
 * Release strategy configuration (v1.0.437+, enterprise)
 */
export interface ReleaseConfig {
  /** Release strategy: 'trunk' (default), 'gitflow', 'env-promotion' */
  strategy?: 'trunk' | 'gitflow' | 'env-promotion';
  /** Ordered list of environments for env-promotion strategy */
  environments?: EnvironmentConfig[];
}

/**
 * CI/CD Configuration (v1.0.231+)
 * Controls push strategy, auto-fix behavior, and monitoring defaults.
 * The cicd config-loader reads from this section first, then falls back to env vars.
 */
export interface CiCdConfig {
  /** Push strategy: 'direct' pushes to branch, 'pr-based' creates pull requests */
  pushStrategy: 'direct' | 'pr-based';
  /** Git branching configuration for pr-based push strategy (v1.0.437+) */
  git?: GitConfig;
  /** Release strategy and environment promotion (v1.0.437+, enterprise) */
  release?: ReleaseConfig;
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
  /** Config schema version. 2.0 configs carry "2.0". */
  version: string;

  /** Project metadata (name is the only field SpecWeave itself reads). */
  project?: ProjectMetadata;

  /** Which instruction-file flavour this project generates (claude | codex | generic). */
  adapters?: AdapterConfiguration;

  /** Multi-repo workspace: the umbrella repo + its child repos. */
  workspace?: WorkspaceConfig;

  /** Test mode, verification commands and coverage targets. */
  testing?: TestingConfig;

  /** Advisory WIP note (never blocks). */
  limits?: LimitsConfig;

  /** Planning policy — deep-interview mode. */
  planning?: PlanningConfig;

  /** Autonomous-run settings (`specweave auto`). */
  auto?: AutoConfig;

  /** External tracker sync (GitHub first-class; Jira/ADO community). */
  sync?: SyncConfiguration;

  /**
   * Living documentation generation.
   *
   * `false` (default) — never generated.
   * `'onDone'`        — regenerated when an increment is completed.
   */
  livingDocs?: false | 'onDone';

  // ───────────────────────────────────────────────────────────────────
  // Kept beyond the advertised 2.0 surface because real code still reads
  // them. Each line names the reader that keeps the key alive; delete the
  // key when its reader goes.
  // ───────────────────────────────────────────────────────────────────

  /** core/lsp/lsp-config.ts, core/lazy-loading/llm-plugin-detector.ts */
  lsp?: { enabled?: boolean };

  /** cli/commands/branch-name.ts, core/cicd/config-loader.ts */
  cicd?: CiCdConfig;

  /** sync/external-issue-auto-creator.ts, cli/commands/sync-health.ts */
  repository?: RepositoryConfiguration;

  /**
   * 1.x issue-tracker block. Still written by the `specweave sync setup`
   * wizard (cli/helpers/issue-tracker/**) and read by the Jira/ADO paths.
   * Not part of the 2.0 surface; collapsing it into `sync.{github,jira,ado}`
   * is its own increment.
   */
  issueTracker?: IssueTrackerConfiguration;

  /**
   * Closure-time external-tracker flags (close_github_issue, …).
   * Read by core/hooks/LifecycleHookDispatcher.ts and the sync gap reports.
   * The living-docs flags were removed in 2.0 — see `livingDocs`.
   */
  hooks?: HookConfiguration;

  /** adapters/claude/adapter.ts (`plugins.enabled` list). */
  plugins?: PluginConfig;

  // ───────────────────────────────────────────────────────────────────
  // Legacy shapes. Read once by the migrator, then removed from disk.
  // ───────────────────────────────────────────────────────────────────

  /** @deprecated migrated to `workspace` on load */
  umbrella?: UmbrellaConfig;
  /** @deprecated migrated to `workspace` on load */
  multiProject?: MultiProjectConfig;
  /** @deprecated migrated to `workspace.repos[].sync` on load */
  projectMappings?: ProjectMappings;
}

/**
 * Backward-compatible alias for SpecWeaveConfig
 * @deprecated Use SpecWeaveConfig from src/core/config/types.ts instead
 */
export type SpecweaveConfig = SpecWeaveConfig;

/**
 * The exact top-level keys a 2.0 config may carry.
 * Anything else produces one warning line on load (see config-manager).
 */
export const KNOWN_CONFIG_KEYS = [
  'version',
  'project',
  'adapters',
  'workspace',
  'testing',
  'limits',
  'planning',
  'auto',
  'sync',
  'livingDocs',
  'lsp',
  'cicd',
  'repository',
  'issueTracker',
  'hooks',
  'plugins',
] as const;

/**
 * Default configuration values (2.0)
 */
export const DEFAULT_CONFIG: SpecWeaveConfig = {
  version: '2.0',
  adapters: {
    default: 'claude',
  },
  testing: {
    mode: 'TDD',
    commands: [],
    coverage: {
      unit: 95,
      integration: 90,
      e2e: 100,
    },
  },
  limits: {
    activeIncrements: 3,
  },
  planning: {
    deepInterview: 'off',
  },
  sync: {
    enabled: false,
    direction: 'bidirectional',
    autoSync: false,
    includeStatus: true,
    autoApplyLabels: true,
  },
  livingDocs: false,
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

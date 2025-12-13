/**
 * Types for Issue Tracker Integration
 *
 * @module cli/helpers/issue-tracker/types
 */

import { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Supported issue trackers
 */
export type IssueTracker = 'github' | 'jira' | 'ado' | 'none';

/**
 * GitHub instance type
 */
export type GitHubInstanceType = 'cloud' | 'enterprise';

/**
 * Jira instance type
 */
export type JiraInstanceType = 'cloud' | 'server';

/**
 * GitHub team mapping strategies
 */
export type GitHubStrategy =
  | 'repository-per-team'        // Separate repositories for each team (most common)
  | 'team-based'                 // Single repository with team filtering (monorepo)
  | 'team-multi-repo';           // Complex team-to-repository mapping

/**
 * GitHub credentials
 */
export interface GitHubCredentials {
  token: string;
  instanceType: GitHubInstanceType;
  apiEndpoint?: string;          // Only for Enterprise
  strategy?: GitHubStrategy;     // Team mapping strategy (optional)
  owner?: string;                // GitHub organization/owner

  // Strategy 1: Repository-per-team (most common)
  repos?: string[];              // Multiple repositories (e.g., ["frontend-app", "backend-api"])

  // Strategy 2: Team-based (monorepo)
  repo?: string;                 // Single repository (e.g., "main-product")
  teams?: string[];              // Team names (e.g., ["frontend-team", "backend-team"])

  // Strategy 3: Team-multi-repo (complex mapping)
  teamRepoMapping?: Record<string, string[]>;  // e.g., {"platform-team": ["api-gateway", "auth-service"]}
}

/**
 * Jira team mapping strategies
 */
export type JiraStrategy =
  | 'project-per-team'           // Separate projects for each team
  | 'component-based'            // One project with multiple components
  | 'board-based';               // One project with filtered boards

/**
 * Per-project configuration for Jira
 *
 * NEW (v0.33.0): Mirrors AzureDevOpsProjectConfig for consistent 2-level structure
 * - JIRA: project → boards (like ADO: project → areaPaths)
 */
export interface JiraProjectConfig {
  /** Jira project key (e.g., "FRONTEND") */
  key: string;
  /** Jira project name (optional, for display) */
  name?: string;
  /** Jira project ID (populated after validation) */
  id?: string;
  /** Boards for this project (2-level structure) */
  boards?: Array<{ id: string; name?: string }>;
  /** Whether this is the default project */
  isDefault?: boolean;
}

/**
 * Jira credentials
 *
 * NEW (v0.33.0): Added `projectConfigs` for 2-level structure (project → boards)
 * This aligns with ADO's `projects[]` structure for consistency.
 */
export interface JiraCredentials {
  token: string;
  email: string;
  domain: string;
  instanceType: JiraInstanceType;
  strategy?: JiraStrategy;       // Team mapping strategy (optional)

  // Strategy 1: Project-per-team (legacy: string array)
  projects?: string[];           // Multiple project keys (e.g., ["FRONTEND", "BACKEND", "MOBILE"])

  // NEW (v0.33.0): Project-per-team with boards (2-level structure)
  projectConfigs?: JiraProjectConfig[];  // Projects with per-project boards

  // Strategy 2: Component-based
  project?: string;              // Single project (e.g., "MAIN")
  components?: string[];         // Multiple components (e.g., ["Frontend", "Backend"])

  // Strategy 3: Board-based
  boards?: string[];             // Board IDs (e.g., ["123", "456", "789"])
}

/**
 * Azure DevOps team mapping strategies
 */
export type AzureDevOpsStrategy =
  | 'project-per-team'           // Separate projects for each team
  | 'area-path-based';           // One project with multiple area paths

/**
 * ADO Process Template types
 *
 * Detected automatically via ADO API to determine hierarchy mapping.
 * SAFe has 5 levels (Capability→Epic→Feature→Story→Task)
 * Others have 4 levels or less.
 */
export type AdoProcessTemplate = 'Agile' | 'Scrum' | 'CMMI' | 'Basic' | 'SAFe' | 'unknown';

/**
 * Per-project configuration for Azure DevOps
 *
 * Used when selecting multiple ADO projects during init
 */
export interface AzureDevOpsProjectConfig {
  name: string; // ADO project name
  areaPaths?: string[]; // Area paths for this project (leaf names only)
  isDefault?: boolean; // Mark as default profile for sync
  isUmbrella?: boolean; // Umbrella/parent project (folder structure only, no items imported)
  /** Auto-detected process template (Agile, Scrum, CMMI, SAFe, etc.) */
  processTemplate?: AdoProcessTemplate;
  /** True if project has Capability work item type (indicates SAFe 5-level hierarchy) */
  hasCapability?: boolean;
}

/**
 * Azure DevOps credentials
 *
 * 2-level hierarchy: Project -> Area Path (teams deprecated)
 *
 * Supports both single project (backward compat) and multi-project modes:
 * - Single: `project` is set
 * - Multi: `projects` is set
 */
export interface AzureDevOpsCredentials {
  pat: string;
  org: string;
  /** Single project name (backward compatibility) */
  project?: string;
  /** Multi-project configuration (new in v0.28.x) */
  projects?: AzureDevOpsProjectConfig[];
  /** Area paths for single-project mode (leaf names only, e.g., ["Platform-Engineering"]) */
  areaPaths?: string[];
  /** Team mapping strategy (optional, defaults to 'area-path-based') */
  strategy?: AzureDevOpsStrategy;
}

/**
 * Union type for all credentials
 */
export type TrackerCredentials =
  | GitHubCredentials
  | JiraCredentials
  | AzureDevOpsCredentials;

/**
 * Existing credentials source
 */
export interface ExistingCredentials {
  source: string;
  credentials: TrackerCredentials;
}

/**
 * Connection validation result
 */
export interface ValidationResult {
  success: boolean;
  username?: string; // For GitHub/Jira
  error?: string;
}

/**
 * Repository hosting types
 *
 * Two-step flow: structure (single/multirepo) + provider (github/bitbucket/ado/local/other)
 *
 * NOTE: 'local' is required for repositories without remote.
 * NOTE: Backward compatibility maintained with 'github' (normalized from 'github-single')
 */
export type RepositoryHosting =
  | 'github'
  | 'github-single'
  | 'github-multirepo'
  | 'bitbucket-single'
  | 'bitbucket-multirepo'
  | 'ado-single'
  | 'ado-multirepo'
  | 'local'
  | 'other-single'
  | 'other-multirepo';

/**
 * ADO project selection from repository setup
 * Used to avoid duplicate prompts when ADO is selected for both repos and issues
 */
export interface AdoProjectSelection {
  org: string;
  pat: string;
  projects: string[];
}

/**
 * Setup options
 */
export interface SetupOptions {
  projectPath: string;
  language: SupportedLanguage;
  maxRetries?: number; // Default: 3 (for network retries within validation)
  setupRetryCount?: number; // Default: 0 (tracks full setup retry attempts to prevent infinite recursion)
  isFrameworkRepo?: boolean; // True if this is the SpecWeave framework repo itself
  repositoryHosting?: RepositoryHosting; // Repository hosting choice (informs issue tracker defaults)
  /** ADO credentials from repository setup - reused when ADO is also selected for issue tracking */
  adoCredentialsFromRepoSetup?: AdoProjectSelection;
  /** GitHub credentials from repository setup - reused when GitHub Issues is selected for issue tracking (v1.0.4) */
  githubCredentialsFromRepoSetup?: { org: string; pat: string };
}

/**
 * Sync settings for external tool integration
 */
export interface SyncSettings {
  includeStatus: boolean;
  autoApplyLabels: boolean;
}

/**
 * Sync permissions for external tool operations
 */
export interface SyncPermissions {
  canUpsertInternalItems: boolean;
  canUpdateExternalItems: boolean;
  canUpdateStatus: boolean;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public rateLimitInfo: RateLimitInfo
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

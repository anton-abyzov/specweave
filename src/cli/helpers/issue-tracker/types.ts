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
 * Jira credentials
 */
export interface JiraCredentials {
  token: string;
  email: string;
  domain: string;
  instanceType: JiraInstanceType;
  strategy?: JiraStrategy;       // Team mapping strategy (optional)

  // Strategy 1: Project-per-team
  projects?: string[];           // Multiple projects (e.g., ["FRONTEND", "BACKEND", "MOBILE"])

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
  | 'area-path-based'            // One project with multiple area paths
  | 'team-based';                // One project with multiple teams

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
  /** @deprecated Teams are no longer part of init flow. Use areaPaths instead. */
  team?: string;
  /** @deprecated Teams are no longer part of init flow. Use areaPaths instead. */
  teams?: string[];
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

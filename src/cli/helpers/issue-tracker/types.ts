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
 * Azure DevOps credentials
 */
export interface AzureDevOpsCredentials {
  pat: string;
  org: string;
  project: string; // One project per organization (ADO standard)
  team?: string; // Single team (backward compatibility)
  teams?: string[]; // Multiple teams within project (optional)
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
 * Setup options
 */
export interface SetupOptions {
  projectPath: string;
  language: SupportedLanguage;
  maxRetries?: number; // Default: 3
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

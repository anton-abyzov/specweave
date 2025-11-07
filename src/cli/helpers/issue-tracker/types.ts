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
 * GitHub credentials
 */
export interface GitHubCredentials {
  token: string;
  instanceType: GitHubInstanceType;
  apiEndpoint?: string; // Only for Enterprise
  repos?: string[]; // Multiple repositories (optional)
}

/**
 * Jira credentials
 */
export interface JiraCredentials {
  token: string;
  email: string;
  domain: string;
  instanceType: JiraInstanceType;
  projects?: string[]; // Multiple projects (optional)
}

/**
 * Azure DevOps credentials
 */
export interface AzureDevOpsCredentials {
  pat: string;
  org: string;
  project: string; // Single project (backward compatibility)
  projects?: string[]; // Multiple projects (optional)
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

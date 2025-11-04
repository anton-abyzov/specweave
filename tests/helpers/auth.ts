/**
 * Authentication Helper for Integration Tests
 *
 * Re-exports auth helpers from shared utility
 * Provides unified authentication for GitHub, Azure DevOps, and Jira
 * Works in both local development and CI/CD environments
 */

// Re-export from shared utility
export {
  getGitHubAuth,
  getAzureDevOpsAuth,
  getJiraAuth,
  hasGitHubCredentials,
  hasAzureDevOpsCredentials,
  hasJiraCredentials,
  shouldRunIntegrationTests,
  getCredentialStatus
} from '../../src/utils/auth-helpers.js';

export type {
  GitHubAuth,
  AzureDevOpsAuth,
  JiraAuth
} from '../../src/utils/auth-helpers.js';

/**
 * Authentication Helpers for Issue Tracker Integration
 *
 * Provides unified authentication detection for GitHub, Azure DevOps, and Jira
 * Works in both CLI (init flow) and test environments
 *
 * @module utils/auth-helpers
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export interface GitHubAuth {
  token: string;
  source: 'GITHUB_TOKEN' | 'GH_TOKEN' | 'gh-cli' | 'none';
}

export interface AzureDevOpsAuth {
  pat: string;
  org: string;
  project: string;
}

export interface JiraAuth {
  token: string;
  email: string;
  domain: string;
}

/**
 * Get GitHub authentication token
 * Priority: GITHUB_TOKEN (CI) > GH_TOKEN (custom) > gh CLI config (local)
 */
export function getGitHubAuth(): GitHubAuth {
  // 1. Check GITHUB_TOKEN (auto-provided in GitHub Actions)
  if (process.env.GITHUB_TOKEN) {
    return { token: process.env.GITHUB_TOKEN, source: 'GITHUB_TOKEN' };
  }

  // 2. Check GH_TOKEN (custom PAT from .env)
  if (process.env.GH_TOKEN) {
    return { token: process.env.GH_TOKEN, source: 'GH_TOKEN' };
  }

  // 3. Try to parse gh CLI config (~/.config/gh/hosts.yml)
  try {
    const ghConfigPath = path.join(os.homedir(), '.config', 'gh', 'hosts.yml');
    if (fs.existsSync(ghConfigPath)) {
      const config = yaml.load(fs.readFileSync(ghConfigPath, 'utf8')) as any;
      const token = config?.['github.com']?.oauth_token;
      if (token) {
        return { token, source: 'gh-cli' };
      }
    }
  } catch (error) {
    // Silently fail - gh CLI config is optional
  }

  return { token: '', source: 'none' };
}

/**
 * Get Azure DevOps authentication
 * Requires: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
 */
export function getAzureDevOpsAuth(): AzureDevOpsAuth | null {
  const pat = process.env.AZURE_DEVOPS_PAT;
  const org = process.env.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT;

  if (!pat || !org || !project) {
    return null;
  }

  return { pat, org, project };
}

/**
 * Get Jira authentication
 * Requires: JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
 */
export function getJiraAuth(): JiraAuth | null {
  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;
  const domain = process.env.JIRA_DOMAIN;

  if (!token || !email || !domain) {
    return null;
  }

  return { token, email, domain };
}

/**
 * Check if integration tests should run
 * Returns true if RUN_INTEGRATION_TESTS=true or if in CI environment
 */
export function shouldRunIntegrationTests(): boolean {
  // Explicitly enabled
  if (process.env.RUN_INTEGRATION_TESTS === 'true') {
    return true;
  }

  // In CI environment (GitHub Actions)
  if (process.env.CI === 'true') {
    return true;
  }

  return false;
}

/**
 * Check if credentials are available for a service
 */
export function hasGitHubCredentials(): boolean {
  const auth = getGitHubAuth();
  return auth.source !== 'none';
}

export function hasAzureDevOpsCredentials(): boolean {
  return getAzureDevOpsAuth() !== null;
}

export function hasJiraCredentials(): boolean {
  return getJiraAuth() !== null;
}

/**
 * Get credential status summary (for debugging)
 */
export function getCredentialStatus(): {
  github: string;
  ado: boolean;
  jira: boolean;
  integrationTestsEnabled: boolean;
} {
  const github = getGitHubAuth();
  return {
    github: github.source,
    ado: hasAzureDevOpsCredentials(),
    jira: hasJiraCredentials(),
    integrationTestsEnabled: shouldRunIntegrationTests()
  };
}

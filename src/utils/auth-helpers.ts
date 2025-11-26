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
import { execSync } from 'child_process';

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
 * Parse a simple .env file and return key-value pairs
 * (Inline implementation to avoid circular dependencies)
 */
function parseEnvFileSimple(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Get GitHub authentication token from project .env file
 * Priority: .env GITHUB_TOKEN > .env GH_TOKEN > process.env > gh CLI
 *
 * CRITICAL (2025-11-26): This function MUST be used when projectRoot is available
 * to properly load tokens from .env file. The original getGitHubAuth() only
 * reads process.env which is empty unless dotenv is explicitly loaded.
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns GitHub authentication with source information
 */
export function getGitHubAuthFromProject(projectRoot: string): GitHubAuth {
  // 1. First, try to read from project .env file
  try {
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFileSimple(content);

      // Check GITHUB_TOKEN first (standard)
      if (envVars.GITHUB_TOKEN) {
        return { token: envVars.GITHUB_TOKEN, source: 'GITHUB_TOKEN' };
      }

      // Check GH_TOKEN (alternative)
      if (envVars.GH_TOKEN) {
        return { token: envVars.GH_TOKEN, source: 'GH_TOKEN' };
      }
    }
  } catch {
    // Silently fail - .env file is optional
  }

  // 2. Fall back to existing getGitHubAuth() for process.env and gh CLI
  return getGitHubAuth();
}

/**
 * Get GitHub authentication token
 * Priority: GITHUB_TOKEN (CI) > GH_TOKEN (custom) > gh CLI config (local)
 *
 * WARNING: This function only reads from process.env, NOT from .env files!
 * If you have access to projectRoot, use getGitHubAuthFromProject() instead.
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

  // 3. Try to get token via gh CLI command (works with Keychain, plain-text, etc.)
  try {
    const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token && token.length > 0) {
      return { token, source: 'gh-cli' };
    }
  } catch (error) {
    // gh CLI not installed or not authenticated - silently fail
  }

  // 4. Fallback: Try to parse gh CLI config directly (~/.config/gh/hosts.yml)
  // This covers edge cases where gh CLI isn't available but config file exists
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

/**
 * Check if GitHub credentials are available (project-aware)
 * Uses getGitHubAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export function hasGitHubCredentialsFromProject(projectRoot: string): boolean {
  const auth = getGitHubAuthFromProject(projectRoot);
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

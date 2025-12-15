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

/**
 * Check if a GitHub token is an OAuth token (gho_ prefix)
 *
 * OAuth tokens from `gh auth` typically lack `repo` scope for private repositories.
 * Only PATs (ghp_) or Fine-grained tokens (github_pat_) have explicit repo access.
 *
 * Token prefixes:
 * - gho_ = OAuth App token (from gh auth) - may lack repo scope!
 * - ghp_ = Classic Personal Access Token - has explicit scopes
 * - ghs_ = GitHub App server-to-server token
 * - ghu_ = GitHub App user-to-server token
 * - github_pat_ = Fine-grained Personal Access Token
 */
export function isOAuthToken(token: string): boolean {
  return token.startsWith('gho_');
}

/**
 * Check if a GitHub token is a Personal Access Token (classic or fine-grained)
 * These tokens have explicit repo scope and work with private repositories.
 */
export function isPersonalAccessToken(token: string): boolean {
  return token.startsWith('ghp_') || token.startsWith('github_pat_');
}

export interface GitHubAuth {
  token: string;
  source: 'GITHUB_TOKEN' | 'GH_TOKEN' | 'gh-cli' | 'none';
  /**
   * Whether this is an OAuth token (gho_ prefix) which may lack repo scope.
   * OAuth tokens from `gh auth` typically cannot access private repos unless
   * the user explicitly granted repo scope during authentication.
   */
  isOAuthToken?: boolean;
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
        return {
          token: envVars.GITHUB_TOKEN,
          source: 'GITHUB_TOKEN',
          isOAuthToken: isOAuthToken(envVars.GITHUB_TOKEN)
        };
      }

      // Check GH_TOKEN (alternative)
      if (envVars.GH_TOKEN) {
        return {
          token: envVars.GH_TOKEN,
          source: 'GH_TOKEN',
          isOAuthToken: isOAuthToken(envVars.GH_TOKEN)
        };
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
    return {
      token: process.env.GITHUB_TOKEN,
      source: 'GITHUB_TOKEN',
      isOAuthToken: isOAuthToken(process.env.GITHUB_TOKEN)
    };
  }

  // 2. Check GH_TOKEN (custom PAT from .env)
  if (process.env.GH_TOKEN) {
    return {
      token: process.env.GH_TOKEN,
      source: 'GH_TOKEN',
      isOAuthToken: isOAuthToken(process.env.GH_TOKEN)
    };
  }

  // 3. Try to get token via gh CLI command (works with Keychain, plain-text, etc.)
  try {
    const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token && token.length > 0) {
      return { token, source: 'gh-cli', isOAuthToken: isOAuthToken(token) };
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
        return { token, source: 'gh-cli', isOAuthToken: isOAuthToken(token) };
      }
    }
  } catch (error) {
    // Silently fail - gh CLI config is optional
  }

  return { token: '', source: 'none', isOAuthToken: false };
}

/**
 * Get Azure DevOps authentication from project .env file
 * Priority: .env file > process.env
 *
 * CRITICAL (2025-12-04): This function MUST be used when projectRoot is available
 * to properly load tokens from .env file. The original getAzureDevOpsAuth() only
 * reads process.env which is empty unless dotenv is explicitly loaded.
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns Azure DevOps authentication or null if not found
 */
export function getAzureDevOpsAuthFromProject(projectRoot: string): AzureDevOpsAuth | null {
  // 1. First, try to read from project .env file
  try {
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFileSimple(content);

      const pat = envVars.AZURE_DEVOPS_PAT;
      const org = envVars.AZURE_DEVOPS_ORG;
      const project = envVars.AZURE_DEVOPS_PROJECT;

      if (pat) {
        // PAT found in .env - return it (org/project might come from config.json)
        return {
          pat,
          org: org || process.env.AZURE_DEVOPS_ORG || '',
          project: project || process.env.AZURE_DEVOPS_PROJECT || ''
        };
      }
    }
  } catch {
    // Silently fail - .env file is optional
  }

  // 2. Fall back to process.env
  return getAzureDevOpsAuth();
}

/**
 * Get Azure DevOps authentication
 * Requires: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
 *
 * WARNING: This function only reads from process.env, NOT from .env files!
 * If you have access to projectRoot, use getAzureDevOpsAuthFromProject() instead.
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

/**
 * Check if Azure DevOps credentials are available (project-aware)
 * Uses getAzureDevOpsAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export function hasAzureDevOpsCredentialsFromProject(projectRoot: string): boolean {
  const auth = getAzureDevOpsAuthFromProject(projectRoot);
  return auth !== null && !!auth.pat;
}

export function hasJiraCredentials(): boolean {
  return getJiraAuth() !== null;
}

/**
 * Get Jira authentication from project files
 *
 * CRITICAL (2025-12-12): This function MUST be used when projectRoot is available.
 *
 * Configuration sources (ADR-0194 compliant):
 * - Domain: config.json → issueTracker.domain (CONFIGURATION, committed)
 * - Token: .env → JIRA_API_TOKEN (SECRET, gitignored)
 * - Email: .env → JIRA_EMAIL (SECRET, gitignored)
 *
 * @param projectRoot - Path to project root containing .env and .specweave/config.json
 * @returns Jira authentication or null if not found
 */
export function getJiraAuthFromProject(projectRoot: string): JiraAuth | null {
  let domain = '';
  let token = '';
  let email = '';

  // 1. Read DOMAIN from config.json (configuration, not secret)
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      domain = config.issueTracker?.domain || '';
    }
  } catch {
    // Silently fail - config.json is optional
  }

  // 2. Read SECRETS from .env file (token and email)
  try {
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFileSimple(content);

      token = envVars.JIRA_API_TOKEN || '';
      email = envVars.JIRA_EMAIL || '';

      // DEPRECATED: Support JIRA_DOMAIN in .env for backwards compatibility
      // New projects should use config.json → issueTracker.domain
      if (!domain && (envVars.JIRA_HOST || envVars.JIRA_DOMAIN)) {
        domain = envVars.JIRA_HOST || envVars.JIRA_DOMAIN || '';
      }
    }
  } catch {
    // Silently fail - .env file is optional
  }

  // 3. Fall back to process.env for secrets (if not found in .env)
  if (!token) token = process.env.JIRA_API_TOKEN || '';
  if (!email) email = process.env.JIRA_EMAIL || '';
  // DEPRECATED: process.env fallback for domain
  if (!domain) domain = process.env.JIRA_DOMAIN || process.env.JIRA_HOST || '';

  // All three required
  if (token && email && domain) {
    return { token, email, domain };
  }

  return null;
}

/**
 * Check if Jira credentials are available (project-aware)
 * Uses getJiraAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export function hasJiraCredentialsFromProject(projectRoot: string): boolean {
  const auth = getJiraAuthFromProject(projectRoot);
  return auth !== null;
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

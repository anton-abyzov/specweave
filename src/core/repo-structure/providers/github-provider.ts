/**
 * GitHub Provider Implementation
 *
 * Implements GitProvider interface for GitHub.com and GitHub Enterprise.
 * Handles repository validation, creation, and management via GitHub API.
 *
 * @module providers/github-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';
import { getActionableError, formatActionableError, type GitApiError } from '../git-error-handler.js';
import type { UrlType } from '../url-generator.js';

/**
 * GitHub Provider
 *
 * Implements Git operations for GitHub platform.
 */
export class GitHubProvider extends BaseGitProvider {
  constructor(config?: Partial<PlatformConfig>) {
    super({
      type: 'github',
      name: 'GitHub',
      host: config?.host || 'github.com',
      apiBaseUrl: config?.apiBaseUrl || 'https://api.github.com',
      selfHosted: config?.selfHosted || false,
      customDomain: config?.customDomain
    });
  }

  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(this.getApiUrl(`/repos/${owner}/${repo}`), { headers });

      if (response.status === 404) {
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        const data: any = await response.json();
        return { exists: true, valid: true, url: data.html_url };
      }

      // Handle all error cases uniformly
      const apiError: GitApiError = {
        status: response.status,
        message: response.statusText,
        platform: 'github',
        operation: 'validate_repo',
        resourceType: 'repository',
        resourceName: `${owner}/${repo}`
      };

      return { exists: false, valid: false, error: formatActionableError(getActionableError(apiError)) };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      // Try as user first (covers both users and organizations)
      const userResponse = await fetch(this.getApiUrl(`/users/${owner}`), { headers });

      if (userResponse.status === 200) {
        const data: any = await userResponse.json();
        return { valid: true, type: data.type === 'Organization' ? 'organization' : 'user' };
      }

      // Try as organization if user endpoint failed
      const orgResponse = await fetch(this.getApiUrl(`/orgs/${owner}`), { headers });

      if (orgResponse.status === 200) {
        return { valid: true, type: 'organization' };
      }

      // Not found
      const apiError: GitApiError = {
        status: 404,
        message: 'Not Found',
        platform: 'github',
        operation: 'validate_owner',
        resourceType: 'user',
        resourceName: owner
      };

      return { valid: false, error: formatActionableError(getActionableError(apiError)) };
    } catch (error) {
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new repository on GitHub
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    // Check if it's an organization or user
    const isOrg = await this.isOrganization(options.owner, token);
    const endpoint = isOrg
      ? this.getApiUrl(`/orgs/${options.owner}/repos`)
      : this.getApiUrl('/user/repos');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        private: options.visibility === 'private',
        auto_init: options.autoInit || false,
        has_issues: options.hasIssues !== false,
        has_wiki: options.hasWiki || false
      })
    });

    if (!response.ok) {
      const error = await response.json() as any;

      // Handle "already exists" error
      if (error.errors?.[0]?.message?.includes('already exists')) {
        // Repository already exists, return URL
        return `https://${this.config.host}/${options.owner}/${options.name}`;
      }

      // Handle other errors with actionable messages
      const apiError: GitApiError = {
        status: response.status,
        message: error.message || response.statusText,
        platform: 'github',
        operation: 'create_repo',
        resourceType: 'repository',
        resourceName: `${options.owner}/${options.name}`
      };

      const actionable = getActionableError(apiError);
      throw new Error(formatActionableError(actionable));
    }

    const data: any = await response.json();
    return data.html_url;
  }

  async isOrganization(account: string, token?: string): Promise<boolean> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(this.getApiUrl(`/users/${account}`), { headers });

      if (response.ok) {
        const data: any = await response.json();
        return data.type === 'Organization';
      }
    } catch {
      // Assume user if we can't determine
    }
    return false;
  }

  /**
   * Get token creation URL
   */
  getTokenUrl(): string {
    if (this.config.selfHosted) {
      return `https://${this.config.customDomain || this.config.host}/settings/tokens/new`;
    }
    return 'https://github.com/settings/tokens/new';
  }

  /**
   * Get required token scopes
   */
  getRequiredScopes(isOrganization?: boolean): string[] {
    const scopes = ['repo'];
    if (isOrganization) {
      scopes.push('admin:org');
    }
    return scopes;
  }

  /**
   * Override getAuthHeaders for GitHub-specific auth
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Create a GitHub provider instance
 *
 * @param config - Optional platform configuration
 * @returns GitHub provider instance
 */
export function createGitHubProvider(config?: Partial<PlatformConfig>): GitHubProvider {
  return new GitHubProvider(config);
}

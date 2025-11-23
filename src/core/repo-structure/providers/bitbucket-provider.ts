/**
 * Bitbucket Provider Implementation
 *
 * Implements GitProvider interface for Bitbucket.org and Bitbucket Server/Data Center.
 * Handles repository validation, creation, and management via Bitbucket API 2.0.
 *
 * @module providers/bitbucket-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';
import { getActionableError, formatActionableError, type GitApiError } from '../git-error-handler.js';

/**
 * Bitbucket Provider
 *
 * Implements Git operations for Bitbucket platform.
 * Supports both Bitbucket.org and Bitbucket Server/Data Center.
 */
export class BitbucketProvider extends BaseGitProvider {
  constructor(config?: Partial<PlatformConfig>) {
    super({
      type: 'bitbucket',
      name: 'Bitbucket',
      host: config?.host || 'bitbucket.org',
      apiBaseUrl: config?.apiBaseUrl || 'https://api.bitbucket.org/2.0',
      selfHosted: config?.selfHosted || false,
      customDomain: config?.customDomain
    });
  }

  /**
   * Validate if a repository exists on Bitbucket
   */
  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        this.getApiUrl(`/repositories/${owner}/${repo}`),
        { headers }
      );

      if (response.status === 404) {
        // Repository does not exist (good for creation)
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        // Repository already exists
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.links.html.href
        };
      }

      if (response.status === 401 || response.status === 403) {
        // Authentication or permission error
        const apiError: GitApiError = {
          status: response.status,
          message: response.statusText,
          platform: 'bitbucket',
          operation: 'validate_repo',
          resourceType: 'repository',
          resourceName: `${owner}/${repo}`
        };

        const actionable = getActionableError(apiError);
        return { exists: false, valid: false, error: formatActionableError(actionable) };
      }

      // Other error
      const apiError: GitApiError = {
        status: response.status,
        message: response.statusText,
        platform: 'bitbucket',
        operation: 'validate_repo',
        resourceType: 'repository',
        resourceName: `${owner}/${repo}`
      };

      const actionable = getActionableError(apiError);
      return {
        exists: false,
        valid: false,
        error: formatActionableError(actionable)
      };

    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate if a Bitbucket workspace (user or team) exists
   */
  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Try as workspace (can be user or team)
      const workspaceResponse = await fetch(
        this.getApiUrl(`/workspaces/${owner}`),
        { headers }
      );

      if (workspaceResponse.status === 200) {
        const data: any = await workspaceResponse.json();
        // Workspace can be either user or team
        const type = data.type === 'team' ? 'organization' : 'user';
        return { valid: true, type };
      }

      // Try as user
      const userResponse = await fetch(
        this.getApiUrl(`/users/${owner}`),
        { headers }
      );

      if (userResponse.status === 200) {
        return { valid: true, type: 'user' };
      }

      // Not found
      const apiError: GitApiError = {
        status: 404,
        message: 'Not Found',
        platform: 'bitbucket',
        operation: 'validate_owner',
        resourceType: 'workspace',
        resourceName: owner
      };

      const actionable = getActionableError(apiError);
      return { valid: false, error: formatActionableError(actionable) };

    } catch (error) {
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new repository on Bitbucket
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    const payload: any = {
      scm: 'git',
      name: options.name,
      description: options.description,
      is_private: options.visibility === 'private',
      has_issues: options.hasIssues !== false,
      has_wiki: options.hasWiki || false,
      fork_policy: 'no_public_forks'
    };

    const response = await fetch(
      this.getApiUrl(`/repositories/${options.owner}/${options.name}`),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;

      // Handle "already exists" error
      if (response.status === 400 && error.error?.message?.includes('already exists')) {
        // Repository already exists, return URL
        const host = this.config.customDomain || this.config.host;
        return `https://${host}/${options.owner}/${options.name}`;
      }

      // Handle other errors with actionable messages
      const apiError: GitApiError = {
        status: response.status,
        message: error.error?.message || response.statusText,
        platform: 'bitbucket',
        operation: 'create_repo',
        resourceType: 'repository',
        resourceName: `${options.owner}/${options.name}`
      };

      const actionable = getActionableError(apiError);
      throw new Error(formatActionableError(actionable));
    }

    const data: any = await response.json();
    return data.links.html.href;
  }

  /**
   * Check if a workspace is a team (organization)
   */
  async isOrganization(account: string, token?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        this.getApiUrl(`/workspaces/${account}`),
        { headers }
      );

      if (response.ok) {
        const data: any = await response.json();
        return data.type === 'team';
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
      return `https://${this.config.customDomain || this.config.host}/account/settings/app-passwords/`;
    }
    return 'https://bitbucket.org/account/settings/app-passwords/';
  }

  /**
   * Get required token scopes
   */
  getRequiredScopes(isOrganization?: boolean): string[] {
    return ['repository:read', 'repository:write', 'repository:admin'];
  }

  /**
   * Override SSH user for Bitbucket
   */
  protected getSSHUser(): string {
    return 'git';
  }

  /**
   * Override getAuthHeaders for Bitbucket-specific auth (Bearer token)
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Create a Bitbucket provider instance
 */
export function createBitbucketProvider(config?: Partial<PlatformConfig>): BitbucketProvider {
  return new BitbucketProvider(config);
}

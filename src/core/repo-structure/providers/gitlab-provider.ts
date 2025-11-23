/**
 * GitLab Provider Implementation
 *
 * Implements GitProvider interface for GitLab.com and self-hosted GitLab instances.
 * Handles project validation, creation, and management via GitLab API v4.
 *
 * @module providers/gitlab-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';
import { getActionableError, formatActionableError, type GitApiError } from '../git-error-handler.js';

/**
 * GitLab Provider
 *
 * Implements Git operations for GitLab platform.
 * Supports both GitLab.com and self-hosted GitLab instances.
 */
export class GitLabProvider extends BaseGitProvider {
  constructor(config?: Partial<PlatformConfig>) {
    super({
      type: 'gitlab',
      name: 'GitLab',
      host: config?.host || 'gitlab.com',
      apiBaseUrl: config?.apiBaseUrl || 'https://gitlab.com/api/v4',
      selfHosted: config?.selfHosted || false,
      customDomain: config?.customDomain
    });
  }

  /**
   * Validate if a project exists on GitLab
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
        headers['PRIVATE-TOKEN'] = token;
      }

      // GitLab uses namespace/project format for project IDs
      const projectPath = encodeURIComponent(`${owner}/${repo}`);

      const response = await fetch(
        this.getApiUrl(`/projects/${projectPath}`),
        { headers }
      );

      if (response.status === 404) {
        // Project does not exist (good for creation)
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        // Project already exists
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.web_url
        };
      }

      if (response.status === 401 || response.status === 403) {
        // Authentication or permission error
        const apiError: GitApiError = {
          status: response.status,
          message: response.statusText,
          platform: 'gitlab',
          operation: 'validate_repo',
          resourceType: 'project',
          resourceName: `${owner}/${repo}`
        };

        const actionable = getActionableError(apiError);
        return { exists: false, valid: false, error: formatActionableError(actionable) };
      }

      // Other error
      const apiError: GitApiError = {
        status: response.status,
        message: response.statusText,
        platform: 'gitlab',
        operation: 'validate_repo',
        resourceType: 'project',
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
   * Validate if a GitLab namespace (user or group) exists
   */
  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (token) {
      headers['PRIVATE-TOKEN'] = token;
    }

    try {
      // Try as user first
      const userResponse = await fetch(
        this.getApiUrl(`/users?username=${encodeURIComponent(owner)}`),
        { headers }
      );

      if (userResponse.status === 200) {
        const users: any[] = await userResponse.json();
        if (users.length > 0) {
          return { valid: true, type: 'user' };
        }
      }

      // Try as group
      const groupResponse = await fetch(
        this.getApiUrl(`/groups/${encodeURIComponent(owner)}`),
        { headers }
      );

      if (groupResponse.status === 200) {
        return { valid: true, type: 'organization' };
      }

      // Not found
      const apiError: GitApiError = {
        status: 404,
        message: 'Not Found',
        platform: 'gitlab',
        operation: 'validate_owner',
        resourceType: 'namespace',
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
   * Create a new project on GitLab
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    // Check if it's a group or user namespace
    const isGroup = await this.isOrganization(options.owner, token);

    const payload: any = {
      name: options.name,
      description: options.description,
      visibility: options.visibility === 'private' ? 'private' :
                  options.visibility === 'internal' ? 'internal' : 'public',
      initialize_with_readme: options.autoInit || false,
      issues_enabled: options.hasIssues !== false,
      wiki_enabled: options.hasWiki || false
    };

    // For group projects, specify the namespace_id
    if (isGroup) {
      try {
        const groupResponse = await fetch(
          this.getApiUrl(`/groups/${encodeURIComponent(options.owner)}`),
          {
            headers: {
              'PRIVATE-TOKEN': token,
              'Accept': 'application/json'
            }
          }
        );

        if (groupResponse.ok) {
          const group: any = await groupResponse.json();
          payload.namespace_id = group.id;
        }
      } catch {
        // Continue without namespace_id, will use user's namespace
      }
    }

    const response = await fetch(
      this.getApiUrl('/projects'),
      {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': token,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;

      // Handle "already exists" error
      if (error.message?.name?.[0]?.includes('has already been taken')) {
        // Project already exists, return URL
        const host = this.config.customDomain || this.config.host;
        return `https://${host}/${options.owner}/${options.name}`;
      }

      // Handle other errors with actionable messages
      const apiError: GitApiError = {
        status: response.status,
        message: error.message || response.statusText,
        platform: 'gitlab',
        operation: 'create_repo',
        resourceType: 'project',
        resourceName: `${options.owner}/${options.name}`
      };

      const actionable = getActionableError(apiError);
      throw new Error(formatActionableError(actionable));
    }

    const data: any = await response.json();
    return data.web_url;
  }

  /**
   * Check if a namespace is a group (organization)
   */
  async isOrganization(account: string, token?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        headers['PRIVATE-TOKEN'] = token;
      }

      const response = await fetch(
        this.getApiUrl(`/groups/${encodeURIComponent(account)}`),
        { headers }
      );

      return response.ok;
    } catch {
      // Assume user if we can't determine
      return false;
    }
  }

  /**
   * Get token creation URL
   */
  getTokenUrl(): string {
    if (this.config.selfHosted) {
      return `https://${this.config.customDomain || this.config.host}/-/profile/personal_access_tokens`;
    }
    return 'https://gitlab.com/-/profile/personal_access_tokens';
  }

  /**
   * Get required token scopes
   */
  getRequiredScopes(isOrganization?: boolean): string[] {
    return ['api', 'read_repository', 'write_repository'];
  }

  /**
   * Override getAuthHeaders for GitLab-specific auth (PRIVATE-TOKEN)
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    return {
      'PRIVATE-TOKEN': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Create a GitLab provider instance
 */
export function createGitLabProvider(config?: Partial<PlatformConfig>): GitLabProvider {
  return new GitLabProvider(config);
}

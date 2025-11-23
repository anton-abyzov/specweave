/**
 * Azure DevOps Provider Implementation
 *
 * Implements GitProvider interface for Azure DevOps Repos.
 * Handles repository validation, creation, and management via Azure DevOps REST API.
 *
 * @module providers/azure-devops-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';
import { getActionableError, formatActionableError, type GitApiError } from '../git-error-handler.js';
import type { UrlType } from '../url-generator.js';

/**
 * Azure DevOps Provider
 *
 * Implements Git operations for Azure DevOps platform.
 * Note: Azure DevOps uses organization/project/repository structure.
 * The "owner" parameter typically represents "organization/project".
 */
export class AzureDevOpsProvider extends BaseGitProvider {
  constructor(config?: Partial<PlatformConfig>) {
    super({
      type: 'azure-devops',
      name: 'Azure DevOps',
      host: config?.host || 'dev.azure.com',
      apiBaseUrl: config?.apiBaseUrl || 'https://dev.azure.com',
      selfHosted: config?.selfHosted || false,
      customDomain: config?.customDomain
    });
  }

  /**
   * Validate if a repository exists in Azure DevOps
   * owner format: "organization/project"
   */
  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    try {
      const [organization, project] = this.parseOwner(owner);

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        // Azure DevOps uses Basic Auth with PAT
        const auth = Buffer.from(`:${token}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await fetch(
        `${this.config.apiBaseUrl}/${organization}/${project}/_apis/git/repositories/${repo}?api-version=7.0`,
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
          url: data.webUrl || data.remoteUrl
        };
      }

      if (response.status === 401 || response.status === 403) {
        // Authentication or permission error
        const apiError: GitApiError = {
          status: response.status,
          message: response.statusText,
          platform: 'azure-devops',
          operation: 'validate_repo',
          resourceType: 'repository',
          resourceName: `${organization}/${project}/${repo}`
        };

        const actionable = getActionableError(apiError);
        return { exists: false, valid: false, error: formatActionableError(actionable) };
      }

      // Other error
      const apiError: GitApiError = {
        status: response.status,
        message: response.statusText,
        platform: 'azure-devops',
        operation: 'validate_repo',
        resourceType: 'repository',
        resourceName: `${organization}/${project}/${repo}`
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
   * Validate if an Azure DevOps organization/project exists
   * owner format: "organization/project"
   */
  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (token) {
      const auth = Buffer.from(`:${token}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    try {
      const [organization, project] = this.parseOwner(owner);

      // Validate organization exists by checking projects
      const orgResponse = await fetch(
        `${this.config.apiBaseUrl}/${organization}/_apis/projects?api-version=7.0`,
        { headers }
      );

      if (orgResponse.status !== 200) {
        const apiError: GitApiError = {
          status: 404,
          message: 'Organization not found',
          platform: 'azure-devops',
          operation: 'validate_owner',
          resourceType: 'organization',
          resourceName: organization
        };

        const actionable = getActionableError(apiError);
        return { valid: false, error: formatActionableError(actionable) };
      }

      // If project specified, validate it exists
      if (project) {
        const projectResponse = await fetch(
          `${this.config.apiBaseUrl}/${organization}/_apis/projects/${project}?api-version=7.0`,
          { headers }
        );

        if (projectResponse.status !== 200) {
          const apiError: GitApiError = {
            status: 404,
            message: 'Project not found',
            platform: 'azure-devops',
            operation: 'validate_owner',
            resourceType: 'project',
            resourceName: `${organization}/${project}`
          };

          const actionable = getActionableError(apiError);
          return { valid: false, error: formatActionableError(actionable) };
        }
      }

      // Azure DevOps organizations are always "organization" type
      return { valid: true, type: 'organization' };

    } catch (error) {
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new repository in Azure DevOps
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    const [organization, project] = this.parseOwner(options.owner);

    if (!project) {
      throw new Error('Azure DevOps requires a project. Use format: "organization/project"');
    }

    const payload: any = {
      name: options.name,
      project: {
        name: project
      }
    };

    const auth = Buffer.from(`:${token}`).toString('base64');

    const response = await fetch(
      `${this.config.apiBaseUrl}/${organization}/${project}/_apis/git/repositories?api-version=7.0`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;

      // Handle "already exists" error
      if (error.message?.includes('already exists') || error.typeKey === 'GitRepositoryNameAlreadyExistsException') {
        // Repository already exists, return URL
        const host = this.config.customDomain || this.config.host;
        return `https://${host}/${organization}/${project}/_git/${options.name}`;
      }

      // Handle other errors with actionable messages
      const apiError: GitApiError = {
        status: response.status,
        message: error.message || response.statusText,
        platform: 'azure-devops',
        operation: 'create_repo',
        resourceType: 'repository',
        resourceName: `${organization}/${project}/${options.name}`
      };

      const actionable = getActionableError(apiError);
      throw new Error(formatActionableError(actionable));
    }

    const data: any = await response.json();
    return data.webUrl || data.remoteUrl;
  }

  /**
   * Check if account is an organization (always true for Azure DevOps)
   */
  async isOrganization(account: string, token?: string): Promise<boolean> {
    // Azure DevOps always uses organizations
    return true;
  }

  /**
   * Get token creation URL
   */
  getTokenUrl(): string {
    if (this.config.selfHosted) {
      return `https://${this.config.customDomain || this.config.host}/_usersSettings/tokens`;
    }
    return 'https://dev.azure.com/_usersSettings/tokens';
  }

  /**
   * Get required token scopes
   */
  getRequiredScopes(isOrganization?: boolean): string[] {
    return ['vso.code_write', 'vso.code_manage', 'vso.project'];
  }

  /**
   * Override getRemoteUrl for Azure DevOps-specific URL format
   */
  getRemoteUrl(owner: string, repo: string, urlType: UrlType): string {
    const [organization, project] = this.parseOwner(owner);
    const host = this.config.customDomain || this.config.host;

    if (!project) {
      throw new Error('Azure DevOps requires a project. Use format: "organization/project"');
    }

    if (urlType === 'ssh') {
      return `git@ssh.${host}:v3/${organization}/${project}/${repo}`;
    } else {
      return `https://${host}/${organization}/${project}/_git/${repo}`;
    }
  }

  /**
   * Override getAuthHeaders for Azure DevOps-specific auth (Basic Auth with PAT)
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    const auth = Buffer.from(`:${token}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Parse owner string into organization and project
   * Format: "organization" or "organization/project"
   */
  private parseOwner(owner: string): [string, string | null] {
    const parts = owner.split('/');
    if (parts.length === 1) {
      return [parts[0], null];
    }
    return [parts[0], parts[1]];
  }
}

/**
 * Create an Azure DevOps provider instance
 */
export function createAzureDevOpsProvider(config?: Partial<PlatformConfig>): AzureDevOpsProvider {
  return new AzureDevOpsProvider(config);
}

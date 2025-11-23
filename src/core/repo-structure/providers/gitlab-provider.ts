/**
 * GitLab Provider Implementation (STUB)
 *
 * Stub implementation for GitLab.com and self-hosted GitLab instances.
 * Full implementation coming soon!
 *
 * @module providers/gitlab-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';

/**
 * GitLab Provider (Stub)
 *
 * Placeholder implementation for GitLab support.
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
   * Validate repository (stub)
   */
  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    throw new Error(`
❌ GitLab Support Coming Soon!

GitLab integration is not yet implemented.
Currently, only GitHub is fully supported.

🔜 What's coming:
   • GitLab.com and self-hosted GitLab support
   • Project validation and creation
   • Group/namespace support
   • SSH and HTTPS remote URLs

For now, please use GitHub or wait for the next SpecWeave release.

📖 Track progress: https://github.com/anton-abyzov/specweave/issues
    `.trim());
  }

  /**
   * Validate owner (stub)
   */
  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    throw new Error('GitLab support coming soon! Please use GitHub for now.');
  }

  /**
   * Create repository (stub)
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    throw new Error('GitLab support coming soon! Please use GitHub for now.');
  }

  /**
   * Check if organization (stub)
   */
  async isOrganization(account: string, token?: string): Promise<boolean> {
    return false;
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

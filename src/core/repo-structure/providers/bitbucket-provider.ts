/**
 * Bitbucket Provider Implementation (STUB)
 *
 * Stub implementation for Bitbucket.org and Bitbucket Server/Data Center.
 * Full implementation coming soon!
 *
 * @module providers/bitbucket-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';

/**
 * Bitbucket Provider (Stub)
 *
 * Placeholder implementation for Bitbucket support.
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
   * Validate repository (stub)
   */
  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    throw new Error(`
❌ Bitbucket Support Coming Soon!

Bitbucket integration is not yet implemented.
Currently, only GitHub is fully supported.

🔜 What's coming:
   • Bitbucket.org and Bitbucket Server/Data Center support
   • Repository validation and creation
   • Workspace support
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
    throw new Error('Bitbucket support coming soon! Please use GitHub for now.');
  }

  /**
   * Create repository (stub)
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    throw new Error('Bitbucket support coming soon! Please use GitHub for now.');
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
   * Override SSH user for Bitbucket (uses 'git' not 'hg')
   */
  protected getSSHUser(): string {
    return 'git';
  }

  /**
   * Override getAuthHeaders for Bitbucket-specific auth
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    // Bitbucket uses HTTP Basic Auth or App Passwords
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

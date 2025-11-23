/**
 * Local Git Provider Implementation
 *
 * Implements GitProvider interface for local-only Git repositories.
 * Suitable for repositories without remote hosting (GitHub, GitLab, etc.).
 *
 * @module providers/local-provider
 */

import { BaseGitProvider, type PlatformConfig, type RepoValidationResult, type OwnerValidationResult, type CreateRepoOptions } from '../git-provider.js';
import type { UrlType } from '../url-generator.js';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Local Git Provider
 *
 * Implements Git operations for local-only repositories.
 * Does not require API tokens or remote hosting.
 */
export class LocalGitProvider extends BaseGitProvider {
  constructor(config?: Partial<PlatformConfig>) {
    super({
      type: 'custom',
      name: 'Local Git',
      host: 'localhost',
      apiBaseUrl: '',
      selfHosted: true,
      customDomain: config?.customDomain
    });
  }

  /**
   * Validate if a local repository exists
   * owner represents the parent directory path
   * repo represents the repository directory name
   */
  async validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult> {
    try {
      // Resolve the full path
      const repoPath = resolve(owner, repo);
      const gitPath = join(repoPath, '.git');

      // Check if directory exists
      if (!existsSync(repoPath)) {
        return { exists: false, valid: true };
      }

      // Check if it's a Git repository
      const isGitRepo = existsSync(gitPath);

      if (isGitRepo) {
        return {
          exists: true,
          valid: true,
          url: `file://${repoPath}`
        };
      } else {
        // Directory exists but is not a Git repository
        return {
          exists: false,
          valid: true
        };
      }

    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `File system error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate if a local directory (owner) exists
   */
  async validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult> {
    try {
      const ownerPath = resolve(owner);

      if (!existsSync(ownerPath)) {
        return {
          valid: false,
          error: `Directory does not exist: ${ownerPath}`
        };
      }

      // Local directories are always treated as "user" type
      return { valid: true, type: 'user' };

    } catch (error) {
      return {
        valid: false,
        error: `File system error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new local repository
   * Note: This creates a bare directory, not a Git repository.
   * Users should run `git init` separately.
   */
  async createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string> {
    const repoPath = resolve(options.owner, options.name);

    // Check if directory already exists
    if (existsSync(repoPath)) {
      return `file://${repoPath}`;
    }

    // Note: We don't actually create the directory here
    // The repository initialization should be done separately with git init
    throw new Error(
      `Local repository creation requires manual setup:\n` +
      `  mkdir -p "${repoPath}"\n` +
      `  cd "${repoPath}"\n` +
      `  git init\n\n` +
      `SpecWeave does not automatically create local Git repositories.`
    );
  }

  /**
   * Local directories are never organizations
   */
  async isOrganization(account: string, token?: string): Promise<boolean> {
    return false;
  }

  /**
   * Get token creation URL (not applicable for local Git)
   */
  getTokenUrl(): string {
    return '';
  }

  /**
   * Get required token scopes (none for local Git)
   */
  getRequiredScopes(isOrganization?: boolean): string[] {
    return [];
  }

  /**
   * Generate Git remote URL for local repositories
   * Local repos use file:// protocol
   */
  getRemoteUrl(owner: string, repo: string, urlType: UrlType): string {
    const repoPath = resolve(owner, repo);
    return `file://${repoPath}`;
  }

  /**
   * Override getAuthHeaders (not needed for local Git)
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    return {};
  }
}

/**
 * Create a Local Git provider instance
 */
export function createLocalGitProvider(config?: Partial<PlatformConfig>): LocalGitProvider {
  return new LocalGitProvider(config);
}

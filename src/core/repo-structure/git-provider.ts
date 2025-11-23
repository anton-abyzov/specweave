/**
 * Git Provider Abstraction Layer
 *
 * Platform-agnostic interface for Git hosting providers (GitHub, GitLab, Bitbucket, Azure DevOps).
 * Enables SpecWeave to work seamlessly across multiple Git platforms.
 *
 * @module git-provider
 */

import type { UrlType } from './url-generator.js';

/**
 * Git platform type
 */
export type GitPlatformType = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops' | 'local' | 'custom';

/**
 * Repository visibility
 */
export type RepoVisibility = 'private' | 'public' | 'internal';

/**
 * Account type (user or organization)
 */
export type AccountType = 'user' | 'organization';

/**
 * Platform configuration
 */
export interface PlatformConfig {
  /** Platform type */
  type: GitPlatformType;

  /** Platform display name */
  name: string;

  /** Default hostname (e.g., 'github.com', 'gitlab.com') */
  host: string;

  /** API base URL */
  apiBaseUrl: string;

  /** Whether this is a self-hosted instance */
  selfHosted: boolean;

  /** Custom domain for self-hosted instances */
  customDomain?: string;
}

/**
 * Repository creation options
 */
export interface CreateRepoOptions {
  /** Repository name */
  name: string;

  /** Repository owner (user or organization) */
  owner: string;

  /** Repository description */
  description: string;

  /** Visibility (private/public/internal) */
  visibility: RepoVisibility;

  /** Whether to initialize with README */
  autoInit?: boolean;

  /** Whether to enable issues */
  hasIssues?: boolean;

  /** Whether to enable wiki */
  hasWiki?: boolean;

  /** Default branch name */
  defaultBranch?: string;
}

/**
 * Repository validation result
 */
export interface RepoValidationResult {
  /** Whether repository exists */
  exists: boolean;

  /** Whether validation was successful */
  valid: boolean;

  /** Repository URL if exists */
  url?: string;

  /** Error message if validation failed */
  error?: string;
}

/**
 * Owner validation result
 */
export interface OwnerValidationResult {
  /** Whether owner is valid */
  valid: boolean;

  /** Account type (user or organization) */
  type?: AccountType;

  /** Error message if validation failed */
  error?: string;
}

/**
 * Git Provider Interface
 *
 * Abstract interface that all Git platform providers must implement.
 * Enables platform-agnostic repository management.
 */
export interface GitProvider {
  /**
   * Platform configuration
   */
  readonly config: PlatformConfig;

  /**
   * Validate if a repository exists
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param token - Authentication token (optional)
   * @returns Validation result
   */
  validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult>;

  /**
   * Validate if an owner (user or organization) exists
   *
   * @param owner - Owner name to validate
   * @param token - Authentication token (optional)
   * @returns Owner validation result
   */
  validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult>;

  /**
   * Create a new repository
   *
   * @param options - Repository creation options
   * @param token - Authentication token (required)
   * @returns Repository URL
   */
  createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string>;

  /**
   * Generate Git remote URL
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param urlType - URL type (ssh or https)
   * @returns Formatted remote URL
   */
  getRemoteUrl(
    owner: string,
    repo: string,
    urlType: UrlType
  ): string;

  /**
   * Check if an account is an organization
   *
   * @param account - Account name
   * @param token - Authentication token (optional)
   * @returns Whether account is an organization
   */
  isOrganization(
    account: string,
    token?: string
  ): Promise<boolean>;

  /**
   * Get token creation URL
   *
   * @returns URL where users can create access tokens
   */
  getTokenUrl(): string;

  /**
   * Get required token scopes/permissions
   *
   * @param isOrganization - Whether creating repos in organization
   * @returns List of required scopes
   */
  getRequiredScopes(isOrganization?: boolean): string[];
}

/**
 * Base Git Provider (abstract implementation)
 *
 * Provides common functionality that all providers can extend.
 */
export abstract class BaseGitProvider implements GitProvider {
  constructor(public readonly config: PlatformConfig) {}

  abstract validateRepository(
    owner: string,
    repo: string,
    token?: string
  ): Promise<RepoValidationResult>;

  abstract validateOwner(
    owner: string,
    token?: string
  ): Promise<OwnerValidationResult>;

  abstract createRepository(
    options: CreateRepoOptions,
    token: string
  ): Promise<string>;

  abstract isOrganization(
    account: string,
    token?: string
  ): Promise<boolean>;

  abstract getTokenUrl(): string;

  abstract getRequiredScopes(isOrganization?: boolean): string[];

  /**
   * Generate Git remote URL (common implementation)
   */
  getRemoteUrl(owner: string, repo: string, urlType: UrlType): string {
    const host = this.config.customDomain || this.config.host;
    const sshUser = this.getSSHUser();

    if (urlType === 'ssh') {
      return `${sshUser}@${host}:${owner}/${repo}.git`;
    } else {
      return `https://${host}/${owner}/${repo}.git`;
    }
  }

  /**
   * Get SSH user for the platform
   * Override for platforms that use different SSH users
   */
  protected getSSHUser(): string {
    return 'git';
  }

  /**
   * Get full API URL
   */
  protected getApiUrl(path: string): string {
    const baseUrl = this.config.apiBaseUrl;
    return `${baseUrl}${path}`;
  }

  /**
   * Create authorization headers
   */
  protected getAuthHeaders(token: string): Record<string, string> {
    // Default implementation (Bearer token)
    // Override for platform-specific auth (e.g., GitLab uses 'PRIVATE-TOKEN')
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
  }
}

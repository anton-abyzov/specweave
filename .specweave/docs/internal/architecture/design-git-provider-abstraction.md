# Git Provider Abstraction Layer - Architecture Design

**Date**: 2025-11-23
**Status**: PROPOSED
**Related ADR**: (To be created after approval)

---

## Executive Summary

This document proposes a comprehensive **Git Provider Abstraction Layer** to replace 17 hardcoded GitHub references across SpecWeave, enabling support for GitLab, Bitbucket, Azure DevOps Repos, and other Git hosting platforms.

**Key Goals**:
- Platform-agnostic repository operations
- Backwards compatibility with existing GitHub workflows
- Extensible architecture for future providers
- Zero breaking changes for existing users

---

## Current State Analysis

### Hardcoded GitHub References (17 total)

**Locations**:
1. `src/core/repo-structure/repo-structure-manager.ts` - 11 instances
   - `https://api.github.com/repos/` (4×)
   - `https://api.github.com/orgs/` (2×)
   - `https://api.github.com/user/repos` (1×)
   - `https://api.github.com/users/` (2×)
   - `https://github.com/` (2× remote URLs)

2. `src/core/repo-structure/github-validator.ts` - 5 instances
   - `https://api.github.com/repos/` (1×)
   - `https://api.github.com/users/` (1×)
   - `https://api.github.com/orgs/` (1×)
   - `https://api.github.com/rate_limit` (1×)
   - Error messages (1×)

3. `src/cli/helpers/issue-tracker/github.ts` - 1 instance
   - `https://api.github.com/user` (1×)

**Impact**: Cannot support GitLab, Bitbucket, or Azure DevOps Repos without major refactoring

---

## Proposed Architecture

### 1. Interface Definitions

```typescript
/**
 * Git Provider Interface
 *
 * Platform-agnostic abstraction for Git hosting services (GitHub, GitLab, Bitbucket, Azure DevOps)
 *
 * @module core/git-provider
 */

/**
 * Repository validation result
 */
export interface RepositoryValidationResult {
  exists: boolean;
  valid: boolean;
  url?: string;
  error?: string;
  metadata?: {
    description?: string;
    visibility?: 'private' | 'public' | 'internal';
    defaultBranch?: string;
    hasIssues?: boolean;
  };
}

/**
 * Owner/organization validation result
 */
export interface OwnerValidationResult {
  valid: boolean;
  type?: 'user' | 'organization' | 'group';
  error?: string;
  metadata?: {
    displayName?: string;
    url?: string;
  };
}

/**
 * Repository creation options
 */
export interface CreateRepositoryOptions {
  name: string;
  owner: string;
  description: string;
  visibility: 'private' | 'public' | 'internal';
  autoInit?: boolean;
  hasIssues?: boolean;
  hasProjects?: boolean;
  hasWiki?: boolean;
}

/**
 * Remote URL types
 */
export type RemoteUrlType = 'ssh' | 'https';

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit?: number;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  supportsIssues: boolean;
  supportsProjects: boolean;
  supportsWiki: boolean;
  supportsInternalVisibility: boolean;
  supportsOrganizations: boolean;
  supportsGroups: boolean;
}

/**
 * Git Provider Interface
 *
 * All Git hosting platforms must implement this interface
 */
export interface GitProvider {
  /**
   * Provider identification
   */
  readonly name: string;
  readonly apiBaseUrl: string;
  readonly webBaseUrl: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Repository Operations
   */

  /**
   * Validate if a repository exists
   *
   * @param owner - Repository owner (user/org)
   * @param repo - Repository name
   * @returns Validation result with metadata
   */
  validateRepository(owner: string, repo: string): Promise<RepositoryValidationResult>;

  /**
   * Validate if an owner/organization exists
   *
   * @param owner - Owner/org name
   * @returns Owner validation result
   */
  validateOwner(owner: string): Promise<OwnerValidationResult>;

  /**
   * Create a repository via API
   *
   * @param options - Repository creation options
   * @returns Created repository metadata
   */
  createRepository(options: CreateRepositoryOptions): Promise<RepositoryValidationResult>;

  /**
   * Check if an account is an organization/group
   *
   * @param account - Account name
   * @returns True if organization/group
   */
  isOrganization(account: string): Promise<boolean>;

  /**
   * URL Generation
   */

  /**
   * Generate remote URL (SSH or HTTPS)
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param type - URL type (ssh or https)
   * @returns Git remote URL
   */
  getRemoteUrl(owner: string, repo: string, type: RemoteUrlType): string;

  /**
   * Generate web URL for repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Web URL
   */
  getWebUrl(owner: string, repo: string): string;

  /**
   * Rate Limiting
   */

  /**
   * Check current rate limit status
   *
   * @returns Rate limit information
   */
  checkRateLimit(): Promise<RateLimitInfo>;

  /**
   * Authentication
   */

  /**
   * Validate authentication token
   *
   * @returns True if token is valid
   */
  validateAuth(): Promise<boolean>;

  /**
   * Get authenticated user information
   *
   * @returns User metadata
   */
  getCurrentUser(): Promise<{ username: string; email?: string }>;
}
```

---

### 2. Provider Implementations

#### GitHub Provider (Extract Existing Logic)

```typescript
/**
 * GitHub Provider Implementation
 *
 * @module core/git-provider/providers/github
 */

import type {
  GitProvider,
  RepositoryValidationResult,
  OwnerValidationResult,
  CreateRepositoryOptions,
  RemoteUrlType,
  RateLimitInfo,
  ProviderCapabilities
} from '../git-provider.js';
import type { Logger } from '../../../utils/logger.js';
import { consoleLogger } from '../../../utils/logger.js';

export interface GitHubProviderOptions {
  token: string;
  apiEndpoint?: string;  // For GitHub Enterprise
  logger?: Logger;
}

export class GitHubProvider implements GitProvider {
  readonly name = 'github';
  readonly apiBaseUrl: string;
  readonly webBaseUrl: string;
  readonly capabilities: ProviderCapabilities = {
    supportsIssues: true,
    supportsProjects: true,
    supportsWiki: true,
    supportsInternalVisibility: false,  // GitHub uses private/public only
    supportsOrganizations: true,
    supportsGroups: false
  };

  private token: string;
  private logger: Logger;

  constructor(options: GitHubProviderOptions) {
    this.token = options.token;
    this.logger = options.logger ?? consoleLogger;

    // Support GitHub Enterprise
    if (options.apiEndpoint) {
      this.apiBaseUrl = options.apiEndpoint;
      this.webBaseUrl = options.apiEndpoint.replace('/api/v3', '');
    } else {
      this.apiBaseUrl = 'https://api.github.com';
      this.webBaseUrl = 'https://github.com';
    }
  }

  async validateRepository(owner: string, repo: string): Promise<RepositoryValidationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/repos/${owner}/${repo}`, {
        headers: this.getHeaders()
      });

      if (response.status === 404) {
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.html_url,
          metadata: {
            description: data.description,
            visibility: data.private ? 'private' : 'public',
            defaultBranch: data.default_branch,
            hasIssues: data.has_issues
          }
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          exists: false,
          valid: false,
          error: response.status === 401
            ? 'Invalid GitHub token'
            : 'Forbidden - check token permissions or rate limit'
        };
      }

      return {
        exists: false,
        valid: false,
        error: `GitHub API error: ${response.status} ${response.statusText}`
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async validateOwner(owner: string): Promise<OwnerValidationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${owner}`, {
        headers: this.getHeaders()
      });

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          valid: true,
          type: data.type === 'Organization' ? 'organization' : 'user',
          metadata: {
            displayName: data.name || data.login,
            url: data.html_url
          }
        };
      }

      if (response.status === 404) {
        return { valid: false, error: 'Owner not found on GitHub' };
      }

      return {
        valid: false,
        error: `GitHub API error: ${response.status}`
      };
    } catch (error) {
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async createRepository(options: CreateRepositoryOptions): Promise<RepositoryValidationResult> {
    const isOrg = await this.isOrganization(options.owner);
    const endpoint = isOrg
      ? `${this.apiBaseUrl}/orgs/${options.owner}/repos`
      : `${this.apiBaseUrl}/user/repos`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: options.name,
          description: options.description,
          private: options.visibility === 'private',
          auto_init: options.autoInit ?? false,
          has_issues: options.hasIssues ?? true,
          has_projects: options.hasProjects ?? true,
          has_wiki: options.hasWiki ?? false
        })
      });

      if (response.ok) {
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.html_url,
          metadata: {
            description: data.description,
            visibility: data.private ? 'private' : 'public',
            defaultBranch: data.default_branch
          }
        };
      }

      const error = await response.json() as any;
      if (error.errors?.[0]?.message?.includes('already exists')) {
        return {
          exists: true,
          valid: false,
          error: 'Repository already exists'
        };
      }

      throw new Error(error.message || `Failed to create repository: ${response.status}`);
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async isOrganization(account: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${account}`, {
        headers: this.getHeaders()
      });

      if (response.ok) {
        const data: any = await response.json();
        return data.type === 'Organization';
      }
    } catch {
      // Assume user if we can't determine
    }
    return false;
  }

  getRemoteUrl(owner: string, repo: string, type: RemoteUrlType = 'https'): string {
    if (type === 'ssh') {
      const sshHost = this.webBaseUrl.replace('https://', '').replace('http://', '');
      return `git@${sshHost}:${owner}/${repo}.git`;
    }
    return `${this.webBaseUrl}/${owner}/${repo}.git`;
  }

  getWebUrl(owner: string, repo: string): string {
    return `${this.webBaseUrl}/${owner}/${repo}`;
  }

  async checkRateLimit(): Promise<RateLimitInfo> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/rate_limit`, {
        headers: this.getHeaders()
      });

      const data: any = await response.json();
      const core = data.resources.core;

      return {
        remaining: core.remaining,
        limit: core.limit,
        resetAt: new Date(core.reset * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<{ username: string; email?: string }> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const data: any = await response.json();
    return {
      username: data.login,
      email: data.email || undefined
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }
}
```

#### GitLab Provider (Stub Implementation)

```typescript
/**
 * GitLab Provider Implementation
 *
 * @module core/git-provider/providers/gitlab
 */

import type {
  GitProvider,
  RepositoryValidationResult,
  OwnerValidationResult,
  CreateRepositoryOptions,
  RemoteUrlType,
  RateLimitInfo,
  ProviderCapabilities
} from '../git-provider.js';
import type { Logger } from '../../../utils/logger.js';
import { consoleLogger } from '../../../utils/logger.js';

export interface GitLabProviderOptions {
  token: string;
  apiEndpoint?: string;  // For self-hosted GitLab
  logger?: Logger;
}

export class GitLabProvider implements GitProvider {
  readonly name = 'gitlab';
  readonly apiBaseUrl: string;
  readonly webBaseUrl: string;
  readonly capabilities: ProviderCapabilities = {
    supportsIssues: true,
    supportsProjects: true,
    supportsWiki: true,
    supportsInternalVisibility: true,  // GitLab supports private/internal/public
    supportsOrganizations: false,
    supportsGroups: true  // GitLab uses groups instead of organizations
  };

  private token: string;
  private logger: Logger;

  constructor(options: GitLabProviderOptions) {
    this.token = options.token;
    this.logger = options.logger ?? consoleLogger;

    // Support self-hosted GitLab
    if (options.apiEndpoint) {
      this.apiBaseUrl = `${options.apiEndpoint}/api/v4`;
      this.webBaseUrl = options.apiEndpoint;
    } else {
      this.apiBaseUrl = 'https://gitlab.com/api/v4';
      this.webBaseUrl = 'https://gitlab.com';
    }
  }

  async validateRepository(owner: string, repo: string): Promise<RepositoryValidationResult> {
    // GitLab uses project ID or namespace/project format
    const projectPath = `${owner}/${repo}`;
    const encodedPath = encodeURIComponent(projectPath);

    try {
      const response = await fetch(`${this.apiBaseUrl}/projects/${encodedPath}`, {
        headers: this.getHeaders()
      });

      if (response.status === 404) {
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.web_url,
          metadata: {
            description: data.description,
            visibility: data.visibility,  // private, internal, or public
            defaultBranch: data.default_branch,
            hasIssues: data.issues_enabled
          }
        };
      }

      return {
        exists: false,
        valid: false,
        error: `GitLab API error: ${response.status}`
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async validateOwner(owner: string): Promise<OwnerValidationResult> {
    try {
      // Try as user
      const userResponse = await fetch(`${this.apiBaseUrl}/users?username=${owner}`, {
        headers: this.getHeaders()
      });

      if (userResponse.ok) {
        const users: any = await userResponse.json();
        if (users.length > 0) {
          return {
            valid: true,
            type: 'user',
            metadata: {
              displayName: users[0].name,
              url: users[0].web_url
            }
          };
        }
      }

      // Try as group
      const groupResponse = await fetch(`${this.apiBaseUrl}/groups/${owner}`, {
        headers: this.getHeaders()
      });

      if (groupResponse.ok) {
        const data: any = await groupResponse.json();
        return {
          valid: true,
          type: 'group',
          metadata: {
            displayName: data.name,
            url: data.web_url
          }
        };
      }

      return { valid: false, error: 'Owner not found on GitLab' };
    } catch (error) {
      return {
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async createRepository(options: CreateRepositoryOptions): Promise<RepositoryValidationResult> {
    const isGroup = await this.isOrganization(options.owner);

    try {
      const payload: any = {
        name: options.name,
        description: options.description,
        visibility: options.visibility,
        initialize_with_readme: options.autoInit ?? false,
        issues_enabled: options.hasIssues ?? true,
        wiki_enabled: options.hasWiki ?? false
      };

      if (isGroup) {
        // Get group ID
        const groupResponse = await fetch(`${this.apiBaseUrl}/groups/${options.owner}`, {
          headers: this.getHeaders()
        });
        const groupData: any = await groupResponse.json();
        payload.namespace_id = groupData.id;
      }

      const response = await fetch(`${this.apiBaseUrl}/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.web_url,
          metadata: {
            description: data.description,
            visibility: data.visibility,
            defaultBranch: data.default_branch
          }
        };
      }

      const error = await response.json() as any;
      throw new Error(error.message || `Failed to create project: ${response.status}`);
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async isOrganization(account: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/groups/${account}`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getRemoteUrl(owner: string, repo: string, type: RemoteUrlType = 'https'): string {
    if (type === 'ssh') {
      const sshHost = this.webBaseUrl.replace('https://', '').replace('http://', '');
      return `git@${sshHost}:${owner}/${repo}.git`;
    }
    return `${this.webBaseUrl}/${owner}/${repo}.git`;
  }

  getWebUrl(owner: string, repo: string): string {
    return `${this.webBaseUrl}/${owner}/${repo}`;
  }

  async checkRateLimit(): Promise<RateLimitInfo> {
    // GitLab doesn't have a rate limit endpoint like GitHub
    // Rate limits are per-IP and not exposed via API
    // Return default values
    this.logger.warn('GitLab does not expose rate limit information via API');
    return {
      remaining: 1000,
      resetAt: new Date(Date.now() + 60000)  // 1 minute from now
    };
  }

  async validateAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<{ username: string; email?: string }> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const data: any = await response.json();
    return {
      username: data.username,
      email: data.email || undefined
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'PRIVATE-TOKEN': this.token,
      'Content-Type': 'application/json'
    };
  }
}
```

#### Bitbucket Provider (Stub Implementation)

```typescript
/**
 * Bitbucket Provider Implementation
 *
 * @module core/git-provider/providers/bitbucket
 */

import type {
  GitProvider,
  RepositoryValidationResult,
  OwnerValidationResult,
  CreateRepositoryOptions,
  RemoteUrlType,
  RateLimitInfo,
  ProviderCapabilities
} from '../git-provider.js';
import type { Logger } from '../../../utils/logger.js';
import { consoleLogger } from '../../../utils/logger.js';

export interface BitbucketProviderOptions {
  username: string;
  appPassword: string;  // Bitbucket uses app passwords
  logger?: Logger;
}

export class BitbucketProvider implements GitProvider {
  readonly name = 'bitbucket';
  readonly apiBaseUrl = 'https://api.bitbucket.org/2.0';
  readonly webBaseUrl = 'https://bitbucket.org';
  readonly capabilities: ProviderCapabilities = {
    supportsIssues: true,
    supportsProjects: true,
    supportsWiki: true,
    supportsInternalVisibility: false,  // Bitbucket uses private/public only
    supportsOrganizations: false,
    supportsGroups: false  // Bitbucket uses "workspaces"
  };

  private username: string;
  private appPassword: string;
  private logger: Logger;

  constructor(options: BitbucketProviderOptions) {
    this.username = options.username;
    this.appPassword = options.appPassword;
    this.logger = options.logger ?? consoleLogger;
  }

  async validateRepository(owner: string, repo: string): Promise<RepositoryValidationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/repositories/${owner}/${repo}`, {
        headers: this.getHeaders()
      });

      if (response.status === 404) {
        return { exists: false, valid: true };
      }

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          exists: true,
          valid: true,
          url: data.links.html.href,
          metadata: {
            description: data.description,
            visibility: data.is_private ? 'private' : 'public'
          }
        };
      }

      return {
        exists: false,
        valid: false,
        error: `Bitbucket API error: ${response.status}`
      };
    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async validateOwner(owner: string): Promise<OwnerValidationResult> {
    // Stub implementation - to be completed
    this.logger.warn('Bitbucket provider validation not fully implemented');
    return { valid: true, type: 'user' };
  }

  async createRepository(options: CreateRepositoryOptions): Promise<RepositoryValidationResult> {
    // Stub implementation - to be completed
    throw new Error('Bitbucket repository creation not yet implemented');
  }

  async isOrganization(account: string): Promise<boolean> {
    // Bitbucket uses "workspaces" instead of organizations
    return false;
  }

  getRemoteUrl(owner: string, repo: string, type: RemoteUrlType = 'https'): string {
    if (type === 'ssh') {
      return `git@bitbucket.org:${owner}/${repo}.git`;
    }
    return `${this.webBaseUrl}/${owner}/${repo}.git`;
  }

  getWebUrl(owner: string, repo: string): string {
    return `${this.webBaseUrl}/${owner}/${repo}`;
  }

  async checkRateLimit(): Promise<RateLimitInfo> {
    // Bitbucket doesn't expose rate limit information
    this.logger.warn('Bitbucket does not expose rate limit information');
    return {
      remaining: 1000,
      resetAt: new Date(Date.now() + 60000)
    };
  }

  async validateAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<{ username: string; email?: string }> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const data: any = await response.json();
    return {
      username: data.username,
      email: data.email || undefined
    };
  }

  private getHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }
}
```

---

### 3. Provider Factory & Registry

```typescript
/**
 * Git Provider Factory
 *
 * Creates and manages Git provider instances
 *
 * @module core/git-provider/provider-factory
 */

import type { GitProvider } from './git-provider.js';
import { GitHubProvider, type GitHubProviderOptions } from './providers/github.js';
import { GitLabProvider, type GitLabProviderOptions } from './providers/gitlab.js';
import { BitbucketProvider, type BitbucketProviderOptions } from './providers/bitbucket.js';
import type { Logger } from '../../utils/logger.js';

export type ProviderType = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';

export interface ProviderFactoryOptions {
  type: ProviderType;
  token?: string;
  username?: string;
  appPassword?: string;
  apiEndpoint?: string;
  logger?: Logger;
}

/**
 * Provider Factory Error
 */
export class ProviderFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderFactoryError';
  }
}

/**
 * Create a Git provider instance
 *
 * @param options - Provider configuration
 * @returns Git provider instance
 */
export function createProvider(options: ProviderFactoryOptions): GitProvider {
  switch (options.type) {
    case 'github':
      if (!options.token) {
        throw new ProviderFactoryError('GitHub provider requires token');
      }
      return new GitHubProvider({
        token: options.token,
        apiEndpoint: options.apiEndpoint,
        logger: options.logger
      });

    case 'gitlab':
      if (!options.token) {
        throw new ProviderFactoryError('GitLab provider requires token');
      }
      return new GitLabProvider({
        token: options.token,
        apiEndpoint: options.apiEndpoint,
        logger: options.logger
      });

    case 'bitbucket':
      if (!options.username || !options.appPassword) {
        throw new ProviderFactoryError('Bitbucket provider requires username and appPassword');
      }
      return new BitbucketProvider({
        username: options.username,
        appPassword: options.appPassword,
        logger: options.logger
      });

    case 'azure-devops':
      throw new ProviderFactoryError('Azure DevOps provider not yet implemented');

    default:
      throw new ProviderFactoryError(`Unknown provider type: ${options.type}`);
  }
}

/**
 * Provider Registry
 *
 * Manages multiple provider instances (for multi-provider support)
 */
export class ProviderRegistry {
  private providers: Map<string, GitProvider> = new Map();
  private defaultProvider?: GitProvider;

  /**
   * Register a provider
   *
   * @param id - Provider identifier
   * @param provider - Provider instance
   * @param isDefault - Set as default provider
   */
  register(id: string, provider: GitProvider, isDefault: boolean = false): void {
    this.providers.set(id, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = provider;
    }
  }

  /**
   * Get provider by ID
   *
   * @param id - Provider identifier
   * @returns Provider instance or undefined
   */
  get(id: string): GitProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get default provider
   *
   * @returns Default provider instance
   */
  getDefault(): GitProvider {
    if (!this.defaultProvider) {
      throw new Error('No default provider registered');
    }
    return this.defaultProvider;
  }

  /**
   * List all registered providers
   *
   * @returns Array of provider IDs
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = undefined;
  }
}
```

---

### 4. Environment Variable Strategy

```typescript
/**
 * Git Provider Configuration
 *
 * Manages environment variables and provider selection
 *
 * @module core/git-provider/provider-config
 */

import { ProviderType } from './provider-factory.js';

/**
 * Provider credentials from environment
 */
export interface ProviderCredentials {
  type: ProviderType;
  token?: string;
  username?: string;
  appPassword?: string;
  apiEndpoint?: string;
}

/**
 * Detect provider from environment variables
 *
 * Priority:
 * 1. GIT_PROVIDER (explicit selection)
 * 2. GITHUB_TOKEN / GH_TOKEN (GitHub)
 * 3. GITLAB_TOKEN (GitLab)
 * 4. BITBUCKET_USERNAME + BITBUCKET_APP_PASSWORD (Bitbucket)
 *
 * @returns Provider credentials or null
 */
export function detectProviderFromEnv(): ProviderCredentials | null {
  // Explicit provider selection
  const explicitProvider = process.env.GIT_PROVIDER as ProviderType;
  if (explicitProvider) {
    switch (explicitProvider) {
      case 'github':
        return {
          type: 'github',
          token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
          apiEndpoint: process.env.GITHUB_API_URL
        };
      case 'gitlab':
        return {
          type: 'gitlab',
          token: process.env.GITLAB_TOKEN,
          apiEndpoint: process.env.GITLAB_API_URL
        };
      case 'bitbucket':
        return {
          type: 'bitbucket',
          username: process.env.BITBUCKET_USERNAME,
          appPassword: process.env.BITBUCKET_APP_PASSWORD
        };
    }
  }

  // Auto-detection based on available credentials
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    return {
      type: 'github',
      token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
      apiEndpoint: process.env.GITHUB_API_URL
    };
  }

  if (process.env.GITLAB_TOKEN) {
    return {
      type: 'gitlab',
      token: process.env.GITLAB_TOKEN,
      apiEndpoint: process.env.GITLAB_API_URL
    };
  }

  if (process.env.BITBUCKET_USERNAME && process.env.BITBUCKET_APP_PASSWORD) {
    return {
      type: 'bitbucket',
      username: process.env.BITBUCKET_USERNAME,
      appPassword: process.env.BITBUCKET_APP_PASSWORD
    };
  }

  return null;
}

/**
 * Environment variable mapping
 */
export const ENV_VARS = {
  // Provider selection
  GIT_PROVIDER: 'GIT_PROVIDER',  // NEW: Explicit provider selection

  // GitHub (backwards compatible)
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  GH_TOKEN: 'GH_TOKEN',
  GITHUB_API_URL: 'GITHUB_API_URL',  // For GitHub Enterprise

  // GitLab
  GITLAB_TOKEN: 'GITLAB_TOKEN',
  GITLAB_API_URL: 'GITLAB_API_URL',  // For self-hosted GitLab

  // Bitbucket
  BITBUCKET_USERNAME: 'BITBUCKET_USERNAME',
  BITBUCKET_APP_PASSWORD: 'BITBUCKET_APP_PASSWORD'
} as const;
```

---

### 5. Integration with RepoStructureManager

```typescript
/**
 * Updated RepoStructureManager Integration
 *
 * Changes required in repo-structure-manager.ts
 */

// BEFORE (hardcoded GitHub):
private async createGitHubRepo(...) {
  const endpoint = isOrg
    ? `https://api.github.com/orgs/${owner}/repos`
    : `https://api.github.com/user/repos`;
  // ...
}

// AFTER (using GitProvider):
import { createProvider, detectProviderFromEnv } from '../git-provider/provider-factory.js';
import type { GitProvider } from '../git-provider/git-provider.js';

export class RepoStructureManager {
  private projectPath: string;
  private gitProvider?: GitProvider;

  constructor(projectPath: string, githubToken?: string) {
    this.projectPath = projectPath;

    // Initialize Git provider (backwards compatible)
    const providerCreds = detectProviderFromEnv();
    if (providerCreds || githubToken) {
      this.gitProvider = createProvider({
        type: providerCreds?.type || 'github',
        token: providerCreds?.token || githubToken,
        username: providerCreds?.username,
        appPassword: providerCreds?.appPassword,
        apiEndpoint: providerCreds?.apiEndpoint
      });
    }
  }

  private async createRepository(
    owner: string,
    name: string,
    description: string,
    visibility: 'private' | 'public'
  ): Promise<void> {
    if (!this.gitProvider) {
      throw new Error('No Git provider configured');
    }

    const result = await this.gitProvider.createRepository({
      owner,
      name,
      description,
      visibility,
      autoInit: false,
      hasIssues: true,
      hasProjects: true,
      hasWiki: false
    });

    if (!result.valid) {
      throw new Error(result.error || 'Failed to create repository');
    }
  }

  private async repositoryExistsOnGitHub(owner: string, repo: string): Promise<boolean> {
    if (!this.gitProvider) {
      return false;
    }

    const result = await this.gitProvider.validateRepository(owner, repo);
    return result.exists;
  }

  private async isGitHubOrganization(account: string): Promise<boolean> {
    if (!this.gitProvider) {
      return false;
    }

    return this.gitProvider.isOrganization(account);
  }
}
```

---

## File Structure

```
src/core/git-provider/
├── git-provider.ts              # Core interface definitions
├── provider-factory.ts          # Factory & registry
├── provider-config.ts           # Environment variable detection
└── providers/
    ├── github.ts                # GitHub implementation
    ├── gitlab.ts                # GitLab implementation
    ├── bitbucket.ts             # Bitbucket implementation
    └── azure-devops.ts          # Future: Azure DevOps implementation

tests/unit/core/git-provider/
├── github-provider.test.ts
├── gitlab-provider.test.ts
├── bitbucket-provider.test.ts
└── provider-factory.test.ts
```

---

## Migration Strategy

### Phase 1: Create Abstraction Layer (Week 1)
1. Create interface definitions (`git-provider.ts`)
2. Extract GitHub logic into `GitHubProvider` class
3. Create provider factory
4. Write unit tests (85%+ coverage)

### Phase 2: Integrate with Core (Week 2)
1. Update `RepoStructureManager` to use `GitProvider` interface
2. Update `github-validator.ts` to use provider
3. Backwards compatibility testing
4. Update environment variable handling

### Phase 3: Add GitLab Support (Week 3)
1. Complete `GitLabProvider` implementation
2. Integration tests with GitLab API
3. Documentation updates
4. CLI prompts for provider selection

### Phase 4: Add Bitbucket Support (Week 4)
1. Complete `BitbucketProvider` implementation
2. Integration tests
3. Final documentation
4. Release v1.0.0 with multi-provider support

---

## Backwards Compatibility

### Existing .env Files
```bash
# OLD (still works!)
GITHUB_TOKEN=ghp_xxx
GH_TOKEN=ghp_xxx

# NEW (explicit provider selection)
GIT_PROVIDER=github
GH_TOKEN=ghp_xxx

# GitLab
GIT_PROVIDER=gitlab
GITLAB_TOKEN=glpat_xxx

# Bitbucket
GIT_PROVIDER=bitbucket
BITBUCKET_USERNAME=user
BITBUCKET_APP_PASSWORD=xxx
```

### Migration Path
1. Existing projects: **No changes required** (defaults to GitHub)
2. New projects: Prompted for provider during `specweave init`
3. Multi-provider: Use `ProviderRegistry` for advanced scenarios

---

## Testing Strategy

### Unit Tests
- Each provider: 85%+ coverage
- Factory: 100% coverage
- Error handling: All edge cases

### Integration Tests
- GitHub API (mocked + real if `GITHUB_TOKEN` available)
- GitLab API (mocked)
- Bitbucket API (mocked)

### E2E Tests
- `specweave init` with GitHub
- `specweave init` with GitLab
- Provider switching

---

## Security Considerations

1. **Tokens never logged**: All providers use logger abstraction
2. **Tokens in .env only**: Never committed to Git
3. **Secure headers**: Bearer tokens, app passwords encrypted in transit
4. **Rate limit respect**: All providers check rate limits before batch operations

---

## Performance

- **Lazy initialization**: Providers created only when needed
- **Caching**: Repository validation results cached (1 minute TTL)
- **Batch operations**: Provider registry supports parallel operations
- **No breaking changes**: Existing GitHub workflows unchanged

---

## Future Extensions

1. **Azure DevOps Repos** (Q2 2025)
2. **Gitea** (self-hosted)
3. **Gogs** (lightweight)
4. **Custom Git servers** (generic HTTP provider)

---

## Open Questions

1. Should we support multiple providers simultaneously (e.g., GitHub + GitLab)?
   - **Answer**: Yes, via `ProviderRegistry`

2. How do we handle provider-specific features (e.g., GitLab internal visibility)?
   - **Answer**: `capabilities` property + graceful degradation

3. Should CLI prompt for provider during `specweave init`?
   - **Answer**: Yes, with GitHub as default for backwards compatibility

---

## Approval Checklist

- [ ] Architecture reviewed by Tech Lead
- [ ] Backwards compatibility verified
- [ ] File structure approved
- [ ] Migration strategy agreed
- [ ] Security review passed
- [ ] Performance benchmarks acceptable
- [ ] Documentation complete

---

**Next Steps**:
1. Review this design document
2. Approve file structure
3. Create ADR (Architecture Decision Record)
4. Begin Phase 1 implementation

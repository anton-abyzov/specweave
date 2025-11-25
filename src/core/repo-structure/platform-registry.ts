/**
 * Git Platform Registry
 *
 * Central registry for all supported Git platforms.
 * Manages platform instances and provides platform selection.
 *
 * @module platform-registry
 */

import type { GitProvider, GitPlatformType, PlatformConfig } from './git-provider.js';

/**
 * Platform registry entry
 */
export interface PlatformEntry {
  /** Platform type identifier */
  type: GitPlatformType;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Whether platform is fully supported */
  supported: boolean;

  /** Status message (e.g., "Coming Soon", "Beta") */
  status?: string;

  /** Platform configuration */
  config: PlatformConfig;
}

/**
 * Platform selection option (for prompts)
 */
export interface PlatformOption {
  value: GitPlatformType;
  name: string;
  description: string;
  disabled?: boolean | string;
}

/**
 * Git Platform Registry
 *
 * Singleton registry for all Git hosting platforms.
 */
export class GitPlatformRegistry {
  private static instance: GitPlatformRegistry;
  private platforms: Map<GitPlatformType, PlatformEntry>;
  private providers: Map<GitPlatformType, GitProvider>;

  private constructor() {
    this.platforms = new Map();
    this.providers = new Map();
    this.registerDefaultPlatforms();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GitPlatformRegistry {
    if (!GitPlatformRegistry.instance) {
      GitPlatformRegistry.instance = new GitPlatformRegistry();
    }
    return GitPlatformRegistry.instance;
  }

  /**
   * Register default platforms
   */
  private registerDefaultPlatforms(): void {
    // GitHub (fully supported)
    this.registerPlatform({
      type: 'github',
      name: 'GitHub',
      description: 'GitHub.com - Most popular Git hosting',
      supported: true,
      config: {
        type: 'github',
        name: 'GitHub',
        host: 'github.com',
        apiBaseUrl: 'https://api.github.com',
        selfHosted: false
      }
    });

    // GitLab (repo operations only - no issue sync plugin yet)
    this.registerPlatform({
      type: 'gitlab',
      name: 'GitLab',
      description: 'GitLab.com - DevOps platform',
      supported: false,
      status: 'repo-only, issue sync coming soon',
      config: {
        type: 'gitlab',
        name: 'GitLab',
        host: 'gitlab.com',
        apiBaseUrl: 'https://gitlab.com/api/v4',
        selfHosted: false
      }
    });

    // Bitbucket (fully supported)
    this.registerPlatform({
      type: 'bitbucket',
      name: 'Bitbucket',
      description: 'Bitbucket.org - Atlassian Git hosting',
      supported: true,
      config: {
        type: 'bitbucket',
        name: 'Bitbucket',
        host: 'bitbucket.org',
        apiBaseUrl: 'https://api.bitbucket.org/2.0',
        selfHosted: false
      }
    });

    // Azure DevOps (fully supported)
    this.registerPlatform({
      type: 'azure-devops',
      name: 'Azure DevOps',
      description: 'Azure DevOps Repos - Microsoft DevOps platform',
      supported: true,
      config: {
        type: 'azure-devops',
        name: 'Azure DevOps',
        host: 'dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com',
        selfHosted: false
      }
    });

    // Local Git (fully supported)
    this.registerPlatform({
      type: 'local',
      name: 'Local Git',
      description: 'Local-only Git repositories (no remote hosting)',
      supported: true,
      config: {
        type: 'local',
        name: 'Local Git',
        host: 'localhost',
        apiBaseUrl: '',
        selfHosted: true
      }
    });
  }

  /**
   * Register a platform
   */
  registerPlatform(entry: PlatformEntry): void {
    this.platforms.set(entry.type, entry);
  }

  /**
   * Register a provider instance
   * Idempotent: skips if provider already registered (Issue #4 fix)
   */
  registerProvider(type: GitPlatformType, provider: GitProvider): void {
    // Issue #4 fix: Idempotency check to prevent unnecessary re-registration
    if (this.providers.has(type)) {
      // Provider already registered, skip to avoid replacing existing instance
      return;
    }
    this.providers.set(type, provider);
  }

  /**
   * Clear all registered providers (for testing/cleanup)
   * @internal
   */
  clearProviders(): void {
    this.providers.clear();
  }

  /**
   * Clear all registered platforms (for testing/cleanup)
   * @internal
   */
  clearPlatforms(): void {
    this.platforms.clear();
  }

  /**
   * Reset the entire registry (for testing only)
   * @internal
   */
  reset(): void {
    this.providers.clear();
    this.platforms.clear();
    this.registerDefaultPlatforms();
  }

  /**
   * Get platform entry
   */
  getPlatform(type: GitPlatformType): PlatformEntry | undefined {
    return this.platforms.get(type);
  }

  /**
   * Get provider instance
   */
  getProvider(type: GitPlatformType): GitProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): PlatformEntry[] {
    return Array.from(this.platforms.values()).filter(p => p.supported);
  }

  /**
   * Get all platforms (including unsupported)
   */
  getAllPlatforms(): PlatformEntry[] {
    return Array.from(this.platforms.values());
  }

  /**
   * Get platform options for user selection
   *
   * @param includeUnsupported - Whether to include unsupported platforms
   * @returns Platform options for prompts
   */
  getPlatformOptions(includeUnsupported: boolean = false): PlatformOption[] {
    const platforms = includeUnsupported
      ? this.getAllPlatforms()
      : this.getSupportedPlatforms();

    return platforms.map(p => ({
      value: p.type,
      name: p.status ? `${p.name} (${p.status})` : p.name,
      description: p.description,
      disabled: p.supported ? false : p.status || 'Not yet supported'
    }));
  }

  /**
   * Check if a platform is supported
   */
  isSupported(type: GitPlatformType): boolean {
    const platform = this.getPlatform(type);
    return platform?.supported || false;
  }

  /**
   * Get default platform (GitHub)
   */
  getDefaultPlatform(): GitPlatformType {
    return 'github';
  }
}

/**
 * Get platform registry instance (convenience function)
 */
export function getPlatformRegistry(): GitPlatformRegistry {
  return GitPlatformRegistry.getInstance();
}

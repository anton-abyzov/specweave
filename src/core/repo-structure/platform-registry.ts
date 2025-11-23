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

    // GitLab (stub - coming soon)
    this.registerPlatform({
      type: 'gitlab',
      name: 'GitLab',
      description: 'GitLab.com - DevOps platform',
      supported: false,
      status: 'Coming Soon',
      config: {
        type: 'gitlab',
        name: 'GitLab',
        host: 'gitlab.com',
        apiBaseUrl: 'https://gitlab.com/api/v4',
        selfHosted: false
      }
    });

    // Bitbucket (stub - coming soon)
    this.registerPlatform({
      type: 'bitbucket',
      name: 'Bitbucket',
      description: 'Bitbucket.org - Atlassian Git hosting',
      supported: false,
      status: 'Coming Soon',
      config: {
        type: 'bitbucket',
        name: 'Bitbucket',
        host: 'bitbucket.org',
        apiBaseUrl: 'https://api.bitbucket.org/2.0',
        selfHosted: false
      }
    });

    // Azure DevOps (stub - coming soon)
    this.registerPlatform({
      type: 'azure-devops',
      name: 'Azure DevOps',
      description: 'Azure DevOps Repos - Microsoft DevOps platform',
      supported: false,
      status: 'Coming Soon',
      config: {
        type: 'azure-devops',
        name: 'Azure DevOps',
        host: 'dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com',
        selfHosted: false
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
   */
  registerProvider(type: GitPlatformType, provider: GitProvider): void {
    this.providers.set(type, provider);
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

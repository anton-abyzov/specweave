/**
 * ADO Profile Resolver
 *
 * Resolves the correct ADO profile to use for sync operations.
 * Priority:
 * 1. Increment's stored profile (metadata.json -> external_sync.ado.profile)
 * 2. Global defaultProfile (config.json -> sync.defaultProfile)
 *
 * This allows each increment to sync to its designated ADO project
 * without requiring manual profile switching.
 *
 * The default profile is a FALLBACK, not a constraint. Bulk operations
 * iterate ALL profiles.
 *
 * Usage:
 * ```typescript
 * const resolver = await createAdoProfileResolver();
 * const profile = await resolver.resolveProfile('0093-my-increment');
 * // profile contains organization, project, PAT, etc.
 * ```
 *
 * @module ado-profile-resolver
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * ADO profile configuration
 */
export interface AdoProfileConfig {
  /**
   * Profile name (for display/logging)
   */
  profileName: string;

  /**
   * ADO organization name
   */
  organization: string;

  /**
   * ADO project name
   */
  project: string;

  /**
   * Display name (optional)
   */
  displayName?: string;

  /**
   * Area path (optional)
   */
  areaPath?: string;

  /**
   * Iteration path (optional)
   */
  iterationPath?: string;
}

/**
 * Profile resolution result
 */
export interface ProfileResolutionResult {
  /**
   * Whether resolution succeeded
   */
  success: boolean;

  /**
   * Resolved profile config (if success)
   */
  profile?: AdoProfileConfig;

  /**
   * Source of the profile
   */
  source?: 'increment' | 'global';

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Increment ID that was checked
   */
  incrementId?: string;
}

/**
 * Sync profile from config.json
 */
interface ConfigProfile {
  provider: string;
  displayName?: string;
  config: {
    organization: string;
    project: string;
    areaPath?: string;
    iterationPath?: string;
  };
}

/**
 * Sync config from config.json
 */
interface SyncConfig {
  activeProfile?: string;
  defaultProfile?: string;
  profiles?: Record<string, ConfigProfile>;
}

/**
 * Config structure
 */
interface SpecWeaveConfig {
  sync?: SyncConfig;
}

/**
 * ADO Profile Resolver
 */
export class AdoProfileResolver {
  private projectRoot: string;
  private configPath: string;
  private incrementsPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
    this.incrementsPath = path.join(projectRoot, '.specweave', 'increments');
  }

  /**
   * Resolve the ADO profile for an increment
   *
   * Priority:
   * 1. Increment's metadata.json -> external_sync.ado.profile
   * 2. Config.json -> sync.defaultProfile
   *
   * @param incrementId - Increment ID (e.g., "0093-my-feature")
   * @returns Profile resolution result
   */
  async resolveProfile(incrementId: string): Promise<ProfileResolutionResult> {
    // Load global config
    const config = await this.loadConfig();
    if (!config) {
      return {
        success: false,
        error: 'Failed to load .specweave/config.json',
        incrementId,
      };
    }

    // Try to get increment-specific profile first
    const incrementProfile = await this.getIncrementProfile(incrementId);

    // Determine which profile to use
    // Read both activeProfile (canonical) and defaultProfile (legacy) with fallback
    const globalDefaultProfile = config.sync?.activeProfile ?? config.sync?.defaultProfile;
    const profileName = incrementProfile || globalDefaultProfile;

    if (!profileName) {
      return {
        success: false,
        error: 'No ADO profile configured. Set sync.defaultProfile in config.json or external_sync.ado.profile in increment metadata.',
        incrementId,
      };
    }

    // Check if profile is for ADO provider
    const profiles = config.sync?.profiles || {};
    const profileConfig = profiles[profileName] as ConfigProfile | undefined;

    if (!profileConfig) {
      return {
        success: false,
        error: `Profile "${profileName}" not found in config.sync.profiles`,
        incrementId,
      };
    }

    if (profileConfig.provider !== 'ado') {
      return {
        success: false,
        error: `Profile "${profileName}" is not an ADO profile (provider: ${profileConfig.provider})`,
        incrementId,
      };
    }

    // Validate required fields
    if (!profileConfig.config?.organization || !profileConfig.config?.project) {
      return {
        success: false,
        error: `Profile "${profileName}" missing required fields (organization, project)`,
        incrementId,
      };
    }

    return {
      success: true,
      profile: {
        profileName,
        organization: profileConfig.config.organization,
        project: profileConfig.config.project,
        displayName: profileConfig.displayName,
        areaPath: profileConfig.config.areaPath,
        iterationPath: profileConfig.config.iterationPath,
      },
      source: incrementProfile ? 'increment' : 'global',
      incrementId,
    };
  }

  /**
   * Get increment's stored ADO profile name
   *
   * @param incrementId - Increment ID
   * @returns Profile name or null if not set
   */
  async getIncrementProfile(incrementId: string): Promise<string | null> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      // Check for profile in external_sync.ado.profile
      return metadata?.external_sync?.ado?.profile || null;
    } catch {
      // Metadata not found or invalid - return null
      return null;
    }
  }

  /**
   * Set increment's ADO profile
   *
   * Stores the profile name in the increment's metadata.json
   *
   * @param incrementId - Increment ID
   * @param profileName - Profile name to set
   */
  async setIncrementProfile(incrementId: string, profileName: string): Promise<void> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    // Load existing metadata
    let metadata: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    } catch {
      // Start with empty metadata if not found
    }

    // Set external_sync.ado.profile
    if (!metadata.external_sync) {
      metadata.external_sync = {};
    }
    if (!(metadata.external_sync as Record<string, unknown>).ado) {
      (metadata.external_sync as Record<string, unknown>).ado = {};
    }
    ((metadata.external_sync as Record<string, unknown>).ado as Record<string, unknown>).profile = profileName;

    // Write back
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
  }

  /**
   * List available ADO profiles
   *
   * @returns Array of profile names
   */
  async listAdoProfiles(): Promise<string[]> {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return [];
    }

    const profiles = config.sync.profiles as Record<string, ConfigProfile>;
    return Object.entries(profiles)
      .filter(([_, p]) => p.provider === 'ado')
      .map(([name]) => name);
  }

  /**
   * Load config.json
   */
  private async loadConfig(): Promise<SpecWeaveConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content) as SpecWeaveConfig;
    } catch {
      return null;
    }
  }
}

/**
 * Create an AdoProfileResolver instance
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns AdoProfileResolver instance
 */
export async function createAdoProfileResolver(
  projectRoot: string = process.cwd()
): Promise<AdoProfileResolver> {
  return new AdoProfileResolver(projectRoot);
}

/**
 * Quick resolve: Get ADO profile for an increment
 *
 * @param incrementId - Increment ID
 * @param projectRoot - Project root directory
 * @returns Profile resolution result
 */
export async function resolveAdoProfile(
  incrementId: string,
  projectRoot: string = process.cwd()
): Promise<ProfileResolutionResult> {
  const resolver = new AdoProfileResolver(projectRoot);
  return resolver.resolveProfile(incrementId);
}

export default AdoProfileResolver;

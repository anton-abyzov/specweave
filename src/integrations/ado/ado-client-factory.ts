/**
 * ADO Client Factory
 *
 * Creates profile-aware ADO clients for multi-project sync support.
 * Uses AdoProfileResolver to determine which org/project to use
 * based on the increment's metadata.
 *
 * This is the FIX for the single-activeProfile problem:
 * - Each increment can have its own ADO profile in metadata.json
 * - The factory resolves the profile and creates a client for that specific org/project
 *
 * @module integrations/ado/ado-client-factory
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { AdoClient, AdoClientConfig } from './ado-client.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Profile configuration from config.json
 */
interface ProfileConfig {
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
 * Resolved profile with all information needed to create a client
 */
export interface ResolvedAdoProfile {
  profileName: string;
  organization: string;
  project: string;
  displayName?: string;
  areaPath?: string;
  iterationPath?: string;
  source: 'increment' | 'global';
}

/**
 * Factory options
 */
export interface AdoClientFactoryOptions {
  projectRoot?: string;
  logger?: Logger;
}

/**
 * Result from profile resolution
 */
export interface ProfileResolutionResult {
  success: boolean;
  profile?: ResolvedAdoProfile;
  error?: string;
}

/**
 * ADO Client Factory
 *
 * Resolves the correct ADO profile for an increment and creates
 * a client configured for that specific ADO project.
 */
export class AdoClientFactory {
  private projectRoot: string;
  private logger: Logger;
  private configPath: string;
  private incrementsPath: string;

  constructor(options: AdoClientFactoryOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.logger = options.logger ?? consoleLogger;
    this.configPath = path.join(this.projectRoot, '.specweave', 'config.json');
    this.incrementsPath = path.join(this.projectRoot, '.specweave', 'increments');
  }

  /**
   * Create an ADO client for a specific increment
   *
   * Resolution priority:
   * 1. Increment's metadata.json -> external_sync.ado.profile
   * 2. Global config.json -> sync.activeProfile
   *
   * @param incrementId - The increment ID (e.g., "0005-feature-name")
   * @returns Configured AdoClient for the resolved profile
   * @throws Error if no profile found or profile is invalid
   */
  async createClientForIncrement(incrementId: string): Promise<AdoClient> {
    const result = await this.resolveProfile(incrementId);

    if (!result.success || !result.profile) {
      throw new Error(result.error || 'Failed to resolve ADO profile');
    }

    this.logger.log(
      `🔗 ADO profile resolved: ${result.profile.profileName} ` +
      `(${result.profile.organization}/${result.profile.project}) ` +
      `[source: ${result.profile.source}]`
    );

    // Get PAT from environment (all profiles share the same PAT by default)
    const pat = await this.getPatForOrganization(result.profile.organization);

    const config: AdoClientConfig = {
      pat,
      organization: result.profile.organization,
      project: result.profile.project,
    };

    return new AdoClient(config);
  }

  /**
   * Resolve the ADO profile for an increment
   *
   * @param incrementId - The increment ID
   * @returns Profile resolution result with success/error info
   */
  async resolveProfile(incrementId: string): Promise<ProfileResolutionResult> {
    // Load global config
    const config = await this.loadConfig();
    if (!config) {
      return {
        success: false,
        error: 'Failed to load .specweave/config.json',
      };
    }

    // Try to get increment-specific profile first
    const incrementProfile = await this.getIncrementProfile(incrementId);

    // Determine which profile name to use
    const profileName = incrementProfile || config.sync?.activeProfile;

    if (!profileName) {
      return {
        success: false,
        error:
          'No ADO profile configured. Set sync.activeProfile in config.json ' +
          'or external_sync.ado.profile in increment metadata.',
      };
    }

    // Get profile configuration
    const profiles = config.sync?.profiles || {};
    const profileConfig = profiles[profileName] as ProfileConfig | undefined;

    if (!profileConfig) {
      return {
        success: false,
        error: `Profile "${profileName}" not found in config.sync.profiles`,
      };
    }

    if (profileConfig.provider !== 'ado') {
      return {
        success: false,
        error: `Profile "${profileName}" is not an ADO profile (provider: ${profileConfig.provider})`,
      };
    }

    if (!profileConfig.config?.organization || !profileConfig.config?.project) {
      return {
        success: false,
        error: `Profile "${profileName}" missing required fields (organization, project)`,
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
        source: incrementProfile ? 'increment' : 'global',
      },
    };
  }

  /**
   * Get increment's stored ADO profile name
   */
  private async getIncrementProfile(incrementId: string): Promise<string | null> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      return metadata?.external_sync?.ado?.profile || null;
    } catch {
      return null;
    }
  }

  /**
   * Get PAT for a specific organization
   *
   * By default, uses AZURE_DEVOPS_PAT from .env
   * Supports organization-specific PATs via AZURE_DEVOPS_PAT_{ORG} env vars
   */
  private async getPatForOrganization(organization: string): Promise<string> {
    // Try organization-specific PAT first (e.g., AZURE_DEVOPS_PAT_NOVA_SYSTEMS)
    const orgEnvKey = `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
    const orgPat = process.env[orgEnvKey];
    if (orgPat) {
      this.logger.debug(`Using organization-specific PAT from ${orgEnvKey}`);
      return orgPat;
    }

    // Fall back to default PAT
    const defaultPat = process.env.AZURE_DEVOPS_PAT;
    if (!defaultPat) {
      throw new Error(
        'Azure DevOps PAT not found. Set AZURE_DEVOPS_PAT in .env file ' +
        `or ${orgEnvKey} for organization-specific PAT.`
      );
    }

    return defaultPat;
  }

  /**
   * Load config.json
   */
  private async loadConfig(): Promise<Record<string, any> | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
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
    ((metadata.external_sync as Record<string, unknown>).ado as Record<string, unknown>).profile =
      profileName;

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
    this.logger.log(`✅ Set ADO profile "${profileName}" for increment ${incrementId}`);
  }

  /**
   * List available ADO profiles from config
   */
  async listAdoProfiles(): Promise<string[]> {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return [];
    }

    const profiles = config.sync.profiles as Record<string, ProfileConfig>;
    return Object.entries(profiles)
      .filter(([_, p]) => p.provider === 'ado')
      .map(([name]) => name);
  }
}

/**
 * Create an ADO client for a specific increment (convenience function)
 *
 * @param incrementId - The increment ID
 * @param projectRoot - Project root directory
 * @returns Configured AdoClient for the resolved profile
 */
export async function createAdoClientForIncrement(
  incrementId: string,
  projectRoot: string = process.cwd()
): Promise<AdoClient> {
  const factory = new AdoClientFactory({ projectRoot });
  return factory.createClientForIncrement(incrementId);
}

/**
 * Resolve ADO profile for an increment without creating a client
 *
 * @param incrementId - The increment ID
 * @param projectRoot - Project root directory
 * @returns Profile resolution result
 */
export async function resolveAdoProfileForIncrement(
  incrementId: string,
  projectRoot: string = process.cwd()
): Promise<ProfileResolutionResult> {
  const factory = new AdoClientFactory({ projectRoot });
  return factory.resolveProfile(incrementId);
}

export default AdoClientFactory;

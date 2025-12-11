/**
 * ADO Client Factory
 *
 * Creates profile-aware ADO clients for multi-project sync support.
 * DELEGATES to AdoProfileResolver (plugin) to determine which org/project to use
 * based on the increment's metadata.
 *
 * This is the FIX for the single-defaultProfile problem:
 * - Each increment can have its own ADO profile in metadata.json
 * - The factory resolves the profile and creates a client for that specific org/project
 *
 * @module integrations/ado/ado-client-factory
 */

import { AdoClient, AdoClientConfig } from './ado-client.js';
import { getAdoPat } from './ado-pat-provider.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import {
  AdoProfileResolver,
  AdoProfileConfig,
  ProfileResolutionResult,
} from '../../../plugins/specweave-ado/lib/ado-profile-resolver.js';

/**
 * Resolved ADO profile with source information
 * Re-export for consumers who need the type
 */
export interface ResolvedAdoProfile extends AdoProfileConfig {
  /**
   * Where the profile was resolved from
   */
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
 * ADO Client Factory
 *
 * Resolves the correct ADO profile for an increment and creates
 * a client configured for that specific ADO project.
 *
 * Uses AdoProfileResolver from the plugin (single source of truth).
 */
export class AdoClientFactory {
  private projectRoot: string;
  private logger: Logger;
  private resolver: AdoProfileResolver;

  constructor(options: AdoClientFactoryOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.logger = options.logger ?? consoleLogger;
    this.resolver = new AdoProfileResolver(this.projectRoot);
  }

  /**
   * Create an ADO client for a specific increment
   *
   * Resolution priority:
   * 1. Increment's metadata.json -> external_sync.ado.profile
   * 2. Global config.json -> sync.defaultProfile
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
      `[source: ${result.source}]`
    );

    // Get PAT from environment (supports org-specific PATs)
    const pat = getAdoPat(result.profile.organization);

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
   * DELEGATES to AdoProfileResolver from the plugin (single source of truth)
   *
   * @param incrementId - The increment ID
   * @returns Profile resolution result with success/error info
   */
  async resolveProfile(incrementId: string): Promise<ProfileResolutionResult> {
    return this.resolver.resolveProfile(incrementId);
  }

  /**
   * Set increment's ADO profile
   *
   * DELEGATES to AdoProfileResolver from the plugin
   *
   * @param incrementId - Increment ID
   * @param profileName - Profile name to set
   */
  async setIncrementProfile(incrementId: string, profileName: string): Promise<void> {
    await this.resolver.setIncrementProfile(incrementId, profileName);
    this.logger.log(`✅ Set ADO profile "${profileName}" for increment ${incrementId}`);
  }

  /**
   * List available ADO profiles from config
   *
   * DELEGATES to AdoProfileResolver from the plugin
   */
  async listAdoProfiles(): Promise<string[]> {
    return this.resolver.listAdoProfiles();
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

// Re-export types for consumers
export { AdoProfileConfig, ProfileResolutionResult };

export default AdoClientFactory;

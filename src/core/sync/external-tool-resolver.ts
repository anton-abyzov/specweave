/**
 * External Tool Resolver Service (v1.0.31+ - ADR-0211)
 *
 * Single source of truth for external tool selection.
 * Resolves which sync profile an increment should use based on:
 * 1. Explicit syncTarget in metadata (highest priority)
 * 2. Project mapping from spec.md **Project**: field
 * 3. Default profile from config (fallback)
 *
 * @module core/sync/external-tool-resolver
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  SyncTarget,
  SyncTargetDerivation,
  ExternalToolValidationResult,
  IncrementMetadataV2,
} from '../types/increment-metadata.js';
import {
  SyncProfile,
  SyncConfiguration,
  SyncProvider,
  GitHubConfig,
  JiraConfig,
  AdoConfig,
} from '../types/sync-profile.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Project mapping configuration (from config.json)
 * Maps SpecWeave project IDs to external tool targets
 */
export interface ProjectMapping {
  github?: {
    owner: string;
    repo: string;
    profileId?: string;  // Optional: explicit profile reference
  };
  jira?: {
    project: string;
    board?: string;
    profileId?: string;
  };
  ado?: {
    project: string;
    areaPath?: string;
    profileId?: string;
  };
}

export interface ProjectMappings {
  [projectId: string]: ProjectMapping;
}

/**
 * Resolution result with full context
 */
export interface ResolutionResult {
  /** Resolved sync target */
  syncTarget: SyncTarget | null;

  /** Full profile configuration (if resolved) */
  profile: SyncProfile | null;

  /** Resolution path for debugging */
  resolutionPath: string[];

  /** Any warnings during resolution */
  warnings: string[];
}

/**
 * External Tool Resolver
 *
 * Provides unified external tool selection logic.
 * Use this service instead of scattered logic throughout the codebase.
 */
export class ExternalToolResolver {
  private projectRoot: string;
  private configPath: string;
  private config: any = null;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
    this.logger = options.logger ?? consoleLogger;
  }

  // ==========================================================================
  // Config Loading
  // ==========================================================================

  /**
   * Load configuration from disk
   */
  private async loadConfig(): Promise<any> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.config = {};
        return this.config;
      }
      throw error;
    }
  }

  /**
   * Get sync configuration
   */
  private async getSyncConfig(): Promise<SyncConfiguration | null> {
    const config = await this.loadConfig();
    return config.sync || null;
  }

  /**
   * Get project mappings
   */
  private async getProjectMappings(): Promise<ProjectMappings> {
    const config = await this.loadConfig();
    return config.projectMappings || {};
  }

  // ==========================================================================
  // Resolution Methods
  // ==========================================================================

  /**
   * Resolve external tool for an increment
   *
   * Resolution priority:
   * 1. Explicit syncTarget in metadata
   * 2. Project mapping from spec.md **Project**: field
   * 3. Default profile from config
   *
   * @param incrementId - Increment ID (e.g., "0142-feature")
   * @param projectId - Optional project ID from spec.md (for priority 2)
   * @returns Resolution result with sync target and profile
   */
  async resolveForIncrement(
    incrementId: string,
    projectId?: string
  ): Promise<ResolutionResult> {
    const resolutionPath: string[] = [];
    const warnings: string[] = [];

    // Step 1: Check for explicit syncTarget in metadata
    const metadata = await this.loadIncrementMetadata(incrementId);
    if (metadata?.syncTarget) {
      resolutionPath.push(`metadata.syncTarget (profileId: ${metadata.syncTarget.profileId})`);

      const profile = await this.getProfileById(metadata.syncTarget.profileId);
      if (profile) {
        return {
          syncTarget: metadata.syncTarget,
          profile,
          resolutionPath,
          warnings,
        };
      } else {
        warnings.push(`Profile '${metadata.syncTarget.profileId}' not found in config`);
        resolutionPath.push('profile not found - falling through');
      }
    }

    // Step 2: Resolve from project ID (if provided)
    if (projectId) {
      const projectResult = await this.resolveForProject(projectId);
      if (projectResult.syncTarget) {
        resolutionPath.push(`projectMappings['${projectId}'] → ${projectResult.syncTarget.profileId}`);
        return {
          ...projectResult,
          resolutionPath: [...resolutionPath, ...projectResult.resolutionPath],
          warnings: [...warnings, ...projectResult.warnings],
        };
      }
      resolutionPath.push(`projectMappings['${projectId}'] not found`);
    }

    // Step 3: Fall back to default profile
    const syncConfig = await this.getSyncConfig();
    if (syncConfig?.defaultProfile) {
      const profile = syncConfig.profiles?.[syncConfig.defaultProfile];
      if (profile) {
        resolutionPath.push(`config.sync.defaultProfile → ${syncConfig.defaultProfile}`);

        const syncTarget: SyncTarget = {
          profileId: syncConfig.defaultProfile,
          provider: profile.provider,
          derivedFrom: 'default-profile',
          setAt: new Date().toISOString(),
        };

        return {
          syncTarget,
          profile,
          resolutionPath,
          warnings,
        };
      }
      warnings.push(`Default profile '${syncConfig.defaultProfile}' not found`);
    }

    // Step 4 (v1.0.46 FIX): Fallback to first available profile if no defaultProfile set
    // This matches GitHubProfileManager.getDefaultProfile() behavior
    if (syncConfig?.profiles) {
      const profileIds = Object.keys(syncConfig.profiles);
      if (profileIds.length > 0) {
        const firstProfileId = profileIds[0];
        const firstProfile = syncConfig.profiles[firstProfileId];
        resolutionPath.push(`fallback to first profile → ${firstProfileId}`);

        const syncTarget: SyncTarget = {
          profileId: firstProfileId,
          provider: firstProfile.provider,
          derivedFrom: 'first-profile-fallback', // v1.0.46: Explicit fallback type for first profile
          setAt: new Date().toISOString(),
        };

        return {
          syncTarget,
          profile: firstProfile,
          resolutionPath,
          warnings,
        };
      }
    }

    // No resolution possible
    resolutionPath.push('no external tool configured');
    return {
      syncTarget: null,
      profile: null,
      resolutionPath,
      warnings,
    };
  }

  /**
   * Resolve external tool for a specific project ID
   *
   * Looks up project in config.projectMappings and resolves to a profile.
   *
   * @param projectId - SpecWeave project ID (e.g., "frontend-app")
   * @returns Resolution result
   */
  async resolveForProject(projectId: string): Promise<ResolutionResult> {
    const resolutionPath: string[] = [];
    const warnings: string[] = [];

    const mappings = await this.getProjectMappings();
    const mapping = mappings[projectId];

    if (!mapping) {
      return {
        syncTarget: null,
        profile: null,
        resolutionPath: [`projectMappings['${projectId}'] not found`],
        warnings,
      };
    }

    // Check for explicit profileId in mapping
    const providers: SyncProvider[] = ['github', 'jira', 'ado'];
    for (const provider of providers) {
      const providerMapping = mapping[provider];
      if (providerMapping) {
        resolutionPath.push(`projectMappings['${projectId}'].${provider}`);

        // If explicit profileId specified, use that
        if (providerMapping.profileId) {
          const profile = await this.getProfileById(providerMapping.profileId);
          if (profile) {
            const syncTarget: SyncTarget = {
              profileId: providerMapping.profileId,
              provider,
              derivedFrom: 'project-mapping',
              setAt: new Date().toISOString(),
              sourceProjectId: projectId,
            };

            return {
              syncTarget,
              profile,
              resolutionPath,
              warnings,
            };
          }
          warnings.push(`Explicit profileId '${providerMapping.profileId}' not found`);
        }

        // Otherwise, find matching profile by config
        const matchingProfile = await this.findProfileByMapping(provider, providerMapping);
        if (matchingProfile) {
          const syncTarget: SyncTarget = {
            profileId: matchingProfile.id,
            provider,
            derivedFrom: 'project-mapping',
            setAt: new Date().toISOString(),
            sourceProjectId: projectId,
          };

          return {
            syncTarget,
            profile: matchingProfile.profile,
            resolutionPath,
            warnings,
          };
        }

        // Mapping exists but no matching profile
        warnings.push(`No profile matches ${provider} config for project '${projectId}'`);
      }
    }

    return {
      syncTarget: null,
      profile: null,
      resolutionPath,
      warnings,
    };
  }

  /**
   * Resolve for a specific provider (e.g., "get me the GitHub profile")
   *
   * @param provider - Provider type
   * @param projectId - Optional project ID for project-specific profile
   * @returns Resolution result
   */
  async resolveForProvider(
    provider: SyncProvider,
    projectId?: string
  ): Promise<ResolutionResult> {
    const resolutionPath: string[] = [];
    const warnings: string[] = [];

    // If projectId provided, try project mapping first
    if (projectId) {
      const mappings = await this.getProjectMappings();
      const mapping = mappings[projectId]?.[provider];
      if (mapping) {
        const profileId = mapping.profileId;
        if (profileId) {
          const profile = await this.getProfileById(profileId);
          if (profile && profile.provider === provider) {
            resolutionPath.push(`projectMappings['${projectId}'].${provider}.profileId`);
            return {
              syncTarget: {
                profileId,
                provider,
                derivedFrom: 'project-mapping',
                setAt: new Date().toISOString(),
                sourceProjectId: projectId,
              },
              profile,
              resolutionPath,
              warnings,
            };
          }
        }
      }
    }

    // Find any profile of this provider type
    const syncConfig = await this.getSyncConfig();
    if (syncConfig?.profiles) {
      for (const [profileId, profile] of Object.entries(syncConfig.profiles)) {
        if (profile.provider === provider) {
          resolutionPath.push(`first ${provider} profile → ${profileId}`);
          return {
            syncTarget: {
              profileId,
              provider,
              derivedFrom: 'default-profile',
              setAt: new Date().toISOString(),
            },
            profile,
            resolutionPath,
            warnings,
          };
        }
      }
    }

    resolutionPath.push(`no ${provider} profile configured`);
    return {
      syncTarget: null,
      profile: null,
      resolutionPath,
      warnings,
    };
  }

  // ==========================================================================
  // Validation Methods
  // ==========================================================================

  /**
   * Validate external tool configuration for an increment
   *
   * Call this at increment start to fail fast if config is missing.
   *
   * @param incrementId - Increment ID
   * @param projectId - Project ID from spec.md
   * @returns Validation result
   */
  async validateIncrementConfig(
    incrementId: string,
    projectId?: string
  ): Promise<ExternalToolValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Resolve the sync target
    const resolution = await this.resolveForIncrement(incrementId, projectId);

    if (!resolution.syncTarget) {
      // Check what's missing
      const syncConfig = await this.getSyncConfig();
      const mappings = await this.getProjectMappings();

      if (!syncConfig || Object.keys(syncConfig.profiles || {}).length === 0) {
        errors.push('No sync profiles configured');
        suggestions.push('Run `specweave init` to configure external tool integration');
      } else if (projectId && !mappings[projectId]) {
        errors.push(`No project mapping for '${projectId}'`);
        suggestions.push(`Add project mapping in config.json: projectMappings.${projectId}`);
      } else if (!syncConfig.defaultProfile) {
        errors.push('No default sync profile configured');
        suggestions.push('Set config.sync.defaultProfile in config.json');
      }

      return {
        valid: false,
        errors,
        warnings: [...warnings, ...resolution.warnings],
        suggestions,
      };
    }

    // Validate the resolved profile exists and has required config
    if (!resolution.profile) {
      errors.push(`Profile '${resolution.syncTarget.profileId}' not found`);
      return {
        valid: false,
        syncTarget: resolution.syncTarget,
        errors,
        warnings: [...warnings, ...resolution.warnings],
        suggestions: ['Check config.sync.profiles in config.json'],
      };
    }

    // Validate provider-specific config
    const configErrors = this.validateProfileConfig(resolution.profile);
    if (configErrors.length > 0) {
      errors.push(...configErrors);
    }

    // Check for authentication
    const authWarnings = await this.checkAuthentication(resolution.profile.provider);
    warnings.push(...authWarnings);

    return {
      valid: errors.length === 0,
      syncTarget: resolution.syncTarget,
      errors,
      warnings: [...warnings, ...resolution.warnings],
      suggestions,
    };
  }

  /**
   * Validate profile configuration completeness
   */
  private validateProfileConfig(profile: SyncProfile): string[] {
    const errors: string[] = [];
    const config = profile.config;

    switch (profile.provider) {
      case 'github': {
        const ghConfig = config as GitHubConfig;
        if (!ghConfig.owner) {
          errors.push('GitHub config missing: owner');
        }
        if (!ghConfig.repo && !ghConfig.repos?.length) {
          errors.push('GitHub config missing: repo or repos[]');
        }
        break;
      }
      case 'jira': {
        const jiraConfig = config as JiraConfig;
        if (!jiraConfig.domain) {
          errors.push('JIRA config missing: domain');
        }
        if (!jiraConfig.projectKey && !jiraConfig.projects?.length) {
          errors.push('JIRA config missing: projectKey or projects[]');
        }
        break;
      }
      case 'ado': {
        const adoConfig = config as AdoConfig;
        if (!adoConfig.organization) {
          errors.push('ADO config missing: organization');
        }
        if (!adoConfig.project && !adoConfig.projects?.length) {
          errors.push('ADO config missing: project or projects[]');
        }
        break;
      }
    }

    return errors;
  }

  /**
   * Check if authentication is configured for a provider
   */
  private async checkAuthentication(provider: SyncProvider): Promise<string[]> {
    const warnings: string[] = [];

    // Check .env file for tokens
    const envPath = path.join(this.projectRoot, '.env');
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      // No .env file
    }

    switch (provider) {
      case 'github':
        if (!envContent.includes('GITHUB_TOKEN') && !envContent.includes('GH_TOKEN')) {
          warnings.push('GitHub token not found in .env (GITHUB_TOKEN or GH_TOKEN)');
        }
        break;
      case 'jira':
        if (!envContent.includes('JIRA_API_TOKEN')) {
          warnings.push('JIRA API token not found in .env (JIRA_API_TOKEN)');
        }
        if (!envContent.includes('JIRA_EMAIL')) {
          warnings.push('JIRA email not found in .env (JIRA_EMAIL)');
        }
        break;
      case 'ado':
        if (!envContent.includes('AZURE_DEVOPS_PAT')) {
          warnings.push('Azure DevOps PAT not found in .env (AZURE_DEVOPS_PAT)');
        }
        break;
    }

    return warnings;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Load increment metadata
   */
  private async loadIncrementMetadata(incrementId: string): Promise<IncrementMetadataV2 | null> {
    const basePath = path.join(this.projectRoot, '.specweave', 'increments');
    const paths = [
      path.join(basePath, incrementId, 'metadata.json'),
      path.join(basePath, '_archive', incrementId, 'metadata.json'),
      path.join(basePath, '_paused', incrementId, 'metadata.json'),
    ];

    for (const metadataPath of paths) {
      try {
        return JSON.parse(await fs.readFile(metadataPath, 'utf-8')) as IncrementMetadataV2;
      } catch {
        // Try next path
      }
    }
    return null;
  }

  /**
   * Get profile by ID
   */
  private async getProfileById(profileId: string): Promise<SyncProfile | null> {
    return (await this.getSyncConfig())?.profiles?.[profileId] ?? null;
  }

  /**
   * Find profile matching a project mapping
   */
  private async findProfileByMapping(
    provider: SyncProvider,
    mapping: any
  ): Promise<{ id: string; profile: SyncProfile } | null> {
    const syncConfig = await this.getSyncConfig();
    if (!syncConfig?.profiles) return null;

    for (const [profileId, profile] of Object.entries(syncConfig.profiles)) {
      if (profile.provider !== provider) continue;

      // Match by config properties
      const config = profile.config;
      switch (provider) {
        case 'github': {
          const ghConfig = config as GitHubConfig;
          const ghMapping = mapping as { owner: string; repo: string };
          if (ghConfig.owner === ghMapping.owner &&
              (ghConfig.repo === ghMapping.repo || ghConfig.repos?.includes(ghMapping.repo))) {
            return { id: profileId, profile };
          }
          break;
        }
        case 'jira': {
          const jiraConfig = config as JiraConfig;
          const jiraMapping = mapping as { project: string };
          if (jiraConfig.projectKey === jiraMapping.project ||
              jiraConfig.projects?.includes(jiraMapping.project)) {
            return { id: profileId, profile };
          }
          break;
        }
        case 'ado': {
          const adoConfig = config as AdoConfig;
          const adoMapping = mapping as { project: string };
          if (adoConfig.project === adoMapping.project ||
              adoConfig.projects?.includes(adoMapping.project)) {
            return { id: profileId, profile };
          }
          break;
        }
      }
    }

    return null;
  }

  /**
   * Create a sync target for saving to metadata
   *
   * @param profileId - Profile ID
   * @param provider - Provider type
   * @param derivedFrom - How it was determined
   * @param sourceProjectId - Optional source project
   * @returns SyncTarget object
   */
  static createSyncTarget(
    profileId: string,
    provider: SyncProvider,
    derivedFrom: SyncTargetDerivation,
    sourceProjectId?: string
  ): SyncTarget {
    return {
      profileId,
      provider,
      derivedFrom,
      setAt: new Date().toISOString(),
      sourceProjectId,
    };
  }

  // ==========================================================================
  // Utility Methods for Callers
  // ==========================================================================

  /**
   * Check if any external tool is configured
   */
  async hasExternalToolConfigured(): Promise<boolean> {
    const syncConfig = await this.getSyncConfig();
    return Object.keys(syncConfig?.profiles ?? {}).length > 0;
  }

  /**
   * Get all configured providers
   */
  async getConfiguredProviders(): Promise<SyncProvider[]> {
    const profiles = (await this.getSyncConfig())?.profiles ?? {};
    return [...new Set(Object.values(profiles).map((p) => p.provider))];
  }

  /**
   * Get summary of external tool configuration
   */
  async getConfigSummary(): Promise<{
    hasConfig: boolean;
    providers: SyncProvider[];
    profileCount: number;
    defaultProfile?: string;
    projectMappingCount: number;
  }> {
    const syncConfig = await this.getSyncConfig();
    const mappings = await this.getProjectMappings();
    const profiles = Object.values(syncConfig?.profiles ?? {});

    return {
      hasConfig: profiles.length > 0,
      providers: [...new Set(profiles.map((p) => p.provider))],
      profileCount: profiles.length,
      defaultProfile: syncConfig?.defaultProfile,
      projectMappingCount: Object.keys(mappings).length,
    };
  }
}

/**
 * Factory function for creating ExternalToolResolver
 */
export function createExternalToolResolver(
  projectRoot: string,
  logger?: Logger
): ExternalToolResolver {
  return new ExternalToolResolver(projectRoot, { logger });
}

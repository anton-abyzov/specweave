/**
 * Profile Manager for Multi-Project Sync
 *
 * Manages sync profiles across multiple external projects (GitHub, JIRA, ADO).
 * Handles CRUD operations, validation, and profile selection.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  SyncProfile,
  SyncProfiles,
  SyncProvider,
  ProfileValidationResult,
  SyncConfiguration,
} from '../types/sync-profile.js';

export class ProfileManager {
  private configPath: string;
  private config: SyncConfiguration | null = null;

  constructor(projectRoot: string) {
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
  }

  // ==========================================================================
  // Load/Save Operations
  // ==========================================================================

  /**
   * Load sync configuration from disk
   */
  async load(): Promise<SyncConfiguration> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const fullConfig = JSON.parse(content);

      const config: SyncConfiguration = fullConfig.sync || {
        profiles: {},
        settings: {
          autoDetectProject: true,
          defaultTimeRange: '1M',
          rateLimitProtection: true,
        },
      };
      this.config = config;

      return config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist yet - return empty
        this.config = {
          profiles: {},
          settings: {
            canUpsertInternalItems: false,
            canUpdateExternalItems: false,
            canUpdateStatus: false,
            autoDetectProject: true,
            defaultTimeRange: '1M',
            rateLimitProtection: true,
          },
        };
        return this.config;
      }
      throw error;
    }
  }

  /**
   * Save sync configuration to disk
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded. Call load() first.');
    }

    // Read full config
    let fullConfig: any = {};
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      fullConfig = JSON.parse(content);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Merge sync section
    fullConfig.sync = this.config;

    // Write back
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeFile(
      this.configPath,
      JSON.stringify(fullConfig, null, 2),
      'utf-8'
    );
  }

  // ==========================================================================
  // Profile CRUD Operations
  // ==========================================================================

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<Record<string, SyncProfile>> {
    return (await this.load()).profiles ?? {};
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(profileId: string): Promise<SyncProfile | null> {
    return (await this.load()).profiles?.[profileId] ?? null;
  }

  /**
   * Get default profile
   */
  async getDefaultProfile(): Promise<{ id: string; profile: SyncProfile } | null> {
    const config = await this.load();
    const defaultId = config.defaultProfile;
    if (!defaultId) return null;

    const profile = config.profiles?.[defaultId];
    return profile ? { id: defaultId, profile } : null;
  }

  /**
   * Set default profile
   */
  async setDefaultProfile(profileId: string): Promise<void> {
    const config = await this.load();

    // Validate profile exists
    if (!config.profiles?.[profileId]) {
      throw new Error(`Profile '${profileId}' does not exist`);
    }

    config.defaultProfile = profileId;
    await this.save();
  }

  /**
   * Create a new profile
   */
  async createProfile(
    profileId: string,
    profile: SyncProfile
  ): Promise<void> {
    const config = await this.load();

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(profileId)) {
      throw new Error(
        'Profile ID must contain only lowercase letters, numbers, and hyphens'
      );
    }

    // Check if profile already exists
    if (config.profiles?.[profileId]) {
      throw new Error(`Profile '${profileId}' already exists`);
    }

    // Validate profile
    const validation = this.validateProfile(profile);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }

    // Add profile
    if (!config.profiles) {
      config.profiles = {};
    }
    config.profiles[profileId] = profile;

    // Set as default if first profile
    if (Object.keys(config.profiles).length === 1) {
      config.defaultProfile = profileId;
    }

    await this.save();
  }

  /**
   * Update an existing profile
   */
  async updateProfile(
    profileId: string,
    updates: Partial<SyncProfile>
  ): Promise<void> {
    const config = await this.load();

    const existing = config.profiles?.[profileId];
    if (!existing) {
      throw new Error(`Profile '${profileId}' does not exist`);
    }

    // Merge updates
    const updated = { ...existing, ...updates };

    // Validate updated profile
    const validation = this.validateProfile(updated);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }

    config.profiles![profileId] = updated;
    await this.save();
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const config = await this.load();

    if (!config.profiles?.[profileId]) {
      throw new Error(`Profile '${profileId}' does not exist`);
    }

    delete config.profiles[profileId];

    if (config.defaultProfile === profileId) {
      const remaining = Object.keys(config.profiles);
      config.defaultProfile = remaining.length > 0 ? remaining[0] : undefined;
    }

    await this.save();
  }

  // ==========================================================================
  // Profile Queries
  // ==========================================================================

  /**
   * Get profiles by provider
   */
  async getProfilesByProvider(provider: SyncProvider): Promise<Record<string, SyncProfile>> {
    const all = await this.getAllProfiles();
    return Object.fromEntries(
      Object.entries(all).filter(([_, profile]) => profile.provider === provider)
    );
  }

  /**
   * Get profiles for a project
   */
  async getProfilesForProject(projectName: string): Promise<Record<string, SyncProfile>> {
    const all = await this.getAllProfiles();
    const lowerName = projectName.toLowerCase();

    return Object.fromEntries(
      Object.entries(all).filter(([_, profile]) => {
        if (!profile.projectContext) return false;

        const ctx = profile.projectContext;
        if (ctx.name.toLowerCase() === lowerName) return true;

        return ctx.keywords?.some(
          (kw) => lowerName.includes(kw.toLowerCase()) || kw.toLowerCase().includes(lowerName)
        );
      })
    );
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate a sync profile
   */
  validateProfile(profile: SyncProfile): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!profile.provider) {
      errors.push('Provider is required');
    } else if (!['github', 'jira', 'ado'].includes(profile.provider)) {
      errors.push(`Invalid provider: ${profile.provider}`);
    }

    if (!profile.displayName || profile.displayName.trim().length === 0) {
      errors.push('Display name is required');
    }

    if (!profile.config) {
      errors.push('Configuration is required');
    } else {
      // Provider-specific validation
      if (profile.provider === 'github') {
        const config = profile.config as any;
        if (!config.owner) errors.push('GitHub owner is required');
        if (!config.repo) errors.push('GitHub repo is required');
      } else if (profile.provider === 'jira') {
        const config = profile.config as any;
        if (!config.domain) errors.push('JIRA domain is required');
        if (!config.projectKey) errors.push('JIRA project key is required');
      } else if (profile.provider === 'ado') {
        const config = profile.config as any;
        if (!config.organization) errors.push('ADO organization is required');
        if (!config.project) errors.push('ADO project is required');
      }
    }

    if (!profile.timeRange) {
      errors.push('Time range configuration is required');
    } else {
      if (!profile.timeRange.default) {
        errors.push('Default time range is required');
      }
      if (!profile.timeRange.max) {
        errors.push('Maximum time range is required');
      }

      // Warn if max < default
      if (profile.timeRange.max && profile.timeRange.default) {
        const presets = ['1W', '2W', '1M', '3M', '6M', '1Y', 'ALL'];
        const defaultIdx = presets.indexOf(profile.timeRange.default);
        const maxIdx = presets.indexOf(profile.timeRange.max);

        if (defaultIdx > maxIdx) {
          warnings.push(
            'Default time range should not exceed maximum time range'
          );
        }
      }
    }

    // Warnings
    if (!profile.projectContext) {
      warnings.push(
        'Project context is recommended for smart project detection'
      );
    }

    if (
      profile.rateLimits &&
      profile.rateLimits.maxItemsPerSync < profile.rateLimits.warnThreshold
    ) {
      warnings.push('Warn threshold should be less than max items per sync');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get profile statistics
   */
  async getStats(): Promise<{
    totalProfiles: number;
    byProvider: Record<SyncProvider, number>;
    defaultProfile: string | null;
  }> {
    const config = await this.load();
    const profiles = Object.values(config.profiles ?? {});

    return {
      totalProfiles: profiles.length,
      byProvider: {
        github: profiles.filter((p) => p.provider === 'github').length,
        jira: profiles.filter((p) => p.provider === 'jira').length,
        ado: profiles.filter((p) => p.provider === 'ado').length,
      },
      defaultProfile: config.defaultProfile ?? null,
    };
  }
}

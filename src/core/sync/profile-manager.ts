/**
 * Profile Manager for Multi-Project Sync
 *
 * Manages sync profiles across multiple external projects (GitHub, JIRA, ADO).
 * Handles CRUD operations, validation, and profile selection.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  SyncProfile,
  SyncProfiles,
  SyncProvider,
  ProfileValidationResult,
  SyncConfiguration,
} from '../types/sync-profile';

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

      this.config = fullConfig.sync || {
        profiles: {},
        settings: {
          autoDetectProject: true,
          defaultTimeRange: '1M',
          rateLimitProtection: true,
        },
      };

      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist yet - return empty
        this.config = {
          profiles: {},
          settings: {
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
    const config = await this.load();
    return config.profiles || {};
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(profileId: string): Promise<SyncProfile | null> {
    const config = await this.load();
    return config.profiles?.[profileId] || null;
  }

  /**
   * Get active profile
   */
  async getActiveProfile(): Promise<{ id: string; profile: SyncProfile } | null> {
    const config = await this.load();
    const activeId = config.activeProfile;

    if (!activeId) {
      return null;
    }

    const profile = config.profiles?.[activeId];
    if (!profile) {
      return null;
    }

    return { id: activeId, profile };
  }

  /**
   * Set active profile
   */
  async setActiveProfile(profileId: string): Promise<void> {
    const config = await this.load();

    // Validate profile exists
    if (!config.profiles?.[profileId]) {
      throw new Error(`Profile '${profileId}' does not exist`);
    }

    config.activeProfile = profileId;
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

    // Set as active if first profile
    if (Object.keys(config.profiles).length === 1) {
      config.activeProfile = profileId;
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

    // If this was the active profile, clear it
    if (config.activeProfile === profileId) {
      config.activeProfile = undefined;

      // Set first available profile as active
      const remaining = Object.keys(config.profiles);
      if (remaining.length > 0) {
        config.activeProfile = remaining[0];
      }
    }

    await this.save();
  }

  // ==========================================================================
  // Profile Queries
  // ==========================================================================

  /**
   * Get profiles by provider
   */
  async getProfilesByProvider(
    provider: SyncProvider
  ): Promise<Record<string, SyncProfile>> {
    const all = await this.getAllProfiles();
    const filtered: Record<string, SyncProfile> = {};

    for (const [id, profile] of Object.entries(all)) {
      if (profile.provider === provider) {
        filtered[id] = profile;
      }
    }

    return filtered;
  }

  /**
   * Get profiles for a project
   */
  async getProfilesForProject(
    projectName: string
  ): Promise<Record<string, SyncProfile>> {
    const all = await this.getAllProfiles();
    const filtered: Record<string, SyncProfile> = {};

    const lowerName = projectName.toLowerCase();

    for (const [id, profile] of Object.entries(all)) {
      if (!profile.projectContext) {
        continue;
      }

      // Match by name
      if (profile.projectContext.name.toLowerCase() === lowerName) {
        filtered[id] = profile;
        continue;
      }

      // Match by keywords
      if (profile.projectContext.keywords) {
        for (const keyword of profile.projectContext.keywords) {
          if (
            lowerName.includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(lowerName)
          ) {
            filtered[id] = profile;
            break;
          }
        }
      }
    }

    return filtered;
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
    activeProfile: string | null;
  }> {
    const config = await this.load();
    const all = config.profiles || {};

    const stats = {
      totalProfiles: Object.keys(all).length,
      byProvider: {
        github: 0,
        jira: 0,
        ado: 0,
      } as Record<SyncProvider, number>,
      activeProfile: config.activeProfile || null,
    };

    for (const profile of Object.values(all)) {
      stats.byProvider[profile.provider]++;
    }

    return stats;
  }
}

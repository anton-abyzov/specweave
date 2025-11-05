/**
 * Interactive Profile Selector
 *
 * Rich CLI interface for selecting sync profiles with:
 * - Profile listing by provider
 * - Profile details and metadata
 * - Smart filtering and search
 * - Create new profile option
 */

import { ProfileManager } from './profile-manager';
import { SyncProfile, SyncProvider } from '../types/sync-profile';

// ============================================================================
// Profile Selector
// ============================================================================

export class ProfileSelector {
  private profileManager: ProfileManager;

  constructor(projectRoot: string) {
    this.profileManager = new ProfileManager(projectRoot);
  }

  // ==========================================================================
  // Interactive Selection
  // ==========================================================================

  /**
   * Display all profiles grouped by provider
   */
  async displayAllProfiles(): Promise<{
    profiles: Record<string, SyncProfile>;
    activeProfileId: string | null;
    byProvider: Record<SyncProvider, ProfileOption[]>;
  }> {
    const allProfiles = await this.profileManager.getAllProfiles();
    const activeProfile = await this.profileManager.getActiveProfile();

    const byProvider: Record<SyncProvider, ProfileOption[]> = {
      github: [],
      jira: [],
      ado: [],
    };

    for (const [id, profile] of Object.entries(allProfiles)) {
      const option: ProfileOption = {
        id,
        profile,
        isActive: activeProfile?.id === id,
        details: this.formatProfileDetails(profile),
      };

      byProvider[profile.provider].push(option);
    }

    return {
      profiles: allProfiles,
      activeProfileId: activeProfile?.id || null,
      byProvider,
    };
  }

  /**
   * Display profiles for a specific provider
   */
  async displayProfilesByProvider(
    provider: SyncProvider
  ): Promise<ProfileOption[]> {
    const profiles = await this.profileManager.getProfilesByProvider(provider);
    const activeProfile = await this.profileManager.getActiveProfile();

    const options: ProfileOption[] = [];

    for (const [id, profile] of Object.entries(profiles)) {
      options.push({
        id,
        profile,
        isActive: activeProfile?.id === id,
        details: this.formatProfileDetails(profile),
      });
    }

    return options;
  }

  /**
   * Format profile option for display
   */
  formatOption(option: ProfileOption, index: number): string[] {
    const lines: string[] = [];

    // Profile name
    const activeTag = option.isActive ? ' (active)' : '';
    lines.push(
      `  ${index + 1}. ${option.profile.displayName}${activeTag}`
    );

    // Configuration details
    lines.push(`     └─ ${this.getProviderIcon(option.profile.provider)} ${option.details}`);

    // Description (if present)
    if (option.profile.description) {
      lines.push(`     └─ ${option.profile.description}`);
    }

    // Time range defaults
    lines.push(
      `     └─ Default time range: ${option.profile.timeRange.default} (max: ${option.profile.timeRange.max})`
    );

    // Project context (if present)
    if (option.profile.projectContext) {
      lines.push(
        `     └─ Project: ${option.profile.projectContext.name}`
      );
    }

    return lines;
  }

  /**
   * Format profile list header
   */
  formatHeader(provider?: SyncProvider): string[] {
    const lines: string[] = [];

    if (provider) {
      lines.push(`🔗 ${this.getProviderDisplayName(provider)} Profiles:`);
    } else {
      lines.push('🔗 Available Sync Profiles:');
    }

    lines.push('');

    return lines;
  }

  /**
   * Format "no profiles" message
   */
  formatNoProfiles(provider?: SyncProvider): string[] {
    const lines: string[] = [];

    if (provider) {
      lines.push(`No ${this.getProviderDisplayName(provider)} profiles configured yet.`);
    } else {
      lines.push('No sync profiles configured yet.');
    }

    lines.push('');
    lines.push('Create your first profile:');
    lines.push('  /specweave:sync-profile create');
    lines.push('');

    return lines;
  }

  /**
   * Display profile stats
   */
  async displayStats(): Promise<string[]> {
    const stats = await this.profileManager.getStats();
    const lines: string[] = [];

    lines.push('📊 Profile Statistics:');
    lines.push('');
    lines.push(`   Total profiles: ${stats.totalProfiles}`);

    if (stats.totalProfiles > 0) {
      lines.push('');
      lines.push('   By provider:');
      for (const [provider, count] of Object.entries(stats.byProvider)) {
        if (count > 0) {
          lines.push(
            `   ├─ ${this.getProviderIcon(provider as SyncProvider)} ${this.getProviderDisplayName(provider as SyncProvider)}: ${count}`
          );
        }
      }
    }

    if (stats.activeProfile) {
      lines.push('');
      lines.push(`   Active profile: ${stats.activeProfile}`);
    }

    return lines;
  }

  // ==========================================================================
  // Profile Details Formatting
  // ==========================================================================

  private formatProfileDetails(profile: SyncProfile): string {
    switch (profile.provider) {
      case 'github': {
        const config = profile.config as any;
        return `GitHub: ${config.owner}/${config.repo}`;
      }

      case 'jira': {
        const config = profile.config as any;
        return `JIRA: ${config.domain} (${config.projectKey})`;
      }

      case 'ado': {
        const config = profile.config as any;
        return `Azure DevOps: ${config.organization}/${config.project}`;
      }

      default:
        return 'Unknown provider';
    }
  }

  private getProviderIcon(provider: SyncProvider | string): string {
    const icons: Record<string, string> = {
      github: '🐙',
      jira: '📋',
      ado: '⚡',
    };
    return icons[provider] || '🔗';
  }

  private getProviderDisplayName(provider: SyncProvider | string): string {
    const names: Record<string, string> = {
      github: 'GitHub',
      jira: 'JIRA',
      ado: 'Azure DevOps',
    };
    return names[provider] || provider;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ProfileOption {
  id: string;
  profile: SyncProfile;
  isActive: boolean;
  details: string;
}

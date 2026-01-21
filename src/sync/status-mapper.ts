/**
 * Status Mapper Service
 *
 * Handles status mapping between SpecWeave increment statuses and external tool statuses.
 * Extracted from sync-coordinator.ts for better separation of concerns.
 *
 * @module sync/status-mapper
 * @since v1.0.115
 */

import type {
  SpecWeaveConfig,
  SyncConfiguration,
  GitHubConfig,
  JiraConfig,
  AzureDevOpsConfig,
  SyncProfile,
} from '../core/config/types.js';

/**
 * Status sync mapping configuration (runtime config, not in core types)
 */
export interface StatusSyncMappings {
  jira?: { completed?: string };
  ado?: { completed?: string | { state: string } };
}

/**
 * Extended sync configuration with runtime statusSync field
 */
export interface SyncConfigurationExtended extends SyncConfiguration {
  statusSync?: {
    mappings?: StatusSyncMappings;
  };
}

/**
 * Supported external providers
 */
export type SyncProvider = 'github' | 'jira' | 'ado';

/**
 * Provider configuration result
 */
export interface ProviderStatus {
  enabled: boolean;
  source: 'profile' | 'legacy' | 'none';
  profileId?: string;
}

/**
 * Check if a provider is enabled in config (supports BOTH formats)
 *
 * v1.0.46 FIX: Supports two config formats:
 * 1. PROFILES format: sync.profiles[name].provider === provider
 * 2. LEGACY format: sync.[provider].enabled === true
 *
 * @param config - Project config object
 * @param provider - Provider to check ('github', 'jira', 'ado')
 * @returns true if provider is enabled in either format
 */
export function isProviderEnabled(config: SpecWeaveConfig, provider: SyncProvider): boolean {
  const syncConfig = config.sync;
  if (!syncConfig) {
    return false;
  }

  // Check LEGACY format first (sync.github.enabled, sync.jira.enabled, sync.ado.enabled)
  const providerConfig = syncConfig[provider] as GitHubConfig | JiraConfig | AzureDevOpsConfig | undefined;
  if (providerConfig?.enabled === true) {
    return true;
  }

  // Check PROFILES format (sync.profiles with provider field)
  if (syncConfig.profiles) {
    for (const profile of Object.values(syncConfig.profiles)) {
      if (profile?.provider === provider) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get detailed provider status including source of configuration
 *
 * @param config - Project config object
 * @param provider - Provider to check
 * @returns Detailed provider status
 */
export function getProviderStatus(config: SpecWeaveConfig, provider: SyncProvider): ProviderStatus {
  const syncConfig = config.sync;
  if (!syncConfig) {
    return { enabled: false, source: 'none' };
  }

  // Check LEGACY format first
  const providerConfig = syncConfig[provider] as GitHubConfig | JiraConfig | AzureDevOpsConfig | undefined;
  if (providerConfig?.enabled === true) {
    return { enabled: true, source: 'legacy' };
  }

  // Check PROFILES format
  if (syncConfig.profiles) {
    for (const [profileId, profile] of Object.entries(syncConfig.profiles)) {
      if (profile?.provider === provider) {
        return { enabled: true, source: 'profile', profileId };
      }
    }
  }

  return { enabled: false, source: 'none' };
}

/**
 * Get all enabled providers from config
 *
 * @param config - Project config object
 * @returns Array of enabled providers
 */
export function getEnabledProviders(config: SpecWeaveConfig): SyncProvider[] {
  const providers: SyncProvider[] = [];

  if (isProviderEnabled(config, 'github')) {
    providers.push('github');
  }
  if (isProviderEnabled(config, 'jira')) {
    providers.push('jira');
  }
  if (isProviderEnabled(config, 'ado')) {
    providers.push('ado');
  }

  return providers;
}

/**
 * Status Mapper class for handling status transitions
 */
export class StatusMapper {
  private config: SpecWeaveConfig;

  constructor(config: SpecWeaveConfig) {
    this.config = config;
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(provider: SyncProvider): boolean {
    return isProviderEnabled(this.config, provider);
  }

  /**
   * Get provider status details
   */
  getProviderStatus(provider: SyncProvider): ProviderStatus {
    return getProviderStatus(this.config, provider);
  }

  /**
   * Get all enabled providers
   */
  getEnabledProviders(): SyncProvider[] {
    return getEnabledProviders(this.config);
  }

  /**
   * Get the target status for a completed increment in JIRA
   *
   * @returns Target JIRA status (default: 'Done')
   */
  getJiraCompletedStatus(): string {
    const syncConfigExt = this.config.sync as SyncConfigurationExtended | undefined;
    return syncConfigExt?.statusSync?.mappings?.jira?.completed || 'Done';
  }

  /**
   * Get the target state for a completed increment in ADO
   *
   * @returns Target ADO state (default: 'Closed')
   */
  getAdoCompletedState(): string {
    const syncConfigExt = this.config.sync as SyncConfigurationExtended | undefined;
    const targetStateConfig = syncConfigExt?.statusSync?.mappings?.ado?.completed || { state: 'Closed' };
    return typeof targetStateConfig === 'string' ? targetStateConfig : targetStateConfig.state;
  }

  /**
   * Check if external sync is allowed
   */
  canUpdateExternal(): boolean {
    return this.config.sync?.settings?.canUpdateExternalItems ?? false;
  }

  /**
   * Check if status updates are allowed
   */
  canUpdateStatus(): boolean {
    return this.config.sync?.settings?.canUpdateStatus ?? false;
  }

  /**
   * Check if auto sync on completion is enabled
   */
  isAutoSyncEnabled(): boolean {
    return this.config.sync?.settings?.autoSyncOnCompletion ?? true;
  }

  /**
   * Check if living docs sync is allowed
   */
  canUpsertInternal(): boolean {
    return this.config.sync?.settings?.canUpsertInternalItems ?? true;
  }
}

/**
 * Status Mapper Service
 *
 * Handles status mapping between SpecWeave increment statuses and external tool statuses.
 * Extracted from sync-coordinator.ts for better separation of concerns.
 *
 * @module sync/status-mapper
 * @since v1.0.115
 */
import type { SpecWeaveConfig, SyncConfiguration } from '../core/config/types.js';
/**
 * Status sync mapping configuration (runtime config, not in core types)
 */
export interface StatusSyncMappings {
    jira?: {
        completed?: string;
    };
    ado?: {
        completed?: string | {
            state: string;
        };
    };
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
export declare function isProviderEnabled(config: SpecWeaveConfig, provider: SyncProvider): boolean;
/**
 * Get detailed provider status including source of configuration
 *
 * @param config - Project config object
 * @param provider - Provider to check
 * @returns Detailed provider status
 */
export declare function getProviderStatus(config: SpecWeaveConfig, provider: SyncProvider): ProviderStatus;
/**
 * Get all enabled providers from config
 *
 * @param config - Project config object
 * @returns Array of enabled providers
 */
export declare function getEnabledProviders(config: SpecWeaveConfig): SyncProvider[];
/**
 * Status Mapper class for handling status transitions
 */
export declare class StatusMapper {
    private config;
    constructor(config: SpecWeaveConfig);
    /**
     * Check if a provider is enabled
     */
    isProviderEnabled(provider: SyncProvider): boolean;
    /**
     * Get provider status details
     */
    getProviderStatus(provider: SyncProvider): ProviderStatus;
    /**
     * Get all enabled providers
     */
    getEnabledProviders(): SyncProvider[];
    /**
     * Get the target status for a completed increment in JIRA
     *
     * @returns Target JIRA status (default: 'Done')
     */
    getJiraCompletedStatus(): string;
    /**
     * Get the target state for a completed increment in ADO
     *
     * @returns Target ADO state (default: 'Closed')
     */
    getAdoCompletedState(): string;
    /**
     * Check if external sync is allowed.
     * Aligns with SyncCoordinator: explicit setting wins, otherwise falls back
     * to resolvePermissions(preset).canUpsert (not a hard-coded false).
     */
    canUpdateExternal(): boolean;
    /**
     * Check if status updates are allowed
     */
    canUpdateStatus(): boolean;
    /**
     * Check if auto sync on completion is enabled
     */
    isAutoSyncEnabled(): boolean;
    /**
     * Check if living docs sync is allowed
     */
    canUpsertInternal(): boolean;
}
//# sourceMappingURL=status-mapper.d.ts.map
/**
 * Status Mapper Service
 *
 * Handles status mapping between SpecWeave increment statuses and external tool statuses.
 * Extracted from sync-coordinator.ts for better separation of concerns.
 *
 * @module sync/status-mapper
 * @since v1.0.115
 */
import { resolvePermissions } from './config.js';
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
export function isProviderEnabled(config, provider) {
    const syncConfig = config.sync;
    if (!syncConfig) {
        return false;
    }
    // Check LEGACY format first (sync.github.enabled, sync.jira.enabled, sync.ado.enabled)
    const providerConfig = syncConfig[provider];
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
export function getProviderStatus(config, provider) {
    const syncConfig = config.sync;
    if (!syncConfig) {
        return { enabled: false, source: 'none' };
    }
    // Check LEGACY format first
    const providerConfig = syncConfig[provider];
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
export function getEnabledProviders(config) {
    const providers = [];
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
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if a provider is enabled
     */
    isProviderEnabled(provider) {
        return isProviderEnabled(this.config, provider);
    }
    /**
     * Get provider status details
     */
    getProviderStatus(provider) {
        return getProviderStatus(this.config, provider);
    }
    /**
     * Get all enabled providers
     */
    getEnabledProviders() {
        return getEnabledProviders(this.config);
    }
    /**
     * Get the target status for a completed increment in JIRA
     *
     * @returns Target JIRA status (default: 'Done')
     */
    getJiraCompletedStatus() {
        const syncConfigExt = this.config.sync;
        return syncConfigExt?.statusSync?.mappings?.jira?.completed || 'Done';
    }
    /**
     * Get the target state for a completed increment in ADO
     *
     * @returns Target ADO state (default: 'Closed')
     */
    getAdoCompletedState() {
        const syncConfigExt = this.config.sync;
        const targetStateConfig = syncConfigExt?.statusSync?.mappings?.ado?.completed || { state: 'Closed' };
        return typeof targetStateConfig === 'string' ? targetStateConfig : targetStateConfig.state;
    }
    /**
     * Check if external sync is allowed.
     * Aligns with SyncCoordinator: explicit setting wins, otherwise falls back
     * to resolvePermissions(preset).canUpsert (not a hard-coded false).
     */
    canUpdateExternal() {
        if (this.config.sync?.settings?.canUpdateExternalItems !== undefined) {
            return this.config.sync.settings.canUpdateExternalItems;
        }
        const syncAny = this.config.sync;
        const permissions = resolvePermissions(syncAny?.preset, undefined, this.config.sync?.settings);
        return permissions.canUpsert;
    }
    /**
     * Check if status updates are allowed
     */
    canUpdateStatus() {
        return this.config.sync?.settings?.canUpdateStatus ?? false;
    }
    /**
     * Check if auto sync on completion is enabled
     */
    isAutoSyncEnabled() {
        return this.config.sync?.settings?.autoSyncOnCompletion ?? true;
    }
    /**
     * Check if living docs sync is allowed
     */
    canUpsertInternal() {
        return this.config.sync?.settings?.canUpsertInternalItems ?? true;
    }
}
//# sourceMappingURL=status-mapper.js.map
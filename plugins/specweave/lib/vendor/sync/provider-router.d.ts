/**
 * Provider Router Service
 *
 * Routes sync operations to the correct external provider (GitHub, JIRA, ADO).
 * Extracted from sync-coordinator.ts for better separation of concerns.
 *
 * @module sync/provider-router
 * @since v1.0.115
 */
import { Logger } from '../utils/logger.js';
import { StatusMapper, SyncProvider } from './status-mapper.js';
import type { SpecWeaveConfig } from '../core/config/types.js';
/**
 * GitHub repository configuration
 */
export interface GitHubRepoConfig {
    enabled?: boolean;
    owner?: string;
    repo?: string;
}
/**
 * Repository information
 */
export interface RepoInfo {
    owner: string;
    repo: string;
}
/**
 * Provider router options
 */
export interface ProviderRouterOptions {
    projectRoot: string;
    logger?: Logger;
}
/**
 * Provider Router - Routes sync operations to the correct external provider
 */
export declare class ProviderRouter {
    private projectRoot;
    private logger;
    constructor(options: ProviderRouterOptions);
    /**
     * Detect GitHub repository from config or git remote
     *
     * @param githubConfig - Optional GitHub config from config.json
     * @returns Repository info or null if not detected
     */
    detectGitHubRepo(githubConfig?: GitHubRepoConfig): Promise<RepoInfo | null>;
    /**
     * Get the external provider for a user story
     *
     * Determines which external provider to use based on the user story's
     * external_source field.
     *
     * @param externalSource - The external source from user story (github, jira, ado, azure-devops)
     * @returns Normalized provider name
     */
    normalizeProvider(externalSource: string | undefined): SyncProvider | null;
    /**
     * Check which providers are available for sync
     *
     * @param config - Project configuration
     * @returns Object with provider availability
     */
    getAvailableProviders(config: SpecWeaveConfig): Record<SyncProvider, boolean>;
    /**
     * Load project configuration
     *
     * @returns Project configuration or empty object
     */
    loadConfig(): Promise<SpecWeaveConfig>;
    /**
     * Get status mapper instance for the current config
     *
     * @param config - Project configuration
     * @returns StatusMapper instance
     */
    getStatusMapper(config: SpecWeaveConfig): StatusMapper;
    /**
     * Log provider availability for debugging
     *
     * @param config - Project configuration
     */
    logProviderStatus(config: SpecWeaveConfig): void;
}
//# sourceMappingURL=provider-router.d.ts.map
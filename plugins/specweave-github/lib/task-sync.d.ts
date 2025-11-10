/**
 * Task-level GitHub synchronization
 * Orchestrates syncing tasks.md to GitHub issues
 */
import { SyncResult, GitHubSyncOptions } from './types';
export declare class TaskSync {
    private client;
    private incrementPath;
    constructor(incrementPath: string, repo?: string);
    /**
     * Sync all tasks to GitHub (main entry point)
     */
    syncTasks(options?: GitHubSyncOptions): Promise<SyncResult>;
    /**
     * Generate epic issue body
     */
    private generateEpicBody;
    /**
     * Generate task issue body
     */
    private generateTaskBody;
    /**
     * Load increment metadata
     */
    private loadIncrementMetadata;
    /**
     * Save increment metadata
     */
    private saveIncrementMetadata;
    /**
     * Save sync mapping
     */
    private saveSyncMapping;
    /**
     * Get milestone title from metadata
     */
    private getMilestoneTitle;
    /**
     * Get GitHub file URL
     */
    private getGitHubFileURL;
    /**
     * Convert string to slug
     */
    private slugify;
    /**
     * Print dry run summary
     */
    private printDryRunSummary;
}
//# sourceMappingURL=task-sync.d.ts.map
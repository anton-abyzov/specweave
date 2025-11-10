/**
 * GitHub CLI Wrapper for SpecWeave (Multi-Project Support)
 *
 * Profile-based GitHub client that supports:
 * - Multiple repositories via sync profiles
 * - Time range filtering for syncs
 * - Rate limiting protection
 * - Secure command execution (no shell injection)
 */
import { GitHubIssue, GitHubMilestone } from './types';
import { SyncProfile, TimeRangePreset } from '../../../src/core/types/sync-profile';
export declare class GitHubClientV2 {
    private owner;
    private repo;
    private fullRepo;
    /**
     * Create GitHub client from sync profile
     */
    constructor(profile: SyncProfile);
    /**
     * Create client from owner/repo directly
     */
    static fromRepo(owner: string, repo: string): GitHubClientV2;
    /**
     * Check if GitHub CLI is installed and authenticated
     */
    static checkCLI(): Promise<{
        installed: boolean;
        authenticated: boolean;
        error?: string;
    }>;
    /**
     * Auto-detect repository from git remote
     */
    static detectRepo(cwd?: string): Promise<{
        owner: string;
        repo: string;
    } | null>;
    /**
     * Create or get existing milestone
     */
    createOrGetMilestone(title: string, description?: string, daysFromNow?: number): Promise<GitHubMilestone>;
    /**
     * Get milestone by title
     */
    private getMilestoneByTitle;
    /**
     * Create epic issue (increment-level)
     */
    createEpicIssue(title: string, body: string, milestone?: number | string, labels?: string[]): Promise<GitHubIssue>;
    /**
     * Create task issue (linked to epic)
     */
    createTaskIssue(title: string, body: string, epicNumber: number, milestone?: number | string, labels?: string[]): Promise<GitHubIssue>;
    /**
     * Get issue details
     */
    getIssue(issueNumber: number): Promise<GitHubIssue>;
    /**
     * Update issue body
     */
    updateIssueBody(issueNumber: number, newBody: string): Promise<void>;
    /**
     * Close issue
     */
    closeIssue(issueNumber: number, comment?: string): Promise<void>;
    /**
     * Add comment to issue
     */
    addComment(issueNumber: number, comment: string): Promise<void>;
    /**
     * Add labels to issue
     */
    addLabels(issueNumber: number, labels: string[]): Promise<void>;
    /**
     * List issues within a time range
     */
    listIssuesInTimeRange(timeRange: TimeRangePreset, customStart?: string, customEnd?: string): Promise<GitHubIssue[]>;
    /**
     * Calculate date range from time range preset
     */
    private calculateTimeRange;
    /**
     * Check rate limit status
     */
    checkRateLimit(): Promise<{
        remaining: number;
        limit: number;
        reset: Date;
    }>;
    /**
     * Batch create issues with rate limit handling
     */
    batchCreateIssues(issues: Array<{
        title: string;
        body: string;
        labels?: string[];
    }>, milestone?: number | string, epicNumber?: number, options?: {
        batchSize?: number;
        delayMs?: number;
    }): Promise<GitHubIssue[]>;
    private sleep;
}
//# sourceMappingURL=github-client-v2.d.ts.map
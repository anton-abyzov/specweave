/**
 * GitHub CLI wrapper for SpecWeave
 * Uses `gh` command for GitHub API operations
 */
import { GitHubIssue, GitHubMilestone } from './types';
export declare class GitHubClient {
    private repo;
    constructor(repo?: string);
    /**
     * Auto-detect GitHub repository from git remote
     */
    private detectRepo;
    /**
     * Check if GitHub CLI is installed and authenticated
     */
    static checkGitHubCLI(): {
        installed: boolean;
        authenticated: boolean;
        error?: string;
    };
    /**
     * Create or get existing milestone
     *
     * @param title Milestone title
     * @param description Milestone description
     * @param daysFromNow Days until milestone due (default: 2 days - SpecWeave AI velocity)
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
     * Update issue body
     */
    updateIssueBody(issueNumber: number, newBody: string): Promise<void>;
    /**
     * Get issue details
     */
    getIssue(issueNumber: number): Promise<GitHubIssue>;
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
     * Check rate limit status
     */
    checkRateLimit(): Promise<{
        remaining: number;
        limit: number;
        reset: Date;
    }>;
    /**
     * Escape quotes in strings for shell commands
     */
    private escapeQuotes;
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
    /**
     * Get all repositories accessible to the user
     * @param owner Optional: filter by specific owner/org (e.g., 'octocat', 'my-org')
     * @param limit Maximum number of repos to fetch (default: 100, max: 1000)
     */
    static getRepositories(owner?: string, limit?: number): Promise<Array<{
        owner: string;
        name: string;
        fullName: string;
    }>>;
}
//# sourceMappingURL=github-client.d.ts.map
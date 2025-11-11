/**
 * GitHub Spec Commit Sync
 *
 * Posts commit/PR comments to GitHub issues linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */
import { GitCommit, GitRepository } from '../../../src/utils/git-utils.js';
import { UserStory } from '../../../src/core/spec-task-mapper.js';
export interface SyncOptions {
    incrementPath: string;
    dryRun?: boolean;
    verbose?: boolean;
}
export interface SyncResult {
    success: boolean;
    commentsPosted: number;
    errors: string[];
    commits: GitCommit[];
    userStories: UserStory[];
}
/**
 * Sync commits for completed user stories to GitHub issue
 */
export declare function syncSpecCommitsToGitHub(options: SyncOptions): Promise<SyncResult>;
/**
 * Post batch commit update to GitHub issue (for multiple commits)
 */
export declare function postCommitBatchUpdate(incrementPath: string, commits: GitCommit[], issueNumber: number, repo: GitRepository, dryRun?: boolean): Promise<boolean>;
/**
 * Check if spec commit sync is enabled in config
 */
export declare function isSpecCommitSyncEnabled(projectRoot: string): Promise<boolean>;
/**
 * Get GitHub issue number from spec metadata
 */
export declare function getGitHubIssueForSpec(specPath: string): Promise<number | null>;
//# sourceMappingURL=github-spec-commit-sync.d.ts.map
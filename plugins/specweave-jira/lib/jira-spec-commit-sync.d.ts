/**
 * JIRA Spec Commit Sync
 *
 * Posts commit/PR comments to JIRA issues linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */
import { GitCommit, GitRepository } from '../../../src/utils/git-utils.js';
import { UserStory } from '../../../src/core/spec-task-mapper.js';
export interface JiraConfig {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
}
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
 * Sync commits for completed user stories to JIRA epic/story
 */
export declare function syncSpecCommitsToJira(config: JiraConfig, options: SyncOptions): Promise<SyncResult>;
/**
 * Post batch commit update to JIRA issue
 */
export declare function postCommitBatchUpdate(config: JiraConfig, incrementPath: string, commits: GitCommit[], issueKey: string, repo: GitRepository, dryRun?: boolean): Promise<boolean>;
/**
 * Check if spec commit sync is enabled in config
 */
export declare function isSpecCommitSyncEnabled(projectRoot: string): Promise<boolean>;
/**
 * Get JIRA issue key from spec metadata
 */
export declare function getJiraIssueForSpec(specPath: string): Promise<string | null>;
//# sourceMappingURL=jira-spec-commit-sync.d.ts.map
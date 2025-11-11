/**
 * Azure DevOps Spec Commit Sync
 *
 * Posts commit/PR comments to ADO work items linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */
import { AdoClientV2 } from './ado-client-v2.js';
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
 * Sync commits for completed user stories to ADO work item
 */
export declare function syncSpecCommitsToAdo(client: AdoClientV2, options: SyncOptions): Promise<SyncResult>;
/**
 * Post batch commit update to ADO work item
 */
export declare function postCommitBatchUpdate(client: AdoClientV2, incrementPath: string, commits: GitCommit[], workItemId: number, repo: GitRepository, dryRun?: boolean): Promise<boolean>;
/**
 * Check if spec commit sync is enabled in config
 */
export declare function isSpecCommitSyncEnabled(projectRoot: string): Promise<boolean>;
/**
 * Get ADO work item ID from spec metadata
 */
export declare function getAdoWorkItemForSpec(specPath: string): Promise<number | null>;
//# sourceMappingURL=ado-spec-commit-sync.d.ts.map
/**
 * GitHub Issue Updater for Living Docs Sync
 *
 * Handles updating GitHub issues with living documentation links and content.
 * Used by post-task-completion hook to keep GitHub issues in sync with SpecWeave docs.
 *
 * @module github-issue-updater
 */
export interface LivingDocsSection {
    specs: string[];
    architecture: string[];
    diagrams: string[];
}
export interface IncrementMetadata {
    id: string;
    status: string;
    type: string;
    github?: {
        issue: number;
        url: string;
        synced?: string;
    };
}
/**
 * Update GitHub issue with living docs section
 */
export declare function updateIssueLivingDocs(issueNumber: number, livingDocs: LivingDocsSection, owner: string, repo: string): Promise<void>;
/**
 * Post comment about ADR/HLD/diagram creation
 */
export declare function postArchitectureComment(issueNumber: number, docPath: string, owner: string, repo: string): Promise<void>;
/**
 * Post scope change comment
 */
export declare function postScopeChangeComment(issueNumber: number, changes: {
    added?: string[];
    removed?: string[];
    modified?: string[];
    reason?: string;
    impact?: string;
}, owner: string, repo: string): Promise<void>;
/**
 * Post status change comment (pause/resume/abandon)
 */
export declare function postStatusChangeComment(issueNumber: number, status: 'paused' | 'resumed' | 'abandoned', reason: string, owner: string, repo: string): Promise<void>;
/**
 * Collect living docs for an increment
 */
export declare function collectLivingDocs(incrementId: string): Promise<LivingDocsSection>;
/**
 * Load increment metadata
 */
export declare function loadIncrementMetadata(incrementId: string): Promise<IncrementMetadata | null>;
/**
 * Detect repository owner and name from git remote
 */
export declare function detectRepo(): Promise<{
    owner: string;
    repo: string;
} | null>;
//# sourceMappingURL=github-issue-updater.d.ts.map
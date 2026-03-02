/**
 * GitHub Reconciler (NEW in v0.28.33)
 *
 * Reconciles GitHub issue states with increment metadata.json statuses.
 * Fixes drift between local SpecWeave state and GitHub:
 * - Closes issues for completed increments that are still open
 * - Reopens issues for in-progress increments that are closed
 *
 * Triggered by:
 * - /specweave-github:reconcile command (manual)
 * - SessionStart hook (automatic, if configured)
 * - post-increment-status-change.sh (on resume/abandon)
 */
import { Logger } from '../utils/logger.js';
export interface ReconcileOptions {
    projectRoot: string;
    dryRun?: boolean;
    logger?: Logger;
}
export interface IncrementGitHubState {
    incrementId: string;
    incrementPath: string;
    metadataStatus: string;
    featureId?: string;
    mainIssue?: {
        number: number;
        url?: string;
    };
    userStoryIssues: Array<{
        userStoryId: string;
        issueNumber: number;
    }>;
}
export interface ReconcileResult {
    scanned: number;
    mismatches: number;
    closed: number;
    reopened: number;
    errors: string[];
    details: Array<{
        incrementId: string;
        action: 'close' | 'reopen' | 'skip' | 'error';
        issueNumber: number;
        reason: string;
    }>;
}
export declare class GitHubReconciler {
    private projectRoot;
    private dryRun;
    private logger;
    private client;
    private configCache;
    constructor(options: ReconcileOptions);
    /**
     * Main reconciliation entry point
     */
    reconcile(): Promise<ReconcileResult>;
    /**
     * Reconcile a single increment
     */
    private reconcileIncrement;
    /**
     * Reconcile a single issue
     */
    private reconcileIssue;
    /**
     * Scan all increments (active + archived + abandoned) and extract GitHub state.
     * Archived/abandoned increments are included so the reconciler can close their
     * stale open issues.
     */
    private scanIncrements;
    /**
     * Extract GitHub state from increment metadata (both old and new formats)
     */
    private extractGitHubState;
    /**
     * Fallback: search GitHub API for issues when metadata has no references.
     * Only used for active (non-archived) increments to avoid excessive API calls.
     */
    private searchGitHubForIssues;
    /**
     * Initialize GitHub client
     *
     * Prefers sync.github.owner/repo from config (critical for umbrella repos
     * where git remote points to a different repo than where issues live).
     * Falls back to git remote detection.
     */
    private initClient;
    /**
     * Load config (cached after first read)
     */
    private loadConfig;
    /**
     * Resolve GitHub owner/repo from config, falling back to git remote.
     * Critical for umbrella repos where git remote != issue target repo.
     */
    private static resolveRepoInfo;
    /**
     * Reopen all GitHub issues for an increment
     * Called by post-increment-status-change.sh when resuming
     */
    static reopenIncrementIssues(projectRoot: string, incrementId: string, reason: string, logger?: Logger): Promise<{
        reopened: number;
        errors: string[];
    }>;
    /**
     * Close all GitHub issues for an abandoned increment
     * Called by post-increment-status-change.sh when abandoning
     */
    static closeAbandonedIncrementIssues(projectRoot: string, incrementId: string, reason: string, logger?: Logger): Promise<{
        closed: number;
        errors: string[];
    }>;
    /**
     * Close all GitHub issues for a completed increment.
     *
     * Fallback path that reads issue numbers directly from metadata.json
     * (does NOT depend on living docs files existing).
     *
     * Reads from BOTH metadata formats:
     *   - metadata.externalLinks.github.issues (keyed by US-ID, has issueNumber)
     *   - metadata.github.issues (array, has number)
     *
     * Idempotent: skips already-closed issues.
     * Also closes the milestone if present in metadata.
     */
    static closeCompletedIncrementIssues(projectRoot: string, incrementId: string, logger?: Logger | ((msg: string) => void)): Promise<{
        closed: number;
        milestoneClose: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=github-reconciler.d.ts.map
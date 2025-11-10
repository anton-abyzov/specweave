/**
 * Bidirectional GitHub Sync
 *
 * Syncs state from GitHub back to SpecWeave.
 * Handles issue state changes, comments, assignees, labels, milestones.
 *
 * @module github-sync-bidirectional
 */
export interface GitHubIssueState {
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    labels: string[];
    assignees: string[];
    milestone?: string;
    comments: GitHubComment[];
    updated_at: string;
}
export interface GitHubComment {
    id: number;
    author: string;
    body: string;
    created_at: string;
}
export interface SyncConflict {
    type: 'status' | 'assignee' | 'label';
    githubValue: any;
    specweaveValue: any;
    resolution: 'github-wins' | 'specweave-wins' | 'prompt';
}
/**
 * Sync from GitHub to SpecWeave
 */
export declare function syncFromGitHub(incrementId: string): Promise<void>;
//# sourceMappingURL=github-sync-bidirectional.d.ts.map
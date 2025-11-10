/**
 * GitHub Sync for Increment Changes
 *
 * Handles syncing spec.md, plan.md, and tasks.md changes to GitHub issues.
 * Detects scope changes, architecture updates, and task modifications.
 *
 * @module github-sync-increment-changes
 */
export interface SpecChanges {
    added: string[];
    removed: string[];
    modified: string[];
}
/**
 * Sync increment file changes to GitHub
 */
export declare function syncIncrementChanges(incrementId: string, changedFile: 'spec.md' | 'plan.md' | 'tasks.md'): Promise<void>;
//# sourceMappingURL=github-sync-increment-changes.d.ts.map
/**
 * Subtask synchronization with GitHub issue checkboxes
 * Updates GitHub issue body when subtasks complete
 */
export declare class SubtaskSync {
    private client;
    private incrementPath;
    constructor(incrementPath: string, repo?: string);
    /**
     * Update subtask status in GitHub issue
     */
    updateSubtaskStatus(taskId: string, subtaskId: string, completed: boolean): Promise<void>;
    /**
     * Sync all subtasks for a task
     */
    syncAllSubtasks(taskId: string): Promise<void>;
    /**
     * Update checkbox in issue body
     */
    private updateSubtaskCheckbox;
    /**
     * Check if all subtasks are done
     */
    private areAllSubtasksDone;
    /**
     * Escape special regex characters
     */
    private escapeRegex;
    /**
     * Post task completion comment to GitHub issue
     */
    postTaskCompletionComment(taskId: string, stats: {
        filesModified?: number;
        linesAdded?: number;
        linesDeleted?: number;
        testsAdded?: number;
        actualDuration?: string;
        estimatedDuration?: string;
        summary?: string;
        nextTask?: string;
        progress?: {
            completed: number;
            total: number;
        };
    }): Promise<void>;
    /**
     * Update epic issue progress
     */
    updateEpicProgress(epicIssueNumber: number, completed: number, total: number): Promise<void>;
}
//# sourceMappingURL=subtask-sync.d.ts.map
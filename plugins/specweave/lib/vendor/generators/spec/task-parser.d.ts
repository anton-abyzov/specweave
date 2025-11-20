/**
 * Task Parser with US-Task Linkage Support
 *
 * Parses tasks.md files to extract task metadata including new US linkage fields:
 * - userStory: US-ID this task implements (e.g., "US-001")
 * - satisfiesACs: List of AC-IDs this task satisfies (e.g., ["AC-US1-01", "AC-US1-02"])
 *
 * Supports hierarchical task structure grouped by User Story.
 */
/**
 * Task metadata extracted from tasks.md
 */
export interface Task {
    /** Task ID (e.g., "T-001") */
    id: string;
    /** Task title */
    title: string;
    /** User Story this task implements (optional for backward compatibility) */
    userStory?: string;
    /** Acceptance Criteria IDs this task satisfies (optional) */
    satisfiesACs?: string[];
    /** Task completion status */
    status: TaskStatus;
    /** Priority level (P0, P1, P2, P3) */
    priority?: string;
    /** Estimated effort (e.g., "4 hours", "2 days") */
    estimatedEffort?: string;
    /** Task dependencies (task IDs this depends on) */
    dependencies?: string[];
    /** Full task description */
    description?: string;
    /** Files affected by this task */
    filesAffected?: string[];
    /** Line number in tasks.md (for error reporting) */
    lineNumber?: number;
}
/**
 * Task completion status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'transferred' | 'canceled';
/**
 * Tasks grouped by User Story
 */
export interface TasksByUserStory {
    [usId: string]: Task[];
}
/**
 * Validation error for task linkage
 */
export interface TaskLinkageError {
    taskId: string;
    field: 'userStory' | 'satisfiesACs';
    value: string;
    message: string;
    suggestedFix?: string;
}
/**
 * Parse tasks.md and extract all tasks with US linkage
 *
 * @param tasksPath - Path to tasks.md file
 * @returns Map of User Story ID → Tasks
 * @throws Error if tasks.md cannot be read or is malformed
 */
export declare function parseTasksWithUSLinks(tasksPath: string): TasksByUserStory;
/**
 * Validate task US and AC linkage
 *
 * @param task - Task to validate
 * @param validUSIds - List of valid US-IDs from spec.md
 * @param validACIds - List of valid AC-IDs from spec.md
 * @returns Array of validation errors (empty if valid)
 */
export declare function validateTaskLinkage(task: Task, validUSIds: string[], validACIds: string[]): TaskLinkageError[];
/**
 * Get all tasks (flattened, not grouped by US)
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Array of all tasks
 */
export declare function getAllTasks(tasksByUS: TasksByUserStory): Task[];
/**
 * Count tasks by status
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Map of status → count
 */
export declare function countTasksByStatus(tasksByUS: TasksByUserStory): Record<TaskStatus, number>;
/**
 * Calculate completion percentage
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Completion percentage (0-100)
 */
export declare function calculateCompletionPercentage(tasksByUS: TasksByUserStory): number;
//# sourceMappingURL=task-parser.d.ts.map
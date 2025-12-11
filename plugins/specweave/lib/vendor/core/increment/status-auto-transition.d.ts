/**
 * Status Auto-Transition Module
 *
 * Automatically transitions increment status based on file activity:
 * - When spec.md created → status = PLANNING (if not already set)
 * - When tasks.md created → status = ACTIVE (if currently PLANNING)
 * - When first task marked in-progress → status = ACTIVE (if not already)
 * - When ALL tasks completed → status = READY_FOR_REVIEW (v0.35.0+)
 *
 * CRITICAL (v0.35.0+): ACTIVE → READY_FOR_REVIEW auto-transition prevents
 * the auto-completion bug where increments get marked "completed" without
 * user approval. Only /sw:done can transition READY_FOR_REVIEW → COMPLETED.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */
import { IncrementStatus } from '../types/increment-metadata.js';
/**
 * Task completion status result
 */
export interface TaskCompletionStatus {
    /** Total number of tasks found */
    totalTasks: number;
    /** Number of completed tasks */
    completedTasks: number;
    /** Number of pending tasks */
    pendingTasks: number;
    /** Whether all tasks are completed (100%) */
    allCompleted: boolean;
    /** Completion percentage (0-100) */
    percentage: number;
}
/**
 * Check task completion status from tasks.md
 *
 * Parses tasks.md to count completed vs pending tasks.
 * A task is considered completed if it has:
 * - **Status**: [x] completed
 * - Or checkbox [x] before task ID
 *
 * @param incrementId - Increment ID to check
 * @returns Task completion status or null if tasks.md doesn't exist
 */
export declare function getTaskCompletionStatus(incrementId: string): TaskCompletionStatus | null;
/**
 * Check if ALL tasks in tasks.md are completed
 *
 * CRITICAL (v0.35.0+): This is used to auto-transition from ACTIVE → READY_FOR_REVIEW.
 * This prevents the auto-completion bug where increments could be marked "completed"
 * without going through the proper review gate.
 *
 * @param incrementId - Increment ID to check
 * @returns true if all tasks are completed, false otherwise
 */
export declare function areAllTasksCompleted(incrementId: string): boolean;
/**
 * Auto-transition increment status based on file activity
 *
 * Transition Rules:
 * 1. PLANNING → ACTIVE: When tasks.md created or first task in-progress
 * 2. BACKLOG → PLANNING: When spec.md created (resume planning)
 * 3. Any status → ACTIVE: When first task in-progress (override)
 * 4. ACTIVE → READY_FOR_REVIEW: When ALL tasks completed (v0.35.0+ - CRITICAL!)
 *
 * CRITICAL (v0.35.0+): Rule 4 prevents the auto-completion bug.
 * ACTIVE cannot transition directly to COMPLETED - it MUST go through READY_FOR_REVIEW.
 * Only /sw:done can transition READY_FOR_REVIEW → COMPLETED with user approval.
 *
 * @param incrementId - Increment ID to check
 * @param triggerFile - File that triggered the check (optional, for logging)
 * @returns true if status was transitioned, false otherwise
 */
export declare function autoTransitionStatus(incrementId: string, triggerFile?: string): boolean;
/**
 * Check and auto-transition increment to READY_FOR_REVIEW if all tasks completed
 *
 * CRITICAL (v0.35.0+): This function should be called after every task completion
 * to ensure increments transition to READY_FOR_REVIEW when all work is done.
 *
 * This is the ONLY path from ACTIVE to closure - prevents auto-completion bug.
 *
 * @param incrementId - Increment ID to check
 * @returns Object with transition result
 */
export declare function checkAndTransitionToReadyForReview(incrementId: string): {
    transitioned: boolean;
    from?: IncrementStatus;
    to?: IncrementStatus;
    taskStatus?: TaskCompletionStatus;
    message: string;
};
/**
 * Auto-transition based on specific file creation
 *
 * This is called by file watchers or post-write hooks
 *
 * @param incrementId - Increment ID
 * @param createdFile - File that was just created
 */
export declare function onFileCreated(incrementId: string, createdFile: string): void;
/**
 * Check if increment should auto-transition to ACTIVE
 *
 * Used by /sw:do command before execution
 */
export declare function shouldTransitionToActive(incrementId: string): boolean;
/**
 * Validate and fix "planned" vs "planning" inconsistency
 *
 * Legacy increments may have "planned" status (not in enum).
 * This migrates them to "planning" (valid enum value).
 */
export declare function migrateLegacyStatuses(): number;
//# sourceMappingURL=status-auto-transition.d.ts.map
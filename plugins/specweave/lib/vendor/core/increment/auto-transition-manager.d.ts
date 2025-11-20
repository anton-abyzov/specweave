/**
 * Auto-Transition Manager
 *
 * Automatically transitions increment status based on lifecycle events:
 * - spec.md created → BACKLOG → PLANNING
 * - tasks.md created → PLANNING/BACKLOG → ACTIVE
 * - first task started → PLANNING → ACTIVE
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */
import { IncrementStatus } from '../types/increment-metadata.js';
export interface TransitionEvent {
    incrementId: string;
    from: IncrementStatus;
    to: IncrementStatus;
    trigger: 'spec-created' | 'tasks-created' | 'task-started' | 'auto-correct';
    timestamp: string;
}
export interface AutoTransitionResult {
    transitioned: boolean;
    from?: IncrementStatus;
    to?: IncrementStatus;
    reason: string;
}
/**
 * Manages automatic status transitions based on increment artifacts
 */
export declare class AutoTransitionManager {
    private projectRoot;
    constructor(projectRoot: string);
    /**
     * Handle spec.md creation event
     * BACKLOG → PLANNING
     */
    handleSpecCreated(incrementId: string): Promise<AutoTransitionResult>;
    /**
     * Handle tasks.md creation event
     * PLANNING/BACKLOG → ACTIVE
     */
    handleTasksCreated(incrementId: string): Promise<AutoTransitionResult>;
    /**
     * Handle first task started event
     * PLANNING → ACTIVE
     */
    handleTaskStarted(incrementId: string): Promise<AutoTransitionResult>;
    /**
     * Detect increment phase based on artifacts (spec.md, plan.md, tasks.md)
     */
    detectPhase(incrementId: string): Promise<IncrementStatus>;
    /**
     * Auto-correct status based on artifacts
     * Useful for fixing increments with invalid "planned"/"planning" statuses
     */
    autoCorrect(incrementId: string, force?: boolean): Promise<AutoTransitionResult>;
    /**
     * Get transition event for logging
     */
    createTransitionEvent(incrementId: string, from: IncrementStatus, to: IncrementStatus, trigger: TransitionEvent['trigger']): TransitionEvent;
}
//# sourceMappingURL=auto-transition-manager.d.ts.map
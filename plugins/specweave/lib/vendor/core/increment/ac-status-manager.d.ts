/**
 * Represents the completion status of an Acceptance Criteria
 */
export interface ACCompletionStatus {
    acId: string;
    totalTasks: number;
    completedTasks: number;
    percentage: number;
    isComplete: boolean;
    tasks: string[];
}
/**
 * Represents an Acceptance Criteria definition in spec.md
 */
export interface ACDefinition {
    acId: string;
    description: string;
    checked: boolean;
    lineNumber: number;
    fullLine: string;
}
/**
 * Result of syncing AC status
 */
export interface ACSyncResult {
    synced: boolean;
    updated: string[];
    conflicts: string[];
    warnings: string[];
    changes: string[];
}
/**
 * Validation result for AC-task mapping
 */
export interface ValidationResult {
    valid: boolean;
    orphanedACs: string[];
    invalidReferences: string[];
    errors: string[];
}
/**
 * AC sync event for metadata logging
 */
export interface ACSyncEvent {
    timestamp: string;
    updated: string[];
    conflicts: string[];
    warnings: string[];
    changesCount: number;
}
/**
 * AC completion summary
 */
export interface ACCompletionSummary {
    totalACs: number;
    completeACs: number;
    incompleteACs: number;
    percentage: number;
    acStatuses: Map<string, ACCompletionStatus>;
}
/**
 * ACStatusManager: Automatically sync spec.md AC checkboxes with tasks.md completion status
 */
export declare class ACStatusManager {
    private rootPath;
    constructor(rootPath: string);
    /**
     * Parse tasks.md and extract AC completion status
     *
     * @param tasksContent - Content of tasks.md file
     * @returns Map of AC-ID to ACCompletionStatus
     */
    parseTasksForACStatus(tasksContent: string): Map<string, ACCompletionStatus>;
    /**
     * Helper method to add a task to the AC map
     */
    private addTaskToACMap;
    /**
     * Parse spec.md and extract AC checkboxes
     *
     * @param specContent - Content of spec.md file
     * @returns Map of AC-ID to ACDefinition
     */
    parseSpecForACs(specContent: string): Map<string, ACDefinition>;
    /**
     * Sync AC status from tasks.md to spec.md
     *
     * @param incrementId - Increment ID (e.g., "0039")
     * @returns Result of sync operation
     */
    syncACStatus(incrementId: string): Promise<ACSyncResult>;
    /**
     * Log AC sync event to metadata.json
     * Keeps last 20 events for audit trail
     *
     * @param incrementId - Increment ID
     * @param result - Sync result to log
     */
    private logSyncEvent;
    /**
     * Validate AC-task mapping
     *
     * @param incrementId - Increment ID
     * @returns Validation result
     */
    validateACMapping(incrementId: string): ValidationResult;
    /**
     * Get AC completion summary
     *
     * @param incrementId - Increment ID
     * @returns Summary of AC completion status
     */
    getACCompletionSummary(incrementId: string): ACCompletionSummary;
}
//# sourceMappingURL=ac-status-manager.d.ts.map
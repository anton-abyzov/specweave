/**
 * Prepare Reflection Context
 *
 * Prepares context for reflection and saves to temp file
 * Used by post-task-completion hook to prepare for reflection invocation
 *
 * @module prepare-reflection-context
 */
/**
 * Prepare reflection context and save to temp file
 * This allows the hook to prepare data without actually invoking the agent
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional)
 * @returns Path to saved context file or null if reflection should be skipped
 */
export declare function prepareReflectionContext(incrementId: string, taskId: string, projectRoot?: string): string | null;
/**
 * Check if reflection context exists for an increment
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 * @returns True if context file exists
 */
export declare function hasReflectionContext(incrementId: string, projectRoot?: string): boolean;
/**
 * Read reflection context from file
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 * @returns Context data or null if not found
 */
export declare function readReflectionContext(incrementId: string, projectRoot?: string): any | null;
/**
 * Clear reflection context after reflection completes
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 */
export declare function clearReflectionContext(incrementId: string, projectRoot?: string): void;
//# sourceMappingURL=prepare-reflection-context.d.ts.map
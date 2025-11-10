/**
 * Core Reflection Engine
 *
 * Orchestrates the self-reflection process:
 * 1. Load configuration
 * 2. Get modified files
 * 3. Build prompt
 * 4. Invoke reflective-reviewer agent
 * 5. Parse response
 * 6. Store reflection
 *
 * @module run-self-reflection
 */
import { ReflectionContext, ReflectionExecutionResult } from './types/reflection-types';
/**
 * Run self-reflection analysis
 * Main entry point for the reflection system
 *
 * @param context Reflection context with increment, task, and files
 * @returns Reflection execution result (success or error)
 */
export declare function runSelfReflection(context: ReflectionContext): Promise<ReflectionExecutionResult>;
/**
 * Create reflection context from hook environment
 * Helper function for hook integration
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional, auto-detected)
 * @returns Reflection context ready for runSelfReflection
 */
export declare function createReflectionContext(incrementId: string, taskId: string, projectRoot?: string): ReflectionContext;
/**
 * Run reflection with automatic context creation
 * Convenience function for hook integration
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional)
 * @returns Reflection execution result
 */
export declare function runReflectionAuto(incrementId: string, taskId: string, projectRoot?: string): Promise<ReflectionExecutionResult>;
//# sourceMappingURL=run-self-reflection.d.ts.map
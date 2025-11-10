/**
 * Reflection Prompt Builder
 *
 * Builds comprehensive prompts for the reflective-reviewer agent
 * Includes modified files context, configuration, task information
 *
 * @module reflection-prompt-builder
 */
import { ReflectionConfig, GitDiffInfo } from './types/reflection-types';
/**
 * Build the complete reflection prompt
 * Main function for creating agent prompts
 *
 * @param options Prompt options
 * @returns Complete markdown-formatted prompt for reflective-reviewer agent
 */
export declare function buildReflectionPrompt(options: {
    taskId: string;
    taskName?: string;
    modifiedFiles: GitDiffInfo[];
    config: ReflectionConfig;
    incrementId?: string;
    includeFullDiff?: boolean;
}): string;
/**
 * Estimate token count for prompt (rough approximation)
 * Used for cost estimation
 *
 * @param prompt Reflection prompt
 * @returns Estimated token count (1 token ≈ 4 characters)
 */
export declare function estimatePromptTokens(prompt: string): number;
/**
 * Truncate large diffs to fit within token budget
 * Preserves most recent changes (bottom of diff)
 *
 * @param modifiedFiles Array of modified files
 * @param maxTokens Maximum tokens to use (default: 8000)
 * @returns Truncated array of modified files
 */
export declare function truncateModifiedFiles(modifiedFiles: GitDiffInfo[], maxTokens?: number): GitDiffInfo[];
/**
 * Build a simplified prompt for very large changes
 * Used when full diff exceeds reasonable token budget
 *
 * @param options Prompt options (same as buildReflectionPrompt)
 * @returns Simplified prompt with file list only (no diffs)
 */
export declare function buildSimplifiedPrompt(options: {
    taskId: string;
    taskName?: string;
    modifiedFiles: GitDiffInfo[];
    config: ReflectionConfig;
    incrementId?: string;
}): string;
//# sourceMappingURL=reflection-prompt-builder.d.ts.map
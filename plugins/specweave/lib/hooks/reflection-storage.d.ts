/**
 * Reflection Storage Manager
 *
 * Writes reflection results to markdown files in increment logs
 * Stores reflections in .specweave/increments/{id}/logs/reflections/
 *
 * @module reflection-storage
 */
import { ReflectionResult } from './types/reflection-types';
/**
 * Generate markdown content from reflection result
 * Follows the exact format specified in reflective-reviewer agent
 *
 * @param result Reflection result object
 * @returns Markdown-formatted reflection content
 */
export declare function generateReflectionMarkdown(result: ReflectionResult): string;
/**
 * Get reflection log directory for an increment
 * @param incrementId Increment identifier (e.g., "0016-self-reflection-system")
 * @param projectRoot Project root directory (optional, auto-detected if not provided)
 * @returns Path to reflection logs directory
 */
export declare function getReflectionLogDir(incrementId: string, projectRoot?: string): string;
/**
 * Generate filename for reflection log
 * @param taskId Task identifier (e.g., "T-005")
 * @param timestamp Optional timestamp (defaults to current date)
 * @returns Filename (e.g., "task-T-005-reflection-2025-11-10.md")
 */
export declare function getReflectionFilename(taskId: string, timestamp?: Date): string;
/**
 * Save reflection result to markdown file
 * Creates directory structure if it doesn't exist
 *
 * @param result Reflection result to save
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional)
 * @returns Path to saved reflection file
 * @throws Error if file cannot be written
 */
export declare function saveReflection(result: ReflectionResult, incrementId: string, taskId: string, projectRoot?: string): string;
/**
 * List all reflection files for an increment
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 * @returns Array of reflection file paths (sorted by date, newest first)
 */
export declare function listReflections(incrementId: string, projectRoot?: string): string[];
/**
 * Read reflection from file
 * @param filepath Path to reflection markdown file
 * @returns Markdown content as string
 * @throws Error if file cannot be read
 */
export declare function readReflection(filepath: string): string;
/**
 * Delete reflection file
 * @param filepath Path to reflection markdown file
 * @throws Error if file cannot be deleted
 */
export declare function deleteReflection(filepath: string): void;
//# sourceMappingURL=reflection-storage.d.ts.map
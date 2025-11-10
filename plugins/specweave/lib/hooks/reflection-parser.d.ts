/**
 * Reflection Parser
 *
 * Parses markdown output from reflective-reviewer agent
 * Extracts structured data (issues, metrics, lessons learned, etc.)
 *
 * @module reflection-parser
 */
import { ReflectionResult, ReflectionModel } from './types/reflection-types';
/**
 * Parse complete reflection result from markdown
 * Main parsing function
 *
 * @param markdown Reflection markdown from reflective-reviewer agent
 * @param taskName Task name for result
 * @param model Model used for reflection
 * @param reflectionTime Time taken in seconds
 * @param estimatedCost Estimated cost in USD
 * @returns Complete ReflectionResult object
 */
export declare function parseReflectionMarkdown(markdown: string, taskName: string, model?: ReflectionModel, reflectionTime?: number, estimatedCost?: number): ReflectionResult;
/**
 * Validate parsed reflection result
 * Checks for required fields and data quality
 *
 * @param result Parsed reflection result
 * @returns Validation result with errors
 */
export declare function validateReflectionResult(result: ReflectionResult): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=reflection-parser.d.ts.map
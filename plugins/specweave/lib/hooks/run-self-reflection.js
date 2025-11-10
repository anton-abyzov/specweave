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
import { loadAndValidateReflectionConfig } from './reflection-config-loader';
import { getModifiedFiles, getModifiedFilesSummary } from './git-diff-analyzer';
import { buildReflectionPrompt, estimatePromptTokens } from './reflection-prompt-builder';
import { parseReflectionMarkdown, validateReflectionResult } from './reflection-parser';
import { saveReflection } from './reflection-storage';
import { ReflectionMode, ReflectionModel } from './types/reflection-types';
/**
 * Check if reflection should run for the current context
 *
 * @param context Reflection context with config and modified files
 * @returns True if reflection should run
 */
function shouldRunReflection(context) {
    const { config, modifiedFiles } = context;
    // Check if reflection is enabled
    if (!config.enabled) {
        return false;
    }
    // Check mode
    if (config.mode === ReflectionMode.DISABLED) {
        return false;
    }
    if (config.mode === ReflectionMode.MANUAL) {
        // Manual mode requires explicit invocation
        // This function is only called in auto mode, so skip
        return false;
    }
    // Check if there are modified files to analyze
    if (modifiedFiles.length === 0) {
        return false;
    }
    return true;
}
/**
 * Estimate reflection cost based on model and prompt size
 *
 * @param model Reflection model (haiku, sonnet, opus)
 * @param promptTokens Estimated prompt token count
 * @param responseTokens Estimated response token count (default: 2000)
 * @returns Estimated cost in USD
 */
function estimateReflectionCost(model, promptTokens, responseTokens = 2000) {
    // Pricing per 1M tokens (as of Nov 2025)
    const pricing = {
        [ReflectionModel.HAIKU]: { input: 0.80, output: 4.00 },
        [ReflectionModel.SONNET]: { input: 3.00, output: 15.00 },
        [ReflectionModel.OPUS]: { input: 15.00, output: 75.00 }
    };
    const modelPricing = pricing[model];
    const inputCost = (promptTokens / 1000000) * modelPricing.input;
    const outputCost = (responseTokens / 1000000) * modelPricing.output;
    return inputCost + outputCost;
}
/**
 * Invoke reflective-reviewer agent to analyze code
 *
 * @param prompt Reflection prompt
 * @param model Model to use (haiku, sonnet, opus)
 * @returns Agent response (markdown reflection)
 */
async function invokeReflectiveReviewerAgent(prompt, model) {
    // NOTE: This is a placeholder for agent invocation
    // In the real implementation, this would use Claude Code's Task tool
    // to invoke the specweave:reflective-reviewer:reflective-reviewer agent
    //
    // For now, we'll return a mock response to enable testing
    // The actual implementation will be in the hook integration (T-008)
    throw new Error('Agent invocation not implemented yet. ' +
        'This function will be implemented in hook integration (T-008). ' +
        'Call this from the post-task-completion hook using the Task tool.');
}
/**
 * Run self-reflection analysis
 * Main entry point for the reflection system
 *
 * @param context Reflection context with increment, task, and files
 * @returns Reflection execution result (success or error)
 */
export async function runSelfReflection(context) {
    const { incrementId, taskId, modifiedFiles, config } = context;
    const startTime = Date.now();
    try {
        // Step 1: Check if reflection should run
        if (!shouldRunReflection(context)) {
            return {
                success: true,
                result: undefined,
                error: undefined
            };
        }
        // Step 2: Build reflection prompt
        const prompt = buildReflectionPrompt({
            taskId,
            taskName: `Task ${taskId}`, // Will be enhanced with actual task name in hook
            modifiedFiles,
            config,
            incrementId,
            includeFullDiff: false // Use simplified prompt for token efficiency
        });
        // Step 3: Estimate cost
        const promptTokens = estimatePromptTokens(prompt);
        const estimatedCost = estimateReflectionCost(config.model, promptTokens);
        // Step 4: Invoke reflective-reviewer agent
        const agentResponse = await invokeReflectiveReviewerAgent(prompt, config.model);
        // Step 5: Parse response
        const endTime = Date.now();
        const reflectionTime = Math.round((endTime - startTime) / 1000); // seconds
        const reflectionResult = parseReflectionMarkdown(agentResponse, `Task ${taskId}`, config.model, reflectionTime, estimatedCost);
        // Step 6: Add file modification stats
        const fileStats = getModifiedFilesSummary(modifiedFiles);
        reflectionResult.filesModified = {
            count: fileStats.count,
            linesAdded: fileStats.linesAdded,
            linesRemoved: fileStats.linesRemoved
        };
        // Step 7: Validate reflection result
        const validation = validateReflectionResult(reflectionResult);
        if (!validation.valid) {
            return {
                success: false,
                error: {
                    message: 'Reflection validation failed',
                    code: 'VALIDATION_ERROR',
                    details: validation.errors
                }
            };
        }
        // Step 8: Store reflection (if enabled)
        if (config.storeReflections) {
            try {
                saveReflection(reflectionResult, incrementId, taskId);
            }
            catch (storageError) {
                // Storage failure shouldn't fail the entire reflection
                console.warn(`Failed to store reflection: ${storageError.message}`);
            }
        }
        // Step 9: Return success
        return {
            success: true,
            result: reflectionResult
        };
    }
    catch (error) {
        // Graceful degradation: Return error but don't throw
        return {
            success: false,
            error: {
                message: error.message || 'Unknown error during reflection',
                code: 'REFLECTION_ERROR',
                details: error.stack
            }
        };
    }
}
/**
 * Create reflection context from hook environment
 * Helper function for hook integration
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional, auto-detected)
 * @returns Reflection context ready for runSelfReflection
 */
export function createReflectionContext(incrementId, taskId, projectRoot) {
    // Load and validate configuration
    const config = loadAndValidateReflectionConfig(projectRoot);
    // Get modified files from git
    const modifiedFiles = getModifiedFiles(projectRoot);
    return {
        incrementId,
        taskId,
        modifiedFiles,
        config
    };
}
/**
 * Run reflection with automatic context creation
 * Convenience function for hook integration
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional)
 * @returns Reflection execution result
 */
export async function runReflectionAuto(incrementId, taskId, projectRoot) {
    const context = createReflectionContext(incrementId, taskId, projectRoot);
    return runSelfReflection(context);
}
//# sourceMappingURL=run-self-reflection.js.map
import { loadAndValidateReflectionConfig } from "./reflection-config-loader";
import { getModifiedFiles, getModifiedFilesSummary } from "./git-diff-analyzer";
import { buildReflectionPrompt, estimatePromptTokens } from "./reflection-prompt-builder";
import { parseReflectionMarkdown, validateReflectionResult } from "./reflection-parser";
import { saveReflection } from "./reflection-storage";
import {
  ReflectionMode,
  ReflectionModel
} from "./types/reflection-types";
function shouldRunReflection(context) {
  const { config, modifiedFiles } = context;
  if (!config.enabled) {
    return false;
  }
  if (config.mode === ReflectionMode.DISABLED) {
    return false;
  }
  if (config.mode === ReflectionMode.MANUAL) {
    return false;
  }
  if (modifiedFiles.length === 0) {
    return false;
  }
  return true;
}
function estimateReflectionCost(model, promptTokens, responseTokens = 2e3) {
  const pricing = {
    [ReflectionModel.HAIKU]: { input: 0.8, output: 4 },
    [ReflectionModel.SONNET]: { input: 3, output: 15 },
    [ReflectionModel.OPUS]: { input: 15, output: 75 }
  };
  const modelPricing = pricing[model];
  const inputCost = promptTokens / 1e6 * modelPricing.input;
  const outputCost = responseTokens / 1e6 * modelPricing.output;
  return inputCost + outputCost;
}
async function invokeReflectiveReviewerAgent(prompt, model) {
  throw new Error(
    "Agent invocation not implemented yet. This function will be implemented in hook integration (T-008). Call this from the post-task-completion hook using the Task tool."
  );
}
async function runSelfReflection(context) {
  const { incrementId, taskId, modifiedFiles, config } = context;
  const startTime = Date.now();
  try {
    if (!shouldRunReflection(context)) {
      return {
        success: true,
        result: void 0,
        error: void 0
      };
    }
    const prompt = buildReflectionPrompt({
      taskId,
      taskName: `Task ${taskId}`,
      // Will be enhanced with actual task name in hook
      modifiedFiles,
      config,
      incrementId,
      includeFullDiff: false
      // Use simplified prompt for token efficiency
    });
    const promptTokens = estimatePromptTokens(prompt);
    const estimatedCost = estimateReflectionCost(config.model, promptTokens);
    const agentResponse = await invokeReflectiveReviewerAgent(prompt, config.model);
    const endTime = Date.now();
    const reflectionTime = Math.round((endTime - startTime) / 1e3);
    const reflectionResult = parseReflectionMarkdown(
      agentResponse,
      `Task ${taskId}`,
      config.model,
      reflectionTime,
      estimatedCost
    );
    const fileStats = getModifiedFilesSummary(modifiedFiles);
    reflectionResult.filesModified = {
      count: fileStats.count,
      linesAdded: fileStats.linesAdded,
      linesRemoved: fileStats.linesRemoved
    };
    const validation = validateReflectionResult(reflectionResult);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          message: "Reflection validation failed",
          code: "VALIDATION_ERROR",
          details: validation.errors
        }
      };
    }
    if (config.storeReflections) {
      try {
        saveReflection(reflectionResult, incrementId, taskId);
      } catch (storageError) {
        console.warn(`Failed to store reflection: ${storageError.message}`);
      }
    }
    return {
      success: true,
      result: reflectionResult
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message || "Unknown error during reflection",
        code: "REFLECTION_ERROR",
        details: error.stack
      }
    };
  }
}
function createReflectionContext(incrementId, taskId, projectRoot) {
  const config = loadAndValidateReflectionConfig(projectRoot);
  const modifiedFiles = getModifiedFiles(projectRoot);
  return {
    incrementId,
    taskId,
    modifiedFiles,
    config
  };
}
async function runReflectionAuto(incrementId, taskId, projectRoot) {
  const context = createReflectionContext(incrementId, taskId, projectRoot);
  return runSelfReflection(context);
}
export {
  createReflectionContext,
  runReflectionAuto,
  runSelfReflection
};

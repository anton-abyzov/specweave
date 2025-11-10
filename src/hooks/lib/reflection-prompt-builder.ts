/**
 * Reflection Prompt Builder
 *
 * Builds comprehensive prompts for the reflective-reviewer agent
 * Includes modified files context, configuration, task information
 *
 * @module reflection-prompt-builder
 */

import { ReflectionConfig, ReflectionDepth, GitDiffInfo } from './types/reflection-types';

/**
 * Build analysis instructions based on configuration
 * @param config Reflection configuration
 * @returns Markdown-formatted analysis instructions
 */
function buildAnalysisInstructions(config: ReflectionConfig): string {
  const { depth, categories } = config;

  const instructions: string[] = [];

  // Depth-specific instructions
  switch (depth) {
    case ReflectionDepth.QUICK:
      instructions.push('**Analysis Mode**: QUICK (<15s)');
      instructions.push('- Focus on CRITICAL and HIGH severity issues only');
      instructions.push('- Skip lessons learned section');
      instructions.push('- Provide concise feedback (1-2 sentences per issue)');
      break;

    case ReflectionDepth.STANDARD:
      instructions.push('**Analysis Mode**: STANDARD (<30s)');
      instructions.push('- Full analysis across all enabled categories');
      instructions.push('- Include lessons learned');
      instructions.push('- Provide actionable feedback with code examples');
      break;

    case ReflectionDepth.DEEP:
      instructions.push('**Analysis Mode**: DEEP (<60s)');
      instructions.push('- Comprehensive analysis with detailed explanations');
      instructions.push('- Include architectural recommendations');
      instructions.push('- Suggest refactoring opportunities');
      instructions.push('- Analyze code metrics (complexity, coupling, cohesion)');
      break;
  }

  instructions.push('');
  instructions.push('**Enabled Analysis Categories**:');

  // Category-specific instructions
  if (categories.security) {
    instructions.push('- ✅ **Security**: OWASP Top 10 vulnerabilities (SQL injection, XSS, secrets, etc.)');
  }
  if (categories.quality) {
    instructions.push('- ✅ **Quality**: Code duplication, complexity, error handling, naming conventions');
  }
  if (categories.testing) {
    instructions.push('- ✅ **Testing**: Edge cases, error paths, integration/E2E coverage');
  }
  if (categories.performance) {
    instructions.push('- ✅ **Performance**: N+1 queries, algorithmic complexity, caching opportunities');
  }
  if (categories.technicalDebt) {
    instructions.push('- ✅ **Technical Debt**: TODOs, deprecated APIs, temporary hacks');
  }

  return instructions.join('\n');
}

/**
 * Build file context section with modified files
 * @param modifiedFiles Array of modified files
 * @param includeFullDiff Whether to include full diff content (default: false for large changes)
 * @returns Markdown-formatted file context
 */
function buildFileContext(
  modifiedFiles: GitDiffInfo[],
  includeFullDiff: boolean = false
): string {
  const context: string[] = [];

  context.push('## Modified Files Context');
  context.push('');
  context.push(`**Files Changed**: ${modifiedFiles.length}`);

  const totalAdded = modifiedFiles.reduce((sum, f) => sum + f.linesAdded, 0);
  const totalRemoved = modifiedFiles.reduce((sum, f) => sum + f.linesRemoved, 0);

  context.push(`**Lines Added**: +${totalAdded}`);
  context.push(`**Lines Removed**: -${totalRemoved}`);
  context.push('');

  // List all modified files with stats
  context.push('### File Summary');
  context.push('');
  for (const file of modifiedFiles) {
    context.push(`- \`${file.file}\`: +${file.linesAdded} -${file.linesRemoved}`);
  }
  context.push('');

  // Include diff content if requested and not too large
  if (includeFullDiff) {
    context.push('### Detailed Changes');
    context.push('');

    for (const file of modifiedFiles) {
      context.push(`#### ${file.file}`);
      context.push('');
      context.push('```diff');
      // Truncate very large diffs (max 100 lines per file)
      const diffLines = file.content.split('\n').slice(0, 100);
      context.push(diffLines.join('\n'));
      if (file.content.split('\n').length > 100) {
        context.push('... (diff truncated)');
      }
      context.push('```');
      context.push('');
    }
  }

  return context.join('\n');
}

/**
 * Build task information section
 * @param taskId Task identifier (e.g., "T-005")
 * @param taskName Human-readable task name
 * @returns Markdown-formatted task context
 */
function buildTaskContext(taskId: string, taskName?: string): string {
  const context: string[] = [];

  context.push('## Task Information');
  context.push('');
  context.push(`**Task ID**: ${taskId}`);

  if (taskName) {
    context.push(`**Task Name**: ${taskName}`);
  }

  context.push('');

  return context.join('\n');
}

/**
 * Build the complete reflection prompt
 * Main function for creating agent prompts
 *
 * @param options Prompt options
 * @returns Complete markdown-formatted prompt for reflective-reviewer agent
 */
export function buildReflectionPrompt(options: {
  taskId: string;
  taskName?: string;
  modifiedFiles: GitDiffInfo[];
  config: ReflectionConfig;
  incrementId?: string;
  includeFullDiff?: boolean;
}): string {
  const {
    taskId,
    taskName,
    modifiedFiles,
    config,
    incrementId,
    includeFullDiff = false
  } = options;

  const sections: string[] = [];

  // Header
  sections.push('# Self-Reflection Request');
  sections.push('');
  sections.push('You are a senior software engineer performing self-reflection on recently completed work.');
  sections.push('Analyze the following code changes and provide comprehensive, actionable feedback.');
  sections.push('');

  // Task context
  sections.push(buildTaskContext(taskId, taskName));

  // Increment context (if provided)
  if (incrementId) {
    sections.push(`**Increment**: ${incrementId}`);
    sections.push('');
  }

  // Analysis instructions
  sections.push('---');
  sections.push('');
  sections.push(buildAnalysisInstructions(config));
  sections.push('');

  // File context
  sections.push('---');
  sections.push('');
  sections.push(buildFileContext(modifiedFiles, includeFullDiff));

  // Analysis request
  sections.push('---');
  sections.push('');
  sections.push('## Analysis Request');
  sections.push('');
  sections.push('Please analyze the modified files and provide a comprehensive self-reflection following the exact format specified in the reflective-reviewer agent documentation.');
  sections.push('');
  sections.push('**Required Sections**:');
  sections.push('1. ✅ What Was Accomplished');
  sections.push('2. 🎯 Quality Assessment (Strengths + Issues)');
  sections.push('3. 🔧 Recommended Follow-Up Actions (Priority 1/2/3)');

  if (config.depth !== ReflectionDepth.QUICK) {
    sections.push('4. 📚 Lessons Learned');
    sections.push('5. 📊 Metrics (Code Quality, Security, Test Coverage, Technical Debt, Performance)');
  }

  sections.push('');
  sections.push('**Critical Requirements**:');
  sections.push('- ✅ Be SPECIFIC: Always include file paths and line numbers');
  sections.push('- ✅ Be CONSTRUCTIVE: Provide code examples for fixes, not just criticism');
  sections.push('- ✅ Be ACTIONABLE: Every issue should have a clear next step');
  sections.push('- ✅ Be BALANCED: Mention both strengths and issues');
  sections.push('- ✅ Be HONEST: Don\'t sugarcoat issues, but acknowledge strengths');

  sections.push('');
  sections.push(`**Severity Threshold**: Flag issues with severity >= ${config.criticalThreshold}`);

  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('**Please provide your self-reflection analysis now.**');

  return sections.join('\n');
}

/**
 * Estimate token count for prompt (rough approximation)
 * Used for cost estimation
 *
 * @param prompt Reflection prompt
 * @returns Estimated token count (1 token ≈ 4 characters)
 */
export function estimatePromptTokens(prompt: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(prompt.length / 4);
}

/**
 * Truncate large diffs to fit within token budget
 * Preserves most recent changes (bottom of diff)
 *
 * @param modifiedFiles Array of modified files
 * @param maxTokens Maximum tokens to use (default: 8000)
 * @returns Truncated array of modified files
 */
export function truncateModifiedFiles(
  modifiedFiles: GitDiffInfo[],
  maxTokens: number = 8000
): GitDiffInfo[] {
  const maxChars = maxTokens * 4; // Approximate token-to-char ratio
  let currentChars = 0;
  const truncated: GitDiffInfo[] = [];

  for (const file of modifiedFiles) {
    const fileChars = file.content.length + file.file.length + 50; // File metadata

    if (currentChars + fileChars > maxChars) {
      // Truncate this file's diff
      const remainingChars = maxChars - currentChars;
      if (remainingChars > 200) {
        // Only include if we can show at least 200 chars
        const truncatedContent = file.content.slice(0, remainingChars - 50) + '\n... (diff truncated)';
        truncated.push({
          ...file,
          content: truncatedContent
        });
      }
      break;
    }

    truncated.push(file);
    currentChars += fileChars;
  }

  return truncated;
}

/**
 * Build a simplified prompt for very large changes
 * Used when full diff exceeds reasonable token budget
 *
 * @param options Prompt options (same as buildReflectionPrompt)
 * @returns Simplified prompt with file list only (no diffs)
 */
export function buildSimplifiedPrompt(options: {
  taskId: string;
  taskName?: string;
  modifiedFiles: GitDiffInfo[];
  config: ReflectionConfig;
  incrementId?: string;
}): string {
  // Build prompt without full diff content
  return buildReflectionPrompt({
    ...options,
    includeFullDiff: false
  });
}

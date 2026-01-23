/**
 * Auto Mode Completion Evaluator
 *
 * Evaluates whether auto mode success criteria are met using LLM-based
 * semantic understanding. Reuses the Claude CLI spawn pattern from
 * llm-plugin-detector.ts.
 *
 * Model Selection:
 * - No LLM: tasks_complete, acs_satisfied (grep-based)
 * - Haiku: tests_pass, build_succeeds (binary checks)
 * - Opus: llm_evaluate, custom criteria (semantic understanding with ultrathink)
 *
 * @module core/auto/completion-evaluator
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';
import type {
  SuccessCriterion,
  CriterionEvaluationResult,
  CompletionEvaluationResult,
  AutoModeFlag,
} from './types.js';

/**
 * Context for LLM evaluation
 */
export interface EvaluationContext {
  incrementId: string;
  tasksContent?: string;
  specContent?: string;
  testOutput?: string;
  userGoal?: string;
}

/**
 * Options for completion evaluation
 */
export interface EvaluationOptions {
  verbose?: boolean;
  timeout?: number; // ms, default 45000
  model?: 'haiku' | 'sonnet' | 'opus'; // default: opus
  skipLLM?: boolean; // Skip LLM evaluation, use only grep-based
}

// Cache CLI status
let cachedCliStatus: ReturnType<typeof detectClaudeCli> | null = null;

/**
 * Execute Claude CLI with specified model
 */
function executeClaudeCli(
  args: string[],
  timeout: number = 45000
): { success: boolean; stdout: string; stderr: string; exitCode: number } {
  // Get cached CLI status or detect
  if (!cachedCliStatus) {
    cachedCliStatus = detectClaudeCli();
  }

  if (!cachedCliStatus.available) {
    return {
      success: false,
      stdout: '',
      stderr: cachedCliStatus.errorMessage || 'Claude CLI not available',
      exitCode: 1,
    };
  }

  const cleanEnv = getCleanEnv();

  // Prefer direct binary if available
  if (cachedCliStatus.commandPath && !cachedCliStatus.shellWorkaround) {
    const result = spawnSync(cachedCliStatus.commandPath, args, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      env: { ...cleanEnv, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
    });

    return {
      success: result.status === 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status ?? 1,
    };
  }

  // Fallback to shell
  const result = spawnSync('claude', args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    shell: true,
    env: { ...cleanEnv, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
  });

  return {
    success: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status ?? 1,
  };
}

/**
 * Count pending tasks in tasks.md
 */
function countPendingTasks(tasksContent: string): number {
  const pendingPattern = /\*\*Status\*\*:\s*\[\s*\]\s*pending/gi;
  const matches = tasksContent.match(pendingPattern);
  return matches ? matches.length : 0;
}

/**
 * Count open ACs in spec.md
 */
function countOpenACs(specContent: string): number {
  const openACPattern = /^-\s*\[\s*\]\s*\*\*AC-/gm;
  const matches = specContent.match(openACPattern);
  return matches ? matches.length : 0;
}

/**
 * Run a command and return whether it succeeded
 */
function runCommand(command: string, projectPath: string): { success: boolean; output: string } {
  try {
    const cleanEnv = getCleanEnv();
    const result = spawnSync(command, [], {
      encoding: 'utf8',
      timeout: 120000, // 2 min timeout for tests
      shell: true,
      cwd: projectPath,
      env: cleanEnv,
    });

    return {
      success: result.status === 0,
      output: (result.stdout || '') + (result.stderr || ''),
    };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Evaluate tasks_complete criterion (no LLM needed)
 */
function evaluateTasksComplete(context: EvaluationContext): CriterionEvaluationResult {
  const criterion: SuccessCriterion = {
    type: 'tasks_complete',
    description: 'All tasks marked [x] complete',
    required: true,
  };

  if (!context.tasksContent) {
    return {
      criterion,
      satisfied: false,
      reason: 'No tasks.md content available',
    };
  }

  const pending = countPendingTasks(context.tasksContent);

  return {
    criterion,
    satisfied: pending === 0,
    reason: pending === 0 ? 'All tasks complete' : `${pending} task(s) still pending`,
  };
}

/**
 * Evaluate acs_satisfied criterion (no LLM needed)
 */
function evaluateACsSatisfied(context: EvaluationContext): CriterionEvaluationResult {
  const criterion: SuccessCriterion = {
    type: 'acs_satisfied',
    description: 'All acceptance criteria satisfied',
    required: true,
  };

  if (!context.specContent) {
    return {
      criterion,
      satisfied: false,
      reason: 'No spec.md content available',
    };
  }

  const openACs = countOpenACs(context.specContent);

  return {
    criterion,
    satisfied: openACs === 0,
    reason: openACs === 0 ? 'All ACs satisfied' : `${openACs} AC(s) still open`,
  };
}

/**
 * Evaluate tests_pass criterion
 */
function evaluateTestsPass(
  criterion: SuccessCriterion,
  projectPath: string
): CriterionEvaluationResult {
  const command = criterion.command || 'npm test';
  const startTime = performance.now();

  const result = runCommand(command, projectPath);

  return {
    criterion,
    satisfied: result.success,
    reason: result.success ? 'Tests passed' : `Tests failed: ${result.output.slice(0, 200)}`,
    durationMs: performance.now() - startTime,
  };
}

/**
 * Evaluate build_succeeds criterion
 */
function evaluateBuildSucceeds(
  criterion: SuccessCriterion,
  projectPath: string
): CriterionEvaluationResult {
  const command = criterion.command || 'npm run build';
  const startTime = performance.now();

  const result = runCommand(command, projectPath);

  return {
    criterion,
    satisfied: result.success,
    reason: result.success ? 'Build succeeded' : `Build failed: ${result.output.slice(0, 200)}`,
    durationMs: performance.now() - startTime,
  };
}

/**
 * Build the system prompt for LLM evaluation
 */
function buildEvaluationPrompt(
  context: EvaluationContext,
  criterion: SuccessCriterion
): string {
  return `You are evaluating whether an auto mode session's success criterion is met.

CRITERION TO EVALUATE:
"${criterion.description}"

USER'S ORIGINAL GOAL:
"${context.userGoal || 'Complete all tasks and acceptance criteria'}"

CURRENT STATE:

## Tasks (tasks.md):
${context.tasksContent?.slice(0, 3000) || 'Not available'}

## Spec (spec.md):
${context.specContent?.slice(0, 3000) || 'Not available'}

${context.testOutput ? `## Test Output:\n${context.testOutput.slice(0, 1000)}` : ''}

INSTRUCTIONS:
1. Analyze if the criterion "${criterion.description}" is satisfied based on the current state
2. Be strict - only return satisfied=true if there is clear evidence
3. If uncertain, return satisfied=false with reason explaining what's missing

Return ONLY valid JSON (no markdown, no explanation):
{"satisfied": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}`;
}

/**
 * Evaluate a criterion using LLM (for llm_evaluate and custom_command types)
 */
async function evaluateViaLLM(
  criterion: SuccessCriterion,
  context: EvaluationContext,
  model: 'haiku' | 'sonnet' | 'opus' = 'opus',
  timeout: number = 45000
): Promise<CriterionEvaluationResult> {
  const startTime = performance.now();
  const prompt = buildEvaluationPrompt(context, criterion);

  const result = executeClaudeCli(['-p', prompt, '--model', model], timeout);

  if (!result.success) {
    logger.warn(`LLM evaluation failed: ${result.stderr}`);
    return {
      criterion,
      satisfied: false,
      reason: `LLM evaluation failed: ${result.stderr.slice(0, 100)}`,
      durationMs: performance.now() - startTime,
    };
  }

  // Parse JSON from response
  try {
    const output = result.stdout.trim();

    // Extract JSON from potential markdown code blocks
    let jsonStr = output;
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      criterion,
      satisfied: parsed.satisfied === true,
      reason: parsed.reason || 'No reason provided',
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    logger.debug(`Failed to parse LLM response: ${error}`);
    return {
      criterion,
      satisfied: false,
      reason: `Failed to parse LLM response: ${result.stdout.slice(0, 100)}`,
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Evaluate a single criterion
 */
async function evaluateCriterion(
  criterion: SuccessCriterion,
  context: EvaluationContext,
  projectPath: string,
  options: EvaluationOptions
): Promise<CriterionEvaluationResult> {
  switch (criterion.type) {
    case 'tasks_complete':
      return evaluateTasksComplete(context);

    case 'acs_satisfied':
      return evaluateACsSatisfied(context);

    case 'tests_pass':
      return evaluateTestsPass(criterion, projectPath);

    case 'build_succeeds':
      return evaluateBuildSucceeds(criterion, projectPath);

    case 'llm_evaluate':
    case 'custom_command':
      if (options.skipLLM) {
        return {
          criterion,
          satisfied: false,
          reason: 'LLM evaluation skipped',
        };
      }
      return evaluateViaLLM(
        criterion,
        context,
        criterion.model || options.model || 'opus',
        options.timeout || 45000
      );

    default:
      return {
        criterion,
        satisfied: false,
        reason: `Unknown criterion type: ${criterion.type}`,
      };
  }
}

/**
 * Load auto-mode.json and get success criteria
 */
export function loadSuccessCriteria(projectPath: string): SuccessCriterion[] | null {
  const autoModeFile = path.join(projectPath, '.specweave/state/auto-mode.json');

  if (!fs.existsSync(autoModeFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(autoModeFile, 'utf-8');
    const autoMode: AutoModeFlag = JSON.parse(content);

    return autoMode.successCriteria || null;
  } catch {
    return null;
  }
}

/**
 * Main evaluation function
 *
 * Evaluates all success criteria for an increment and returns
 * a comprehensive result indicating whether auto mode should complete.
 */
export async function evaluateCompletion(
  projectPath: string,
  incrementId: string,
  options: EvaluationOptions = {}
): Promise<CompletionEvaluationResult> {
  const startTime = performance.now();
  const results: CriterionEvaluationResult[] = [];
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  // Load files
  const incrementDir = path.join(projectPath, '.specweave/increments', incrementId);
  const tasksPath = path.join(incrementDir, 'tasks.md');
  const specPath = path.join(incrementDir, 'spec.md');

  const context: EvaluationContext = {
    incrementId,
    tasksContent: fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf-8') : undefined,
    specContent: fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : undefined,
  };

  // Load success criteria
  let criteria = loadSuccessCriteria(projectPath);

  // Default criteria if none specified
  if (!criteria || criteria.length === 0) {
    criteria = [
      { type: 'tasks_complete', description: 'All tasks marked complete', required: true },
      { type: 'acs_satisfied', description: 'All acceptance criteria satisfied', required: true },
    ];
  }

  // Load user goal from auto-mode.json
  const autoModeFile = path.join(projectPath, '.specweave/state/auto-mode.json');
  if (fs.existsSync(autoModeFile)) {
    try {
      const autoMode: AutoModeFlag = JSON.parse(fs.readFileSync(autoModeFile, 'utf-8'));
      context.userGoal = autoMode.userGoal;
    } catch {
      // Ignore
    }
  }

  // Evaluate each criterion
  for (const criterion of criteria) {
    if (options.verbose) {
      logger.info(`Evaluating: ${criterion.description}`);
    }

    const result = await evaluateCriterion(criterion, context, projectPath, options);
    results.push(result);

    if (!result.satisfied && criterion.required) {
      blockers.push(result.reason);
    }
  }

  // Build next steps
  if (blockers.length > 0) {
    const tasksResult = results.find((r) => r.criterion.type === 'tasks_complete');
    const acsResult = results.find((r) => r.criterion.type === 'acs_satisfied');

    if (tasksResult && !tasksResult.satisfied) {
      nextSteps.push('Complete pending tasks with /sw:do');
    }

    if (acsResult && !acsResult.satisfied) {
      nextSteps.push('Satisfy open acceptance criteria');
    }

    if (results.some((r) => r.criterion.type === 'tests_pass' && !r.satisfied)) {
      nextSteps.push('Fix failing tests');
    }

    nextSteps.push(`Then run /sw:done ${incrementId}`);
  }

  // Build overall result
  const complete = blockers.length === 0;
  const overallReason = complete
    ? 'All success criteria met'
    : `Blocked by: ${blockers.join('; ')}`;

  // Calculate average confidence for LLM-evaluated criteria
  const llmResults = results.filter(
    (r) => r.criterion.type === 'llm_evaluate' || r.criterion.type === 'custom_command'
  );
  const confidence = llmResults.length > 0 ? 0.9 : 1.0; // Lower confidence for LLM evaluations

  return {
    complete,
    overallReason,
    confidence,
    results,
    nextSteps,
    durationMs: performance.now() - startTime,
  };
}

/**
 * Extract success criteria from user prompt using LLM
 *
 * Called at auto mode session start to understand user's goal.
 */
export async function extractSuccessCriteria(
  userPrompt: string,
  timeout: number = 30000
): Promise<{
  success: boolean;
  criteria: SuccessCriterion[];
  summary: string;
  confidence: number;
  error?: string;
}> {
  const prompt = `You are extracting success criteria from a user's auto mode command.

USER PROMPT:
"${userPrompt}"

AVAILABLE CRITERION TYPES:
- tasks_complete: All tasks in tasks.md marked [x] complete
- acs_satisfied: All acceptance criteria in spec.md satisfied
- tests_pass: Tests must pass (can specify command)
- build_succeeds: Build must succeed (can specify command)
- llm_evaluate: Custom condition that needs LLM to evaluate (use for complex criteria)

EXAMPLES:
- "run until tests pass" → [tasks_complete, acs_satisfied, tests_pass]
- "complete the auth feature" → [tasks_complete, acs_satisfied]
- "make sure E2E login works" → [tasks_complete, acs_satisfied, {type: llm_evaluate, description: "E2E login flow works"}]

RULES:
1. Always include tasks_complete and acs_satisfied as required
2. Add tests_pass if user mentions "tests", "passing", "green"
3. Add build_succeeds if user mentions "build", "compile"
4. Add llm_evaluate for any semantic/complex conditions

Return ONLY valid JSON:
{
  "criteria": [
    {"type": "tasks_complete", "description": "All tasks complete", "required": true},
    {"type": "acs_satisfied", "description": "All ACs satisfied", "required": true}
  ],
  "summary": "One-line human-readable summary of completion conditions",
  "confidence": 0.9
}`;

  const result = executeClaudeCli(['-p', prompt, '--model', 'haiku'], timeout);

  if (!result.success) {
    return {
      success: false,
      criteria: [],
      summary: '',
      confidence: 0,
      error: result.stderr || 'Claude CLI failed',
    };
  }

  try {
    const output = result.stdout.trim();
    let jsonStr = output;
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      criteria: parsed.criteria || [],
      summary: parsed.summary || 'Complete all tasks and acceptance criteria',
      confidence: parsed.confidence || 0.8,
    };
  } catch (error) {
    return {
      success: false,
      criteria: [],
      summary: '',
      confidence: 0,
      error: `Failed to parse: ${error}`,
    };
  }
}

/**
 * Format evaluation result for display
 */
export function formatEvaluationResult(result: CompletionEvaluationResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('━'.repeat(60));
  lines.push(result.complete ? '✅ AUTO MODE COMPLETION CRITERIA MET' : '⏳ WORK REMAINING');
  lines.push('━'.repeat(60));
  lines.push('');

  for (const r of result.results) {
    const icon = r.satisfied ? '✅' : '❌';
    const duration = r.durationMs ? ` (${Math.round(r.durationMs)}ms)` : '';
    lines.push(`${icon} ${r.criterion.description}${duration}`);
    lines.push(`   ${r.reason}`);
    lines.push('');
  }

  if (result.nextSteps.length > 0) {
    lines.push('📋 NEXT STEPS:');
    for (const step of result.nextSteps) {
      lines.push(`   → ${step}`);
    }
    lines.push('');
  }

  lines.push(`Duration: ${Math.round(result.durationMs)}ms | Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  lines.push('━'.repeat(60));

  return lines.join('\n');
}

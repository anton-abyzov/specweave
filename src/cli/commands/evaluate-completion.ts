/**
 * Evaluate Completion CLI Command
 *
 * Evaluates whether an auto mode session should be considered complete
 * based on success criteria. Uses LLM (Claude Sonnet) for semantic evaluation
 * when configured, falls back to grep-based checks otherwise.
 *
 * This command is called by the stop-auto.sh hook when requireLLMEval is enabled.
 *
 * Usage:
 *   specweave evaluate-completion <incrementId>              # Evaluate completion
 *   specweave evaluate-completion <incrementId> --model haiku # Use faster model
 *   specweave evaluate-completion <incrementId> --timeout 60000  # Custom timeout
 *   specweave evaluate-completion <incrementId> --json       # JSON output (default)
 *
 * @module cli/commands/evaluate-completion
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';
import type {
  SuccessCriterion,
  CriterionEvaluationResult,
  CompletionEvaluationResult,
} from '../../core/auto/types.js';
import { DEFAULT_SUCCESS_CRITERIA } from '../../core/auto/types.js';

export interface EvaluateCompletionOptions {
  /** Model to use for LLM evaluation (default: sonnet) */
  model?: 'haiku' | 'sonnet';
  /** Timeout in milliseconds (default: 45000) */
  timeout?: number;
  /** Output as JSON (default: true) */
  json?: boolean;
  /** Silent mode - minimal output */
  silent?: boolean;
}

// Cache CLI detection result
let cachedCliStatus: ReturnType<typeof detectClaudeCli> | null = null;

/**
 * Find project root by looking for .specweave directory
 */
function findProjectRoot(): string | null {
  let current = process.cwd();
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, '.specweave'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Count pending tasks in tasks.md
 */
function countPendingTasks(tasksPath: string): { pending: number; total: number } {
  if (!fs.existsSync(tasksPath)) {
    return { pending: 0, total: 0 };
  }

  const content = fs.readFileSync(tasksPath, 'utf8');
  const pendingMatch = content.match(/\*\*Status\*\*:\s*\[\s*\]\s*pending/gi) || [];
  const completedMatch = content.match(/\*\*Status\*\*:\s*\[x\]\s*completed/gi) || [];

  return {
    pending: pendingMatch.length,
    total: pendingMatch.length + completedMatch.length,
  };
}

/**
 * Count open acceptance criteria in spec.md
 */
function countOpenACs(specPath: string): { open: number; total: number } {
  if (!fs.existsSync(specPath)) {
    return { open: 0, total: 0 };
  }

  const content = fs.readFileSync(specPath, 'utf8');
  const openMatch = content.match(/^- \[ \] \*\*AC-/gm) || [];
  const closedMatch = content.match(/^- \[x\] \*\*AC-/gm) || [];

  return {
    open: openMatch.length,
    total: openMatch.length + closedMatch.length,
  };
}

/**
 * Execute Claude CLI command safely
 * Reuses pattern from llm-plugin-detector.ts
 */
function executeClaudeCli(
  args: string[],
  timeout: number = 45000
): { stdout: string; stderr: string; exitCode: number | null; error?: string } {
  // Get cached CLI status or detect
  if (!cachedCliStatus) {
    cachedCliStatus = detectClaudeCli();
  }

  if (!cachedCliStatus.available) {
    return {
      stdout: '',
      stderr: '',
      exitCode: 1,
      error: cachedCliStatus.errorMessage || 'Claude CLI not available',
    };
  }

  const cleanEnv = getCleanEnv();

  // Use direct binary path if available
  const command = cachedCliStatus.commandPath || 'claude';
  const useShell = !cachedCliStatus.commandPath || cachedCliStatus.shellWorkaround;

  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024, // 1MB
      windowsHide: true,
      shell: useShell,
      env: {
        ...cleanEnv,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      },
    });

    if (result.error) {
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.status,
        error: result.error.message,
      };
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: '',
      exitCode: 1,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build the LLM evaluation prompt
 */
function buildEvaluationPrompt(
  incrementId: string,
  tasksContent: string,
  specContent: string,
  successCriteria: SuccessCriterion[],
  taskStats: { pending: number; total: number },
  acStats: { open: number; total: number }
): string {
  const criteriaList = successCriteria
    .map((c) => `- ${c.type}: ${c.description} (${c.required ? 'REQUIRED' : 'optional'})`)
    .join('\n');

  return `You are evaluating whether an auto mode session should be considered COMPLETE.

## Increment: ${incrementId}

## Current State
- Tasks: ${taskStats.total - taskStats.pending}/${taskStats.total} completed (${taskStats.pending} pending)
- Acceptance Criteria: ${acStats.total - acStats.open}/${acStats.total} satisfied (${acStats.open} open)

## Success Criteria (session ends when ALL required criteria are met)
${criteriaList}

## Tasks File Content (tasks.md)
\`\`\`markdown
${tasksContent.slice(0, 3000)}${tasksContent.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

## Spec File Content (spec.md)
\`\`\`markdown
${specContent.slice(0, 3000)}${specContent.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

## Your Task
Evaluate whether the session should be considered COMPLETE based on the success criteria.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "complete": true/false,
  "confidence": 0.0-1.0,
  "reason": "One sentence explanation",
  "criteriaResults": [
    {"type": "tasks_complete", "satisfied": true/false, "reason": "brief note"},
    {"type": "acs_satisfied", "satisfied": true/false, "reason": "brief note"}
  ],
  "nextSteps": ["step1", "step2"] // Only if not complete
}

BE STRICT. Only mark complete if ALL required criteria are truly satisfied.`;
}

/**
 * Evaluate a single criterion without LLM
 */
function evaluateCriterionLocally(
  criterion: SuccessCriterion,
  taskStats: { pending: number; total: number },
  acStats: { open: number; total: number },
  projectRoot: string
): CriterionEvaluationResult {
  const startTime = performance.now();

  switch (criterion.type) {
    case 'tasks_complete': {
      const satisfied = taskStats.pending === 0 && taskStats.total > 0;
      return {
        criterion,
        satisfied,
        reason: satisfied
          ? `All ${taskStats.total} tasks completed`
          : `${taskStats.pending} of ${taskStats.total} tasks still pending`,
        durationMs: performance.now() - startTime,
      };
    }

    case 'acs_satisfied': {
      const satisfied = acStats.open === 0;
      return {
        criterion,
        satisfied,
        reason: satisfied
          ? `All ${acStats.total} acceptance criteria satisfied`
          : `${acStats.open} of ${acStats.total} ACs still open`,
        durationMs: performance.now() - startTime,
      };
    }

    case 'tests_pass': {
      const cmd = criterion.command || 'npm test';
      try {
        const result = spawnSync(cmd.split(' ')[0], cmd.split(' ').slice(1), {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 300000, // 5 min for tests
          stdio: 'pipe',
        });
        const satisfied = result.status === 0;
        return {
          criterion,
          satisfied,
          reason: satisfied ? 'Tests passed' : `Tests failed (exit code ${result.status})`,
          durationMs: performance.now() - startTime,
        };
      } catch (error) {
        return {
          criterion,
          satisfied: false,
          reason: `Test execution error: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: performance.now() - startTime,
        };
      }
    }

    case 'build_succeeds': {
      const cmd = criterion.command || 'npm run build';
      try {
        const result = spawnSync(cmd.split(' ')[0], cmd.split(' ').slice(1), {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 300000, // 5 min for build
          stdio: 'pipe',
        });
        const satisfied = result.status === 0;
        return {
          criterion,
          satisfied,
          reason: satisfied ? 'Build succeeded' : `Build failed (exit code ${result.status})`,
          durationMs: performance.now() - startTime,
        };
      } catch (error) {
        return {
          criterion,
          satisfied: false,
          reason: `Build execution error: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: performance.now() - startTime,
        };
      }
    }

    case 'custom_command': {
      if (!criterion.command) {
        return {
          criterion,
          satisfied: false,
          reason: 'No command specified for custom_command criterion',
          durationMs: performance.now() - startTime,
        };
      }
      try {
        const result = spawnSync('sh', ['-c', criterion.command], {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 60000, // 1 min for custom
          stdio: 'pipe',
        });
        const satisfied = result.status === 0;
        return {
          criterion,
          satisfied,
          reason: satisfied
            ? `Command succeeded: ${criterion.command}`
            : `Command failed (exit code ${result.status})`,
          durationMs: performance.now() - startTime,
        };
      } catch (error) {
        return {
          criterion,
          satisfied: false,
          reason: `Command error: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: performance.now() - startTime,
        };
      }
    }

    case 'llm_evaluate':
      // This requires LLM - will be handled separately
      return {
        criterion,
        satisfied: false,
        reason: 'LLM evaluation required',
        durationMs: performance.now() - startTime,
      };

    default:
      return {
        criterion,
        satisfied: false,
        reason: `Unknown criterion type: ${criterion.type}`,
        durationMs: performance.now() - startTime,
      };
  }
}

/**
 * Evaluate completion using LLM
 */
async function evaluateWithLLM(
  incrementId: string,
  tasksContent: string,
  specContent: string,
  successCriteria: SuccessCriterion[],
  taskStats: { pending: number; total: number },
  acStats: { open: number; total: number },
  model: 'haiku' | 'sonnet',
  timeout: number
): Promise<{
  complete: boolean;
  confidence: number;
  reason: string;
  criteriaResults: Array<{ type: string; satisfied: boolean; reason: string }>;
  nextSteps: string[];
  error?: string;
}> {
  const prompt = buildEvaluationPrompt(
    incrementId,
    tasksContent,
    specContent,
    successCriteria,
    taskStats,
    acStats
  );

  const result = executeClaudeCli(['-p', prompt, '--model', model], timeout);

  if (result.error || result.exitCode !== 0) {
    return {
      complete: false,
      confidence: 0,
      reason: result.error || `CLI exited with code ${result.exitCode}`,
      criteriaResults: [],
      nextSteps: ['Check Claude CLI availability'],
      error: result.error || result.stderr,
    };
  }

  // Parse JSON response
  try {
    const output = result.stdout.trim();

    // Extract JSON from potential markdown code blocks
    let jsonStr = output;
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        complete: false,
        confidence: 0,
        reason: 'Invalid LLM response format (no JSON found)',
        criteriaResults: [],
        nextSteps: ['Retry evaluation'],
        error: `Raw output: ${output.slice(0, 200)}`,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      complete: parsed.complete === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: parsed.reason || 'No reason provided',
      criteriaResults: Array.isArray(parsed.criteriaResults) ? parsed.criteriaResults : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    };
  } catch (parseError) {
    return {
      complete: false,
      confidence: 0,
      reason: `Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      criteriaResults: [],
      nextSteps: ['Retry evaluation'],
      error: result.stdout.slice(0, 200),
    };
  }
}

/**
 * Main evaluation function
 */
export async function evaluateCompletionCommand(
  incrementId: string,
  options: EvaluateCompletionOptions = {}
): Promise<CompletionEvaluationResult> {
  const startTime = performance.now();
  const model = options.model || 'sonnet';
  const timeout = options.timeout || 45000;

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      complete: false,
      overallReason: 'Not in a SpecWeave project',
      confidence: 0,
      results: [],
      nextSteps: ['Run from a SpecWeave project directory'],
      durationMs: performance.now() - startTime,
    };
  }

  const incrementsDir = path.join(projectRoot, '.specweave/increments');
  const incrementDir = path.join(incrementsDir, incrementId);

  // Find increment by ID or prefix
  if (!fs.existsSync(incrementDir)) {
    // Try to find by prefix
    const entries = fs.readdirSync(incrementsDir);
    const match = entries.find((e) => e.startsWith(incrementId));
    if (!match) {
      return {
        complete: false,
        overallReason: `Increment not found: ${incrementId}`,
        confidence: 0,
        results: [],
        nextSteps: [`Check increment ID: ${incrementId}`],
        durationMs: performance.now() - startTime,
      };
    }
  }

  const tasksPath = path.join(incrementDir, 'tasks.md');
  const specPath = path.join(incrementDir, 'spec.md');

  // Read file contents
  const tasksContent = fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf8') : '';
  const specContent = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : '';

  // Get stats
  const taskStats = countPendingTasks(tasksPath);
  const acStats = countOpenACs(specPath);

  // Load success criteria from auto-mode.json or use defaults
  const autoModeFile = path.join(projectRoot, '.specweave/state/auto-mode.json');
  let successCriteria: SuccessCriterion[] = DEFAULT_SUCCESS_CRITERIA;

  if (fs.existsSync(autoModeFile)) {
    try {
      const autoMode = JSON.parse(fs.readFileSync(autoModeFile, 'utf8'));
      if (Array.isArray(autoMode.successCriteria) && autoMode.successCriteria.length > 0) {
        successCriteria = autoMode.successCriteria;
      }
    } catch {
      // Use defaults
    }
  }

  // Check if any criterion requires LLM evaluation
  const hasLLMCriterion = successCriteria.some((c) => c.type === 'llm_evaluate');
  const useLLM = hasLLMCriterion;

  // Evaluate all criteria locally first
  const localResults: CriterionEvaluationResult[] = [];
  for (const criterion of successCriteria) {
    if (criterion.type !== 'llm_evaluate') {
      const result = evaluateCriterionLocally(criterion, taskStats, acStats, projectRoot);
      localResults.push(result);
    }
  }

  // Check if all required local criteria are satisfied
  const requiredLocalCriteria = localResults.filter((r) => r.criterion.required);
  const allLocalSatisfied = requiredLocalCriteria.every((r) => r.satisfied);

  // If using LLM and local criteria pass, do semantic evaluation
  let llmResult:
    | {
        complete: boolean;
        confidence: number;
        reason: string;
        criteriaResults: Array<{ type: string; satisfied: boolean; reason: string }>;
        nextSteps: string[];
        error?: string;
      }
    | undefined;

  if (useLLM && allLocalSatisfied) {
    llmResult = await evaluateWithLLM(
      incrementId,
      tasksContent,
      specContent,
      successCriteria,
      taskStats,
      acStats,
      model,
      timeout
    );

    // Add LLM criterion result
    const llmCriterion = successCriteria.find((c) => c.type === 'llm_evaluate');
    if (llmCriterion) {
      localResults.push({
        criterion: llmCriterion,
        satisfied: llmResult.complete,
        reason: llmResult.reason,
        durationMs: performance.now() - startTime,
      });
    }
  }

  // Determine overall completion
  const allRequiredSatisfied = localResults
    .filter((r) => r.criterion.required)
    .every((r) => r.satisfied);

  const complete = allRequiredSatisfied;
  const confidence = llmResult ? llmResult.confidence : allRequiredSatisfied ? 1.0 : 0.0;

  // Build next steps
  const nextSteps: string[] = [];
  if (!complete) {
    for (const result of localResults) {
      if (!result.satisfied && result.criterion.required) {
        switch (result.criterion.type) {
          case 'tasks_complete':
            nextSteps.push(`Complete ${taskStats.pending} pending task(s)`);
            break;
          case 'acs_satisfied':
            nextSteps.push(`Satisfy ${acStats.open} open acceptance criteria`);
            break;
          case 'tests_pass':
            nextSteps.push('Fix failing tests');
            break;
          case 'build_succeeds':
            nextSteps.push('Fix build errors');
            break;
          default:
            nextSteps.push(`Address: ${result.reason}`);
        }
      }
    }
    if (llmResult?.nextSteps) {
      nextSteps.push(...llmResult.nextSteps);
    }
  }

  // Build overall reason
  let overallReason: string;
  if (complete) {
    overallReason = 'All required success criteria satisfied';
  } else {
    const failedCriteria = localResults
      .filter((r) => !r.satisfied && r.criterion.required)
      .map((r) => r.criterion.type);
    overallReason = `Incomplete: ${failedCriteria.join(', ')} not satisfied`;
  }

  return {
    complete,
    overallReason,
    confidence,
    results: localResults,
    nextSteps: [...new Set(nextSteps)], // Dedupe
    durationMs: performance.now() - startTime,
  };
}

/**
 * Create the evaluate-completion command for Commander
 */
export function createEvaluateCompletionCommand(): Command {
  const cmd = new Command('evaluate-completion');

  cmd
    .description('Evaluate whether an auto mode session should be considered complete')
    .argument('<incrementId>', 'Increment ID to evaluate')
    .option('--model <model>', 'Model for LLM evaluation: haiku or sonnet (default: sonnet)')
    .option('--timeout <ms>', 'Timeout in milliseconds (default: 45000)', parseInt)
    .option('--json', 'Output as JSON (default)')
    .option('--silent', 'Minimal output')
    .action(async (incrementId: string, options: EvaluateCompletionOptions) => {
      try {
        const result = await evaluateCompletionCommand(incrementId, options);

        if (!options.silent) {
          console.log(JSON.stringify(result, null, 2));
        }

        // Exit code: 0 if complete, 1 if not
        process.exit(result.complete ? 0 : 1);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (!options.silent) {
          console.error(chalk.red(`Error: ${err.message}`));
        }

        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Export for direct CLI invocation
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let incrementId = '';
  let model: 'haiku' | 'sonnet' = 'sonnet';
  let timeout = 45000;
  let silent = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[++i] as 'haiku' | 'sonnet';
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[++i], 10);
    } else if (args[i] === '--silent') {
      silent = true;
    } else if (!args[i].startsWith('--')) {
      incrementId = args[i];
    }
  }

  if (!incrementId) {
    if (!silent) {
      console.error('Usage: specweave evaluate-completion <incrementId> [--model haiku|sonnet] [--timeout ms]');
    }
    process.exit(1);
  }

  const result = await evaluateCompletionCommand(incrementId, { model, timeout, silent });

  if (!silent) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.complete ? 0 : 1);
}

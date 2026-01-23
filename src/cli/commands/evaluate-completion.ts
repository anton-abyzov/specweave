/**
 * Evaluate Completion CLI Command
 *
 * CLI wrapper for the completion evaluator. Evaluates whether an auto mode
 * session should be considered complete based on success criteria.
 *
 * This command is called by the stop-auto.sh hook when requireLLMEval is enabled.
 *
 * Usage:
 *   specweave evaluate-completion <incrementId>              # Evaluate completion
 *   specweave evaluate-completion <incrementId> --model haiku # Use faster model
 *   specweave evaluate-completion <incrementId> --timeout 60000  # Custom timeout
 *
 * @module cli/commands/evaluate-completion
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateCompletion,
  formatEvaluationResult,
  type EvaluationOptions,
} from '../../core/auto/completion-evaluator.js';
import type { CompletionEvaluationResult } from '../../core/auto/types.js';

export interface EvaluateCompletionOptions {
  /** Model to use for LLM evaluation (default: opus) */
  model?: 'haiku' | 'sonnet' | 'opus';
  /** Timeout in milliseconds (default: 45000) */
  timeout?: number;
  /** Output as JSON (default: true) */
  json?: boolean;
  /** Silent mode - minimal output */
  silent?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

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
 * Resolve increment ID to full path
 * Handles both full names (0173-auto-completion-evaluation) and prefixes (0173)
 */
function resolveIncrementId(projectRoot: string, incrementId: string): string | null {
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  if (!fs.existsSync(incrementsDir)) {
    return null;
  }

  // Check for exact match first
  const exactPath = path.join(incrementsDir, incrementId);
  if (fs.existsSync(exactPath)) {
    return incrementId;
  }

  // Try prefix match
  const entries = fs.readdirSync(incrementsDir);
  const match = entries.find((e) => e.startsWith(incrementId));
  return match || null;
}

/**
 * Main evaluation function - CLI entry point
 *
 * Wraps the core evaluateCompletion function with CLI-specific
 * error handling and project root resolution.
 */
export async function evaluateCompletionCommand(
  incrementId: string,
  options: EvaluateCompletionOptions = {}
): Promise<CompletionEvaluationResult> {
  const startTime = performance.now();

  // Find project root
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

  // Resolve increment ID (handle prefixes like "0173")
  const resolvedId = resolveIncrementId(projectRoot, incrementId);
  if (!resolvedId) {
    return {
      complete: false,
      overallReason: `Increment not found: ${incrementId}`,
      confidence: 0,
      results: [],
      nextSteps: [`Check increment ID: ${incrementId}`],
      durationMs: performance.now() - startTime,
    };
  }

  // Map CLI options to core evaluator options
  const evaluatorOptions: EvaluationOptions = {
    model: options.model || 'opus',
    timeout: options.timeout || 45000,
    verbose: options.verbose,
  };

  // Call the core evaluator
  const result = await evaluateCompletion(projectRoot, resolvedId, evaluatorOptions);

  // Log formatted output if verbose and not silent
  if (options.verbose && !options.silent) {
    console.log(formatEvaluationResult(result));
  }

  return result;
}

// Re-export for backwards compatibility
export { formatEvaluationResult } from '../../core/auto/completion-evaluator.js';

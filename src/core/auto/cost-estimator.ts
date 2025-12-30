/**
 * Cost Estimator for Auto Sessions
 *
 * Note: Optimized for Claude Code MAX Plan (subscription-based).
 * No API key needed, no per-token billing.
 * Cost estimation is informational only.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CostEstimate {
  /** Estimated number of iterations */
  iterations: number;
  /** Estimated tokens per iteration */
  tokensPerIteration: number;
  /** Total estimated tokens */
  totalTokens: number;
  /** Estimated cost in USD (for API users) */
  estimatedCostUSD: number;
  /** Whether using MAX Plan (subscription) */
  isMaxPlan: boolean;
  /** Estimated duration in hours */
  estimatedHours: number;
  /** Confidence level: low, medium, high */
  confidence: 'low' | 'medium' | 'high';
  /** Breakdown by increment */
  incrementBreakdown: IncrementEstimate[];
}

export interface IncrementEstimate {
  incrementId: string;
  taskCount: number;
  estimatedIterations: number;
  estimatedTokens: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface EstimatorConfig {
  /** Average tokens per iteration (default: 4000) */
  avgTokensPerIteration: number;
  /** Average iterations per task (default: 2) */
  avgIterationsPerTask: number;
  /** Claude Opus input cost per 1M tokens */
  inputCostPerMillion: number;
  /** Claude Opus output cost per 1M tokens */
  outputCostPerMillion: number;
  /** Input/output ratio (default: 3:1) */
  inputOutputRatio: number;
}

const DEFAULT_CONFIG: EstimatorConfig = {
  avgTokensPerIteration: 4000,
  avgIterationsPerTask: 2,
  inputCostPerMillion: 15.0, // Claude Opus input
  outputCostPerMillion: 75.0, // Claude Opus output
  inputOutputRatio: 3, // 3 input tokens per 1 output token
};

/**
 * Estimate cost for an auto session
 */
export function estimateCost(
  incrementIds: string[],
  projectRoot: string,
  config: Partial<EstimatorConfig> = {}
): CostEstimate {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  const incrementBreakdown: IncrementEstimate[] = [];
  let totalIterations = 0;
  let totalTokens = 0;
  let dataPoints = 0;

  for (const incrementId of incrementIds) {
    const estimate = estimateIncrement(incrementId, incrementsDir, cfg);
    incrementBreakdown.push(estimate);
    totalIterations += estimate.estimatedIterations;
    totalTokens += estimate.estimatedTokens;
    if (estimate.taskCount > 0) dataPoints++;
  }

  // Calculate cost (for API users)
  const outputTokens = totalTokens / (cfg.inputOutputRatio + 1);
  const inputTokens = totalTokens - outputTokens;
  const estimatedCostUSD =
    (inputTokens / 1_000_000) * cfg.inputCostPerMillion +
    (outputTokens / 1_000_000) * cfg.outputCostPerMillion;

  // Detect MAX Plan (no ANTHROPIC_API_KEY or using Claude Code CLI)
  const isMaxPlan = !process.env.ANTHROPIC_API_KEY;

  // Estimate duration (assume ~2 minutes per iteration average)
  const estimatedHours = (totalIterations * 2) / 60;

  // Confidence based on data quality
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (dataPoints === incrementIds.length && totalIterations > 0) {
    confidence = incrementBreakdown.every((i) => i.taskCount > 5) ? 'high' : 'medium';
  }

  return {
    iterations: totalIterations,
    tokensPerIteration: cfg.avgTokensPerIteration,
    totalTokens,
    estimatedCostUSD: Math.round(estimatedCostUSD * 100) / 100,
    isMaxPlan,
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    confidence,
    incrementBreakdown,
  };
}

/**
 * Estimate a single increment
 */
function estimateIncrement(
  incrementId: string,
  incrementsDir: string,
  config: EstimatorConfig
): IncrementEstimate {
  // Find increment directory
  let incDir = path.join(incrementsDir, incrementId);
  if (!fs.existsSync(incDir)) {
    // Try to find by prefix
    const entries = fs.readdirSync(incrementsDir);
    const match = entries.find((e) => e.startsWith(incrementId));
    if (match) {
      incDir = path.join(incrementsDir, match);
    }
  }

  const tasksPath = path.join(incDir, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    return {
      incrementId,
      taskCount: 0,
      estimatedIterations: 5, // Minimum estimate
      estimatedTokens: 5 * config.avgTokensPerIteration,
      complexity: 'moderate',
    };
  }

  // Count tasks
  const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
  const taskMatches = tasksContent.match(/^### T-\d+:/gm) || [];
  const taskCount = taskMatches.length;

  // Count pending tasks
  const pendingMatches = tasksContent.match(/\*\*Status\*\*:\s*\[ \]/g) || [];
  const pendingCount = pendingMatches.length;

  // Determine complexity from spec.md
  const specPath = path.join(incDir, 'spec.md');
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const usCount = (specContent.match(/^### US-\d+:/gm) || []).length;
    const acCount = (specContent.match(/\*\*AC-/g) || []).length;

    if (usCount > 5 || acCount > 20) {
      complexity = 'complex';
    } else if (usCount <= 2 && acCount <= 5) {
      complexity = 'simple';
    }
  }

  // Calculate estimates
  const complexityMultiplier = complexity === 'complex' ? 1.5 : complexity === 'simple' ? 0.7 : 1.0;
  const estimatedIterations = Math.ceil(
    pendingCount * config.avgIterationsPerTask * complexityMultiplier
  );
  const estimatedTokens = estimatedIterations * config.avgTokensPerIteration;

  return {
    incrementId,
    taskCount,
    estimatedIterations: Math.max(estimatedIterations, 1),
    estimatedTokens,
    complexity,
  };
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const lines: string[] = [];

  lines.push('📊 Cost Estimation');
  lines.push('');

  if (estimate.isMaxPlan) {
    lines.push('💎 MAX Plan Detected (Subscription)');
    lines.push('   No per-token billing - estimates are informational only');
    lines.push('');
  }

  lines.push(`Estimated Iterations: ${estimate.iterations}`);
  lines.push(`Estimated Duration: ~${estimate.estimatedHours} hours`);
  lines.push(`Confidence: ${estimate.confidence}`);
  lines.push('');

  if (!estimate.isMaxPlan) {
    lines.push('💰 Estimated API Cost');
    lines.push(`   Total Tokens: ~${(estimate.totalTokens / 1000).toFixed(0)}K`);
    lines.push(`   Estimated: $${estimate.estimatedCostUSD.toFixed(2)} USD`);
    lines.push('');
  }

  if (estimate.incrementBreakdown.length > 1) {
    lines.push('📋 Per-Increment Breakdown:');
    for (const inc of estimate.incrementBreakdown) {
      lines.push(`   ${inc.incrementId}`);
      lines.push(`     Tasks: ${inc.taskCount} | Complexity: ${inc.complexity}`);
      lines.push(`     Est. Iterations: ${inc.estimatedIterations}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

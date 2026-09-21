/**
 * Model Selection Utilities
 *
 * Intelligent model selection for SpecWeave tasks based on complexity,
 * instruction detail, and task characteristics.
 *
 * Strategy (Opus 4.6 Default):
 * - Haiku: Simple/cheap operations, translations, mechanical work
 * - Opus: Default for all complex work, architecture, creative problem-solving
 */

import type { JevClient } from '../core/jev/client.js';
import type { classifyTask } from '../core/jev/decide.js';

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface Task {
  id: string;
  content: string;
  description?: string;
  acceptanceCriteria?: string[];
  specReference?: string;
  planReference?: string;
  priority?: 'P1' | 'P2' | 'P3';
  estimatedHours?: number;
}

export interface DetectionResult {
  model: ModelTier;
  confidence: number;
  reasoning: string;
}

/**
 * Keywords that suggest complex thinking is required (Sonnet territory)
 */
const COMPLEX_KEYWORDS = [
  'design', 'architecture', 'architect', 'evaluate', 'choose', 'decide',
  'compare', 'analyze', 'research', 'investigate', 'plan', 'strategy',
  'refactor', 'optimize', 'tradeoff', 'consider', 'assess', 'review'
];

/**
 * Keywords that suggest simple implementation (Haiku territory)
 */
const SIMPLE_KEYWORDS = [
  'implement', 'create', 'add', 'update', 'fix', 'write', 'install',
  'configure', 'setup', 'integrate', 'connect', 'deploy', 'build',
  'test', 'validate', 'document', 'format', 'style', 'lint'
];

/**
 * Keywords that suggest creative/critical work (Sonnet/Opus territory)
 */
const CREATIVE_KEYWORDS = [
  'novel', 'innovative', 'unique', 'creative', 'original', 'new approach',
  'alternative', 'improve', 'enhance', 'redesign', 'rethink'
];

/**
 * Detects the optimal model for a given task
 *
 * @param task - The task to analyze
 * @param options - Additional context (spec detail level, etc.)
 * @returns Detection result with model recommendation and reasoning
 */
export function detectModelForTask(
  task: Task,
  options: {
    specDetailLevel?: number; // 0-1, how detailed the spec is
    hasDetailedPlan?: boolean;
    isArchitectural?: boolean;
  } = {}
): DetectionResult {
  const taskText = `${task.content} ${task.description || ''}`.toLowerCase();

  // Score-based detection
  let haikuScore = 0;
  let sonnetScore = 0;
  let opusScore = 0;

  // 1. Keyword analysis
  COMPLEX_KEYWORDS.forEach(keyword => {
    if (taskText.includes(keyword)) {
      sonnetScore += 2;
    }
  });

  SIMPLE_KEYWORDS.forEach(keyword => {
    if (taskText.includes(keyword)) {
      haikuScore += 1;
    }
  });

  CREATIVE_KEYWORDS.forEach(keyword => {
    if (taskText.includes(keyword)) {
      sonnetScore += 3;
      opusScore += 1;
    }
  });

  // 2. Spec/plan reference analysis
  if (task.specReference && options.specDetailLevel && options.specDetailLevel > 0.7) {
    haikuScore += 3; // Has detailed spec reference
  }

  if (options.hasDetailedPlan) {
    haikuScore += 2; // Implementation approach already defined
  }

  if (options.isArchitectural) {
    sonnetScore += 4; // Architectural decisions need thinking
    opusScore += 2;
  }

  // 3. Acceptance criteria analysis
  if (task.acceptanceCriteria && task.acceptanceCriteria.length >= 3) {
    haikuScore += 2; // Clear, specific criteria = can use Haiku
  }

  // 4. Priority analysis (P1 might need more careful attention)
  if (task.priority === 'P1' && !options.hasDetailedPlan) {
    sonnetScore += 1; // Critical work without plan = need thinking
  }

  // 5. Task complexity indicators
  const hasFileReference = /src\/[a-zA-Z0-9\/\-_.]+\.(ts|js|tsx|jsx|py|java|go)/.test(taskText);
  if (hasFileReference) {
    haikuScore += 2; // Specific file paths = concrete instructions
  }

  const hasMultipleSteps = taskText.split(/\n|;|,/).length > 3;
  if (hasMultipleSteps && options.hasDetailedPlan) {
    haikuScore += 1; // Multi-step with plan = can execute mechanically
  }

  // Calculate confidence based on total scores
  const totalScore = haikuScore + sonnetScore + opusScore;

  // Default to opus for best quality
  if (totalScore === 0) {
    return {
      model: 'opus',
      confidence: 0.5,
      reasoning: 'Default to opus for best quality and reasoning'
    };
  }

  const haikuConfidence = haikuScore / totalScore;
  const sonnetConfidence = sonnetScore / totalScore;
  const opusConfidence = opusScore / totalScore;

  // Decision logic - prioritize opus for critical work, haiku for clear instructions
  if (opusScore > 5 && opusConfidence > 0.3) {
    return {
      model: 'opus',
      confidence: opusConfidence,
      reasoning: 'Critical architectural decision requiring deep reasoning'
    };
  }

  if (haikuScore > sonnetScore && haikuConfidence > 0.5) {
    return {
      model: 'haiku',
      confidence: haikuConfidence,
      reasoning: 'Clear instructions with detailed spec/plan - suitable for fast execution'
    };
  }

  if (sonnetScore > haikuScore || sonnetConfidence > 0.4) {
    return {
      model: 'opus',
      confidence: sonnetConfidence,
      reasoning: 'Requires decision-making or complex implementation'
    };
  }

  return {
    model: 'opus',
    confidence: 0.5,
    reasoning: 'Default to opus for best quality and reasoning'
  };
}

/**
 * Batch detect models for multiple tasks
 * Useful when generating tasks.md from plan.md
 */
export function detectModelsForTasks(
  tasks: Task[],
  options: {
    specDetailLevel?: number;
    hasDetailedPlan?: boolean;
  } = {}
): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  tasks.forEach(task => {
    const result = detectModelForTask(task, options);
    results.set(task.id, result);
  });

  return results;
}

/**
 * Format model hint for tasks.md
 *
 * @param model - The model tier
 * @returns Formatted string for inclusion in tasks.md
 */
export function formatModelHint(model: ModelTier): string {
  const icons = {
    haiku: '⚡',   // Fast
    sonnet: '🧠',  // Thinking
    opus: '💎'     // Premium
  };

  return `${icons[model]} ${model}`;
}

/**
 * Parse model hint from tasks.md line
 *
 * @param line - A line from tasks.md
 * @returns Detected model or null
 */
export function parseModelHint(line: string): ModelTier | null {
  const haikuMatch = /⚡\s*haiku|model:\s*haiku/i.test(line);
  const sonnetMatch = /🧠\s*sonnet|model:\s*sonnet/i.test(line);
  const opusMatch = /💎\s*opus|model:\s*opus/i.test(line);

  if (haikuMatch) return 'haiku';
  if (sonnetMatch) return 'sonnet';
  if (opusMatch) return 'opus';

  return null;
}

/**
 * Cost estimation utilities
 */
export function estimateTaskCost(
  model: ModelTier,
  estimatedTokens: number = 2000
): number {
  // Approximate costs per 1M tokens (input + output blended)
  const costPer1M = {
    haiku: 1.25,   // $0.25 input + $1.25 output = ~$1.25 blended
    sonnet: 15.00, // $3 input + $15 output = ~$15 blended
    opus: 25.00    // $5 input + $25 output = ~$25 blended
  };

  return (estimatedTokens / 1_000_000) * costPer1M[model];
}

/**
 * Calculate total cost savings when using smart model selection
 */
export function calculateCostSavings(
  tasksWithModels: Map<string, ModelTier>,
  averageTokensPerTask: number = 2000
): {
  optimizedCost: number;
  allSonnetCost: number;
  savings: number;
  savingsPercent: number;
} {
  let optimizedCost = 0;
  let allSonnetCost = 0;

  tasksWithModels.forEach((model) => {
    optimizedCost += estimateTaskCost(model, averageTokensPerTask);
    allSonnetCost += estimateTaskCost('sonnet', averageTokensPerTask);
  });

  const savings = allSonnetCost - optimizedCost;
  const savingsPercent = (savings / allSonnetCost) * 100;

  return {
    optimizedCost,
    allSonnetCost,
    savings,
    savingsPercent
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Jev-assisted tier selection (opt-in, falls back to the keyword heuristic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where a tier recommendation came from.
 * - `jev`       — TypeSafe System One classified the task
 * - `heuristic` — the keyword scorer in {@link detectModelForTask}
 */
export type ModelTierSource = 'jev' | 'heuristic';

/** {@link DetectionResult} plus the decision's provenance. */
export interface TierSelection extends DetectionResult {
  source: ModelTierSource;
  /** Latency of the Jev call, when one happened. */
  latencyMs?: number;
  /** Cost of the Jev call in USD, when reported. */
  cost?: number;
}

/**
 * Injection points for tests and callers that already hold a client/config.
 * Nothing here is required: the defaults read the project config.
 */
export interface SelectModelTierDeps {
  /** Project root used to load `.specweave/config.json`. */
  projectRoot?: string;
  /** Force the Jev path on/off (skips config loading when provided). */
  enabled?: boolean;
  /** Force modelRouting on/off (skips config loading when provided). */
  modelRouting?: boolean;
  /** Confidence floor below which the tier falls back to opus. */
  routeThreshold?: number;
  /** A ready client. `null` means "no client available" (heuristic path). */
  client?: JevClient | null;
  /** Override the classifier (tests). */
  classify?: typeof classifyTask;
}

/**
 * Pick a model tier for a task, preferring Jev when the project opted in.
 *
 * Behaviour (AC-07):
 * - Jev off, no key, error, timeout → the keyword heuristic, `source: 'heuristic'`
 * - Jev on → `{ model: tier, reasoning: 'jev:<complexity>', source: 'jev' }`
 * - Jev on but confidence < `thresholds.route` → opus, `reasoning: 'jev:low-confidence'`
 *
 * Never throws: every failure path degrades to the heuristic.
 */
export async function selectModelTierForTask(
  task: Task,
  options: {
    specDetailLevel?: number;
    hasDetailedPlan?: boolean;
    isArchitectural?: boolean;
  } = {},
  deps: SelectModelTierDeps = {}
): Promise<TierSelection> {
  const heuristic = (): TierSelection => ({
    ...detectModelForTask(task, options),
    source: 'heuristic',
  });

  try {
    const [cfgMod, clientMod, decideMod] = await Promise.all([
      import('../core/jev/config.js'),
      import('../core/jev/client.js'),
      import('../core/jev/decide.js'),
    ]);

    let enabled = deps.enabled;
    let modelRouting = deps.modelRouting;
    let routeThreshold = deps.routeThreshold;

    if (enabled === undefined || modelRouting === undefined || routeThreshold === undefined) {
      const cfg = cfgMod.loadJevConfig(deps.projectRoot);
      if (enabled === undefined) enabled = cfg.enabled;
      if (modelRouting === undefined) modelRouting = cfg.modelRouting;
      if (routeThreshold === undefined) routeThreshold = cfg.thresholds.route;
    }

    if (!enabled || !modelRouting) return heuristic();

    const client =
      deps.client !== undefined ? deps.client : clientMod.createJevClient(deps.projectRoot);
    if (!client) return heuristic();

    const classify = deps.classify ?? decideMod.classifyTask;
    const decision = await classify(client, {
      id: task.id,
      title: task.content,
      body: task.description ?? '',
      acs: task.acceptanceCriteria ?? [],
    });

    if (!decision.available) return heuristic();

    if (decision.confidence < routeThreshold) {
      return {
        model: 'opus',
        confidence: decision.confidence,
        reasoning: 'jev:low-confidence',
        source: 'jev',
        latencyMs: decision.latencyMs,
        cost: decision.cost,
      };
    }

    return {
      model: decision.tier,
      confidence: decision.confidence,
      reasoning: `jev:${decision.complexity}`,
      source: 'jev',
      latencyMs: decision.latencyMs,
      cost: decision.cost,
    };
  } catch {
    return heuristic();
  }
}

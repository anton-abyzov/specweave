/**
 * Model Selection Utilities
 *
 * Intelligent model selection for SpecWeave tasks based on complexity,
 * instruction detail, and task characteristics.
 *
 * Strategy:
 * - Haiku: Detailed instructions, clear acceptance criteria, mechanical work
 * - Sonnet: Complex decisions, architecture, creative problem-solving
 * - Opus: Critical architecture, high-stakes decisions (rare)
 */

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

  // Calculate confidence and select model
  const totalScore = haikuScore + sonnetScore + opusScore;
  const haikuConfidence = totalScore > 0 ? haikuScore / totalScore : 0;
  const sonnetConfidence = totalScore > 0 ? sonnetScore / totalScore : 0;
  const opusConfidence = totalScore > 0 ? opusScore / totalScore : 0;

  // Decision logic
  let selectedModel: ModelTier;
  let confidence: number;
  let reasoning: string;

  if (opusScore > 5 && opusConfidence > 0.3) {
    selectedModel = 'opus';
    confidence = opusConfidence;
    reasoning = 'Critical architectural decision requiring deep reasoning';
  } else if (haikuScore > sonnetScore && haikuConfidence > 0.5) {
    selectedModel = 'haiku';
    confidence = haikuConfidence;
    reasoning = 'Clear instructions with detailed spec/plan - suitable for fast execution';
  } else if (sonnetScore > haikuScore || sonnetConfidence > 0.4) {
    selectedModel = 'sonnet';
    confidence = sonnetConfidence;
    reasoning = 'Requires decision-making or complex implementation';
  } else {
    // Default to sonnet for safety
    selectedModel = 'sonnet';
    confidence = 0.5;
    reasoning = 'Default to sonnet for balanced quality and speed';
  }

  return {
    model: selectedModel,
    confidence,
    reasoning
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
    opus: 75.00    // $15 input + $75 output = ~$75 blended
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

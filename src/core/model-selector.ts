/**
 * Model Selector
 *
 * Decision engine that combines agent preferences + phase detection to select
 * the optimal AI model for each task.
 *
 * Decision hierarchy:
 * 1. User override (--model flag) - Always wins
 * 2. Agent preference (from AGENT.md) - Used when not 'auto'
 * 3. Phase detection - Used for 'auto' agents with high confidence
 * 4. Safe default (Sonnet) - Used when confidence is low
 *
 * Achieves 60-70% cost savings by routing execution to Haiku.
 */

import type { Model, Phase, ModelSelectionDecision } from '../types/model-selection';
import type { ExecutionContext } from './phase-detector';
import { AgentModelManager } from './agent-model-manager';
import { PhaseDetector } from './phase-detector';

export interface ModelSelectionConfig {
  mode: 'auto' | 'balanced' | 'manual';
  forceModel?: Exclude<Model, 'auto'>;
  highConfidenceThreshold: number; // 0.7
  mediumConfidenceThreshold: number; // 0.4
  defaultPlanningModel: 'sonnet' | 'opus';
  defaultExecutionModel: 'haiku' | 'sonnet';
  defaultReviewModel: 'sonnet' | 'opus';
  logDecisions: boolean;
  showReasoning: boolean;
}

const DEFAULT_CONFIG: ModelSelectionConfig = {
  mode: 'auto',
  highConfidenceThreshold: 0.7,
  mediumConfidenceThreshold: 0.4,
  defaultPlanningModel: 'sonnet',
  defaultExecutionModel: 'haiku',
  defaultReviewModel: 'sonnet',
  logDecisions: true,
  showReasoning: true,
};

/**
 * Phase-to-model mapping (when agent is 'auto')
 */
const PHASE_MODEL_MAP: Record<Phase, Exclude<Model, 'auto'>> = {
  planning: 'sonnet',
  execution: 'haiku',
  review: 'sonnet',
};

export class ModelSelector {
  private agentModelManager: AgentModelManager;
  private phaseDetector: PhaseDetector;
  private config: ModelSelectionConfig;

  constructor(
    agentModelManager: AgentModelManager,
    phaseDetector: PhaseDetector,
    config: Partial<ModelSelectionConfig> = {}
  ) {
    this.agentModelManager = agentModelManager;
    this.phaseDetector = phaseDetector;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Select optimal model for a given task
   *
   * @param prompt - User's prompt/task description
   * @param agent - Agent name (e.g., 'pm', 'frontend', 'architect')
   * @param context - Execution context (command, increment state, etc.)
   * @returns Model selection decision with reasoning
   */
  select(
    prompt: string,
    agent: string,
    context: ExecutionContext = {}
  ): ModelSelectionDecision {
    // Step 1: Check explicit user override
    if (this.config.forceModel) {
      return {
        model: this.config.forceModel,
        reason: 'user_override',
        reasoning: `User explicitly forced ${this.config.forceModel} model via --model flag`,
      };
    }

    // Step 2: Load agent preference
    const agentPref = this.agentModelManager.getPreferredModel(agent);
    const costProfile = this.agentModelManager.getCostProfile(agent);

    // If agent has explicit preference (not 'auto'), use it
    if (agentPref !== 'auto') {
      return {
        model: agentPref as Exclude<Model, 'auto'>,
        reason: 'agent_preference',
        reasoning: `Agent '${agent}' prefers ${agentPref} for ${costProfile} work`,
      };
    }

    // Step 3: Detect phase (for 'auto' agents)
    const phaseDetection = this.phaseDetector.detect(prompt, context);

    // Step 4: Apply decision matrix based on confidence
    if (phaseDetection.confidence >= this.config.highConfidenceThreshold) {
      // High confidence - use phase-based model
      return {
        model: PHASE_MODEL_MAP[phaseDetection.phase],
        reason: 'phase_detection',
        confidence: phaseDetection.confidence,
        reasoning: phaseDetection.reasoning,
      };
    }

    // Step 5: Low confidence - default to Sonnet for safety
    return {
      model: 'sonnet',
      reason: 'low_confidence_default',
      confidence: phaseDetection.confidence,
      reasoning: `Low confidence (${(phaseDetection.confidence * 100).toFixed(0)}%), defaulting to Sonnet for safety. Detected: ${phaseDetection.reasoning}`,
    };
  }

  /**
   * Log model selection decision (if logging enabled)
   */
  logDecision(decision: ModelSelectionDecision, agent: string): void {
    if (!this.config.logDecisions) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Model Selection] Agent: ${agent} → ${decision.model} (${decision.reason})`;

    if (this.config.showReasoning) {
      console.log(`${logMessage}\n  Reasoning: ${decision.reasoning}`);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModelSelectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }
}

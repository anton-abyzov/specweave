/**
 * Type definitions for the Intelligent Model Selection system
 *
 * This system automatically routes work to the optimal AI model based on:
 * - Agent preferences (planning vs execution agents)
 * - Phase detection (planning vs execution vs review)
 * - User overrides (manual model selection)
 *
 * Achieves 60-70% cost savings by using Haiku for execution, Sonnet for planning.
 */

/**
 * Available AI models
 * - sonnet: Latest Sonnet 4.5 (planning, complex analysis)
 * - haiku: Latest Haiku 4.5 (execution, simple tasks)
 * - opus: Latest Opus (rare, critical decisions)
 * - auto: System decides based on context
 */
export type Model = 'sonnet' | 'haiku' | 'opus' | 'auto';

/**
 * Work phases for phase detection
 */
export type Phase = 'planning' | 'execution' | 'review';

/**
 * Cost profiles for agents
 */
export type CostProfile = 'planning' | 'execution' | 'hybrid';

/**
 * Fallback behavior when preferred model fails
 */
export type FallbackBehavior = 'strict' | 'flexible' | 'auto';

/**
 * Agent model preference loaded from AGENT.md frontmatter
 */
export interface AgentModelPreference {
  agent: string;
  preference: Model;
  profile: CostProfile;
  fallback: FallbackBehavior;
}

/**
 * Model selection decision with reasoning
 */
export interface ModelSelectionDecision {
  model: Exclude<Model, 'auto'>;
  reason: 'user_override' | 'agent_preference' | 'phase_detection' | 'low_confidence_default' | 'cost_policy' | 'fallback';
  confidence?: number;
  reasoning: string;
  alternatives?: Array<{ model: Model; score: number }>;
}

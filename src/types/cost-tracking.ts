/**
 * Type definitions for Cost Tracking system
 *
 * Tracks token usage and costs per session, agent, phase, and increment.
 * Calculates savings vs all-Sonnet baseline.
 */

import type { Model, Phase } from './model-selection';

/**
 * Token usage for a single LLM call
 */
export interface TokenUsage {
  input: number;
  output: number;
  cached?: number;
}

/**
 * Single cost tracking session (one agent invocation)
 */
export interface CostSession {
  sessionId: string;
  timestamp: string;
  incrementId?: string;
  agent?: string;
  model: Exclude<Model, 'auto'>;
  phase: Phase;
  tokens: TokenUsage;
  cost: {
    input: number;
    output: number;
    total: number;
  };
  duration: number; // milliseconds
  success: boolean;
  errorType?: string;
}

/**
 * Cost report for an entire increment
 */
export interface IncrementCostReport {
  incrementId: string;
  startTime: string;
  endTime: string;
  sessions: CostSession[];
  totals: {
    sonnetCost: number;
    haikuCost: number;
    opusCost: number;
    totalCost: number;
  };
  breakdown: {
    byAgent: Record<string, number>;
    byPhase: Record<string, number>;
    byModel: Record<string, number>;
  };
  savings: {
    baselineCost: number; // What it would cost with all Sonnet
    actualCost: number;
    savedAmount: number;
    savedPercent: number;
  };
  efficiency: {
    avgCostPerTask: number;
    avgDuration: number;
    successRate: number;
  };
}

/**
 * Type definitions for Cost Tracking system
 *
 * Tracks token usage and costs per session, agent, model, and increment.
 * Calculates savings vs all-Sonnet baseline.
 */

import type { Model } from './model-selection.js';

/**
 * Token usage for a single session
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Single cost tracking session (one agent invocation)
 */
export interface CostSession {
  sessionId: string;
  agent: string;
  model: Exclude<Model, 'auto'>;
  increment?: string;
  command?: string;
  startedAt: string;
  endedAt?: string;
  tokenUsage: TokenUsage;
  cost: number; // Total cost in dollars
  savings: number; // Savings vs Sonnet baseline
}

/**
 * Cost report for an entire increment
 */
export interface IncrementCostReport {
  incrementId: string;
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessionCount: number;
  costByModel: Record<string, number>;
  costByAgent: Record<string, number>;
}

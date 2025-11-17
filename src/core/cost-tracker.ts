/**
 * Cost Tracker Service
 *
 * Real-time cost tracking for agent executions. Tracks token usage, calculates
 * costs, aggregates by increment, and calculates savings vs baseline (Sonnet-only).
 *
 * Persistence: Stores data in .specweave/logs/costs.json
 */

import fs from 'fs-extra';
import path from 'path';
import type { Model } from '../types/model-selection.js';
import type { TokenUsage, CostSession, IncrementCostReport } from '../types/cost-tracking.js';
import { calculateCost, calculateSavings } from '../utils/pricing-constants.js';

interface CostTrackerConfig {
  logPath?: string;
  autoSave?: boolean;
}

const DEFAULT_LOG_PATH = '.specweave/logs/costs.json';

export class CostTracker {
  private sessions: Map<string, CostSession> = new Map();
  private currentSessionId: string | null = null;
  private logPath: string;
  private autoSave: boolean;

  constructor(config: CostTrackerConfig = {}) {
    this.logPath = config.logPath || DEFAULT_LOG_PATH;
    this.autoSave = config.autoSave !== false; // Default true
  }

  /**
   * Start a new tracking session
   *
   * @param agent - Agent name (e.g., 'pm', 'frontend')
   * @param model - Model used ('sonnet', 'haiku', 'opus')
   * @param increment - Optional increment ID (e.g., '0003')
   * @param command - Optional command that triggered this (e.g., '/specweave.inc')
   * @returns Session ID
   */
  startSession(
    agent: string,
    model: Exclude<Model, 'auto'>,
    increment?: string,
    command?: string
  ): string {
    const sessionId = this.generateSessionId();
    const session: CostSession = {
      sessionId,
      agent,
      model,
      increment,
      command,
      startedAt: new Date().toISOString(),
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      cost: 0,
      savings: 0,
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    return sessionId;
  }

  /**
   * Record token usage for current session
   *
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param sessionId - Optional session ID (defaults to current)
   */
  recordTokens(
    inputTokens: number,
    outputTokens: number,
    sessionId?: string
  ): void {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error('No active session. Call startSession() first.');
    }

    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    // Update token usage
    session.tokenUsage.inputTokens += inputTokens;
    session.tokenUsage.outputTokens += outputTokens;
    session.tokenUsage.totalTokens += inputTokens + outputTokens;

    // Recalculate cost
    session.cost = calculateCost(
      session.model,
      session.tokenUsage.inputTokens,
      session.tokenUsage.outputTokens
    );

    // Calculate savings vs Sonnet baseline
    session.savings = calculateSavings(
      session.model,
      session.tokenUsage.inputTokens,
      session.tokenUsage.outputTokens
    );
  }

  /**
   * End current session
   *
   * @param sessionId - Optional session ID (defaults to current)
   */
  endSession(sessionId?: string): void {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error('No active session to end');
    }

    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    session.endedAt = new Date().toISOString();

    if (this.autoSave) {
      this.saveToDisk();
    }

    // Clear current session if it's the one we just ended
    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CostSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current session
   */
  getCurrentSession(): CostSession | undefined {
    return this.currentSessionId
      ? this.sessions.get(this.currentSessionId)
      : undefined;
  }

  /**
   * Get all sessions for a specific increment
   *
   * @param incrementId - Increment ID (e.g., '0003')
   * @returns Array of sessions for this increment
   */
  getIncrementSessions(incrementId: string): CostSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.increment === incrementId
    );
  }

  /**
   * Get cost report for a specific increment
   *
   * @param incrementId - Increment ID (e.g., '0003')
   * @returns Aggregate cost report
   */
  getIncrementCost(incrementId: string): IncrementCostReport {
    const sessions = this.getIncrementSessions(incrementId);

    if (sessions.length === 0) {
      return {
        incrementId,
        totalCost: 0,
        totalSavings: 0,
        totalTokens: 0,
        sessionCount: 0,
        costByModel: {},
        costByAgent: {},
      };
    }

    const report: IncrementCostReport = {
      incrementId,
      totalCost: 0,
      totalSavings: 0,
      totalTokens: 0,
      sessionCount: sessions.length,
      costByModel: {},
      costByAgent: {},
    };

    for (const session of sessions) {
      // Aggregate totals
      report.totalCost += session.cost;
      report.totalSavings += session.savings;
      report.totalTokens += session.tokenUsage.totalTokens;

      // Aggregate by model
      if (!report.costByModel[session.model]) {
        report.costByModel[session.model] = 0;
      }
      report.costByModel[session.model] += session.cost;

      // Aggregate by agent
      if (!report.costByAgent[session.agent]) {
        report.costByAgent[session.agent] = 0;
      }
      report.costByAgent[session.agent] += session.cost;
    }

    return report;
  }

  /**
   * Get total cost across all sessions
   */
  getTotalCost(): number {
    return Array.from(this.sessions.values()).reduce(
      (sum, session) => sum + session.cost,
      0
    );
  }

  /**
   * Get total savings across all sessions
   */
  getTotalSavings(): number {
    return Array.from(this.sessions.values()).reduce(
      (sum, session) => sum + session.savings,
      0
    );
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CostSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clearSessions(): void {
    this.sessions.clear();
    this.currentSessionId = null;
  }

  /**
   * Save sessions to disk
   */
  async saveToDisk(): Promise<void> {
    try {
      const data = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
          ...session,
          sessionId: id,
        })),
      };

      await fs.ensureDir(path.dirname(this.logPath));
      await fs.writeJson(this.logPath, data, { spaces: 2 });
    } catch (error: any) {
      throw new Error(`Failed to save cost data: ${error.message}`);
    }
  }

  /**
   * Load sessions from disk
   */
  async loadFromDisk(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.logPath))) {
        // No data file yet, that's ok
        return;
      }

      const data = await fs.readJson(this.logPath);

      // Validate version (for future migrations)
      if (data.version !== '1.0') {
        throw new Error(`Unsupported cost data version: ${data.version}`);
      }

      // Load sessions
      this.sessions.clear();
      for (const session of data.sessions) {
        this.sessions.set(session.sessionId, session);
      }
    } catch (error: any) {
      throw new Error(`Failed to load cost data: ${error.message}`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalSessions: number;
    totalCost: number;
    totalSavings: number;
    savingsPercentage: number;
    mostExpensiveAgent: string | null;
    cheapestAgent: string | null;
  } {
    const sessions = this.getAllSessions();

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalCost: 0,
        totalSavings: 0,
        savingsPercentage: 0,
        mostExpensiveAgent: null,
        cheapestAgent: null,
      };
    }

    const totalCost = this.getTotalCost();
    const totalSavings = this.getTotalSavings();
    const baselineCost = totalCost + totalSavings;

    // Calculate by agent
    const agentCosts: Record<string, number> = {};
    for (const session of sessions) {
      if (!agentCosts[session.agent]) {
        agentCosts[session.agent] = 0;
      }
      agentCosts[session.agent] += session.cost;
    }

    const sortedAgents = Object.entries(agentCosts).sort(
      ([, a], [, b]) => b - a
    );

    return {
      totalSessions: sessions.length,
      totalCost,
      totalSavings,
      savingsPercentage: baselineCost > 0 ? (totalSavings / baselineCost) * 100 : 0,
      mostExpensiveAgent: sortedAgents[0]?.[0] || null,
      cheapestAgent: sortedAgents[sortedAgents.length - 1]?.[0] || null,
    };
  }
}

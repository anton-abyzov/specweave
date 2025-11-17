/**
 * Cost Estimator - AI execution cost estimation
 *
 * Estimates the cost of autonomous workflow execution based on
 * AI API calls, task count, and complexity.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/cost-estimator
 * @since v0.22.0
 */

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Cost estimate for workflow execution
 */
export interface CostEstimate {
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Cost breakdown by phase */
  breakdown: CostBreakdown[];
  /** Risk level */
  riskLevel: RiskLevel;
  /** Explanation */
  explanation: string;
  /** Confidence in estimate (0.0-1.0) */
  confidence: number;
}

/**
 * Cost breakdown by phase
 */
export interface CostBreakdown {
  /** Phase name */
  phase: string;
  /** Number of AI calls */
  aiCalls: number;
  /** Estimated cost */
  cost: number;
}

/**
 * Risk level for cost
 */
export enum RiskLevel {
  /** < $1 */
  LOW = 'low',
  /** $1 - $5 */
  MEDIUM = 'medium',
  /** $5 - $20 */
  HIGH = 'high',
  /** > $20 */
  CRITICAL = 'critical'
}

/**
 * Cost estimation configuration
 */
export interface CostEstimatorConfig {
  /** Cost per AI call (default: $0.01) */
  costPerCall?: number;
  /** Low risk threshold (default: $1) */
  lowThreshold?: number;
  /** Medium risk threshold (default: $5) */
  mediumThreshold?: number;
  /** High risk threshold (default: $20) */
  highThreshold?: number;
}

/**
 * Cost Estimator - Estimate autonomous execution costs
 */
export class CostEstimator {
  private costPerCall: number;
  private lowThreshold: number;
  private mediumThreshold: number;
  private highThreshold: number;

  constructor(config: CostEstimatorConfig = {}) {
    this.costPerCall = config.costPerCall || 0.01;
    this.lowThreshold = config.lowThreshold || 1.0;
    this.mediumThreshold = config.mediumThreshold || 5.0;
    this.highThreshold = config.highThreshold || 20.0;
  }

  /**
   * Estimate cost for increment execution
   *
   * @param incrementPath - Path to increment directory
   * @returns Cost estimate
   */
  async estimateIncrement(incrementPath: string): Promise<CostEstimate> {
    const breakdown: CostBreakdown[] = [];
    let totalCost = 0;

    // Planning phase: 2 AI calls (Architect + test-aware-planner)
    const planningCost = this.estimatePlanning(incrementPath);
    breakdown.push(planningCost);
    totalCost += planningCost.cost;

    // Execution phase: Based on task count
    const executionCost = await this.estimateExecution(incrementPath);
    breakdown.push(executionCost);
    totalCost += executionCost.cost;

    // Validation phase: 1 AI call (PM validation)
    const validationCost = this.estimateValidation();
    breakdown.push(validationCost);
    totalCost += validationCost.cost;

    // QA phase: 1 AI call (judge LLM)
    const qaCost = this.estimateQA();
    breakdown.push(qaCost);
    totalCost += qaCost.cost;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(totalCost);

    // Calculate confidence based on data availability
    const confidence = await this.calculateConfidence(incrementPath);

    return {
      estimatedCost: totalCost,
      breakdown,
      riskLevel,
      explanation: this.generateExplanation(totalCost, riskLevel, breakdown),
      confidence
    };
  }

  /**
   * Estimate planning cost
   */
  private estimatePlanning(incrementPath: string): CostBreakdown {
    // Planning = Architect + test-aware-planner = 2 calls
    return {
      phase: 'Planning',
      aiCalls: 2,
      cost: 2 * this.costPerCall
    };
  }

  /**
   * Estimate execution cost based on task count
   */
  private async estimateExecution(incrementPath: string): Promise<CostBreakdown> {
    const tasksPath = path.join(incrementPath, 'tasks.md');
    let taskCount = 0;

    // Try to count tasks from tasks.md
    if (await fs.pathExists(tasksPath)) {
      try {
        const content = await fs.readFile(tasksPath, 'utf-8');
        // Count task headers (#### T-XXX:)
        const taskMatches = content.match(/^####\s+T-\d+:/gm);
        taskCount = taskMatches ? taskMatches.length : 0;
      } catch (error) {
        // If can't read tasks, estimate based on spec
        taskCount = 10; // Default estimate
      }
    } else {
      // No tasks.md yet, estimate from spec.md
      taskCount = await this.estimateTasksFromSpec(incrementPath);
    }

    // Assume 3 AI calls per task (avg: simple=1, medium=3, complex=5)
    const aiCalls = taskCount * 3;

    return {
      phase: 'Execution',
      aiCalls,
      cost: aiCalls * this.costPerCall
    };
  }

  /**
   * Estimate task count from spec.md
   */
  private async estimateTasksFromSpec(incrementPath: string): Promise<number> {
    const specPath = path.join(incrementPath, 'spec.md');

    if (!await fs.pathExists(specPath)) {
      return 10; // Default estimate
    }

    try {
      const content = await fs.readFile(specPath, 'utf-8');

      // Count acceptance criteria as rough proxy for tasks
      const acMatches = content.match(/^- \[.\] AC-/gm);
      const acCount = acMatches ? acMatches.length : 0;

      // Rough heuristic: 2 ACs ≈ 1 task
      return Math.max(Math.floor(acCount / 2), 5);
    } catch (error) {
      return 10;
    }
  }

  /**
   * Estimate validation cost
   */
  private estimateValidation(): CostBreakdown {
    // Validation = 1 PM validation call
    return {
      phase: 'Validation',
      aiCalls: 1,
      cost: 1 * this.costPerCall
    };
  }

  /**
   * Estimate QA cost
   */
  private estimateQA(): CostBreakdown {
    // QA = 1 judge LLM call
    return {
      phase: 'QA',
      aiCalls: 1,
      cost: 1 * this.costPerCall
    };
  }

  /**
   * Determine risk level based on total cost
   */
  private determineRiskLevel(cost: number): RiskLevel {
    if (cost < this.lowThreshold) {
      return RiskLevel.LOW;
    } else if (cost < this.mediumThreshold) {
      return RiskLevel.MEDIUM;
    } else if (cost < this.highThreshold) {
      return RiskLevel.HIGH;
    } else {
      return RiskLevel.CRITICAL;
    }
  }

  /**
   * Calculate confidence in estimate
   */
  private async calculateConfidence(incrementPath: string): Promise<number> {
    // Higher confidence if tasks.md exists
    const tasksExists = await fs.pathExists(path.join(incrementPath, 'tasks.md'));
    const planExists = await fs.pathExists(path.join(incrementPath, 'plan.md'));
    const specExists = await fs.pathExists(path.join(incrementPath, 'spec.md'));

    if (tasksExists && planExists) {
      return 0.9; // High confidence (tasks are defined)
    } else if (specExists) {
      return 0.6; // Medium confidence (only spec exists)
    } else {
      return 0.3; // Low confidence (estimating blindly)
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    totalCost: number,
    riskLevel: RiskLevel,
    breakdown: CostBreakdown[]
  ): string {
    const parts: string[] = [];

    parts.push(`Estimated cost: $${totalCost.toFixed(2)} (Risk: ${riskLevel.toUpperCase()})`);
    parts.push('\nBreakdown:');

    breakdown.forEach(item => {
      parts.push(`  - ${item.phase}: ${item.aiCalls} AI calls ($${item.cost.toFixed(2)})`);
    });

    if (riskLevel === RiskLevel.CRITICAL) {
      parts.push('\n⚠️  CRITICAL: Cost exceeds $20. Consider manual execution or splitting work.');
    } else if (riskLevel === RiskLevel.HIGH) {
      parts.push('\n⚠️  HIGH: Cost is significant ($5-$20). Confirm before proceeding.');
    }

    return parts.join('\n');
  }

  /**
   * Check if cost exceeds threshold
   *
   * @param estimate - Cost estimate
   * @returns True if cost exceeds HIGH threshold
   */
  checkThreshold(estimate: CostEstimate): boolean {
    return estimate.riskLevel === RiskLevel.HIGH || estimate.riskLevel === RiskLevel.CRITICAL;
  }
}

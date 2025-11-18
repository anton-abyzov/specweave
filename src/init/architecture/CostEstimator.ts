/**
 * Cost Estimation Calculator (T-040)
 *
 * Calculates infrastructure costs at different user scales
 * for each architecture type.
 */

import type { ArchitectureType, CostEstimate } from './types.js';

/**
 * Cost model for each architecture type
 */
interface CostModel {
  /** Fixed monthly costs (servers, databases, etc.) */
  fixedCosts: number;

  /** Variable cost per 1K users */
  variableCostPer1KUsers: number;

  /** Compliance overhead (HIPAA/PCI adds $2K-$5K/month) */
  complianceOverhead: number;

  /** Free tier breakpoint (users covered by free tier) */
  freeBreakpoint?: number;
}

/**
 * Cost models for all architecture types
 */
const COST_MODELS: Record<ArchitectureType, CostModel> = {
  serverless: {
    fixedCosts: 0,
    variableCostPer1KUsers: 0.85, // $0.85 per 1K users
    complianceOverhead: 0,
    freeBreakpoint: 5000 // AWS free tier covers ~5K users
  },
  'traditional-monolith': {
    fixedCosts: 300, // ECS + RDS base
    variableCostPer1KUsers: 1.5,
    complianceOverhead: 2500, // HIPAA/PCI baseline
    freeBreakpoint: undefined
  },
  microservices: {
    fixedCosts: 5000, // Kubernetes cluster + infrastructure
    variableCostPer1KUsers: 10,
    complianceOverhead: 0,
    freeBreakpoint: undefined
  },
  'modular-monolith': {
    fixedCosts: 100, // ECS + RDS
    variableCostPer1KUsers: 2,
    complianceOverhead: 0,
    freeBreakpoint: undefined
  },
  jamstack: {
    fixedCosts: 0,
    variableCostPer1KUsers: 0.5,
    complianceOverhead: 0,
    freeBreakpoint: 10000 // Vercel free tier
  },
  hybrid: {
    fixedCosts: 500,
    variableCostPer1KUsers: 5,
    complianceOverhead: 0,
    freeBreakpoint: undefined
  }
};

/**
 * Cost Estimator Class
 */
export class CostEstimator {
  /**
   * Estimate cost for specific architecture and user count
   *
   * @param architecture - Architecture type
   * @param users - Number of users
   * @param hasCompliance - Whether compliance standards apply (HIPAA/PCI)
   * @returns Formatted cost string
   */
  public estimateCost(
    architecture: ArchitectureType,
    users: number,
    hasCompliance = false
  ): string {
    const model = COST_MODELS[architecture];

    // Check free tier breakpoint
    if (model.freeBreakpoint && users <= model.freeBreakpoint) {
      return '$0/month (free tier)';
    }

    // Calculate base cost
    let cost = model.fixedCosts;

    // Calculate variable cost (subtract free tier if applicable)
    const chargeableUsers = model.freeBreakpoint
      ? Math.max(0, users - model.freeBreakpoint)
      : users;
    cost += (chargeableUsers / 1000) * model.variableCostPer1KUsers;

    // Add compliance overhead
    if (hasCompliance) {
      cost += model.complianceOverhead;
    }

    // Round to nearest $5
    cost = Math.round(cost / 5) * 5;

    return `$${cost.toLocaleString()}/month`;
  }

  /**
   * Generate complete cost estimate at 4 scales
   *
   * @param architecture - Architecture type
   * @param hasCompliance - Whether compliance standards apply
   * @returns Cost estimate object
   */
  public generateCostEstimate(
    architecture: ArchitectureType,
    hasCompliance = false
  ): CostEstimate {
    return {
      at1K: this.estimateCost(architecture, 1000, hasCompliance),
      at10K: this.estimateCost(architecture, 10000, hasCompliance),
      at100K: this.estimateCost(architecture, 100000, hasCompliance),
      at1M: this.estimateCost(architecture, 1000000, hasCompliance)
    };
  }

  /**
   * Get cost model for architecture (for testing/debugging)
   */
  public getCostModel(architecture: ArchitectureType): CostModel {
    return COST_MODELS[architecture];
  }
}

/**
 * Singleton instance
 */
export const costEstimator = new CostEstimator();

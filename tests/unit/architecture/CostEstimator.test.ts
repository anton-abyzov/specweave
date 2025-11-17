import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for CostEstimator (T-040)
 */

import { CostEstimator } from '../../../src/init/architecture/CostEstimator.js.js';
import type { ArchitectureType } from '../../../src/init/architecture/types.js.js';

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  describe('estimateCost', () => {
    it('should return $0 for serverless with 1K users (free tier)', () => {
      const cost = estimator.estimateCost('serverless', 1000, false);
      expect(cost).toBe('$0/month (free tier)');
    });

    it('should return $0 for JAMstack with 5K users (free tier)', () => {
      const cost = estimator.estimateCost('jamstack', 5000, false);
      expect(cost).toBe('$0/month (free tier)');
    });

    it('should calculate serverless cost beyond free tier', () => {
      const cost = estimator.estimateCost('serverless', 10000, false);
      // 10K users, 5K free tier = 5K chargeable
      // 5K * $0.85/1K = $4.25 ≈ $5 (rounded to nearest $5)
      expect(cost).toBe('$5/month');
    });

    it('should calculate traditional monolith base cost', () => {
      const cost = estimator.estimateCost('traditional-monolith', 1000, false);
      // Fixed: $300, Variable: 1K * $1.5/1K = $1.5
      // Total: $301.5 ≈ $300 (rounded)
      expect(cost).toBe('$300/month');
    });

    it('should add compliance overhead for traditional monolith', () => {
      const cost = estimator.estimateCost('traditional-monolith', 1000, true);
      // Fixed: $300, Variable: $1.5, Compliance: $2500
      // Total: $2801.5 ≈ $2800 (rounded to nearest $5)
      expect(cost).toBe('$2,800/month');
    });

    it('should calculate microservices high fixed cost', () => {
      const cost = estimator.estimateCost('microservices', 1000, false);
      // Fixed: $5000, Variable: 1K * $10/1K = $10
      // Total: $5010 ≈ $5010 (rounded)
      expect(cost).toBe('$5,010/month');
    });

    it('should scale costs linearly with users', () => {
      const cost1K = estimator.estimateCost('modular-monolith', 1000, false);
      const cost10K = estimator.estimateCost('modular-monolith', 10000, false);
      const cost100K = estimator.estimateCost('modular-monolith', 100000, false);

      // Fixed: $100, Variable: $2/1K users
      // 1K:   $102 ≈ $100
      // 10K:  $120 ≈ $120
      // 100K: $300 ≈ $300

      expect(cost1K).toBe('$100/month');
      expect(cost10K).toBe('$120/month');
      expect(cost100K).toBe('$300/month');
    });
  });

  describe('generateCostEstimate', () => {
    it('should generate cost estimate for all scales', () => {
      const estimate = estimator.generateCostEstimate('serverless', false);

      expect(estimate).toHaveProperty('at1K');
      expect(estimate).toHaveProperty('at10K');
      expect(estimate).toHaveProperty('at100K');
      expect(estimate).toHaveProperty('at1M');
    });

    it('should show serverless cost progression', () => {
      const estimate = estimator.generateCostEstimate('serverless', false);

      expect(estimate.at1K).toBe('$0/month (free tier)'); // Free tier
      expect(estimate.at10K).toBe('$5/month');
      expect(estimate.at100K).toBe('$80/month');
      expect(estimate.at1M).toBe('$845/month');
    });

    it('should show traditional monolith with compliance', () => {
      const estimate = estimator.generateCostEstimate('traditional-monolith', true);

      // All scales include $2500 compliance overhead
      expect(estimate.at1K).toBe('$2,800/month');
      expect(estimate.at10K).toBe('$2,815/month');
      expect(estimate.at100K).toBe('$2,950/month');
      expect(estimate.at1M).toBe('$4,300/month');
    });

    it('should show microservices expensive at all scales', () => {
      const estimate = estimator.generateCostEstimate('microservices', false);

      expect(estimate.at1K).toBe('$5,010/month');
      expect(estimate.at10K).toBe('$5,100/month');
      expect(estimate.at100K).toBe('$6,000/month');
      expect(estimate.at1M).toBe('$15,000/month');
    });

    it('should show JAMstack cheapest option', () => {
      const estimate = estimator.generateCostEstimate('jamstack', false);

      expect(estimate.at1K).toBe('$0/month (free tier)');
      expect(estimate.at10K).toBe('$0/month (free tier)'); // 10K still free
      expect(estimate.at100K).toBe('$45/month');
      expect(estimate.at1M).toBe('$495/month');
    });
  });

  describe('getCostModel', () => {
    it('should return cost model for serverless', () => {
      const model = estimator.getCostModel('serverless');

      expect(model.fixedCosts).toBe(0);
      expect(model.variableCostPer1KUsers).toBe(0.85);
      expect(model.freeBreakpoint).toBe(5000);
    });

    it('should return cost model for traditional-monolith', () => {
      const model = estimator.getCostModel('traditional-monolith');

      expect(model.fixedCosts).toBe(300);
      expect(model.variableCostPer1KUsers).toBe(1.5);
      expect(model.complianceOverhead).toBe(2500);
    });

    it('should return cost model for all architectures', () => {
      const architectures: ArchitectureType[] = [
        'serverless',
        'traditional-monolith',
        'microservices',
        'modular-monolith',
        'jamstack',
        'hybrid'
      ];

      for (const arch of architectures) {
        const model = estimator.getCostModel(arch);
        expect(model).toBeDefined();
        expect(typeof model.fixedCosts).toBe('number');
        expect(typeof model.variableCostPer1KUsers).toBe('number');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle 0 users', () => {
      const cost = estimator.estimateCost('serverless', 0, false);
      expect(cost).toBe('$0/month (free tier)');
    });

    it('should handle negative users (treated as 0)', () => {
      const cost = estimator.estimateCost('serverless', -1000, false);
      expect(cost).toBe('$0/month (free tier)');
    });

    it('should handle very large user counts', () => {
      const cost = estimator.estimateCost('serverless', 10000000, false); // 10M users
      // Should not crash, should return formatted string
      expect(cost).toMatch(/\$/);
      expect(cost).toMatch(/month/);
    });
  });
});

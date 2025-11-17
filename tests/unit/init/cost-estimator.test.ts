import { describe, it, expect } from 'vitest';
import { CostEstimator } from '../../../src/init/architecture/CostEstimator.js';
import type { ArchitectureType } from '../../../src/init/architecture/types.js';

/**
 * Unit tests for CostEstimator (T-040)
 *
 * Tests cost calculation logic for different architecture types,
 * user scales, and compliance requirements.
 */

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  describe('Basic cost estimation', () => {
    it('should estimate cost for serverless architecture', () => {
      const cost = estimator.estimateCost('serverless', 1000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
      expect(cost).toMatch(/\$[\d,]+\/month/);
    });

    it('should estimate cost for traditional-monolith architecture', () => {
      const cost = estimator.estimateCost('traditional-monolith', 10000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
      expect(cost).toMatch(/\$[\d,]+\/month/);
    });

    it('should estimate cost for microservices architecture', () => {
      const cost = estimator.estimateCost('microservices', 100000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
      expect(cost).toMatch(/\$[\d,]+\/month/);
    });

    it('should estimate cost for modular-monolith architecture', () => {
      const cost = estimator.estimateCost('modular-monolith', 5000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
    });

    it('should estimate cost for jamstack architecture', () => {
      const cost = estimator.estimateCost('jamstack', 2000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
    });

    it('should estimate cost for hybrid architecture', () => {
      const cost = estimator.estimateCost('hybrid', 50000, false);

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('string');
    });
  });

  describe('Free tier breakpoints', () => {
    it('should return $0 for serverless under free tier (5K users)', () => {
      const cost = estimator.estimateCost('serverless', 3000, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should return $0 for serverless at exact free tier breakpoint', () => {
      const cost = estimator.estimateCost('serverless', 5000, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should charge for serverless above free tier', () => {
      const cost = estimator.estimateCost('serverless', 6000, false);

      expect(cost).not.toBe('$0/month (free tier)');
      expect(cost).toMatch(/\$\d+\/month/);
    });

    it('should return $0 for jamstack under free tier (10K users)', () => {
      const cost = estimator.estimateCost('jamstack', 8000, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should return $0 for jamstack at exact free tier breakpoint', () => {
      const cost = estimator.estimateCost('jamstack', 10000, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should charge for jamstack above free tier', () => {
      const cost = estimator.estimateCost('jamstack', 15000, false);

      expect(cost).not.toBe('$0/month (free tier)');
    });

    it('should not have free tier for traditional-monolith', () => {
      const cost = estimator.estimateCost('traditional-monolith', 1000, false);

      expect(cost).not.toBe('$0/month (free tier)');
    });

    it('should not have free tier for microservices', () => {
      const cost = estimator.estimateCost('microservices', 100, false);

      expect(cost).not.toBe('$0/month (free tier)');
    });
  });

  describe('Compliance overhead', () => {
    it('should add compliance overhead for traditional-monolith', () => {
      const withoutCompliance = estimator.estimateCost('traditional-monolith', 10000, false);
      const withCompliance = estimator.estimateCost('traditional-monolith', 10000, true);

      // Parse costs (remove $, commas, and /month)
      const costWithout = parseInt(withoutCompliance.replace(/[$,\/month]/g, ''));
      const costWith = parseInt(withCompliance.replace(/[$,\/month]/g, ''));

      expect(costWith).toBeGreaterThan(costWithout);

      // Compliance overhead should be $2,500/month
      expect(costWith - costWithout).toBeGreaterThanOrEqual(2000);
    });

    it('should not add compliance overhead for serverless', () => {
      const withoutCompliance = estimator.estimateCost('serverless', 10000, false);
      const withCompliance = estimator.estimateCost('serverless', 10000, true);

      expect(withCompliance).toBe(withoutCompliance);
    });

    it('should not add compliance overhead for jamstack', () => {
      const withoutCompliance = estimator.estimateCost('jamstack', 15000, false);
      const withCompliance = estimator.estimateCost('jamstack', 15000, true);

      expect(withCompliance).toBe(withoutCompliance);
    });
  });

  describe('Cost scaling with user count', () => {
    it('should scale serverless costs linearly with users', () => {
      const cost1K = estimator.estimateCost('serverless', 10000, false);
      const cost10K = estimator.estimateCost('serverless', 20000, false);

      const cost1KNum = parseInt(cost1K.replace(/[$,\/month()freetier ]/g, ''));
      const cost10KNum = parseInt(cost10K.replace(/[$,\/month()freetier ]/g, ''));

      // More users should cost more
      expect(cost10KNum).toBeGreaterThan(cost1KNum);
    });

    it('should scale traditional costs with users and services', () => {
      const cost1K = estimator.estimateCost('traditional-monolith', 1000, false);
      const cost100K = estimator.estimateCost('traditional-monolith', 100000, false);

      const cost1KNum = parseInt(cost1K.replace(/[$,\/month]/g, ''));
      const cost100KNum = parseInt(cost100K.replace(/[$,\/month]/g, ''));

      expect(cost100KNum).toBeGreaterThan(cost1KNum);
    });

    it('should have significant fixed costs for microservices', () => {
      const cost = estimator.estimateCost('microservices', 1000, false);
      const costNum = parseInt(cost.replace(/[$,\/month]/g, ''));

      // Microservices has $5K fixed costs
      expect(costNum).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('generateCostEstimate - complete cost breakdown', () => {
    it('should generate cost estimates at 4 scales', () => {
      const estimate = estimator.generateCostEstimate('serverless', false);

      expect(estimate).toHaveProperty('at1K');
      expect(estimate).toHaveProperty('at10K');
      expect(estimate).toHaveProperty('at100K');
      expect(estimate).toHaveProperty('at1M');

      expect(estimate.at1K).toMatch(/\$[\d,]+\/month/);
      expect(estimate.at10K).toMatch(/\$[\d,]+\/month/);
      expect(estimate.at100K).toMatch(/\$[\d,]+\/month/);
      expect(estimate.at1M).toMatch(/\$[\d,]+\/month/);
    });

    it('should scale costs progressively across scales', () => {
      const estimate = estimator.generateCostEstimate('traditional-monolith', false);

      // Parse costs
      const parse = (cost: string) => parseInt(cost.replace(/[$,\/month()freetier ]/g, ''));

      const cost1K = parse(estimate.at1K);
      const cost10K = parse(estimate.at10K);
      const cost100K = parse(estimate.at100K);
      const cost1M = parse(estimate.at1M);

      // Costs should increase with scale
      expect(cost10K).toBeGreaterThanOrEqual(cost1K);
      expect(cost100K).toBeGreaterThanOrEqual(cost10K);
      expect(cost1M).toBeGreaterThanOrEqual(cost100K);
    });

    it('should apply compliance overhead at all scales', () => {
      const withoutCompliance = estimator.generateCostEstimate('traditional-monolith', false);
      const withCompliance = estimator.generateCostEstimate('traditional-monolith', true);

      const parse = (cost: string) => parseInt(cost.replace(/[$,\/month]/g, ''));

      expect(parse(withCompliance.at1K)).toBeGreaterThan(parse(withoutCompliance.at1K));
      expect(parse(withCompliance.at10K)).toBeGreaterThan(parse(withoutCompliance.at10K));
      expect(parse(withCompliance.at100K)).toBeGreaterThan(parse(withoutCompliance.at100K));
      expect(parse(withCompliance.at1M)).toBeGreaterThan(parse(withoutCompliance.at1M));
    });
  });

  describe('getCostModel - cost model access', () => {
    it('should return cost model for serverless', () => {
      const model = estimator.getCostModel('serverless');

      expect(model).toBeDefined();
      expect(model).toHaveProperty('fixedCosts');
      expect(model).toHaveProperty('variableCostPer1KUsers');
      expect(model).toHaveProperty('complianceOverhead');
      expect(model).toHaveProperty('freeBreakpoint');

      expect(model.fixedCosts).toBe(0);
      expect(model.freeBreakpoint).toBe(5000);
    });

    it('should return cost model for traditional-monolith', () => {
      const model = estimator.getCostModel('traditional-monolith');

      expect(model.fixedCosts).toBeGreaterThan(0);
      expect(model.complianceOverhead).toBe(2500);
      expect(model.freeBreakpoint).toBeUndefined();
    });

    it('should return cost model for microservices', () => {
      const model = estimator.getCostModel('microservices');

      expect(model.fixedCosts).toBe(5000);
      expect(model.variableCostPer1KUsers).toBe(10);
    });

    it('should return cost model for jamstack', () => {
      const model = estimator.getCostModel('jamstack');

      expect(model.fixedCosts).toBe(0);
      expect(model.freeBreakpoint).toBe(10000);
    });

    it('should return cost model for hybrid', () => {
      const model = estimator.getCostModel('hybrid');

      expect(model.fixedCosts).toBeGreaterThan(0);
      expect(model.variableCostPer1KUsers).toBeGreaterThan(0);
    });

    it('should return cost model for modular-monolith', () => {
      const model = estimator.getCostModel('modular-monolith');

      expect(model.fixedCosts).toBeGreaterThan(0);
      expect(model.variableCostPer1KUsers).toBeGreaterThan(0);
    });
  });

  describe('Cost rounding behavior', () => {
    it('should round costs to nearest $5', () => {
      // Test with architecture types that have predictable costs
      const cost = estimator.estimateCost('serverless', 10000, false);
      const costNum = parseInt(cost.replace(/[$,\/month]/g, ''));

      // Cost should be divisible by 5
      expect(costNum % 5).toBe(0);
    });

    it('should round all estimates in generateCostEstimate', () => {
      const estimate = estimator.generateCostEstimate('traditional-monolith', false);

      const parse = (cost: string) => parseInt(cost.replace(/[$,\/month]/g, ''));

      expect(parse(estimate.at1K) % 5).toBe(0);
      expect(parse(estimate.at10K) % 5).toBe(0);
      expect(parse(estimate.at100K) % 5).toBe(0);
      expect(parse(estimate.at1M) % 5).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small user counts (1 user)', () => {
      const cost = estimator.estimateCost('serverless', 1, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should handle very large user counts (10M users)', () => {
      const cost = estimator.estimateCost('traditional-monolith', 10000000, false);

      expect(cost).toBeDefined();
      expect(cost).toMatch(/\$[\d,]+\/month/);
    });

    it('should handle zero users', () => {
      const cost = estimator.estimateCost('serverless', 0, false);

      expect(cost).toBe('$0/month (free tier)');
    });

    it('should handle users exactly at free tier boundary', () => {
      const serverlessCost = estimator.estimateCost('serverless', 5000, false);
      const jamstackCost = estimator.estimateCost('jamstack', 10000, false);

      expect(serverlessCost).toBe('$0/month (free tier)');
      expect(jamstackCost).toBe('$0/month (free tier)');
    });

    it('should handle users one above free tier boundary', () => {
      const serverlessCost = estimator.estimateCost('serverless', 5001, false);
      const jamstackCost = estimator.estimateCost('jamstack', 10001, false);

      expect(serverlessCost).not.toBe('$0/month (free tier)');
      expect(jamstackCost).not.toBe('$0/month (free tier)');
    });
  });

  describe('Architecture cost comparison', () => {
    it('should show serverless cheaper than traditional at low scale', () => {
      const serverlessCost = estimator.estimateCost('serverless', 10000, false);
      const traditionalCost = estimator.estimateCost('traditional-monolith', 10000, false);

      const serverlessNum = parseInt(serverlessCost.replace(/[$,\/month()freetier ]/g, ''));
      const traditionalNum = parseInt(traditionalCost.replace(/[$,\/month]/g, ''));

      expect(serverlessNum).toBeLessThan(traditionalNum);
    });

    it('should show jamstack cheapest for static content', () => {
      const jamstackCost = estimator.estimateCost('jamstack', 15000, false);
      const serverlessCost = estimator.estimateCost('serverless', 15000, false);
      const traditionalCost = estimator.estimateCost('traditional-monolith', 15000, false);

      const parse = (cost: string) => parseInt(cost.replace(/[$,\/month()freetier ]/g, ''));

      const jamstackNum = parse(jamstackCost);
      const serverlessNum = parse(serverlessCost);
      const traditionalNum = parse(traditionalCost);

      expect(jamstackNum).toBeLessThanOrEqual(serverlessNum);
      expect(jamstackNum).toBeLessThan(traditionalNum);
    });

    it('should show microservices most expensive due to fixed costs', () => {
      const microservicesCost = estimator.estimateCost('microservices', 1000, false);
      const serverlessCost = estimator.estimateCost('serverless', 1000, false);

      const parse = (cost: string) => parseInt(cost.replace(/[$,\/month()freetier ]/g, ''));

      expect(parse(microservicesCost)).toBeGreaterThan(parse(serverlessCost));
    });
  });
});

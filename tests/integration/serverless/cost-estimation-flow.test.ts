/**
 * Cost Estimation Flow Integration Tests
 *
 * Tests end-to-end cost estimation workflow including:
 * - Single platform cost estimation
 * - Multi-platform cost comparison
 * - Free tier calculations
 * - Cost breakdown analysis
 */

import { describe, it, expect } from 'vitest';
import { estimateCost } from '../../../src/core/serverless/cost-estimator.js';
import { compareCosts, getComparisonSummary } from '../../../src/core/serverless/cost-comparison.js';
import { loadAllPlatforms } from '../../../src/core/serverless/platform-data-loader.js';
import type { CostEstimationInput } from '../../../src/core/serverless/cost-estimator.js';

describe('Cost Estimation Flow Integration', () => {
  describe('testSinglePlatformCostEstimation', () => {
    it('should calculate accurate costs for AWS Lambda with free tier', () => {
      const knowledgeBase = loadAllPlatforms();
      const awsLambda = Array.from(knowledgeBase.platforms.values()).find(
        (p) => p.provider === 'AWS'
      )!;

      const input: CostEstimationInput = {
        requestsPerMonth: 500000, // 500K requests
        avgExecutionTimeMs: 200, // 200ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 5, // 5 GB
      };

      const result = estimateCost(awsLambda, input);

      // Verify structure
      expect(result.platform).toBeDefined();
      expect(result.input).toEqual(input);
      expect(result.breakdown).toBeDefined();
      expect(result.monthlyEstimate).toBeGreaterThanOrEqual(0);

      // Verify breakdown
      expect(result.breakdown.compute).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.requests).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.dataTransfer).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.total).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.freeTierDeduction).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.billableAmount).toBeGreaterThanOrEqual(0);

      // Verify free tier applied
      expect(result.breakdown.freeTierDeduction).toBeGreaterThan(0);

      // For small workload, should be within free tier or very cheap
      expect(result.monthlyEstimate).toBeLessThan(10);
    });

    it('should calculate costs for Firebase Cloud Functions', () => {
      const knowledgeBase = loadAllPlatforms();
      const firebase = Array.from(knowledgeBase.platforms.values()).find((p) =>
        p.id.includes('firebase')
      )!;

      const input: CostEstimationInput = {
        requestsPerMonth: 1000000, // 1M requests
        avgExecutionTimeMs: 300, // 300ms
        memoryMb: 256, // 256 MB
        dataTransferGb: 10, // 10 GB
      };

      const result = estimateCost(firebase, input);

      expect(result.platform.provider).toBe('firebase');
      expect(result.monthlyEstimate).toBeGreaterThanOrEqual(0);

      // Firebase has generous free tier
      expect(result.breakdown.freeTierDeduction).toBeGreaterThan(0);

      // Verify cost is reasonable
      expect(result.monthlyEstimate).toBeLessThan(50);
    });

    it('should calculate higher costs for large workload exceeding free tier', () => {
      const knowledgeBase = loadAllPlatforms();
      const awsLambda = Array.from(knowledgeBase.platforms.values()).find(
        (p) => p.provider === 'AWS'
      )!;

      const input: CostEstimationInput = {
        requestsPerMonth: 50000000, // 50M requests
        avgExecutionTimeMs: 500, // 500ms
        memoryMb: 1024, // 1 GB
        dataTransferGb: 200, // 200 GB
      };

      const result = estimateCost(awsLambda, input);

      // Large workload should have significant cost
      expect(result.monthlyEstimate).toBeGreaterThan(100);
      expect(result.withinFreeTier).toBe(false);

      // All cost categories should contribute
      expect(result.breakdown.compute).toBeGreaterThan(0);
      expect(result.breakdown.requests).toBeGreaterThan(0);
      expect(result.breakdown.dataTransfer).toBeGreaterThan(0);
    });

    it('should handle zero usage correctly', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 0,
        avgExecutionTimeMs: 0,
        memoryMb: 512,
        dataTransferGb: 0,
      };

      const result = estimateCost(platform, input);

      expect(result.monthlyEstimate).toBe(0);
      expect(result.withinFreeTier).toBe(true);
      expect(result.breakdown.billableAmount).toBe(0);
    });

    it('should handle minimal usage within free tier', () => {
      const knowledgeBase = loadAllPlatforms();
      const awsLambda = Array.from(knowledgeBase.platforms.values()).find(
        (p) => p.provider === 'AWS'
      )!;

      const input: CostEstimationInput = {
        requestsPerMonth: 100000, // 100K requests (well within free tier)
        avgExecutionTimeMs: 100, // 100ms
        memoryMb: 128, // 128 MB
        dataTransferGb: 1, // 1 GB
      };

      const result = estimateCost(awsLambda, input);

      // Should be within free tier
      expect(result.withinFreeTier).toBe(true);
      expect(result.monthlyEstimate).toBe(0);
      expect(result.breakdown.freeTierDeduction).toBeGreaterThan(0);
    });
  });

  describe('testMultiPlatformCostComparison', () => {
    it('should compare costs across all serverless platforms', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const input: CostEstimationInput = {
        requestsPerMonth: 2000000, // 2M requests
        avgExecutionTimeMs: 250, // 250ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 15, // 15 GB
      };

      const result = compareCosts(platforms, input);

      // Verify structure
      expect(result.input).toEqual(input);
      expect(result.platforms.length).toBe(platforms.length);
      expect(result.cheapest).toBeDefined();
      expect(result.mostExpensive).toBeDefined();
      expect(result.costDifferences.length).toBeGreaterThan(0);

      // Verify ranking
      for (let i = 0; i < result.platforms.length; i++) {
        expect(result.platforms[i].rank).toBe(i + 1);
      }

      // Verify sorted by cost
      for (let i = 0; i < result.platforms.length - 1; i++) {
        expect(result.platforms[i].totalCost).toBeLessThanOrEqual(result.platforms[i + 1].totalCost);
      }

      // Cheapest should be first
      expect(result.cheapest.rank).toBe(1);
      expect(result.cheapest.totalCost).toBeLessThanOrEqual(result.mostExpensive.totalCost);
    });

    it('should provide cost difference explanations', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const input: CostEstimationInput = {
        requestsPerMonth: 5000000, // 5M requests
        avgExecutionTimeMs: 400, // 400ms
        memoryMb: 1024, // 1 GB
        dataTransferGb: 50, // 50 GB
      };

      const result = compareCosts(platforms, input);

      // Should have meaningful cost differences
      expect(result.costDifferences.length).toBeGreaterThan(0);

      // First difference should compare most expensive vs cheapest
      expect(result.costDifferences[0]).toContain('more expensive');
      expect(result.costDifferences[0]).toContain(result.mostExpensive.platform.name);
      expect(result.costDifferences[0]).toContain(result.cheapest.platform.name);

      // Should explain pricing model differences
      const hasPricingExplanation = result.costDifferences.some(
        (diff) => diff.includes('pricing') || diff.includes('charges')
      );
      expect(hasPricingExplanation).toBe(true);
    });

    it('should identify platforms within free tier for small workload', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const input: CostEstimationInput = {
        requestsPerMonth: 200000, // 200K requests
        avgExecutionTimeMs: 150, // 150ms
        memoryMb: 256, // 256 MB
        dataTransferGb: 2, // 2 GB
      };

      const result = compareCosts(platforms, input);

      // At least some platforms should be within free tier
      const freeTierPlatforms = result.platforms.filter((p) => p.totalCost === 0);
      expect(freeTierPlatforms.length).toBeGreaterThan(0);

      // Cost differences should mention free tier
      const hasFreeTierMention = result.costDifferences.some((diff) => diff.includes('free tier'));
      expect(hasFreeTierMention).toBe(true);
    });

    it('should calculate comparison summary statistics', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const input: CostEstimationInput = {
        requestsPerMonth: 3000000, // 3M requests
        avgExecutionTimeMs: 300, // 300ms
        memoryMb: 768, // 768 MB
        dataTransferGb: 25, // 25 GB
      };

      const result = compareCosts(platforms, input);
      const summary = getComparisonSummary(result);

      expect(summary.averageCost).toBeGreaterThanOrEqual(0);
      expect(summary.medianCost).toBeGreaterThanOrEqual(0);
      expect(summary.costRange).toBeGreaterThanOrEqual(0);
      expect(summary.bestValue).toBeDefined();

      // Average should be between cheapest and most expensive
      expect(summary.averageCost).toBeGreaterThanOrEqual(result.cheapest.totalCost);
      expect(summary.averageCost).toBeLessThanOrEqual(result.mostExpensive.totalCost);

      // Cost range should be difference between most and least expensive
      expect(summary.costRange).toBe(result.mostExpensive.totalCost - result.cheapest.totalCost);
    });
  });

  describe('testCostBreakdownAnalysis', () => {
    it('should show compute-dominated cost breakdown for high memory usage', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 1000000, // 1M requests
        avgExecutionTimeMs: 1000, // 1 second (long execution)
        memoryMb: 3008, // 3 GB (high memory)
        dataTransferGb: 5, // 5 GB
      };

      const result = estimateCost(platform, input);

      // Compute should dominate
      expect(result.breakdown.compute).toBeGreaterThan(result.breakdown.requests);
      expect(result.breakdown.compute).toBeGreaterThan(result.breakdown.dataTransfer);
    });

    it('should show request-dominated cost breakdown for many short invocations', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 100000000, // 100M requests (very high)
        avgExecutionTimeMs: 50, // 50ms (very short)
        memoryMb: 128, // 128 MB (minimal)
        dataTransferGb: 5, // 5 GB
      };

      const result = estimateCost(platform, input);

      // Requests should dominate
      expect(result.breakdown.requests).toBeGreaterThan(result.breakdown.compute);
    });

    it('should show data-transfer-dominated cost breakdown for high transfer', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 2000000, // 2M requests
        avgExecutionTimeMs: 100, // 100ms
        memoryMb: 256, // 256 MB
        dataTransferGb: 1000, // 1 TB (very high)
      };

      const result = estimateCost(platform, input);

      // Data transfer should be significant
      expect(result.breakdown.dataTransfer).toBeGreaterThan(0);
      expect(result.breakdown.dataTransfer).toBeGreaterThan(result.breakdown.requests);
    });
  });

  describe('testFreeTierCalculations', () => {
    it('should correctly apply free tier deductions', () => {
      const knowledgeBase = loadAllPlatforms();
      const awsLambda = Array.from(knowledgeBase.platforms.values()).find(
        (p) => p.provider === 'AWS'
      )!;

      const input: CostEstimationInput = {
        requestsPerMonth: 1500000, // 1.5M requests (500K over free tier)
        avgExecutionTimeMs: 200, // 200ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 2, // 2 GB
      };

      const result = estimateCost(awsLambda, input);

      // Should have free tier deduction
      expect(result.breakdown.freeTierDeduction).toBeGreaterThan(0);

      // Should not be fully within free tier
      expect(result.withinFreeTier).toBe(false);

      // Billable amount should be less than total
      expect(result.breakdown.billableAmount).toBeLessThan(result.breakdown.total);
    });

    it('should handle workload exactly at free tier boundary', () => {
      const knowledgeBase = loadAllPlatforms();
      const awsLambda = Array.from(knowledgeBase.platforms.values()).find(
        (p) => p.provider === 'AWS'
      )!;

      // AWS Lambda free tier: 1M requests + 400,000 GB-seconds
      const input: CostEstimationInput = {
        requestsPerMonth: 1000000, // Exactly 1M requests
        avgExecutionTimeMs: 200, // 200ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 1, // 1 GB
      };

      const result = estimateCost(awsLambda, input);

      // Should apply free tier
      expect(result.breakdown.freeTierDeduction).toBeGreaterThan(0);

      // Cost should be minimal or zero
      expect(result.monthlyEstimate).toBeLessThan(1);
    });
  });

  describe('testEdgeCases', () => {
    it('should handle very small memory allocation', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 1000000,
        avgExecutionTimeMs: 100,
        memoryMb: 128, // Minimum
        dataTransferGb: 0,
      };

      const result = estimateCost(platform, input);

      expect(result.monthlyEstimate).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.compute).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large memory allocation', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 500000,
        avgExecutionTimeMs: 500,
        memoryMb: 10240, // 10 GB (maximum for some platforms)
        dataTransferGb: 10,
      };

      const result = estimateCost(platform, input);

      expect(result.monthlyEstimate).toBeGreaterThan(0);
      expect(result.breakdown.compute).toBeGreaterThan(0);
    });

    it('should handle very short execution time', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 10000000,
        avgExecutionTimeMs: 10, // Very short
        memoryMb: 128,
        dataTransferGb: 5,
      };

      const result = estimateCost(platform, input);

      expect(result.monthlyEstimate).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long execution time within limits', () => {
      const knowledgeBase = loadAllPlatforms();
      const platform = Array.from(knowledgeBase.platforms.values())[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 10000,
        avgExecutionTimeMs: 300000, // 5 minutes
        memoryMb: 1024,
        dataTransferGb: 5,
      };

      const result = estimateCost(platform, input);

      expect(result.monthlyEstimate).toBeGreaterThan(0);
      expect(result.breakdown.compute).toBeGreaterThan(0);
    });
  });
});

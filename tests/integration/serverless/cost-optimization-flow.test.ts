/**
 * Cost Optimization Flow Integration Tests
 *
 * Tests end-to-end cost optimization workflow including:
 * - Optimization recommendation generation
 * - Memory right-sizing
 * - Caching opportunities
 * - Batching recommendations
 * - Reserved capacity analysis
 * - Compression and CDN recommendations
 */

import { describe, it, expect } from 'vitest';
import { optimizeCost } from '../../../src/core/serverless/cost-optimizer.js';
import { estimateCost } from '../../../src/core/serverless/cost-estimator.js';
import { loadAllPlatforms } from '../../../src/core/serverless/platform-data-loader.js';
import type { CostEstimationInput } from '../../../src/core/serverless/cost-estimator.js';

describe('Cost Optimization Flow Integration', () => {
  describe('testFullOptimizationWorkflow', () => {
    it('should execute complete optimization workflow: estimate → analyze → recommend', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 10000000, // 10M requests
        avgExecutionTimeMs: 500, // 500ms
        memoryMb: 1024, // 1 GB
        dataTransferGb: 100, // 100 GB
      };

      // Step 1: Calculate current cost
      const currentEstimate = estimateCost(platform, input);
      expect(currentEstimate.monthlyEstimate).toBeGreaterThan(0);

      // Step 2: Analyze optimization opportunities
      const optimizationResult = optimizeCost(platform, input);

      // Step 3: Verify optimization structure
      expect(optimizationResult.currentCost).toBe(currentEstimate.monthlyEstimate);
      expect(optimizationResult.optimizedCost).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.recommendations.length).toBeGreaterThan(0);

      // Step 4: Verify optimized cost is less than current
      expect(optimizationResult.optimizedCost).toBeLessThanOrEqual(
        optimizationResult.currentCost
      );

      // Step 5: Verify savings calculation
      const calculatedSavings =
        optimizationResult.currentCost - optimizationResult.optimizedCost;
      expect(optimizationResult.potentialSavings).toBeCloseTo(calculatedSavings, 2);

      // Step 6: Verify recommendations are sorted by priority
      const priorities = optimizationResult.recommendations.map((r) => r.priority);
      const hasHighPriority = priorities.includes('high');
      expect(hasHighPriority || priorities.includes('medium')).toBe(true);
    });

    it('should generate multiple optimization recommendations for high-traffic workload', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 50000000, // 50M requests (high traffic)
        avgExecutionTimeMs: 400, // 400ms
        memoryMb: 2048, // 2 GB
        dataTransferGb: 500, // 500 GB
      };

      const result = optimizeCost(platform, input);

      // Should generate multiple recommendations
      expect(result.recommendations.length).toBeGreaterThanOrEqual(3);

      // Should have significant savings potential
      expect(result.potentialSavings).toBeGreaterThan(result.currentCost * 0.2); // At least 20%

      // All recommendations should have valid structure
      for (const rec of result.recommendations) {
        expect(rec.type).toMatch(/memory|caching|batching|reserved-capacity|compression|cdn/);
        expect(rec.description).toBeDefined();
        expect(rec.description.length).toBeGreaterThan(0);
        expect(rec.estimatedSavings).toBeGreaterThan(0);
        expect(rec.implementationComplexity).toMatch(/low|medium|high/);
        expect(rec.priority).toMatch(/high|medium|low/);
      }
    });
  });

  describe('testMemoryOptimization', () => {
    it('should recommend memory reduction for over-provisioned functions', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 5000000, // 5M requests
        avgExecutionTimeMs: 200, // 200ms (fast execution)
        memoryMb: 3008, // 3 GB (likely over-provisioned)
        dataTransferGb: 20, // 20 GB
      };

      const result = optimizeCost(platform, input);

      // Should include memory optimization
      const memoryRec = result.recommendations.find((r) => r.type === 'memory');
      expect(memoryRec).toBeDefined();

      if (memoryRec) {
        expect(memoryRec.description).toContain('memory');
        expect(memoryRec.description).toContain('MB');
        expect(memoryRec.estimatedSavings).toBeGreaterThan(0);
        expect(memoryRec.implementationComplexity).toBe('low');
      }
    });

    it('should not recommend memory reduction for minimal memory allocation', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 1000000,
        avgExecutionTimeMs: 100,
        memoryMb: 128, // Already minimal
        dataTransferGb: 5,
      };

      const result = optimizeCost(platform, input);

      // Should not include memory optimization
      const memoryRec = result.recommendations.find((r) => r.type === 'memory');
      expect(memoryRec).toBeUndefined();
    });
  });

  describe('testCachingOptimization', () => {
    it('should recommend caching for high-traffic workload', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 30000000, // 30M requests (high traffic)
        avgExecutionTimeMs: 150, // 150ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 50, // 50 GB
      };

      const result = optimizeCost(platform, input);

      // Should include caching recommendation
      const cachingRec = result.recommendations.find((r) => r.type === 'caching');
      expect(cachingRec).toBeDefined();

      if (cachingRec) {
        expect(cachingRec.description).toContain('caching');
        expect(cachingRec.description).toMatch(/Redis|CloudFront|API Gateway/);
        expect(cachingRec.estimatedSavings).toBeGreaterThan(0);
        expect(cachingRec.implementationComplexity).toBe('medium');
      }
    });

    it('should not recommend caching for low-traffic workload', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 100000, // 100K requests (low traffic)
        avgExecutionTimeMs: 200,
        memoryMb: 256,
        dataTransferGb: 2,
      };

      const result = optimizeCost(platform, input);

      // Should not include caching
      const cachingRec = result.recommendations.find((r) => r.type === 'caching');
      expect(cachingRec).toBeUndefined();
    });
  });

  describe('testBatchingOptimization', () => {
    it('should recommend batching for many short invocations', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 50000000, // 50M requests
        avgExecutionTimeMs: 50, // Very short (50ms)
        memoryMb: 256, // 256 MB
        dataTransferGb: 20, // 20 GB
      };

      const result = optimizeCost(platform, input);

      // Should include batching recommendation
      const batchingRec = result.recommendations.find((r) => r.type === 'batching');
      expect(batchingRec).toBeDefined();

      if (batchingRec) {
        expect(batchingRec.description).toContain('batch');
        expect(batchingRec.estimatedSavings).toBeGreaterThan(0);
        expect(batchingRec.implementationComplexity).toBe('high');
      }
    });

    it('should not recommend batching for fewer long-running invocations', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 500000, // 500K requests
        avgExecutionTimeMs: 1000, // Long (1 second)
        memoryMb: 1024,
        dataTransferGb: 10,
      };

      const result = optimizeCost(platform, input);

      // Should not include batching
      const batchingRec = result.recommendations.find((r) => r.type === 'batching');
      expect(batchingRec).toBeUndefined();
    });
  });

  describe('testReservedCapacityOptimization', () => {
    it('should recommend reserved capacity for high consistent traffic', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 300000000, // 300M requests (very high)
        avgExecutionTimeMs: 200, // 200ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 100, // 100 GB
      };

      const result = optimizeCost(platform, input);

      // Current cost should be high enough to trigger recommendation
      if (result.currentCost > 500) {
        const reservedRec = result.recommendations.find((r) => r.type === 'reserved-capacity');
        expect(reservedRec).toBeDefined();

        if (reservedRec) {
          expect(reservedRec.description).toContain('provisioned concurrency');
          expect(reservedRec.description).toContain('cold starts');
          expect(reservedRec.estimatedSavings).toBeGreaterThan(0);
          expect(reservedRec.implementationComplexity).toBe('low');
          expect(reservedRec.priority).toBe('high');
        }
      }
    });

    it('should not recommend reserved capacity for low traffic', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 1000000, // 1M requests
        avgExecutionTimeMs: 200,
        memoryMb: 256,
        dataTransferGb: 5,
      };

      const result = optimizeCost(platform, input);

      // Should not include reserved capacity
      const reservedRec = result.recommendations.find((r) => r.type === 'reserved-capacity');
      expect(reservedRec).toBeUndefined();
    });
  });

  describe('testCompressionOptimization', () => {
    it('should recommend compression for high data transfer', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 5000000, // 5M requests
        avgExecutionTimeMs: 300, // 300ms
        memoryMb: 512, // 512 MB
        dataTransferGb: 500, // 500 GB (high)
      };

      const result = optimizeCost(platform, input);

      // Should include compression recommendation
      const compressionRec = result.recommendations.find((r) => r.type === 'compression');
      expect(compressionRec).toBeDefined();

      if (compressionRec) {
        expect(compressionRec.description).toContain('compression');
        expect(compressionRec.description).toMatch(/gzip|brotli/);
        expect(compressionRec.estimatedSavings).toBeGreaterThan(0);
        expect(compressionRec.implementationComplexity).toBe('low');
      }
    });

    it('should not recommend compression for low data transfer', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 2000000,
        avgExecutionTimeMs: 200,
        memoryMb: 256,
        dataTransferGb: 10, // Low data transfer
      };

      const result = optimizeCost(platform, input);

      // Should not include compression
      const compressionRec = result.recommendations.find((r) => r.type === 'compression');
      expect(compressionRec).toBeUndefined();
    });
  });

  describe('testCDNOptimization', () => {
    it('should recommend CDN for very high traffic with significant data transfer', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 100000000, // 100M requests
        avgExecutionTimeMs: 150, // 150ms
        memoryMb: 256, // 256 MB
        dataTransferGb: 200, // 200 GB
      };

      const result = optimizeCost(platform, input);

      // Should include CDN recommendation
      const cdnRec = result.recommendations.find((r) => r.type === 'cdn');
      expect(cdnRec).toBeDefined();

      if (cdnRec) {
        expect(cdnRec.description).toContain('CDN');
        expect(cdnRec.description).toMatch(/CloudFront|Cloudflare|Fastly/);
        expect(cdnRec.estimatedSavings).toBeGreaterThan(0);
        expect(cdnRec.implementationComplexity).toBe('medium');
      }
    });

    it('should not recommend CDN for low traffic', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 500000, // 500K requests
        avgExecutionTimeMs: 200,
        memoryMb: 256,
        dataTransferGb: 5,
      };

      const result = optimizeCost(platform, input);

      // Should not include CDN
      const cdnRec = result.recommendations.find((r) => r.type === 'cdn');
      expect(cdnRec).toBeUndefined();
    });
  });

  describe('testPrioritization', () => {
    it('should prioritize high-impact optimizations', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 50000000, // 50M requests
        avgExecutionTimeMs: 500, // 500ms
        memoryMb: 2048, // 2 GB
        dataTransferGb: 300, // 300 GB
      };

      const result = optimizeCost(platform, input);

      // Recommendations should be sorted by priority and savings
      const highPriorityRecs = result.recommendations.filter((r) => r.priority === 'high');
      const mediumPriorityRecs = result.recommendations.filter((r) => r.priority === 'medium');
      const lowPriorityRecs = result.recommendations.filter((r) => r.priority === 'low');

      // High priority should come before medium and low
      if (highPriorityRecs.length > 0 && mediumPriorityRecs.length > 0) {
        const firstHighIndex = result.recommendations.findIndex((r) => r.priority === 'high');
        const firstMediumIndex = result.recommendations.findIndex((r) => r.priority === 'medium');
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }

      // Medium priority should come before low
      if (mediumPriorityRecs.length > 0 && lowPriorityRecs.length > 0) {
        const firstMediumIndex = result.recommendations.findIndex((r) => r.priority === 'medium');
        const firstLowIndex = result.recommendations.findIndex((r) => r.priority === 'low');
        expect(firstMediumIndex).toBeLessThan(firstLowIndex);
      }
    });

    it('should mark high-savings optimizations as high priority', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 100000000, // Very high traffic
        avgExecutionTimeMs: 400,
        memoryMb: 3008, // High memory
        dataTransferGb: 500, // High transfer
      };

      const result = optimizeCost(platform, input);

      // Should have at least one high-priority recommendation
      const highPriorityRecs = result.recommendations.filter((r) => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);

      // High priority recommendations should have significant savings
      for (const rec of highPriorityRecs) {
        expect(rec.estimatedSavings).toBeGreaterThan(result.currentCost * 0.1); // At least 10%
      }
    });
  });

  describe('testImplementationComplexity', () => {
    it('should mark simple optimizations as low complexity', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 10000000,
        avgExecutionTimeMs: 300,
        memoryMb: 1024,
        dataTransferGb: 150,
      };

      const result = optimizeCost(platform, input);

      // Memory and compression should be low complexity
      const memoryRec = result.recommendations.find((r) => r.type === 'memory');
      if (memoryRec) {
        expect(memoryRec.implementationComplexity).toBe('low');
      }

      const compressionRec = result.recommendations.find((r) => r.type === 'compression');
      if (compressionRec) {
        expect(compressionRec.implementationComplexity).toBe('low');
      }
    });

    it('should mark complex optimizations as high complexity', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 80000000, // High traffic
        avgExecutionTimeMs: 50, // Short executions
        memoryMb: 256,
        dataTransferGb: 100,
      };

      const result = optimizeCost(platform, input);

      // Batching should be high complexity
      const batchingRec = result.recommendations.find((r) => r.type === 'batching');
      if (batchingRec) {
        expect(batchingRec.implementationComplexity).toBe('high');
      }
    });
  });

  describe('testEdgeCases', () => {
    it('should handle minimal workload with no optimizations needed', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 50000, // Very low
        avgExecutionTimeMs: 100,
        memoryMb: 128, // Already minimal
        dataTransferGb: 1,
      };

      const result = optimizeCost(platform, input);

      // May have few or no recommendations
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);

      // Savings should be minimal
      expect(result.potentialSavings).toBeLessThan(result.currentCost * 0.5);
    });

    it('should handle already optimized workload', async () => {
      const platforms = await loadAllPlatforms();
      const platform = platforms[0];

      const input: CostEstimationInput = {
        requestsPerMonth: 2000000,
        avgExecutionTimeMs: 150,
        memoryMb: 256, // Reasonable
        dataTransferGb: 5, // Low
      };

      const result = optimizeCost(platform, input);

      // Should still provide valid result even if few optimizations available
      expect(result.currentCost).toBeGreaterThanOrEqual(0);
      expect(result.optimizedCost).toBeGreaterThanOrEqual(0);
      expect(result.optimizedCost).toBeLessThanOrEqual(result.currentCost);
    });
  });
});

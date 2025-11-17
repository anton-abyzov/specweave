/**
 * Serverless Cost Optimizer
 *
 * Analyzes usage patterns and provides optimization recommendations to reduce costs:
 * - Memory right-sizing
 * - Caching strategies
 * - Batching recommendations
 * - Reserved capacity
 * - Compression
 * - CDN usage
 */

import type { ServerlessPlatform } from './types.js';
import type { CostEstimationInput } from './cost-estimator.js';
import { estimateCost } from './cost-estimator.js';

/**
 * Types of optimization recommendations
 */
export type OptimizationType =
  | 'memory'
  | 'caching'
  | 'batching'
  | 'reserved-capacity'
  | 'compression'
  | 'cdn';

/**
 * Individual optimization recommendation
 */
export interface OptimizationRecommendation {
  type: OptimizationType;
  description: string;
  estimatedSavings: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
}

/**
 * Complete cost optimization analysis result
 */
export interface CostOptimizationResult {
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  recommendations: OptimizationRecommendation[];
}

/**
 * Analyze usage and generate cost optimization recommendations
 *
 * @param platform - The serverless platform
 * @param input - Current usage parameters
 * @returns Optimization analysis with recommendations
 *
 * @example
 * ```typescript
 * const input = {
 *   requestsPerMonth: 5000000,
 *   avgExecutionTimeMs: 500,
 *   memoryMb: 1024,
 *   dataTransferGb: 50
 * };
 * const result = optimizeCost(platform, input);
 * console.log(`Potential savings: $${result.potentialSavings}/month`);
 * ```
 */
export function optimizeCost(
  platform: ServerlessPlatform,
  input: CostEstimationInput
): CostOptimizationResult {
  const currentEstimation = estimateCost(platform, input);
  const currentCost = currentEstimation.monthlyEstimate;

  const recommendations: OptimizationRecommendation[] = [];
  let optimizedCost = currentCost;

  // 1. Memory right-sizing
  const memoryOptimization = analyzeMemoryOptimization(platform, input, currentCost);
  if (memoryOptimization) {
    recommendations.push(memoryOptimization);
    optimizedCost -= memoryOptimization.estimatedSavings;
  }

  // 2. Caching recommendations
  const cachingOptimization = analyzeCachingOpportunity(input, currentCost);
  if (cachingOptimization) {
    recommendations.push(cachingOptimization);
    optimizedCost -= cachingOptimization.estimatedSavings;
  }

  // 3. Batching recommendations
  const batchingOptimization = analyzeBatchingOpportunity(input, currentCost);
  if (batchingOptimization) {
    recommendations.push(batchingOptimization);
    optimizedCost -= batchingOptimization.estimatedSavings;
  }

  // 4. Reserved capacity
  const reservedCapacityOptimization = analyzeReservedCapacity(input, currentCost);
  if (reservedCapacityOptimization) {
    recommendations.push(reservedCapacityOptimization);
    optimizedCost -= reservedCapacityOptimization.estimatedSavings;
  }

  // 5. Compression
  const compressionOptimization = analyzeCompression(input, currentCost);
  if (compressionOptimization) {
    recommendations.push(compressionOptimization);
    optimizedCost -= compressionOptimization.estimatedSavings;
  }

  // 6. CDN recommendations
  const cdnOptimization = analyzeCdnOpportunity(input, currentCost);
  if (cdnOptimization) {
    recommendations.push(cdnOptimization);
    optimizedCost -= cdnOptimization.estimatedSavings;
  }

  // Sort recommendations by priority and savings
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedSavings - a.estimatedSavings;
  });

  return {
    currentCost,
    optimizedCost: Math.max(0, optimizedCost),
    potentialSavings: currentCost - Math.max(0, optimizedCost),
    recommendations,
  };
}

/**
 * Analyze memory right-sizing opportunities
 */
function analyzeMemoryOptimization(
  platform: ServerlessPlatform,
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // Test different memory configurations
  const memoryOptions = [128, 256, 512, 1024, 2048];
  const currentMemory = input.memoryMb;

  // Only recommend if current memory is not already minimal
  if (currentMemory <= 128) {
    return null;
  }

  // Find optimal memory (assuming execution time might improve with more memory)
  let bestMemory = currentMemory;
  let bestCost = currentCost;

  for (const memory of memoryOptions) {
    if (memory >= currentMemory) continue; // Only test smaller sizes

    const testInput = { ...input, memoryMb: memory };
    const estimation = estimateCost(platform, testInput);

    if (estimation.monthlyEstimate < bestCost) {
      bestCost = estimation.monthlyEstimate;
      bestMemory = memory;
    }
  }

  if (bestMemory < currentMemory) {
    const savings = currentCost - bestCost;
    const savingsPercent = ((savings / currentCost) * 100).toFixed(1);

    return {
      type: 'memory',
      description: `Reduce memory from ${currentMemory}MB to ${bestMemory}MB. This could save ${savingsPercent}% on compute costs. Test thoroughly to ensure performance is acceptable.`,
      estimatedSavings: savings,
      implementationComplexity: 'low',
      priority: savings > currentCost * 0.2 ? 'high' : 'medium',
    };
  }

  return null;
}

/**
 * Analyze caching opportunities
 */
function analyzeCachingOpportunity(
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // High request rate with potential for repetitive queries
  const requestsPerSecond = input.requestsPerMonth / (30 * 24 * 60 * 60);

  if (requestsPerSecond > 10) {
    // Assume 30-50% of requests could be cached
    const cacheHitRate = 0.4;
    const estimatedSavings = currentCost * cacheHitRate * 0.9; // 90% reduction for cached requests

    return {
      type: 'caching',
      description: `Implement caching (Redis, CloudFront, or API Gateway caching) to reduce function invocations. With ~${requestsPerSecond.toFixed(1)} requests/second, caching could eliminate 30-50% of function calls.`,
      estimatedSavings,
      implementationComplexity: 'medium',
      priority: estimatedSavings > currentCost * 0.2 ? 'high' : 'medium',
    };
  }

  return null;
}

/**
 * Analyze batching opportunities
 */
function analyzeBatchingOpportunity(
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // Many small invocations that could be batched
  if (input.requestsPerMonth > 1_000_000 && input.avgExecutionTimeMs < 100) {
    // Batching could reduce invocations by 80%
    const estimatedSavings = currentCost * 0.5; // Conservative 50% savings

    return {
      type: 'batching',
      description: `Batch multiple operations together to reduce invocation count. With ${(input.requestsPerMonth / 1_000_000).toFixed(1)}M short invocations, batching could significantly reduce request costs.`,
      estimatedSavings,
      implementationComplexity: 'high',
      priority: estimatedSavings > currentCost * 0.3 ? 'high' : 'medium',
    };
  }

  return null;
}

/**
 * Analyze reserved capacity opportunities
 */
function analyzeReservedCapacity(
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // High consistent traffic (AWS Lambda offers provisioned concurrency)
  const requestsPerSecond = input.requestsPerMonth / (30 * 24 * 60 * 60);

  if (requestsPerSecond > 100 && currentCost > 500) {
    // Reserved capacity typically saves 20-40%
    const estimatedSavings = currentCost * 0.3;

    return {
      type: 'reserved-capacity',
      description: `Consider provisioned concurrency (AWS Lambda) or reserved capacity. With high consistent traffic (~${requestsPerSecond.toFixed(0)} req/s), reserved capacity could save 20-40% and eliminate cold starts.`,
      estimatedSavings,
      implementationComplexity: 'low',
      priority: 'high',
    };
  }

  return null;
}

/**
 * Analyze compression opportunities
 */
function analyzeCompression(
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // High data transfer
  if (input.dataTransferGb > 100) {
    // Compression can reduce transfer by 60-80%
    const compressionRatio = 0.7;
    const dataTransferCostRatio = 0.2; // Assume ~20% of total cost is data transfer
    const estimatedSavings = currentCost * dataTransferCostRatio * compressionRatio;

    return {
      type: 'compression',
      description: `Enable response compression (gzip/brotli) to reduce data transfer costs. With ${input.dataTransferGb.toFixed(0)}GB/month, compression could reduce transfer by 60-80%.`,
      estimatedSavings,
      implementationComplexity: 'low',
      priority: estimatedSavings > 50 ? 'high' : 'medium',
    };
  }

  return null;
}

/**
 * Analyze CDN opportunities
 */
function analyzeCdnOpportunity(
  input: CostEstimationInput,
  currentCost: number
): OptimizationRecommendation | null {
  // High read traffic that could benefit from edge caching
  if (input.requestsPerMonth > 10_000_000 && input.dataTransferGb > 50) {
    // CDN can reduce origin requests by 70-90%
    const cdnCacheRate = 0.8;
    const estimatedSavings = currentCost * cdnCacheRate * 0.6;

    return {
      type: 'cdn',
      description: `Use a CDN (CloudFront, Cloudflare, Fastly) to cache static content and reduce origin requests. With ${(input.requestsPerMonth / 1_000_000).toFixed(1)}M requests, a CDN could cache 70-90% of traffic.`,
      estimatedSavings,
      implementationComplexity: 'medium',
      priority: estimatedSavings > currentCost * 0.4 ? 'high' : 'medium',
    };
  }

  return null;
}

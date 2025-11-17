/**
 * Serverless Cost Comparison
 *
 * Compares costs across multiple serverless platforms to help identify
 * the most cost-effective option for a given workload.
 */

import type { ServerlessPlatform } from './types.js';
import type { CostEstimationInput, CostBreakdown } from './cost-estimator.js';
import { estimateCost } from './cost-estimator.js';
import { PlatformDataLoader } from './platform-data-loader.js';

/**
 * Cost comparison for a single platform
 */
export interface PlatformCostComparison {
  platform: ServerlessPlatform;
  totalCost: number;
  breakdown: CostBreakdown;
  rank: number;
}

/**
 * Complete cost comparison result across platforms
 */
export interface CostComparisonResult {
  input: CostEstimationInput;
  platforms: PlatformCostComparison[];
  cheapest: PlatformCostComparison;
  mostExpensive: PlatformCostComparison;
  costDifferences: string[];
}

/**
 * Compare costs across multiple serverless platforms
 *
 * @param platforms - Array of platforms to compare
 * @param input - Usage parameters
 * @returns Comparison result with rankings and analysis
 *
 * @example
 * ```typescript
 * const platforms = [awsLambda, azureFunctions, gcpCloudFunctions];
 * const input = {
 *   requestsPerMonth: 2000000,
 *   avgExecutionTimeMs: 300,
 *   memoryMb: 512,
 *   dataTransferGb: 10
 * };
 * const result = compareCosts(platforms, input);
 * console.log(`Cheapest: ${result.cheapest.platform.name} at $${result.cheapest.totalCost}`);
 * ```
 */
export function compareCosts(
  platforms: ServerlessPlatform[],
  input: CostEstimationInput
): CostComparisonResult {
  if (platforms.length === 0) {
    throw new Error('At least one platform must be provided for comparison');
  }

  // Calculate costs for all platforms
  const platformCosts = platforms.map((platform) => {
    const estimation = estimateCost(platform, input);
    return {
      platform,
      totalCost: estimation.monthlyEstimate,
      breakdown: estimation.breakdown,
      rank: 0, // Will be assigned after sorting
    };
  });

  // Sort by total cost (cheapest first)
  platformCosts.sort((a, b) => a.totalCost - b.totalCost);

  // Assign ranks
  platformCosts.forEach((pc, index) => {
    pc.rank = index + 1;
  });

  const cheapest = platformCosts[0];
  const mostExpensive = platformCosts[platformCosts.length - 1];

  // Generate cost difference explanations
  const costDifferences = generateCostDifferences(platformCosts, input);

  return {
    input,
    platforms: platformCosts,
    cheapest,
    mostExpensive,
    costDifferences,
  };
}

/**
 * Compare costs across platforms by platform IDs
 *
 * @param platformIds - Array of platform IDs to compare
 * @param input - Usage parameters
 * @returns Comparison result
 */
export async function compareCostsByIds(
  platformIds: string[],
  input: CostEstimationInput
): Promise<CostComparisonResult> {
  const loader = new PlatformDataLoader();
  await loader.loadAll();

  const platforms: ServerlessPlatform[] = [];
  for (const id of platformIds) {
    const platform = await loader.loadById(id);
    if (!platform) {
      throw new Error(`Platform not found: ${id}`);
    }
    platforms.push(platform);
  }

  return compareCosts(platforms, input);
}

/**
 * Compare all available platforms
 *
 * @param input - Usage parameters
 * @returns Comparison result for all platforms
 */
export async function compareAllPlatforms(
  input: CostEstimationInput
): Promise<CostComparisonResult> {
  const loader = new PlatformDataLoader();
  const platforms = await loader.loadAll();
  return compareCosts(platforms, input);
}

/**
 * Generate explanations for cost differences
 */
function generateCostDifferences(
  platformCosts: PlatformCostComparison[],
  input: CostEstimationInput
): string[] {
  const differences: string[] = [];

  if (platformCosts.length < 2) {
    return differences;
  }

  const cheapest = platformCosts[0];
  const mostExpensive = platformCosts[platformCosts.length - 1];

  // Overall cost difference
  const costDiff = mostExpensive.totalCost - cheapest.totalCost;
  const costDiffPercent = ((costDiff / mostExpensive.totalCost) * 100).toFixed(1);

  differences.push(
    `${mostExpensive.platform.name} is ${costDiffPercent}% more expensive than ${cheapest.platform.name} ($${costDiff.toFixed(2)}/month difference)`
  );

  // Analyze why there are differences
  analyzePricingModel(platformCosts, differences);
  analyzeFreeTier(platformCosts, input, differences);
  analyzeBreakdown(platformCosts, differences);

  return differences;
}

/**
 * Analyze pricing model differences
 */
function analyzePricingModel(
  platformCosts: PlatformCostComparison[],
  differences: string[]
): void {
  const cheapest = platformCosts[0];

  // Compare compute pricing
  const computePrices = platformCosts.map(
    (pc) => pc.platform.pricing.payAsYouGo.computePerGbSecond
  );
  const maxComputePrice = Math.max(...computePrices);
  const minComputePrice = Math.min(...computePrices);

  if (maxComputePrice > minComputePrice * 2) {
    differences.push(
      `Compute pricing varies significantly: ${cheapest.platform.name} charges $${minComputePrice.toFixed(8)}/GB-second vs. $${maxComputePrice.toFixed(8)}/GB-second for the most expensive`
    );
  }

  // Compare request pricing
  const requestPrices = platformCosts.map((pc) => pc.platform.pricing.payAsYouGo.requestsPer1M);
  const maxRequestPrice = Math.max(...requestPrices);
  const minRequestPrice = Math.min(...requestPrices);

  if (maxRequestPrice > minRequestPrice * 2) {
    differences.push(
      `Request pricing varies: ${cheapest.platform.name} charges $${minRequestPrice.toFixed(2)}/1M requests vs. $${maxRequestPrice.toFixed(2)}/1M for the most expensive`
    );
  }
}

/**
 * Analyze free tier impact
 */
function analyzeFreeTier(
  platformCosts: PlatformCostComparison[],
  input: CostEstimationInput,
  differences: string[]
): void {
  // Check if any platform is within free tier
  const withinFreeTier = platformCosts.filter((pc) => pc.totalCost === 0);

  if (withinFreeTier.length > 0) {
    const platformNames = withinFreeTier.map((pc) => pc.platform.name).join(', ');
    differences.push(`${platformNames} remain within free tier for this usage level`);
  }

  // Compare free tier generosity
  const freeTierRequests = platformCosts.map((pc) => pc.platform.pricing.freeTier.requests);
  const maxFreeTier = Math.max(...freeTierRequests);
  const platformWithMaxFreeTier = platformCosts.find(
    (pc) => pc.platform.pricing.freeTier.requests === maxFreeTier
  );

  if (platformWithMaxFreeTier && input.requestsPerMonth > 0) {
    const coverage = (maxFreeTier / input.requestsPerMonth) * 100;
    if (coverage > 50) {
      differences.push(
        `${platformWithMaxFreeTier.platform.name} has the most generous free tier, covering ${coverage.toFixed(0)}% of your requests (${(maxFreeTier / 1_000_000).toFixed(1)}M free requests/month)`
      );
    }
  }
}

/**
 * Analyze cost breakdown differences
 */
function analyzeBreakdown(platformCosts: PlatformCostComparison[], differences: string[]): void {
  // Find which cost category dominates
  const cheapest = platformCosts[0];
  const { breakdown } = cheapest;

  const totalBeforeFreeTier = breakdown.total;
  if (totalBeforeFreeTier === 0) return;

  const computePercent = (breakdown.compute / cheapest.totalCost) * 100;
  const requestPercent = (breakdown.requests / cheapest.totalCost) * 100;
  const dataTransferPercent = (breakdown.dataTransfer / cheapest.totalCost) * 100;

  // Identify the dominant cost factor
  if (computePercent > 60) {
    differences.push(
      `Compute costs dominate (${computePercent.toFixed(0)}%). Platforms with lower compute rates (like Firebase at $0.0000025/GB-second) will be cheaper.`
    );
  } else if (requestPercent > 60) {
    differences.push(
      `Request costs dominate (${requestPercent.toFixed(0)}%). Platforms with lower request rates (like AWS Lambda at $0.20/1M) will be cheaper.`
    );
  } else if (dataTransferPercent > 60) {
    differences.push(
      `Data transfer costs dominate (${dataTransferPercent.toFixed(0)}%). Consider using a CDN or compression to reduce transfer costs.`
    );
  } else {
    differences.push(
      `Costs are balanced across compute (${computePercent.toFixed(0)}%), requests (${requestPercent.toFixed(0)}%), and data transfer (${dataTransferPercent.toFixed(0)}%)`
    );
  }
}

/**
 * Get summary statistics for a comparison
 */
export function getComparisonSummary(result: CostComparisonResult): {
  averageCost: number;
  medianCost: number;
  costRange: number;
  bestValue: PlatformCostComparison;
} {
  const costs = result.platforms.map((p) => p.totalCost).sort((a, b) => a - b);

  const averageCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
  const medianCost = costs[Math.floor(costs.length / 2)];
  const costRange = costs[costs.length - 1] - costs[0];

  // Best value considers features and ecosystem, not just price
  // For now, just return cheapest (can be enhanced later)
  const bestValue = result.cheapest;

  return {
    averageCost,
    medianCost,
    costRange,
    bestValue,
  };
}

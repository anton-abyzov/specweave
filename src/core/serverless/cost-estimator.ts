/**
 * Serverless Cost Estimator
 *
 * Calculates accurate costs for serverless platforms including:
 * - Compute costs (GB-seconds)
 * - Request costs
 * - Data transfer costs
 * - Free tier deductions
 */

import type { ServerlessPlatform } from './types.js';
import { PlatformDataLoader } from './platform-data-loader.js';

/**
 * Input parameters for cost estimation
 */
export interface CostEstimationInput {
  requestsPerMonth: number;
  avgExecutionTimeMs: number;
  memoryMb: number;
  dataTransferGb: number;
}

/**
 * Detailed cost breakdown by category
 */
export interface CostBreakdown {
  compute: number;
  requests: number;
  dataTransfer: number;
  total: number;
  freeTierDeduction: number;
  billableAmount: number;
}

/**
 * Complete cost estimation result for a platform
 */
export interface CostEstimationResult {
  platform: ServerlessPlatform;
  input: CostEstimationInput;
  breakdown: CostBreakdown;
  withinFreeTier: boolean;
  monthlyEstimate: number;
}

/**
 * Estimate costs for a serverless platform
 *
 * @param platform - The serverless platform to estimate costs for
 * @param input - Usage parameters
 * @returns Detailed cost estimation with breakdown
 *
 * @example
 * ```typescript
 * const input = {
 *   requestsPerMonth: 1000000,
 *   avgExecutionTimeMs: 200,
 *   memoryMb: 512,
 *   dataTransferGb: 5
 * };
 * const result = estimateCost(platform, input);
 * console.log(`Monthly cost: $${result.monthlyEstimate}`);
 * ```
 */
export function estimateCost(
  platform: ServerlessPlatform,
  input: CostEstimationInput
): CostEstimationResult {
  // Validate input
  validateInput(input);

  const { pricing } = platform;

  // Calculate GB-seconds
  // Formula: (requests × execution_time_ms × memory_MB) / (1000 × 1024)
  const gbSeconds =
    (input.requestsPerMonth * input.avgExecutionTimeMs * input.memoryMb) / (1000 * 1024);

  // Calculate raw costs before free tier
  const computeCostRaw = gbSeconds * pricing.payAsYouGo.computePerGbSecond;
  const requestCostRaw = (input.requestsPerMonth / 1_000_000) * pricing.payAsYouGo.requestsPer1M;
  const dataTransferCostRaw = input.dataTransferGb * pricing.payAsYouGo.dataTransferPerGb;

  // Calculate free tier deductions
  const freeTierDeduction = calculateFreeTierDeduction(
    {
      compute: computeCostRaw,
      requests: requestCostRaw,
      dataTransfer: dataTransferCostRaw,
    },
    {
      gbSeconds,
      requests: input.requestsPerMonth,
      dataTransferGb: input.dataTransferGb,
    },
    platform
  );

  // Calculate billable amounts
  const computeCost = Math.max(0, computeCostRaw - freeTierDeduction.compute);
  const requestCost = Math.max(0, requestCostRaw - freeTierDeduction.requests);
  const dataTransferCost = Math.max(0, dataTransferCostRaw - freeTierDeduction.dataTransfer);

  const total = computeCostRaw + requestCostRaw + dataTransferCostRaw;
  const totalFreeTierDeduction =
    freeTierDeduction.compute + freeTierDeduction.requests + freeTierDeduction.dataTransfer;
  const billableAmount = computeCost + requestCost + dataTransferCost;

  const breakdown: CostBreakdown = {
    compute: computeCost,
    requests: requestCost,
    dataTransfer: dataTransferCost,
    total,
    freeTierDeduction: totalFreeTierDeduction,
    billableAmount,
  };

  return {
    platform,
    input,
    breakdown,
    withinFreeTier: billableAmount === 0,
    monthlyEstimate: billableAmount,
  };
}

/**
 * Estimate costs by platform ID
 *
 * @param platformId - Platform identifier (e.g., 'aws-lambda', 'firebase')
 * @param input - Usage parameters
 * @returns Cost estimation result
 */
export async function estimateCostById(
  platformId: string,
  input: CostEstimationInput
): Promise<CostEstimationResult> {
  const loader = new PlatformDataLoader();
  const platform = await loader.loadById(platformId);

  if (!platform) {
    throw new Error(`Platform not found: ${platformId}`);
  }

  return estimateCost(platform, input);
}

/**
 * Calculate free tier deductions
 */
function calculateFreeTierDeduction(
  costs: { compute: number; requests: number; dataTransfer: number },
  usage: { gbSeconds: number; requests: number; dataTransferGb: number },
  platform: ServerlessPlatform
): { compute: number; requests: number; dataTransfer: number } {
  const { freeTier, payAsYouGo } = platform.pricing;

  // Calculate how much of each resource is covered by free tier
  const freeComputeGbSeconds = Math.min(usage.gbSeconds, freeTier.computeGbSeconds);
  const freeRequests = Math.min(usage.requests, freeTier.requests);
  const freeDataTransferGb = Math.min(usage.dataTransferGb, freeTier.dataTransferGb);

  // Calculate the monetary value of free tier coverage
  const computeDeduction = freeComputeGbSeconds * payAsYouGo.computePerGbSecond;
  const requestsDeduction = (freeRequests / 1_000_000) * payAsYouGo.requestsPer1M;
  const dataTransferDeduction = freeDataTransferGb * payAsYouGo.dataTransferPerGb;

  return {
    compute: Math.min(computeDeduction, costs.compute),
    requests: Math.min(requestsDeduction, costs.requests),
    dataTransfer: Math.min(dataTransferDeduction, costs.dataTransfer),
  };
}

/**
 * Validate cost estimation input
 */
function validateInput(input: CostEstimationInput): void {
  if (input.requestsPerMonth < 0) {
    throw new Error('Requests per month cannot be negative');
  }

  if (input.avgExecutionTimeMs < 0) {
    throw new Error('Average execution time cannot be negative');
  }

  if (input.memoryMb < 0) {
    throw new Error('Memory cannot be negative');
  }

  if (input.dataTransferGb < 0) {
    throw new Error('Data transfer cannot be negative');
  }

  // Zero requests is valid (e.g., for testing or estimation purposes)
  // No warning needed as it's a valid scenario
}

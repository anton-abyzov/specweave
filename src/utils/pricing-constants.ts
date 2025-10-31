/**
 * Anthropic API Pricing Constants
 *
 * Pricing as of 2025-10-31 (verified against https://www.anthropic.com/pricing)
 *
 * Model Tier Mapping:
 * - sonnet → claude-sonnet-4-5-20250929 (latest Sonnet 4.5)
 * - haiku → claude-4-5-haiku-20250110 (latest Haiku 4.5)
 * - opus → claude-opus-4-0-... (when released)
 *
 * Note: This file should be updated when Anthropic releases new models.
 */

/**
 * Pricing per 1M tokens (input/output) in USD
 */
export const PRICING = {
  sonnet: {
    input: 0.000003,   // $3 per 1M input tokens
    output: 0.000015,  // $15 per 1M output tokens
  },
  haiku: {
    input: 0.000001,   // $1 per 1M input tokens
    output: 0.000005,  // $5 per 1M output tokens
  },
  opus: {
    input: 0.000015,   // $15 per 1M input tokens
    output: 0.000075,  // $75 per 1M output tokens
  },
} as const;

/**
 * Calculate cost for a given model and token usage
 *
 * @param model - Model tier (sonnet, haiku, opus)
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Total cost in USD
 *
 * @example
 * ```typescript
 * const cost = calculateCost('haiku', 1000, 500);
 * // Returns: 0.0035 ($0.0035 = $0.001 input + $0.0025 output)
 * ```
 */
export function calculateCost(
  model: 'sonnet' | 'haiku' | 'opus',
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  return (inputTokens * pricing.input) + (outputTokens * pricing.output);
}

/**
 * Get pricing constants for a specific model
 *
 * @param model - Model tier
 * @returns Pricing object with input/output costs
 */
export function getModelPricing(model: 'sonnet' | 'haiku' | 'opus') {
  return PRICING[model];
}

/**
 * Calculate cost savings vs baseline (all-Sonnet)
 *
 * @param actualModel - Model actually used
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 * @returns Savings object with amount and percentage
 */
export function calculateSavings(
  actualModel: 'sonnet' | 'haiku' | 'opus',
  inputTokens: number,
  outputTokens: number
): { savedAmount: number; savedPercent: number } {
  const actualCost = calculateCost(actualModel, inputTokens, outputTokens);
  const baselineCost = calculateCost('sonnet', inputTokens, outputTokens);
  const savedAmount = baselineCost - actualCost;
  const savedPercent = baselineCost > 0 ? (savedAmount / baselineCost) * 100 : 0;

  return { savedAmount, savedPercent };
}

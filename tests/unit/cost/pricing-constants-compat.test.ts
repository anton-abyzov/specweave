/**
 * pricing-constants.ts backward compatibility tests
 * Ensures existing callers still work after delegation to ModelPricingRegistry
 */

import { describe, it, expect } from 'vitest';
import { PRICING, calculateCost, getModelPricing, calculateSavings } from '../../../src/utils/pricing-constants.js';

describe('pricing-constants backward compatibility', () => {
  it('PRICING export has sonnet/haiku/opus tiers', () => {
    expect(PRICING.sonnet).toBeDefined();
    expect(PRICING.haiku).toBeDefined();
    expect(PRICING.opus).toBeDefined();
  });

  it('PRICING values match original rates', () => {
    // Sonnet: $3/$15 per 1M → $0.000003/$0.000015 per token
    expect(PRICING.sonnet.input).toBeCloseTo(0.000003, 8);
    expect(PRICING.sonnet.output).toBeCloseTo(0.000015, 8);
    // Haiku: $1/$5
    expect(PRICING.haiku.input).toBeCloseTo(0.000001, 8);
    expect(PRICING.haiku.output).toBeCloseTo(0.000005, 8);
    // Opus: $15/$75 (Opus 4.0 tier pricing for backward compat)
    expect(PRICING.opus.input).toBeCloseTo(0.000015, 8);
    expect(PRICING.opus.output).toBeCloseTo(0.000075, 8);
  });

  it('calculateCost returns correct values', () => {
    const cost = calculateCost('sonnet', 1_000_000, 1_000_000);
    // $3 input + $15 output = $18
    expect(cost).toBeCloseTo(18, 1);
  });

  it('getModelPricing returns pricing object', () => {
    const pricing = getModelPricing('haiku');
    expect(pricing).toBeDefined();
    expect(pricing.input).toBeCloseTo(0.000001, 8);
    expect(pricing.output).toBeCloseTo(0.000005, 8);
  });

  it('calculateSavings computes vs sonnet baseline', () => {
    const { savedAmount, savedPercent } = calculateSavings('haiku', 1_000_000, 1_000_000);
    // Haiku costs $6, Sonnet costs $18, savings = $12
    expect(savedAmount).toBeCloseTo(12, 1);
    expect(savedPercent).toBeCloseTo(66.67, 0);
  });

  it('calculateSavings returns negative for opus', () => {
    const { savedAmount } = calculateSavings('opus', 1_000_000, 1_000_000);
    // Opus costs $90, Sonnet costs $18, savings = -$72
    expect(savedAmount).toBeLessThan(0);
  });
});

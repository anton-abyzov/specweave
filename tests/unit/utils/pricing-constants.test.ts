import { describe, it, expect } from 'vitest';
import {
  PRICING,
  calculateCost,
  getModelPricing,
  calculateSavings,
} from '../../../src/utils/pricing-constants.js';

describe('pricing-constants', () => {
  describe('PRICING constants', () => {
    it('should have correct sonnet pricing', () => {
      expect(PRICING.sonnet.input).toBe(0.000003);
      expect(PRICING.sonnet.output).toBe(0.000015);
    });

    it('should have correct haiku pricing', () => {
      expect(PRICING.haiku.input).toBe(0.000001);
      expect(PRICING.haiku.output).toBe(0.000005);
    });

    it('should have correct opus pricing', () => {
      expect(PRICING.opus.input).toBe(0.000015);
      expect(PRICING.opus.output).toBe(0.000075);
    });

    it('should have haiku as the cheapest model', () => {
      expect(PRICING.haiku.input).toBeLessThan(PRICING.sonnet.input);
      expect(PRICING.haiku.output).toBeLessThan(PRICING.sonnet.output);
      expect(PRICING.haiku.input).toBeLessThan(PRICING.opus.input);
      expect(PRICING.haiku.output).toBeLessThan(PRICING.opus.output);
    });

    it('should have opus as the most expensive model', () => {
      expect(PRICING.opus.input).toBeGreaterThan(PRICING.sonnet.input);
      expect(PRICING.opus.output).toBeGreaterThan(PRICING.sonnet.output);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for sonnet correctly', () => {
      const cost = calculateCost('sonnet', 1000, 500);
      // 1000 * 0.000003 + 500 * 0.000015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 10);
    });

    it('should calculate cost for haiku correctly', () => {
      const cost = calculateCost('haiku', 1000, 500);
      // 1000 * 0.000001 + 500 * 0.000005 = 0.001 + 0.0025 = 0.0035
      expect(cost).toBeCloseTo(0.0035, 10);
    });

    it('should calculate cost for opus correctly', () => {
      const cost = calculateCost('opus', 1000, 500);
      // 1000 * 0.000015 + 500 * 0.000075 = 0.015 + 0.0375 = 0.0525
      expect(cost).toBeCloseTo(0.0525, 10);
    });

    it('should return zero cost when both token counts are zero', () => {
      expect(calculateCost('sonnet', 0, 0)).toBe(0);
      expect(calculateCost('haiku', 0, 0)).toBe(0);
      expect(calculateCost('opus', 0, 0)).toBe(0);
    });

    it('should handle input-only usage (zero output tokens)', () => {
      const cost = calculateCost('sonnet', 5000, 0);
      // 5000 * 0.000003 = 0.015
      expect(cost).toBeCloseTo(0.015, 10);
    });

    it('should handle output-only usage (zero input tokens)', () => {
      const cost = calculateCost('sonnet', 0, 5000);
      // 5000 * 0.000015 = 0.075
      expect(cost).toBeCloseTo(0.075, 10);
    });
  });

  describe('getModelPricing', () => {
    it('should return correct pricing for sonnet', () => {
      const pricing = getModelPricing('sonnet');
      expect(pricing.input).toBe(0.000003);
      expect(pricing.output).toBe(0.000015);
    });

    it('should return correct pricing for haiku', () => {
      const pricing = getModelPricing('haiku');
      expect(pricing.input).toBe(0.000001);
      expect(pricing.output).toBe(0.000005);
    });

    it('should return correct pricing for opus', () => {
      const pricing = getModelPricing('opus');
      expect(pricing.input).toBe(0.000015);
      expect(pricing.output).toBe(0.000075);
    });
  });

  describe('calculateSavings', () => {
    it('should show positive savings when using haiku vs sonnet baseline', () => {
      const result = calculateSavings('haiku', 10000, 5000);
      expect(result.savedAmount).toBeGreaterThan(0);
      expect(result.savedPercent).toBeGreaterThan(0);
    });

    it('should compute correct haiku savings amount and percentage', () => {
      const result = calculateSavings('haiku', 10000, 5000);
      // haiku cost: 10000 * 0.000001 + 5000 * 0.000005 = 0.01 + 0.025 = 0.035
      // sonnet cost: 10000 * 0.000003 + 5000 * 0.000015 = 0.03 + 0.075 = 0.105
      // saved: 0.105 - 0.035 = 0.07
      // percent: (0.07 / 0.105) * 100 = 66.666...
      expect(result.savedAmount).toBeCloseTo(0.07, 10);
      expect(result.savedPercent).toBeCloseTo(66.6667, 3);
    });

    it('should show negative savings when using opus (more expensive than sonnet)', () => {
      const result = calculateSavings('opus', 10000, 5000);
      // opus cost: 10000 * 0.000015 + 5000 * 0.000075 = 0.15 + 0.375 = 0.525
      // sonnet cost: 0.105
      // saved: 0.105 - 0.525 = -0.42
      expect(result.savedAmount).toBeLessThan(0);
      expect(result.savedPercent).toBeLessThan(0);
      expect(result.savedAmount).toBeCloseTo(-0.42, 10);
      expect(result.savedPercent).toBeCloseTo(-400, 3);
    });

    it('should show zero savings when using sonnet (same as baseline)', () => {
      const result = calculateSavings('sonnet', 10000, 5000);
      expect(result.savedAmount).toBe(0);
      expect(result.savedPercent).toBe(0);
    });

    it('should return zero savings with zero tokens', () => {
      const result = calculateSavings('haiku', 0, 0);
      expect(result.savedAmount).toBe(0);
      expect(result.savedPercent).toBe(0);
    });
  });
});

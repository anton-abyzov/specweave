import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

import { calculateCost, getModelPricing, calculateSavings, PRICING } from '../../src/utils/pricing-constants.js';

describe('Pricing Constants', () => {
  describe('PRICING', () => {
    test('has correct pricing structure', () => {
      expect(PRICING.sonnet.input).toBe(0.000003);
      expect(PRICING.sonnet.output).toBe(0.000015);
      expect(PRICING.haiku.input).toBe(0.000001);
      expect(PRICING.haiku.output).toBe(0.000005);
      expect(PRICING.opus.input).toBe(0.000015);
      expect(PRICING.opus.output).toBe(0.000075);
    });
  });

  describe('calculateCost', () => {
    test('calculates Sonnet cost correctly', () => {
      const cost = calculateCost('sonnet', 1000, 500);
      expect(cost).toBeCloseTo(0.0105); // (1000 * 0.000003) + (500 * 0.000015) = 0.003 + 0.0075 = 0.0105
    });

    test('calculates Haiku cost correctly', () => {
      const cost = calculateCost('haiku', 1000, 500);
      expect(cost).toBeCloseTo(0.0035); // (1000 * 0.000001) + (500 * 0.000005) = 0.001 + 0.0025 = 0.0035
    });

    test('calculates Opus cost correctly', () => {
      const cost = calculateCost('opus', 1000, 500);
      expect(cost).toBeCloseTo(0.0525); // (1000 * 0.000015) + (500 * 0.000075) = 0.015 + 0.0375 = 0.0525
    });

    test('handles zero tokens', () => {
      const cost = calculateCost('haiku', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('getModelPricing', () => {
    test('returns correct pricing for sonnet', () => {
      const pricing = getModelPricing('sonnet');
      expect(pricing.input).toBe(0.000003);
      expect(pricing.output).toBe(0.000015);
    });

    test('returns correct pricing for haiku', () => {
      const pricing = getModelPricing('haiku');
      expect(pricing.input).toBe(0.000001);
      expect(pricing.output).toBe(0.000005);
    });
  });

  describe('calculateSavings', () => {
    test('calculates savings when using Haiku vs Sonnet', () => {
      const { savedAmount, savedPercent } = calculateSavings('haiku', 1000, 500);

      // Sonnet cost: 0.0105, Haiku cost: 0.0035
      // Savings: 0.007, Percent: 66.67%
      expect(savedAmount).toBeCloseTo(0.007);
      expect(savedPercent).toBeCloseTo(66.67, 1);
    });

    test('calculates zero savings when using Sonnet', () => {
      const { savedAmount, savedPercent } = calculateSavings('sonnet', 1000, 500);

      expect(savedAmount).toBe(0);
      expect(savedPercent).toBe(0);
    });

    test('calculates negative savings when using Opus', () => {
      const { savedAmount, savedPercent } = calculateSavings('opus', 1000, 500);

      // Sonnet cost: 0.0105, Opus cost: 0.0525
      // "Savings": -0.042 (negative = more expensive)
      expect(savedAmount).toBeCloseTo(-0.042);
      expect(savedPercent).toBeLessThan(0);
    });

    test('handles zero tokens', () => {
      const { savedAmount, savedPercent } = calculateSavings('haiku', 0, 0);

      expect(savedAmount).toBe(0);
      expect(savedPercent).toBe(0);
    });
  });
});

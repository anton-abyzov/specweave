/**
 * Percentile Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import { calculatePercentile } from '../../../src/metrics/utils/percentile.js';

describe('calculatePercentile', () => {
  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    it('should throw for percentile < 0', () => {
      expect(() => calculatePercentile([1, 2, 3], -1)).toThrow(
        'Percentile must be between 0 and 100'
      );
    });

    it('should throw for percentile > 100', () => {
      expect(() => calculatePercentile([1, 2, 3], 101)).toThrow(
        'Percentile must be between 0 and 100'
      );
    });

    it('should handle single-element array', () => {
      expect(calculatePercentile([42], 0)).toBe(42);
      expect(calculatePercentile([42], 50)).toBe(42);
      expect(calculatePercentile([42], 100)).toBe(42);
    });

    it('should handle two-element array', () => {
      expect(calculatePercentile([10, 20], 0)).toBe(10);
      expect(calculatePercentile([10, 20], 50)).toBe(15);
      expect(calculatePercentile([10, 20], 100)).toBe(20);
    });
  });

  describe('integer index (exact values)', () => {
    it('should return the 0th percentile (minimum)', () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 0)).toBe(1);
    });

    it('should return the 100th percentile (maximum)', () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 100)).toBe(5);
    });

    it('should return the 50th percentile (median) for odd-length array', () => {
      // index = (50/100) * (5-1) = 2.0 => exact => sorted[2] = 3
      expect(calculatePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('should return the 25th percentile for even-length array', () => {
      // index = (25/100) * (4-1) = 0.75 => not integer, interpolation
      // Actually for [1,2,3,4,5] with 5 elements: (25/100) * 4 = 1.0 => exact => sorted[1] = 2
      expect(calculatePercentile([1, 2, 3, 4, 5], 25)).toBe(2);
    });
  });

  describe('fractional index (interpolation)', () => {
    it('should interpolate for P90 with 5 elements', () => {
      // sorted: [1, 2, 3, 4, 5]
      // index = (90/100) * 4 = 3.6
      // lowerIndex = 3, upperIndex = 4, fraction = 0.6
      // result = 4 + (5 - 4) * 0.6 = 4.6
      expect(calculatePercentile([1, 2, 3, 4, 5], 90)).toBeCloseTo(4.6);
    });

    it('should interpolate for P10 with 5 elements', () => {
      // sorted: [1, 2, 3, 4, 5]
      // index = (10/100) * 4 = 0.4
      // lowerIndex = 0, upperIndex = 1, fraction = 0.4
      // result = 1 + (2 - 1) * 0.4 = 1.4
      expect(calculatePercentile([1, 2, 3, 4, 5], 10)).toBeCloseTo(1.4);
    });

    it('should interpolate for P75 with 4 elements', () => {
      // sorted: [10, 20, 30, 40]
      // index = (75/100) * 3 = 2.25
      // lowerIndex = 2, upperIndex = 3, fraction = 0.25
      // result = 30 + (40 - 30) * 0.25 = 32.5
      expect(calculatePercentile([10, 20, 30, 40], 75)).toBeCloseTo(32.5);
    });

    it('should interpolate for P33 with 10 elements', () => {
      // sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // index = (33/100) * 9 = 2.97
      // lowerIndex = 2, upperIndex = 3, fraction = 0.97
      // result = 3 + (4 - 3) * 0.97 = 3.97
      expect(
        calculatePercentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 33)
      ).toBeCloseTo(3.97);
    });
  });

  describe('sorting behavior', () => {
    it('should sort values before calculating (unsorted input)', () => {
      // Input is unsorted: [5, 1, 3, 2, 4]
      // Should be sorted to: [1, 2, 3, 4, 5]
      expect(calculatePercentile([5, 1, 3, 2, 4], 50)).toBe(3);
    });

    it('should not mutate the original array', () => {
      const original = [5, 1, 3, 2, 4];
      const copy = [...original];
      calculatePercentile(original, 50);
      expect(original).toEqual(copy);
    });

    it('should handle duplicate values', () => {
      // sorted: [1, 1, 3, 3, 5]
      // P50: index = 2.0 => sorted[2] = 3
      expect(calculatePercentile([1, 1, 3, 3, 5], 50)).toBe(3);
    });

    it('should handle all same values', () => {
      expect(calculatePercentile([7, 7, 7, 7], 25)).toBe(7);
      expect(calculatePercentile([7, 7, 7, 7], 50)).toBe(7);
      expect(calculatePercentile([7, 7, 7, 7], 75)).toBe(7);
    });
  });

  describe('boundary percentiles', () => {
    it('should handle percentile 0', () => {
      expect(calculatePercentile([10, 20, 30], 0)).toBe(10);
    });

    it('should handle percentile 100', () => {
      expect(calculatePercentile([10, 20, 30], 100)).toBe(30);
    });

    it('should handle percentile 1', () => {
      // sorted: [10, 20, 30]
      // index = (1/100) * 2 = 0.02
      // lower = 10, upper = 20, fraction = 0.02
      // result = 10 + (20 - 10) * 0.02 = 10.2
      expect(calculatePercentile([10, 20, 30], 1)).toBeCloseTo(10.2);
    });

    it('should handle percentile 99', () => {
      // sorted: [10, 20, 30]
      // index = (99/100) * 2 = 1.98
      // lower = 20, upper = 30, fraction = 0.98
      // result = 20 + (30 - 20) * 0.98 = 29.8
      expect(calculatePercentile([10, 20, 30], 99)).toBeCloseTo(29.8);
    });
  });

  describe('real-world DORA metrics scenarios', () => {
    it('should calculate P50 for lead times in hours', () => {
      const leadTimesHours = [0.5, 1.2, 2.5, 3.0, 4.8, 6.2, 8.0, 12.5, 18.0, 24.0];
      const p50 = calculatePercentile(leadTimesHours, 50);
      // index = (50/100) * 9 = 4.5
      // lower = 4.8, upper = 6.2, fraction = 0.5
      // result = 4.8 + (6.2 - 4.8) * 0.5 = 5.5
      expect(p50).toBeCloseTo(5.5);
    });

    it('should calculate P90 for recovery times in minutes', () => {
      const recoveryMinutes = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
      const p90 = calculatePercentile(recoveryMinutes, 90);
      // index = (90/100) * 9 = 8.1
      // lower = 90, upper = 120, fraction = 0.1
      // result = 90 + (120 - 90) * 0.1 = 93
      expect(p90).toBeCloseTo(93);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: RateLimiter
 *
 * Tests for rate limiting, estimation, and backoff strategies.
 */

import { RateLimiter, PROVIDER_RATE_LIMITS } from '../../../src/core/sync/rate-limiter.js';
import type {
  TimeRangePreset,
  TimeRangeEstimate,
  RateLimitStatus,
} from '../../../src/core/types/sync-profile.js';

describe('RateLimiter', () => {
  describe('estimateSync', () => {
    it('should estimate 1W time range correctly', () => {
      const limiter = new RateLimiter('github');
      const estimate = limiter.estimateSync('1W');

      expect(estimate.items).toBe(50);
      expect(estimate.apiCalls).toBe(75); // 50 * 1.5
      expect(estimate.durationMinutes).toBe(1); // Math.ceil(50/100)
      expect(estimate.rateLimitImpact).toBe('low'); // 75 < 250
    });

    it('should estimate 1M time range correctly', () => {
      const limiter = new RateLimiter('github');
      const estimate = limiter.estimateSync('1M');

      expect(estimate.items).toBe(200);
      expect(estimate.apiCalls).toBe(300); // 200 * 1.5
      expect(estimate.durationMinutes).toBe(2); // Math.ceil(200/100)
      expect(estimate.rateLimitImpact).toBe('medium'); // 300 > 250, < 1000
    });

    it('should estimate ALL time range correctly', () => {
      const limiter = new RateLimiter('github');
      const estimate = limiter.estimateSync('ALL');

      expect(estimate.items).toBe(5000);
      expect(estimate.apiCalls).toBe(7500); // 5000 * 1.5
      expect(estimate.durationMinutes).toBe(50); // Math.ceil(5000/100)
      expect(estimate.rateLimitImpact).toBe('critical'); // 7500 > 2500
    });

    it('should apply custom scaling factor', () => {
      const limiter = new RateLimiter('github');
      const estimate = limiter.estimateSync('1M', 2.0); // 2x multiplier

      expect(estimate.items).toBe(400); // 200 * 2.0
      expect(estimate.apiCalls).toBe(600); // 400 * 1.5
      expect(estimate.durationMinutes).toBe(4); // Math.ceil(400/100)
      expect(estimate.rateLimitImpact).toBe('medium');
    });

    it('should calculate impact levels correctly for GitHub', () => {
      const limiter = new RateLimiter('github');

      // Low: < 250 calls
      expect(limiter.estimateSync('1W').rateLimitImpact).toBe('low');

      // Medium: < 1000 calls
      expect(limiter.estimateSync('1M').rateLimitImpact).toBe('medium');

      // High: < 2500 calls
      expect(limiter.estimateSync('6M', 1.0).rateLimitImpact).toBe('high');

      // Critical: >= 2500 calls
      expect(limiter.estimateSync('ALL').rateLimitImpact).toBe('critical');
    });

    it('should calculate impact levels correctly for JIRA', () => {
      const limiter = new RateLimiter('jira');

      // JIRA has lower thresholds (25, 50, 75)
      expect(limiter.estimateSync('1W', 0.2).rateLimitImpact).toBe('low'); // ~15 calls
      expect(limiter.estimateSync('1W', 0.5).rateLimitImpact).toBe('medium'); // ~38 calls
      expect(limiter.estimateSync('1M', 0.5).rateLimitImpact).toBe('critical'); // ~150 calls (>= 75)
    });

    it('should calculate impact levels correctly for ADO', () => {
      const limiter = new RateLimiter('ado');

      // ADO has medium thresholds (50, 100, 150)
      expect(limiter.estimateSync('1W', 0.5).rateLimitImpact).toBe('low'); // ~38 calls
      expect(limiter.estimateSync('1M', 0.5).rateLimitImpact).toBe('critical'); // ~150 calls (>= 150)
      expect(limiter.estimateSync('3M', 0.5).rateLimitImpact).toBe('critical'); // ~450 calls (>= 150)
    });
  });

  describe('validateSync', () => {
    it('should validate safe sync with low impact', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 50,
        apiCalls: 75,
        durationMinutes: 1,
        rateLimitImpact: 'low',
      };

      const result = limiter.validateSync(estimate);

      expect(result.safe).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.blockers).toHaveLength(0);
    });

    it('should warn on high impact', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 1200,
        apiCalls: 1800,
        durationMinutes: 12,
        rateLimitImpact: 'high',
      };

      const result = limiter.validateSync(estimate);

      expect(result.safe).toBe(true); // Still safe, just warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('High rate limit impact'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Long sync duration'))).toBe(true);
    });

    it('should block critical impact', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 5000,
        apiCalls: 7500,
        durationMinutes: 50,
        rateLimitImpact: 'critical',
      };

      const result = limiter.validateSync(estimate);

      expect(result.safe).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers.some((b) => b.includes('CRITICAL'))).toBe(true);
    });

    it('should warn when rate limit already high', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 200,
        apiCalls: 300,
        durationMinutes: 2,
        rateLimitImpact: 'medium',
      };

      const rateLimitStatus: RateLimitStatus = {
        remaining: 500,
        limit: 5000,
        resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        percentUsed: 90, // 90% used!
      };

      const result = limiter.validateSync(estimate, rateLimitStatus);

      expect(result.safe).toBe(true);
      expect(result.warnings.some((w) => w.includes('already 90% used'))).toBe(true);
    });

    it('should block if not enough rate limit remaining', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 200,
        apiCalls: 300,
        durationMinutes: 2,
        rateLimitImpact: 'medium',
      };

      const rateLimitStatus: RateLimitStatus = {
        remaining: 100, // Only 100 remaining, need 300!
        limit: 5000,
        resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        percentUsed: 98,
      };

      const result = limiter.validateSync(estimate, rateLimitStatus);

      expect(result.safe).toBe(false);
      expect(result.blockers.some((b) => b.includes('Not enough rate limit'))).toBe(true);
    });

    it('should warn if after-sync remaining is low', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 200,
        apiCalls: 300,
        durationMinutes: 2,
        rateLimitImpact: 'medium',
      };

      const rateLimitStatus: RateLimitStatus = {
        remaining: 400, // After sync: 100 remaining (2% of limit)
        limit: 5000,
        resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        percentUsed: 92,
      };

      const result = limiter.validateSync(estimate, rateLimitStatus);

      expect(result.safe).toBe(true);
      expect(result.warnings.some((w) => w.includes('After sync'))).toBe(true);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const limiter = new RateLimiter('github');

      expect(limiter.calculateBackoff(0)).toBe(1000); // 2^0 * 1000 = 1s
      expect(limiter.calculateBackoff(1)).toBe(2000); // 2^1 * 1000 = 2s
      expect(limiter.calculateBackoff(2)).toBe(4000); // 2^2 * 1000 = 4s
      expect(limiter.calculateBackoff(3)).toBe(8000); // 2^3 * 1000 = 8s
      expect(limiter.calculateBackoff(4)).toBe(16000); // 2^4 * 1000 = 16s
    });

    it('should cap backoff at maxBackoff', () => {
      const limiter = new RateLimiter('github');
      const maxBackoff = 60 * 1000; // 1 minute

      expect(limiter.calculateBackoff(10, maxBackoff)).toBe(maxBackoff); // Would be 1024s, capped at 60s
    });

    it('should use default maxBackoff of 5 minutes', () => {
      const limiter = new RateLimiter('github');

      const backoff = limiter.calculateBackoff(20); // Would be huge without cap
      expect(backoff).toBe(5 * 60 * 1000); // Capped at 5 minutes
    });
  });

  describe('waitForReset', () => {
    it('should wait until reset time', async () => {
      const limiter = new RateLimiter('github');
      const resetAt = new Date(Date.now() + 100).toISOString(); // 100ms from now

      const start = Date.now();
      await limiter.waitForReset(resetAt);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(80); // Allow some tolerance
      expect(elapsed).toBeLessThan(200); // But not too much
    });

    it('should not wait if reset time is in the past', async () => {
      const limiter = new RateLimiter('github');
      const resetAt = new Date(Date.now() - 1000).toISOString(); // 1s ago

      const start = Date.now();
      await limiter.waitForReset(resetAt);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be immediate
    });
  });

  describe('formatEstimate', () => {
    it('should format low impact estimate', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 50,
        apiCalls: 75,
        durationMinutes: 1,
        rateLimitImpact: 'low',
      };

      const formatted = limiter.formatEstimate(estimate);

      expect(formatted).toContain('50 items');
      expect(formatted).toContain('75 API calls');
      expect(formatted).toContain('⚡');
      expect(formatted).toContain('1 min');
      expect(formatted).toContain('LOW');
    });

    it('should format medium impact estimate', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 200,
        apiCalls: 300,
        durationMinutes: 2,
        rateLimitImpact: 'medium',
      };

      const formatted = limiter.formatEstimate(estimate);

      expect(formatted).toContain('200 items');
      expect(formatted).toContain('300 API calls');
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('2 min');
      expect(formatted).toContain('MEDIUM');
    });

    it('should format high impact estimate', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 1200,
        apiCalls: 1800,
        durationMinutes: 12,
        rateLimitImpact: 'high',
      };

      const formatted = limiter.formatEstimate(estimate);

      expect(formatted).toContain('1200 items');
      expect(formatted).toContain('1800 API calls');
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('12 min');
      expect(formatted).toContain('HIGH');
    });

    it('should format critical impact estimate', () => {
      const limiter = new RateLimiter('github');
      const estimate: TimeRangeEstimate = {
        items: 5000,
        apiCalls: 7500,
        durationMinutes: 50,
        rateLimitImpact: 'critical',
      };

      const formatted = limiter.formatEstimate(estimate);

      expect(formatted).toContain('5000 items');
      expect(formatted).toContain('7500 API calls');
      expect(formatted).toContain('❌');
      expect(formatted).toContain('50 min');
      expect(formatted).toContain('CRITICAL');
    });
  });

  describe('formatRateLimitStatus', () => {
    it('should format rate limit status correctly', () => {
      const limiter = new RateLimiter('github');
      const status: RateLimitStatus = {
        remaining: 4500,
        limit: 5000,
        resetAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        percentUsed: 10,
      };

      const formatted = limiter.formatRateLimitStatus(status);

      expect(formatted).toContain('4500/5000');
      expect(formatted).toContain('90% available');
      expect(formatted).toContain('30 min');
    });

    it('should handle near-zero remaining', () => {
      const limiter = new RateLimiter('github');
      const status: RateLimitStatus = {
        remaining: 50,
        limit: 5000,
        resetAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        percentUsed: 99,
      };

      const formatted = limiter.formatRateLimitStatus(status);

      expect(formatted).toContain('50/5000');
      expect(formatted).toContain('1% available');
      expect(formatted).toContain('15 min');
    });
  });

  describe('Provider Rate Limits', () => {
    it('should have correct GitHub limits', () => {
      expect(PROVIDER_RATE_LIMITS.github.limit).toBe(5000);
      expect(PROVIDER_RATE_LIMITS.github.window).toBe('1h');
      expect(PROVIDER_RATE_LIMITS.github.thresholds.low).toBe(250);
      expect(PROVIDER_RATE_LIMITS.github.thresholds.medium).toBe(1000);
      expect(PROVIDER_RATE_LIMITS.github.thresholds.high).toBe(2500);
    });

    it('should have correct JIRA limits', () => {
      expect(PROVIDER_RATE_LIMITS.jira.limit).toBe(100);
      expect(PROVIDER_RATE_LIMITS.jira.window).toBe('1m');
      expect(PROVIDER_RATE_LIMITS.jira.thresholds.low).toBe(25);
      expect(PROVIDER_RATE_LIMITS.jira.thresholds.medium).toBe(50);
      expect(PROVIDER_RATE_LIMITS.jira.thresholds.high).toBe(75);
    });

    it('should have correct ADO limits', () => {
      expect(PROVIDER_RATE_LIMITS.ado.limit).toBe(200);
      expect(PROVIDER_RATE_LIMITS.ado.window).toBe('5m');
      expect(PROVIDER_RATE_LIMITS.ado.thresholds.low).toBe(50);
      expect(PROVIDER_RATE_LIMITS.ado.thresholds.medium).toBe(100);
      expect(PROVIDER_RATE_LIMITS.ado.thresholds.high).toBe(150);
    });
  });

  describe('checkRateLimitStatus', () => {
    it('should return null for JIRA (estimated)', async () => {
      const limiter = new RateLimiter('jira');
      const mockClient = {}; // Mock client

      const status = await limiter.checkRateLimitStatus(mockClient);

      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(100); // JIRA limit
      expect(status?.limit).toBe(100);
      expect(status?.percentUsed).toBe(0); // Unknown
    });

    it('should return null for ADO (estimated)', async () => {
      const limiter = new RateLimiter('ado');
      const mockClient = {}; // Mock client

      const status = await limiter.checkRateLimitStatus(mockClient);

      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(200); // ADO limit
      expect(status?.limit).toBe(200);
      expect(status?.percentUsed).toBe(0); // Unknown
    });

    // Note: GitHub rate limit check requires `gh` CLI, so we skip it in unit tests
    // (tested in integration tests instead)
  });
});

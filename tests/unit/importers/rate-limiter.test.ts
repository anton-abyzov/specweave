/**
 * Unit tests for Rate Limiter
 *
 * Tests cover:
 * - TC-108: Check GitHub rate limit
 * - TC-109: Wait if rate limit low
 * - TC-110: Large import confirmation (> 100 items)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RateLimiter,
  shouldConfirmLargeImport,
  formatLargeImportMessage,
  type RateLimitInfo,
  type RateLimitThresholds,
} from '../../../src/importers/rate-limiter.js';

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe('TC-108: Check GitHub rate limit', () => {
    it('should parse GitHub rate limit headers correctly', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '5',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000', // Unix timestamp
      };

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert
      expect(rateLimitInfo.remaining).toBe(5);
      expect(rateLimitInfo.limit).toBe(5000);
      expect(rateLimitInfo.platform).toBe('github');
      expect(rateLimitInfo.resetAt).toBe(new Date(1700000000 * 1000).toISOString());
      expect(rateLimitInfo.resetInSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should use default values when headers are missing', () => {
      // Arrange
      const headers = {};

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert
      expect(rateLimitInfo.remaining).toBe(5000);
      expect(rateLimitInfo.limit).toBe(5000);
      expect(rateLimitInfo.platform).toBe('github');
    });

    it('should cache rate limit info for later retrieval', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '100',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      // Act
      rateLimiter.checkGitHubRateLimit(headers);
      const cachedInfo = rateLimiter.getLastRateLimitInfo('github');

      // Assert
      expect(cachedInfo).toBeDefined();
      expect(cachedInfo?.remaining).toBe(100);
      expect(cachedInfo?.limit).toBe(5000);
    });

    it('should handle rate limit reset time calculation', () => {
      // Arrange
      const futureResetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const headers = {
        'x-ratelimit-remaining': '50',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': futureResetTime.toString(),
      };

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert
      expect(rateLimitInfo.resetInSeconds).toBeGreaterThan(3500); // Approximately 1 hour
      expect(rateLimitInfo.resetInSeconds).toBeLessThanOrEqual(3600);
    });
  });

  describe('TC-109: Wait if rate limit low', () => {
    it('should wait when remaining requests are below pause threshold', async () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '5', // Below default pause threshold of 10
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      rateLimiter.checkGitHubRateLimit(headers);

      const onWait = vi.fn();
      const startTime = Date.now();

      // Use short pause duration for testing
      const testLimiter = new RateLimiter({ pauseDuration: 0.1 }); // 100ms
      testLimiter.checkGitHubRateLimit(headers);

      // Act
      const didWait = await testLimiter.waitIfNeeded('github', onWait);
      const elapsedTime = Date.now() - startTime;

      // Assert
      expect(didWait).toBe(true);
      expect(onWait).toHaveBeenCalledWith('github', 0.1);
      expect(elapsedTime).toBeGreaterThanOrEqual(90); // At least 90ms
    });

    it('should not wait when remaining requests are above pause threshold', async () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '100', // Above pause threshold of 10
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      rateLimiter.checkGitHubRateLimit(headers);

      const onWait = vi.fn();

      // Act
      const didWait = await rateLimiter.waitIfNeeded('github', onWait);

      // Assert
      expect(didWait).toBe(false);
      expect(onWait).not.toHaveBeenCalled();
    });

    it('should not wait when no rate limit info is available', async () => {
      // Arrange
      const onWait = vi.fn();

      // Act
      const didWait = await rateLimiter.waitIfNeeded('github', onWait);

      // Assert
      expect(didWait).toBe(false);
      expect(onWait).not.toHaveBeenCalled();
    });

    it('should use custom pause threshold', async () => {
      // Arrange
      const customLimiter = new RateLimiter({
        pauseThreshold: 50,
        pauseDuration: 0.1,
      });

      const headers = {
        'x-ratelimit-remaining': '40', // Below custom threshold of 50
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      customLimiter.checkGitHubRateLimit(headers);

      const onWait = vi.fn();

      // Act
      const didWait = await customLimiter.waitIfNeeded('github', onWait);

      // Assert
      expect(didWait).toBe(true);
      expect(onWait).toHaveBeenCalledWith('github', 0.1);
    });
  });

  describe('shouldWarn', () => {
    it('should warn when remaining requests are below warning threshold', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '50', // Below default warning threshold of 100
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      rateLimiter.checkGitHubRateLimit(headers);

      // Act
      const shouldWarn = rateLimiter.shouldWarn('github');

      // Assert
      expect(shouldWarn).toBe(true);
    });

    it('should not warn when remaining requests are above warning threshold', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '150', // Above warning threshold of 100
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      rateLimiter.checkGitHubRateLimit(headers);

      // Act
      const shouldWarn = rateLimiter.shouldWarn('github');

      // Assert
      expect(shouldWarn).toBe(false);
    });

    it('should use custom warning threshold', () => {
      // Arrange
      const customLimiter = new RateLimiter({ warningThreshold: 200 });

      const headers = {
        'x-ratelimit-remaining': '150', // Below custom threshold of 200
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      customLimiter.checkGitHubRateLimit(headers);

      // Act
      const shouldWarn = customLimiter.shouldWarn('github');

      // Assert
      expect(shouldWarn).toBe(true);
    });
  });

  describe('JIRA and ADO rate limits', () => {
    it('should check JIRA rate limit with estimated values', () => {
      // Arrange
      const headers = {};

      // Act
      const rateLimitInfo = rateLimiter.checkJiraRateLimit(headers);

      // Assert
      expect(rateLimitInfo.platform).toBe('jira');
      expect(rateLimitInfo.remaining).toBe(1000);
      expect(rateLimitInfo.limit).toBe(1000);
      expect(rateLimitInfo.resetInSeconds).toBe(60);
    });

    it('should check ADO rate limit with estimated values', () => {
      // Arrange
      const headers = {};

      // Act
      const rateLimitInfo = rateLimiter.checkAdoRateLimit(headers);

      // Assert
      expect(rateLimitInfo.platform).toBe('ado');
      expect(rateLimitInfo.remaining).toBe(200);
      expect(rateLimitInfo.limit).toBe(200);
      expect(rateLimitInfo.resetInSeconds).toBe(60);
    });
  });

  describe('formatWarning', () => {
    it('should format rate limit warning message correctly', () => {
      // Arrange
      const rateLimitInfo: RateLimitInfo = {
        remaining: 50,
        limit: 5000,
        resetAt: new Date('2025-11-19T12:00:00Z').toISOString(),
        resetInSeconds: 3600,
        platform: 'github',
      };

      // Act
      const message = rateLimiter.formatWarning(rateLimitInfo);

      // Assert
      expect(message).toContain('GITHUB');
      expect(message).toContain('50/5000');
      expect(message).toContain('3600s');
      expect(message).toContain('⚠️');
    });
  });

  describe('formatPauseMessage', () => {
    it('should format pause message correctly', () => {
      // Act
      const message = rateLimiter.formatPauseMessage('github', 60);

      // Assert
      expect(message).toContain('GITHUB');
      expect(message).toContain('60s');
      expect(message).toContain('⚠️');
      expect(message).toContain('critically low');
    });
  });

  describe('clearCache', () => {
    it('should clear cached rate limit info', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '100',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      rateLimiter.checkGitHubRateLimit(headers);

      // Act
      rateLimiter.clearCache();
      const cachedInfo = rateLimiter.getLastRateLimitInfo('github');

      // Assert
      expect(cachedInfo).toBeUndefined();
    });
  });

  describe('getThresholds', () => {
    it('should return configured thresholds', () => {
      // Arrange
      const customThresholds: RateLimitThresholds = {
        warningThreshold: 200,
        pauseThreshold: 20,
        pauseDuration: 120,
      };

      const customLimiter = new RateLimiter(customThresholds);

      // Act
      const thresholds = customLimiter.getThresholds();

      // Assert
      expect(thresholds.warningThreshold).toBe(200);
      expect(thresholds.pauseThreshold).toBe(20);
      expect(thresholds.pauseDuration).toBe(120);
    });

    it('should return default thresholds when not customized', () => {
      // Act
      const thresholds = rateLimiter.getThresholds();

      // Assert
      expect(thresholds.warningThreshold).toBe(100);
      expect(thresholds.pauseThreshold).toBe(10);
      expect(thresholds.pauseDuration).toBe(60);
    });
  });

  describe('TC-110: Large import confirmation', () => {
    it('should require confirmation for imports over 100 items', () => {
      // Act & Assert
      expect(shouldConfirmLargeImport(250)).toBe(true);
      expect(shouldConfirmLargeImport(150)).toBe(true);
      expect(shouldConfirmLargeImport(101)).toBe(true);
    });

    it('should not require confirmation for imports under 100 items', () => {
      // Act & Assert
      expect(shouldConfirmLargeImport(100)).toBe(false);
      expect(shouldConfirmLargeImport(50)).toBe(false);
      expect(shouldConfirmLargeImport(1)).toBe(false);
    });

    it('should support custom confirmation threshold', () => {
      // Act & Assert
      expect(shouldConfirmLargeImport(150, 200)).toBe(false);
      expect(shouldConfirmLargeImport(250, 200)).toBe(true);
    });

    it('should format large import confirmation message correctly', () => {
      // Act
      const message = formatLargeImportMessage(250);

      // Assert
      expect(message).toContain('250');
      expect(message).toContain('⚠️');
      expect(message).toContain('Continue?');
      expect(message).toContain('(Y/n)');
    });
  });

  describe('Edge cases', () => {
    it('should handle negative reset time gracefully', () => {
      // Arrange
      const pastResetTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const headers = {
        'x-ratelimit-remaining': '50',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': pastResetTime.toString(),
      };

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert
      expect(rateLimitInfo.resetInSeconds).toBe(0); // Should be clamped to 0
    });

    it('should handle zero remaining requests', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1700000000',
      };

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert
      expect(rateLimitInfo.remaining).toBe(0);
      expect(rateLimiter.shouldWarn('github')).toBe(true);
    });

    it('should handle invalid header values gracefully', () => {
      // Arrange
      const headers = {
        'x-ratelimit-remaining': 'invalid',
        'x-ratelimit-limit': 'also-invalid',
        'x-ratelimit-reset': 'not-a-number',
      };

      // Act
      const rateLimitInfo = rateLimiter.checkGitHubRateLimit(headers);

      // Assert - Should use defaults when parsing fails
      expect(rateLimitInfo.remaining).toBe(5000); // Default
      expect(rateLimitInfo.limit).toBe(5000); // Default
    });
  });
});

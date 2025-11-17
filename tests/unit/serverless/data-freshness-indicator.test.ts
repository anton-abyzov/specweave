import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

import { describe, it, expect } from 'vitest';
import { PlatformDataLoader } from '../../../src/core/serverless/platform-data-loader.js';
import { formatPlatformRecommendationWithFreshness, checkDataFreshness } from '../../../src/core/serverless/recommendation-formatter.js';
import type { ServerlessPlatform } from '../../../src/core/serverless/types.js';

describe('Data Freshness Indicator', () => {
  describe('testFreshnessIndicatorDisplay', () => {
    it('should display lastVerified date in recommendation', async () => {
      const loader = new PlatformDataLoader();
      const platforms = await loader.loadAll();
      const awsLambda = platforms.find(p => p.id === 'aws-lambda');

      expect(awsLambda).toBeDefined();

      const recommendation = formatPlatformRecommendationWithFreshness(awsLambda!);

      // Should include lastVerified date
      expect(recommendation).toContain('Last verified:');
      expect(recommendation).toContain(awsLambda!.lastVerified);
    });
  });

  describe('testStaleDataWarning', () => {
    it('should show warning when data is more than 30 days old', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const stalePlatform: ServerlessPlatform = {
        id: 'test-platform',
        name: 'Test Platform',
        provider: 'AWS',
        pricing: {
          freeTier: { requests: 1000000, computeGbSeconds: 400000, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.20, computePerGbSecond: 0.0000166667, dataTransferPerGb: 0.09 }
        },
        features: {
          runtimes: ['Node.js'],
          coldStartMs: 200,
          maxExecutionMinutes: 15,
          maxMemoryMb: 10240
        },
        ecosystem: {
          integrations: ['S3'],
          sdks: ['Node.js'],
          communitySize: 'large'
        },
        lockIn: {
          portability: 'medium',
          migrationComplexity: 'medium',
          vendorLockIn: 'Medium lock-in'
        },
        startupPrograms: [],
        lastVerified: thirtyOneDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD
      };

      const recommendation = formatPlatformRecommendationWithFreshness(stalePlatform);

      // Should include warning about stale data
      expect(recommendation).toMatch(/⚠️.*stale.*data/i);
      expect(recommendation).toMatch(/verify.*current.*pricing/i);
    });
  });

  describe('testFreshData', () => {
    it('should NOT show warning when data is less than or equal to 30 days old', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const freshPlatform: ServerlessPlatform = {
        id: 'test-platform-fresh',
        name: 'Fresh Platform',
        provider: 'AWS',
        pricing: {
          freeTier: { requests: 1000000, computeGbSeconds: 400000, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.20, computePerGbSecond: 0.0000166667, dataTransferPerGb: 0.09 }
        },
        features: {
          runtimes: ['Node.js'],
          coldStartMs: 200,
          maxExecutionMinutes: 15,
          maxMemoryMb: 10240
        },
        ecosystem: {
          integrations: ['S3'],
          sdks: ['Node.js'],
          communitySize: 'large'
        },
        lockIn: {
          portability: 'medium',
          migrationComplexity: 'medium',
          vendorLockIn: 'Medium lock-in'
        },
        startupPrograms: [],
        lastVerified: tenDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD
      };

      const recommendation = formatPlatformRecommendationWithFreshness(freshPlatform);

      // Should NOT include warning
      expect(recommendation).not.toMatch(/⚠️.*stale/i);

      // But should still show the lastVerified date
      expect(recommendation).toContain('Last verified:');
      expect(recommendation).toContain(freshPlatform.lastVerified);
    });
  });

  describe('checkDataFreshness utility', () => {
    it('should correctly identify stale data', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      const staleDate = thirtyOneDaysAgo.toISOString().split('T')[0];

      const result = checkDataFreshness(staleDate);

      expect(result.isStale).toBe(true);
      expect(result.daysOld).toBeGreaterThan(30);
    });

    it('should correctly identify fresh data', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const freshDate = tenDaysAgo.toISOString().split('T')[0];

      const result = checkDataFreshness(freshDate);

      expect(result.isStale).toBe(false);
      expect(result.daysOld).toBeLessThanOrEqual(10);
    });

    it('should handle today\'s date as fresh', () => {
      const today = new Date().toISOString().split('T')[0];

      const result = checkDataFreshness(today);

      expect(result.isStale).toBe(false);
      expect(result.daysOld).toBe(0);
    });
  });
});

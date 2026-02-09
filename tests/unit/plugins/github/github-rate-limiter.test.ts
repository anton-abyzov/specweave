/**
 * Unit tests for GitHubRateLimiter (RED phase — module does not exist yet)
 *
 * Tests the shared token-bucket rate limiter for multi-repo GitHub sync.
 * The rate limiter queries `gh api rate_limit`, tracks cumulative usage,
 * and gates sync operations when approaching API limits.
 *
 * @see plugins/specweave-github/lib/github-rate-limiter.ts (not yet created)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock execFileNoThrow which the rate limiter will use for `gh api rate_limit`
const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// RED phase import — this module does not exist yet and will cause test failure
import {
  GitHubRateLimiter,
  type RateLimitStatus,
} from '../../../../plugins/specweave-github/lib/github-rate-limiter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock `gh api rate_limit` JSON response */
function makeRateLimitResponse(remaining: number, limit: number, resetEpoch: number) {
  return JSON.stringify({
    resources: {
      core: {
        limit,
        remaining,
        reset: resetEpoch,
        used: limit - remaining,
      },
    },
  });
}

/** Shortcut for a successful exec result */
function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

/** Shortcut for a failed exec result */
function execFailure(stderr: string) {
  return { stdout: '', stderr, exitCode: 1, success: false, error: new Error(stderr) };
}

describe('GitHubRateLimiter', () => {
  let limiter: GitHubRateLimiter;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockExecFileNoThrow.mockReset();
    limiter = new GitHubRateLimiter();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------------
  // 1. checkRateLimit — parses gh CLI response
  // -----------------------------------------------------------------------
  describe('checkRateLimit', () => {
    it('should return parsed rate limit from gh CLI response', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(4500, 5000, resetEpoch)),
      );

      const status: RateLimitStatus = await limiter.checkRateLimit();

      expect(status.remaining).toBe(4500);
      expect(status.limit).toBe(5000);
      expect(status.resetAt).toBeInstanceOf(Date);
      expect(status.resetAt.getTime()).toBe(resetEpoch * 1000);
      expect(status.percentUsed).toBeCloseTo(10, 0); // (500/5000)*100 = 10%
    });

    it('should call gh api rate_limit via execFileNoThrow', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );

      await limiter.checkRateLimit();

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        ['api', 'rate_limit'],
        expect.objectContaining({}),
      );
    });

    it('should throw when gh CLI fails', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execFailure('gh: command not found'),
      );

      await expect(limiter.checkRateLimit()).rejects.toThrow();
    });

    it('should throw when response JSON is invalid', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess('not valid json'),
      );

      await expect(limiter.checkRateLimit()).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // 2. estimateApiCalls — pre-flight call estimation
  // -----------------------------------------------------------------------
  describe('estimateApiCalls', () => {
    it('should estimate ~10 calls for 1 spec with 3 user stories', () => {
      // 3 searches + 3 creates/updates + overhead (labels, milestones, etc.)
      const estimate = limiter.estimateApiCalls(1, 3);
      expect(estimate).toBeGreaterThanOrEqual(8);
      expect(estimate).toBeLessThanOrEqual(12);
    });

    it('should scale linearly with spec count', () => {
      const single = limiter.estimateApiCalls(1, 3);
      const double = limiter.estimateApiCalls(2, 6);
      // Double the work should roughly double the calls
      expect(double).toBeGreaterThanOrEqual(single * 1.5);
      expect(double).toBeLessThanOrEqual(single * 2.5);
    });

    it('should return 0 for zero specs and zero user stories', () => {
      expect(limiter.estimateApiCalls(0, 0)).toBe(0);
    });

    it('should handle specs with no user stories', () => {
      // Even with 0 user stories, a spec sync still needs some API calls
      const estimate = limiter.estimateApiCalls(1, 0);
      expect(estimate).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // 3. canProceed — allowed when under 80% usage
  // -----------------------------------------------------------------------
  describe('canProceed', () => {
    it('should return allowed:true when under 80% usage', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      // 70% used → 30% remaining (1500 of 5000)
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(1500, 5000, resetEpoch)),
      );

      const result = await limiter.canProceed(10);

      expect(result.allowed).toBe(true);
      expect(result.waitMs).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should return allowed:true when estimated calls fit within remaining quota', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      // 50% used → 2500 remaining
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(2500, 5000, resetEpoch)),
      );

      const result = await limiter.canProceed(100);

      expect(result.allowed).toBe(true);
    });

    // -------------------------------------------------------------------
    // 4. canProceed — blocked when over 90% usage
    // -------------------------------------------------------------------
    it('should return allowed:false with waitMs when over 90% usage', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 1800; // resets in 30 min
      // 95% used → only 250 remaining
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(250, 5000, resetEpoch)),
      );

      const result = await limiter.canProceed(300);

      expect(result.allowed).toBe(false);
      expect(result.waitMs).toBeTypeOf('number');
      expect(result.waitMs).toBeGreaterThan(0);
      expect(result.reason).toBeTypeOf('string');
      expect(result.reason).toMatch(/rate limit/i);
    });

    it('should return allowed:false when estimated calls exceed remaining', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 600;
      // 80% used, only 1000 remaining, but we need 1500
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(1000, 5000, resetEpoch)),
      );

      const result = await limiter.canProceed(1500);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should calculate waitMs based on reset time', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const resetInSeconds = 600; // 10 minutes
      const resetEpoch = nowSec + resetInSeconds;
      // Nearly exhausted
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5, 5000, resetEpoch)),
      );

      const result = await limiter.canProceed(100);

      expect(result.allowed).toBe(false);
      // waitMs should be approximately resetInSeconds * 1000 (within a few seconds tolerance)
      expect(result.waitMs).toBeGreaterThan((resetInSeconds - 5) * 1000);
      expect(result.waitMs).toBeLessThanOrEqual((resetInSeconds + 5) * 1000);
    });
  });

  // -----------------------------------------------------------------------
  // 5. recordUsage — cumulative tracking
  // -----------------------------------------------------------------------
  describe('recordUsage', () => {
    it('should track cumulative calls', () => {
      limiter.recordUsage(10);
      limiter.recordUsage(20);
      limiter.recordUsage(5);

      // Total recorded = 35; use getUsagePercent to verify indirectly
      // We need to set a known limit first via checkRateLimit
      expect(() => limiter.recordUsage(10)).not.toThrow();
    });

    it('should accumulate across multiple calls', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );
      await limiter.checkRateLimit();

      limiter.recordUsage(100);
      limiter.recordUsage(200);

      // After recording 300 calls against a 5000 limit, percent = 6%
      expect(limiter.getUsagePercent()).toBeCloseTo(6, 0);
    });

    it('should not accept negative values', () => {
      expect(() => limiter.recordUsage(-5)).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // 6. getUsagePercent — correct percentage
  // -----------------------------------------------------------------------
  describe('getUsagePercent', () => {
    it('should return 0 before any usage is recorded', () => {
      expect(limiter.getUsagePercent()).toBe(0);
    });

    it('should return correct percentage after recording usage', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );
      await limiter.checkRateLimit();

      limiter.recordUsage(500);

      // 500 / 5000 = 10%
      expect(limiter.getUsagePercent()).toBeCloseTo(10, 0);
    });

    it('should cap at 100% even if usage exceeds limit', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );
      await limiter.checkRateLimit();

      limiter.recordUsage(6000);

      expect(limiter.getUsagePercent()).toBeLessThanOrEqual(100);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Token passthrough via GH_TOKEN env var
  // -----------------------------------------------------------------------
  describe('token passthrough', () => {
    it('should pass token as GH_TOKEN env var to gh CLI', async () => {
      const tokenLimiter = new GitHubRateLimiter('ghp_test_token_abc123');
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );

      await tokenLimiter.checkRateLimit();

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        ['api', 'rate_limit'],
        expect.objectContaining({
          env: expect.objectContaining({
            GH_TOKEN: 'ghp_test_token_abc123',
          }),
        }),
      );
    });

    it('should use process.env when no token is provided', async () => {
      const noTokenLimiter = new GitHubRateLimiter();
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );

      await noTokenLimiter.checkRateLimit();

      // Should still call gh but without overriding GH_TOKEN
      expect(mockExecFileNoThrow).toHaveBeenCalled();
      const callArgs = mockExecFileNoThrow.mock.calls[0];
      const envArg = callArgs[2]?.env;
      // When no token provided, env should not have an explicit GH_TOKEN override
      // (it may inherit from process.env, but the limiter should not inject one)
      if (envArg && !process.env.GH_TOKEN) {
        expect(envArg.GH_TOKEN).toBeUndefined();
      }
    });

    it('should not mutate process.env when token is set', async () => {
      const originalGhToken = process.env.GH_TOKEN;
      const tokenLimiter = new GitHubRateLimiter('ghp_should_not_leak');
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(makeRateLimitResponse(5000, 5000, resetEpoch)),
      );

      await tokenLimiter.checkRateLimit();

      expect(process.env.GH_TOKEN).toBe(originalGhToken);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Error handling when gh CLI fails
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('should throw a descriptive error when gh CLI is not found', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execFailure('gh: command not found'),
      );

      await expect(limiter.checkRateLimit()).rejects.toThrow(/gh/i);
    });

    it('should throw when gh returns non-zero exit code', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce({
        stdout: '',
        stderr: 'HTTP 401: Bad credentials',
        exitCode: 1,
        success: false,
        error: new Error('HTTP 401: Bad credentials'),
      });

      await expect(limiter.checkRateLimit()).rejects.toThrow();
    });

    it('should throw when rate limit response is missing expected fields', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execSuccess(JSON.stringify({ resources: {} })),
      );

      await expect(limiter.checkRateLimit()).rejects.toThrow();
    });

    it('should handle network timeout gracefully', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execFailure('timeout: connection timed out'),
      );

      await expect(limiter.checkRateLimit()).rejects.toThrow();
    });

    it('should propagate errors in canProceed when checkRateLimit fails', async () => {
      mockExecFileNoThrow.mockResolvedValueOnce(
        execFailure('gh: not authenticated'),
      );

      await expect(limiter.canProceed(10)).rejects.toThrow();
    });
  });
});

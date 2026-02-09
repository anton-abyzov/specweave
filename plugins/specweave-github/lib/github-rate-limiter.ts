/**
 * GitHub Rate Limiter
 *
 * Shared token-bucket rate limiter for multi-repo GitHub sync.
 * Queries `gh api rate_limit`, tracks cumulative usage, and gates
 * sync operations when approaching API limits.
 *
 * @module github-rate-limiter
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

export interface RateLimitStatus {
  /** Remaining requests in current window */
  remaining: number;
  /** Total limit per window */
  limit: number;
  /** When the rate limit resets */
  resetAt: Date;
  /** Percentage of limit used (0-100) */
  percentUsed: number;
}

interface CanProceedResult {
  allowed: boolean;
  waitMs?: number;
  reason?: string;
}

/** Calls per user story: search + create/update + labels */
const CALLS_PER_USER_STORY = 3;
/** Overhead per spec: milestone check, project check */
const CALLS_PER_SPEC_OVERHEAD = 2;

export class GitHubRateLimiter {
  private token?: string;
  private totalUsed = 0;
  private knownLimit = 0;

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Query current GitHub API rate limit via `gh api rate_limit`.
   */
  async checkRateLimit(): Promise<RateLimitStatus> {
    const env = this.getEnv();
    const result = await execFileNoThrow('gh', ['api', 'rate_limit'], { env });

    if (!result.success) {
      throw new Error(`gh CLI failed: ${result.stderr || result.error?.message || 'unknown error'}`);
    }

    let parsed: { resources?: { core?: { remaining?: number; limit?: number; reset?: number } } };
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      throw new Error(`Failed to parse rate limit response: ${result.stdout.slice(0, 100)}`);
    }

    const core = parsed?.resources?.core;
    if (!core || core.remaining === undefined || core.limit === undefined || core.reset === undefined) {
      throw new Error('Rate limit response missing expected fields (resources.core)');
    }

    this.knownLimit = core.limit;

    const percentUsed = core.limit > 0
      ? ((core.limit - core.remaining) / core.limit) * 100
      : 0;

    return {
      remaining: core.remaining,
      limit: core.limit,
      resetAt: new Date(core.reset * 1000),
      percentUsed,
    };
  }

  /**
   * Estimate how many API calls a sync operation will require.
   */
  estimateApiCalls(specCount: number, userStoryCount: number): number {
    if (specCount === 0 && userStoryCount === 0) {
      return 0;
    }
    return (specCount * CALLS_PER_SPEC_OVERHEAD) + (userStoryCount * CALLS_PER_USER_STORY);
  }

  /**
   * Check whether a sync operation can proceed given the current rate limit.
   */
  async canProceed(estimatedCalls: number): Promise<CanProceedResult> {
    const status = await this.checkRateLimit();

    if (estimatedCalls > status.remaining) {
      const waitMs = Math.max(0, status.resetAt.getTime() - Date.now());
      return {
        allowed: false,
        waitMs,
        reason: `Rate limit: need ${estimatedCalls} calls but only ${status.remaining}/${status.limit} remaining. Resets in ${Math.ceil(waitMs / 1000)}s`,
      };
    }

    if (status.percentUsed > 90) {
      const waitMs = Math.max(0, status.resetAt.getTime() - Date.now());
      return {
        allowed: false,
        waitMs,
        reason: `Rate limit at ${status.percentUsed.toFixed(0)}% — too high to proceed safely`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record API calls made during a sync operation.
   */
  recordUsage(calls: number): void {
    if (calls < 0) {
      throw new Error('Cannot record negative usage');
    }
    this.totalUsed += calls;
  }

  /**
   * Get the percentage of the known limit used by this limiter instance.
   */
  getUsagePercent(): number {
    if (this.knownLimit === 0) return 0;
    const pct = (this.totalUsed / this.knownLimit) * 100;
    return Math.min(pct, 100);
  }

  private getEnv(): NodeJS.ProcessEnv {
    if (this.token) {
      return { ...process.env, GH_TOKEN: this.token };
    }
    return process.env;
  }
}

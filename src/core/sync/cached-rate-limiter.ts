/**
 * Cached Rate Limiter
 *
 * Wraps a rate limit checker with a 60-second TTL cache to avoid
 * making extra API calls on each sync operation.
 *
 * @module core/sync/cached-rate-limiter
 */

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  percentUsed: number;
}

interface CanProceedResult {
  allowed: boolean;
  waitMs?: number;
  reason?: string;
}

interface RateLimitChecker {
  checkRateLimit(): Promise<RateLimitStatus>;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

export class CachedRateLimiter {
  private readonly checker: RateLimitChecker;
  private cached: { status: RateLimitStatus; cachedAt: number } | null = null;

  constructor(checker: RateLimitChecker) {
    this.checker = checker;
  }

  async canProceed(estimatedCalls: number): Promise<CanProceedResult> {
    const status = await this.getOrRefresh();

    if (estimatedCalls > status.remaining) {
      const waitMs = Math.max(0, status.resetAt.getTime() - Date.now());
      return {
        allowed: false,
        waitMs,
        reason: `Need ${estimatedCalls} calls but only ${status.remaining}/${status.limit} remaining. Resets in ${Math.ceil(waitMs / 1000)}s`,
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

  getStatus(): RateLimitStatus | null {
    return this.cached?.status ?? null;
  }

  private async getOrRefresh(): Promise<RateLimitStatus> {
    if (this.cached && (Date.now() - this.cached.cachedAt) < CACHE_TTL_MS) {
      return this.cached.status;
    }

    const status = await this.checker.checkRateLimit();
    this.cached = { status, cachedAt: Date.now() };
    return status;
  }
}

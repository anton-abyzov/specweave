import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
const CALLS_PER_USER_STORY = 3;
const CALLS_PER_SPEC_OVERHEAD = 2;
class GitHubRateLimiter {
  constructor(token) {
    this.totalUsed = 0;
    this.knownLimit = 0;
    this.token = token;
  }
  /**
   * Query current GitHub API rate limit via `gh api rate_limit`.
   */
  async checkRateLimit() {
    const env = this.getEnv();
    const result = await execFileNoThrow("gh", ["api", "rate_limit"], { env });
    if (!result.success) {
      throw new Error(`gh CLI failed: ${result.stderr || result.error?.message || "unknown error"}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      throw new Error(`Failed to parse rate limit response: ${result.stdout.slice(0, 100)}`);
    }
    const core = parsed?.resources?.core;
    if (!core || core.remaining === void 0 || core.limit === void 0 || core.reset === void 0) {
      throw new Error("Rate limit response missing expected fields (resources.core)");
    }
    this.knownLimit = core.limit;
    const percentUsed = core.limit > 0 ? (core.limit - core.remaining) / core.limit * 100 : 0;
    return {
      remaining: core.remaining,
      limit: core.limit,
      resetAt: new Date(core.reset * 1e3),
      percentUsed
    };
  }
  /**
   * Estimate how many API calls a sync operation will require.
   */
  estimateApiCalls(specCount, userStoryCount) {
    if (specCount === 0 && userStoryCount === 0) {
      return 0;
    }
    return specCount * CALLS_PER_SPEC_OVERHEAD + userStoryCount * CALLS_PER_USER_STORY;
  }
  /**
   * Check whether a sync operation can proceed given the current rate limit.
   */
  async canProceed(estimatedCalls) {
    const status = await this.checkRateLimit();
    if (estimatedCalls > status.remaining) {
      const waitMs = Math.max(0, status.resetAt.getTime() - Date.now());
      return {
        allowed: false,
        waitMs,
        reason: `Rate limit: need ${estimatedCalls} calls but only ${status.remaining}/${status.limit} remaining. Resets in ${Math.ceil(waitMs / 1e3)}s`
      };
    }
    if (status.percentUsed > 90) {
      const waitMs = Math.max(0, status.resetAt.getTime() - Date.now());
      return {
        allowed: false,
        waitMs,
        reason: `Rate limit at ${status.percentUsed.toFixed(0)}% \u2014 too high to proceed safely`
      };
    }
    return { allowed: true };
  }
  /**
   * Record API calls made during a sync operation.
   */
  recordUsage(calls) {
    if (calls < 0) {
      throw new Error("Cannot record negative usage");
    }
    this.totalUsed += calls;
  }
  /**
   * Get the percentage of the known limit used by this limiter instance.
   */
  getUsagePercent() {
    if (this.knownLimit === 0) return 0;
    const pct = this.totalUsed / this.knownLimit * 100;
    return Math.min(pct, 100);
  }
  getEnv() {
    if (this.token) {
      return { ...process.env, GH_TOKEN: this.token };
    }
    return process.env;
  }
}
export {
  GitHubRateLimiter
};

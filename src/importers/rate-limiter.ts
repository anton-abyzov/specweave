/**
 * Rate Limiter
 *
 * Handles API rate limiting for external platforms (GitHub, JIRA, ADO).
 * Prevents hitting rate limits and provides graceful backoff strategies.
 */

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Remaining requests in current window */
  remaining: number;

  /** Total requests allowed per window */
  limit: number;

  /** Timestamp when rate limit resets (ISO string) */
  resetAt: string;

  /** Seconds until reset */
  resetInSeconds: number;

  /** Platform name */
  platform: 'github' | 'jira' | 'ado';
}

/**
 * Rate limit thresholds
 */
export interface RateLimitThresholds {
  /** Warn when remaining requests drop below this (default: 100) */
  warningThreshold?: number;

  /** Pause when remaining requests drop below this (default: 10) */
  pauseThreshold?: number;

  /** Wait time in seconds when paused (default: 60) */
  pauseDuration?: number;
}

/**
 * Default rate limit thresholds
 */
const DEFAULT_THRESHOLDS: Required<RateLimitThresholds> = {
  warningThreshold: 100,
  pauseThreshold: 10,
  pauseDuration: 60,
};

/**
 * Rate Limiter
 *
 * Monitors and manages API rate limits across platforms.
 */
export class RateLimiter {
  private thresholds: Required<RateLimitThresholds>;
  private lastRateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(thresholds: RateLimitThresholds = {}) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };
  }

  /**
   * Check GitHub rate limit from response headers
   *
   * @param headers - HTTP response headers from GitHub API
   * @returns Rate limit information
   */
  checkGitHubRateLimit(headers: Record<string, string>): RateLimitInfo {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '5000', 10);
    const limit = parseInt(headers['x-ratelimit-limit'] || '5000', 10);
    const resetTimestamp = parseInt(headers['x-ratelimit-reset'] || '0', 10);

    // Handle invalid values by using defaults
    const safeRemaining = isNaN(remaining) ? 5000 : remaining;
    const safeLimit = isNaN(limit) ? 5000 : limit;
    const safeResetTimestamp = isNaN(resetTimestamp) ? Math.floor(Date.now() / 1000) : resetTimestamp;

    const resetAt = new Date(safeResetTimestamp * 1000).toISOString();
    const resetInSeconds = Math.max(0, safeResetTimestamp - Math.floor(Date.now() / 1000));

    const rateLimitInfo: RateLimitInfo = {
      remaining: safeRemaining,
      limit: safeLimit,
      resetAt,
      resetInSeconds,
      platform: 'github',
    };

    // Cache rate limit info
    this.lastRateLimitInfo.set('github', rateLimitInfo);

    return rateLimitInfo;
  }

  /**
   * Check JIRA rate limit (placeholder - JIRA doesn't expose rate limits in headers)
   *
   * @param headers - HTTP response headers from JIRA API
   * @returns Rate limit information (estimated)
   */
  checkJiraRateLimit(headers: Record<string, string>): RateLimitInfo {
    // JIRA Cloud rate limits are not exposed in response headers
    // We estimate based on known limits (10 requests/second for Cloud)
    const rateLimitInfo: RateLimitInfo = {
      remaining: 1000, // Estimate
      limit: 1000,
      resetAt: new Date(Date.now() + 60000).toISOString(), // 1 minute
      resetInSeconds: 60,
      platform: 'jira',
    };

    this.lastRateLimitInfo.set('jira', rateLimitInfo);

    return rateLimitInfo;
  }

  /**
   * Check Azure DevOps rate limit (placeholder - ADO has different rate limit model)
   *
   * @param headers - HTTP response headers from ADO API
   * @returns Rate limit information (estimated)
   */
  checkAdoRateLimit(headers: Record<string, string>): RateLimitInfo {
    // Azure DevOps has rate limits but doesn't expose them in headers
    // Default is 200 requests per minute
    const rateLimitInfo: RateLimitInfo = {
      remaining: 200, // Estimate
      limit: 200,
      resetAt: new Date(Date.now() + 60000).toISOString(), // 1 minute
      resetInSeconds: 60,
      platform: 'ado',
    };

    this.lastRateLimitInfo.set('ado', rateLimitInfo);

    return rateLimitInfo;
  }

  /**
   * Wait if rate limit is low
   *
   * @param platform - Platform to check
   * @param onWait - Callback when waiting (receives wait duration in seconds)
   * @returns True if waited, false if no wait needed
   */
  async waitIfNeeded(
    platform: 'github' | 'jira' | 'ado',
    onWait?: (platform: string, seconds: number) => void
  ): Promise<boolean> {
    const rateLimitInfo = this.lastRateLimitInfo.get(platform);

    if (!rateLimitInfo) {
      return false; // No rate limit info available
    }

    // Check if remaining requests are below pause threshold
    if (rateLimitInfo.remaining < this.thresholds.pauseThreshold) {
      const waitSeconds = this.thresholds.pauseDuration;

      // Notify caller
      if (onWait) {
        onWait(platform, waitSeconds);
      }

      // Wait for specified duration
      await this.sleep(waitSeconds * 1000);

      return true;
    }

    return false;
  }

  /**
   * Check if rate limit warning should be shown
   *
   * @param platform - Platform to check
   * @returns True if remaining requests are below warning threshold
   */
  shouldWarn(platform: 'github' | 'jira' | 'ado'): boolean {
    const rateLimitInfo = this.lastRateLimitInfo.get(platform);

    if (!rateLimitInfo) {
      return false;
    }

    return rateLimitInfo.remaining < this.thresholds.warningThreshold;
  }

  /**
   * Get last known rate limit info for a platform
   *
   * @param platform - Platform to query
   * @returns Rate limit info or undefined if not cached
   */
  getLastRateLimitInfo(platform: 'github' | 'jira' | 'ado'): RateLimitInfo | undefined {
    return this.lastRateLimitInfo.get(platform);
  }

  /**
   * Format rate limit warning message
   *
   * @param rateLimitInfo - Rate limit information
   * @returns Formatted warning message
   */
  formatWarning(rateLimitInfo: RateLimitInfo): string {
    const platformName = rateLimitInfo.platform.toUpperCase();
    const resetTime = new Date(rateLimitInfo.resetAt).toLocaleTimeString();

    return (
      `⚠️  ${platformName} rate limit low: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining. ` +
      `Resets at ${resetTime} (in ${rateLimitInfo.resetInSeconds}s).`
    );
  }

  /**
   * Format pause message
   *
   * @param platform - Platform name
   * @param seconds - Wait duration in seconds
   * @returns Formatted pause message
   */
  formatPauseMessage(platform: string, seconds: number): string {
    return `⚠️  ${platform.toUpperCase()} rate limit critically low. Waiting ${seconds}s before continuing...`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear cached rate limit info (useful for testing)
   */
  clearCache(): void {
    this.lastRateLimitInfo.clear();
  }

  /**
   * Get current thresholds
   */
  getThresholds(): Required<RateLimitThresholds> {
    return { ...this.thresholds };
  }
}

/**
 * Check if a large import should prompt for confirmation
 *
 * @param itemCount - Number of items to import
 * @param threshold - Confirmation threshold (default: 100)
 * @returns True if confirmation should be requested
 */
export function shouldConfirmLargeImport(itemCount: number, threshold: number = 100): boolean {
  return itemCount > threshold;
}

/**
 * Format large import confirmation message
 *
 * @param itemCount - Number of items to import
 * @returns Formatted confirmation message
 */
export function formatLargeImportMessage(itemCount: number): string {
  return `⚠️  Found ${itemCount} items to import. This may take some time. Continue? (Y/n)`;
}

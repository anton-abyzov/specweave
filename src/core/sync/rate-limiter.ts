/**
 * Rate Limiter for External Sync
 *
 * Provides rate limiting protection, estimation, and backoff strategies
 * for GitHub, JIRA, and Azure DevOps sync operations.
 */

import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
import {
  SyncProvider,
  TimeRangePreset,
  TimeRangeEstimate,
  RateLimitStatus,
} from '../types/sync-profile.js';

// ============================================================================
// Provider Rate Limit Constants
// ============================================================================

export const PROVIDER_RATE_LIMITS = {
  github: {
    limit: 5000,
    window: '1h',
    thresholds: {
      low: 250,    // < 5% of limit
      medium: 1000, // < 20% of limit
      high: 2500,   // < 50% of limit
    },
  },
  jira: {
    limit: 100,
    window: '1m',
    thresholds: {
      low: 25,
      medium: 50,
      high: 75,
    },
  },
  ado: {
    limit: 200,
    window: '5m',
    thresholds: {
      low: 50,
      medium: 100,
      high: 150,
    },
  },
} as const;

// ============================================================================
// Time Range Estimation Constants
// ============================================================================

/**
 * Average work items created per time period
 * (Adjust based on real project velocity)
 */
const ITEMS_PER_PERIOD: Record<TimeRangePreset, number> = {
  '1W': 50,
  '2W': 100,
  '1M': 200,
  '3M': 600,
  '6M': 1200,
  '1Y': 2400,
  ALL: 5000, // Estimate - actual will vary greatly
};

/**
 * API call multiplier (overhead for pagination, metadata, etc.)
 */
const API_CALL_MULTIPLIER = 1.5;

/**
 * Throughput (items synced per minute)
 */
const ITEMS_PER_MINUTE = 100;

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private provider: SyncProvider;

  constructor(provider: SyncProvider) {
    this.provider = provider;
  }

  // ==========================================================================
  // Estimation
  // ==========================================================================

  /**
   * Estimate sync operation impact
   *
   * @param timeRange Time range preset
   * @param customFactor Custom scaling factor (default: 1.0)
   * @returns Estimate of items, API calls, duration, and impact
   */
  estimateSync(
    timeRange: TimeRangePreset,
    customFactor: number = 1.0
  ): TimeRangeEstimate {
    // Base estimate from preset
    const baseItems = ITEMS_PER_PERIOD[timeRange];
    const items = Math.ceil(baseItems * customFactor);

    // Calculate API calls (with overhead)
    const apiCalls = Math.ceil(items * API_CALL_MULTIPLIER);

    // Estimate duration
    const durationMinutes = Math.ceil(items / ITEMS_PER_MINUTE);

    // Calculate rate limit impact
    const rateLimitImpact = this.calculateImpact(apiCalls);

    return {
      items,
      apiCalls,
      durationMinutes,
      rateLimitImpact,
    };
  }

  /**
   * Calculate rate limit impact level
   *
   * @param apiCalls Number of API calls
   * @returns Impact level: low, medium, high, or critical
   */
  private calculateImpact(
    apiCalls: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const limits = PROVIDER_RATE_LIMITS[this.provider];

    if (apiCalls < limits.thresholds.low) {
      return 'low';
    } else if (apiCalls < limits.thresholds.medium) {
      return 'medium';
    } else if (apiCalls < limits.thresholds.high) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  // ==========================================================================
  // Rate Limit Checking
  // ==========================================================================

  /**
   * Check current rate limit status (provider-specific)
   *
   * @param client Provider client (e.g., GitHubClient)
   * @returns Current rate limit status
   */
  async checkRateLimitStatus(client: any): Promise<RateLimitStatus | null> {
    try {
      if (this.provider === 'github') {
        return await this.checkGitHubRateLimit(client);
      } else if (this.provider === 'jira') {
        return await this.checkJiraRateLimit(client);
      } else if (this.provider === 'ado') {
        return await this.checkAdoRateLimit(client);
      }

      return null;
    } catch (error) {
      console.warn(`Failed to check rate limit for ${this.provider}:`, error);
      return null;
    }
  }

  /**
   * Check GitHub rate limit status
   */
  private async checkGitHubRateLimit(client: any): Promise<RateLimitStatus> {
    try {
      // Use secure execFileNoThrow instead of execSync
      const result = await execFileNoThrow('gh', [
        'api',
        'rate_limit',
        '--jq',
        '.resources.core',
      ]);

      if (!result.success) {
        throw new Error(
          `GitHub CLI command failed: ${result.stderr || 'Unknown error'}`
        );
      }

      const data = JSON.parse(result.stdout);

      return {
        remaining: data.remaining,
        limit: data.limit,
        resetAt: new Date(data.reset * 1000).toISOString(),
        percentUsed: ((data.limit - data.remaining) / data.limit) * 100,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to check GitHub rate limit. Is \`gh\` CLI authenticated? ${error.message}`
      );
    }
  }

  /**
   * Check JIRA rate limit status
   * (JIRA doesn't expose rate limit info - return estimated)
   */
  private async checkJiraRateLimit(client: any): Promise<RateLimitStatus> {
    // JIRA: No API to check rate limits - return estimated
    const limits = PROVIDER_RATE_LIMITS.jira;

    return {
      remaining: limits.limit,
      limit: limits.limit,
      resetAt: new Date(Date.now() + 60 * 1000).toISOString(), // 1 minute window
      percentUsed: 0, // Unknown
    };
  }

  /**
   * Check Azure DevOps rate limit status
   * (ADO doesn't expose rate limit info - return estimated)
   */
  private async checkAdoRateLimit(client: any): Promise<RateLimitStatus> {
    // ADO: No API to check rate limits - return estimated
    const limits = PROVIDER_RATE_LIMITS.ado;

    return {
      remaining: limits.limit,
      limit: limits.limit,
      resetAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minute window
      percentUsed: 0, // Unknown
    };
  }

  // ==========================================================================
  // Sync Protection
  // ==========================================================================

  /**
   * Validate sync operation is safe to proceed
   *
   * @param estimate Sync estimate
   * @param rateLimitStatus Current rate limit status (optional)
   * @returns Validation result
   */
  validateSync(
    estimate: TimeRangeEstimate,
    rateLimitStatus?: RateLimitStatus | null
  ): {
    safe: boolean;
    warnings: string[];
    blockers: string[];
  } {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Check impact level
    if (estimate.rateLimitImpact === 'high') {
      warnings.push(
        `High rate limit impact: ${estimate.apiCalls} API calls (will use ${this.getImpactPercentage(estimate.apiCalls)}% of ${this.provider} rate limit)`
      );
    } else if (estimate.rateLimitImpact === 'critical') {
      blockers.push(
        `CRITICAL rate limit impact: ${estimate.apiCalls} API calls exceeds safe threshold for ${this.provider}`
      );
    }

    // Check duration
    if (estimate.durationMinutes > 10) {
      warnings.push(
        `Long sync duration: ~${estimate.durationMinutes} minutes`
      );
    }

    // Check current rate limit status
    if (rateLimitStatus) {
      const percentUsed = rateLimitStatus.percentUsed;

      if (percentUsed > 80) {
        warnings.push(
          `Rate limit already ${Math.round(percentUsed)}% used. Consider waiting until reset at ${rateLimitStatus.resetAt}`
        );
      }

      // Check if sync would exceed limit
      const afterSync = rateLimitStatus.remaining - estimate.apiCalls;
      if (afterSync < 0) {
        blockers.push(
          `Not enough rate limit remaining. Need ${estimate.apiCalls} calls, only ${rateLimitStatus.remaining} remaining. Reset at ${rateLimitStatus.resetAt}`
        );
      } else if (afterSync < rateLimitStatus.limit * 0.1) {
        warnings.push(
          `After sync, only ${afterSync} requests remaining (${Math.round((afterSync / rateLimitStatus.limit) * 100)}%)`
        );
      }
    }

    return {
      safe: blockers.length === 0,
      warnings,
      blockers,
    };
  }

  /**
   * Get impact percentage for given API calls
   */
  private getImpactPercentage(apiCalls: number): number {
    const limits = PROVIDER_RATE_LIMITS[this.provider];
    return Math.round((apiCalls / limits.limit) * 100);
  }

  // ==========================================================================
  // Backoff Strategy
  // ==========================================================================

  /**
   * Calculate backoff delay when rate limited
   *
   * @param attempt Current retry attempt (0-indexed)
   * @param maxBackoff Maximum backoff in milliseconds (default: 5 minutes)
   * @returns Delay in milliseconds
   */
  calculateBackoff(attempt: number, maxBackoff: number = 5 * 60 * 1000): number {
    // Exponential backoff: 2^attempt * 1000ms, capped at maxBackoff
    const delay = Math.min(Math.pow(2, attempt) * 1000, maxBackoff);
    return delay;
  }

  /**
   * Wait for rate limit to reset
   *
   * @param resetAt ISO timestamp when rate limit resets
   * @returns Promise that resolves when rate limit resets
   */
  async waitForReset(resetAt: string): Promise<void> {
    const resetTime = new Date(resetAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, resetTime - now);

    if (delay > 0) {
      console.log(
        `⏳ Waiting for rate limit reset... (${Math.ceil(delay / 1000 / 60)} minutes)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // ==========================================================================
  // Formatting Helpers
  // ==========================================================================

  /**
   * Format estimate for display
   */
  formatEstimate(estimate: TimeRangeEstimate): string {
    const impactEmoji = {
      low: '⚡',
      medium: '⚠️ ',
      high: '⚠️ ',
      critical: '❌',
    };

    return `${estimate.items} items | ${estimate.apiCalls} API calls | ${impactEmoji[estimate.rateLimitImpact]} ${estimate.durationMinutes} min | Rate: ${estimate.rateLimitImpact.toUpperCase()}`;
  }

  /**
   * Format rate limit status for display
   */
  formatRateLimitStatus(status: RateLimitStatus): string {
    const resetDate = new Date(status.resetAt);
    const now = new Date();
    const minutesUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 1000 / 60);

    return `${status.remaining}/${status.limit} (${Math.round(100 - status.percentUsed)}% available) | Resets in ${minutesUntilReset} min`;
  }
}

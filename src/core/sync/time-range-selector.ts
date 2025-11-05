/**
 * Interactive Time Range Selector
 *
 * Rich CLI interface for selecting time ranges with:
 * - Real-time estimates (items, duration, API calls)
 * - Rate limit impact visualization
 * - Current rate limit status
 * - Warnings and recommendations
 */

import { RateLimiter, PROVIDER_RATE_LIMITS } from './rate-limiter';
import {
  TimeRangePreset,
  TimeRangeEstimate,
  RateLimitStatus,
  SyncProvider,
} from '../types/sync-profile';

// ============================================================================
// Time Range Selector
// ============================================================================

export class TimeRangeSelector {
  private rateLimiter: RateLimiter;
  private provider: SyncProvider;

  constructor(provider: SyncProvider) {
    this.provider = provider;
    this.rateLimiter = new RateLimiter(provider);
  }

  // ==========================================================================
  // Interactive Selection
  // ==========================================================================

  /**
   * Display time range options with estimates
   *
   * @param rateLimitStatus Current rate limit status (optional)
   * @returns Object with selected range, estimate, and user confirmed
   */
  displayOptions(
    rateLimitStatus?: RateLimitStatus | null
  ): {
    options: TimeRangeOption[];
    rateLimitInfo: string[];
    recommendation: string;
  } {
    const options: TimeRangeOption[] = [
      {
        preset: '1W',
        label: 'Last 1 week',
        estimate: this.rateLimiter.estimateSync('1W'),
      },
      {
        preset: '2W',
        label: 'Last 2 weeks',
        estimate: this.rateLimiter.estimateSync('2W'),
      },
      {
        preset: '1M',
        label: 'Last 1 month',
        estimate: this.rateLimiter.estimateSync('1M'),
        recommended: true,
      },
      {
        preset: '3M',
        label: 'Last 3 months',
        estimate: this.rateLimiter.estimateSync('3M'),
      },
      {
        preset: '6M',
        label: 'Last 6 months',
        estimate: this.rateLimiter.estimateSync('6M'),
      },
      {
        preset: '1Y',
        label: 'Last 1 year',
        estimate: this.rateLimiter.estimateSync('1Y'),
      },
      {
        preset: 'ALL',
        label: 'All time',
        estimate: this.rateLimiter.estimateSync('ALL'),
        warning: '⚠️  WARNING: Will likely exceed rate limit! Not recommended.',
      },
    ];

    // Build rate limit info
    const rateLimitInfo: string[] = [];
    const limits = PROVIDER_RATE_LIMITS[this.provider];

    rateLimitInfo.push(`📅 ${this.getProviderDisplayName()} Rate Limits:`);
    rateLimitInfo.push(
      `   • Limit: ${limits.limit.toLocaleString()} requests per ${limits.window}`
    );

    if (rateLimitStatus) {
      rateLimitInfo.push(
        `   • Current: ${rateLimitStatus.remaining.toLocaleString()}/${rateLimitStatus.limit.toLocaleString()} (${Math.round(100 - rateLimitStatus.percentUsed)}% available)`
      );

      const resetDate = new Date(rateLimitStatus.resetAt);
      const now = new Date();
      const minutesUntilReset = Math.ceil(
        (resetDate.getTime() - now.getTime()) / 1000 / 60
      );

      rateLimitInfo.push(
        `   • Resets: ${resetDate.toLocaleTimeString()} (${minutesUntilReset} min)`
      );
    }

    return {
      options,
      rateLimitInfo,
      recommendation:
        '💡 Recommended: 1 month balances completeness with performance',
    };
  }

  /**
   * Format option for display
   */
  formatOption(option: TimeRangeOption, index: number): string[] {
    const lines: string[] = [];

    // Option number and label
    const recommendedTag = option.recommended ? ' ← Recommended' : '';
    lines.push(`  ${index + 1}. ${option.label}${recommendedTag}`);

    // Estimate details
    const estimate = option.estimate;
    const impactEmoji = this.getImpactEmoji(estimate.rateLimitImpact);
    const durationStr = this.formatDuration(estimate.durationMinutes);

    lines.push(
      `     └─ ~${estimate.items} items | ${estimate.apiCalls} API calls | ${impactEmoji} ${durationStr} | Rate: ${this.formatImpact(estimate.rateLimitImpact)}`
    );

    // Warning if present
    if (option.warning) {
      lines.push(`     └─ ${option.warning}`);
    }

    return lines;
  }

  /**
   * Display preview after selection
   */
  displayPreview(
    selectedOption: TimeRangeOption,
    rateLimitStatus?: RateLimitStatus | null
  ): string[] {
    const lines: string[] = [];

    lines.push('');
    lines.push('📊 Sync Preview:');
    lines.push('');
    lines.push(`   Time range: ${selectedOption.label}`);
    lines.push(`   └─ ${this.getDateRange(selectedOption.preset)}`);
    lines.push('');
    lines.push('   Estimated sync:');
    lines.push(
      `   ├─ Work items: ~${selectedOption.estimate.items} issues/PRs/work items`
    );
    lines.push(`   ├─ API calls: ~${selectedOption.estimate.apiCalls} requests`);
    lines.push(
      `   ├─ Duration: ~${this.formatDuration(selectedOption.estimate.durationMinutes)}`
    );
    lines.push(
      `   └─ Rate limit: ${this.formatImpact(selectedOption.estimate.rateLimitImpact)} impact (${this.getImpactPercentage(selectedOption.estimate)}% of ${this.getProviderDisplayName()} limit)`
    );

    // Rate limit status
    if (rateLimitStatus) {
      lines.push('');
      lines.push(`   ${this.getProviderDisplayName()} rate limit (BEFORE sync):`);
      lines.push(
        `   ├─ Current: ${rateLimitStatus.remaining.toLocaleString()}/${rateLimitStatus.limit.toLocaleString()} (${Math.round(100 - rateLimitStatus.percentUsed)}% available)`
      );

      const afterSync =
        rateLimitStatus.remaining - selectedOption.estimate.apiCalls;
      const afterPercentage = (afterSync / rateLimitStatus.limit) * 100;

      lines.push(
        `   ├─ After sync: ~${afterSync.toLocaleString()}/${rateLimitStatus.limit.toLocaleString()} (${Math.round(afterPercentage)}% available)`
      );

      const resetDate = new Date(rateLimitStatus.resetAt);
      lines.push(`   └─ Reset: ${resetDate.toLocaleTimeString()}`);
    }

    lines.push('');

    // Safety assessment
    const validation = this.rateLimiter.validateSync(
      selectedOption.estimate,
      rateLimitStatus
    );

    if (validation.safe) {
      lines.push('✅ This sync is SAFE to proceed');
    } else {
      lines.push('❌ This sync may FAIL due to:');
      validation.blockers.forEach((blocker) => {
        lines.push(`   • ${blocker}`);
      });
    }

    if (validation.warnings.length > 0) {
      lines.push('');
      lines.push('⚠️  Warnings:');
      validation.warnings.forEach((warning) => {
        lines.push(`   • ${warning}`);
      });
    }

    return lines;
  }

  // ==========================================================================
  // Formatting Helpers
  // ==========================================================================

  private getProviderDisplayName(): string {
    const names = {
      github: 'GitHub',
      jira: 'JIRA',
      ado: 'Azure DevOps',
    };
    return names[this.provider];
  }

  private getImpactEmoji(impact: string): string {
    const emojis: Record<string, string> = {
      low: '⚡',
      medium: '⚠️ ',
      high: '⚠️ ',
      critical: '❌',
    };
    return emojis[impact] || '?';
  }

  private formatImpact(impact: string): string {
    return impact.toUpperCase();
  }

  private formatDuration(minutes: number): string {
    if (minutes < 1) {
      return '< 1 min';
    } else if (minutes === 1) {
      return '1 min';
    } else if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }

  private getImpactPercentage(estimate: TimeRangeEstimate): number {
    const limits = PROVIDER_RATE_LIMITS[this.provider];
    return Math.round((estimate.apiCalls / limits.limit) * 100);
  }

  private getDateRange(preset: TimeRangePreset): string {
    const now = new Date();
    const since = new Date(now);

    switch (preset) {
      case '1W':
        since.setDate(now.getDate() - 7);
        break;
      case '2W':
        since.setDate(now.getDate() - 14);
        break;
      case '1M':
        since.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        since.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        since.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        since.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        return '1970-01-01 to present';
    }

    return `${since.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface TimeRangeOption {
  preset: TimeRangePreset;
  label: string;
  estimate: TimeRangeEstimate;
  recommended?: boolean;
  warning?: string;
}

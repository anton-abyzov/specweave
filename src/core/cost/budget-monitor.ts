/**
 * BudgetMonitor — threshold-based budget alerting
 *
 * Subscribes to SpendEmitter and checks cumulative monthly spend
 * against configured thresholds. Emits alerts with debouncing
 * to prevent duplicate notifications.
 */

import { SpendAggregator } from './spend-aggregator.js';
import type { BillingBudgetConfig } from './spend-aggregator.js';
import type { SpendRecord } from './spend-record.js';

export interface BudgetAlert {
  severity: 'warning' | 'critical';
  threshold: number;
  currentSpend: number;
  monthlyLimit: number;
  percentUsed: number;
  increment_id?: string;
  timestamp: string;
}

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_INVALIDATION_INTERVAL_MS = 5_000; // Don't re-read files more than once per 5s

export class BudgetMonitor {
  private readonly aggregator: SpendAggregator;
  private readonly config: BillingBudgetConfig | undefined;
  private readonly onAlert: (alert: BudgetAlert) => void;
  private lastAlertByThreshold: Map<number, number> = new Map();
  private lastCacheInvalidation = 0;

  constructor(
    spendDir: string,
    config: BillingBudgetConfig | undefined,
    onAlert: (alert: BudgetAlert) => void,
  ) {
    this.aggregator = new SpendAggregator(spendDir);
    this.config = config;
    this.onAlert = onAlert;
  }

  /**
   * Check if a new spend record triggers any budget alerts
   */
  check(record: SpendRecord): void {
    if (!this.config?.monthly) return;

    // Debounce cache invalidation to avoid disk I/O thrashing under high throughput
    const now = Date.now();
    if (now - this.lastCacheInvalidation > CACHE_INVALIDATION_INTERVAL_MS) {
      this.aggregator.invalidateCache();
      this.lastCacheInvalidation = now;
    }

    const status = this.aggregator.getBudgetStatus(this.config);
    if (!status) return;

    const thresholds = this.config.alertThresholds ?? [0.8, 1.0];
    const percentDecimal = status.percentUsed / 100;

    // Check thresholds from highest to lowest, emit only the highest crossed
    const sortedThresholds = [...thresholds].sort((a, b) => b - a);

    for (const threshold of sortedThresholds) {
      if (percentDecimal >= threshold) {
        if (this.isDebounced(threshold)) break;

        this.lastAlertByThreshold.set(threshold, Date.now());

        this.onAlert({
          severity: threshold >= 1.0 ? 'critical' : 'warning',
          threshold,
          currentSpend: status.currentSpend,
          monthlyLimit: status.monthlyLimit,
          percentUsed: status.percentUsed,
          increment_id: record.increment_id,
          timestamp: new Date().toISOString(),
        });

        break; // Only emit the highest crossed threshold
      }
    }
  }

  private isDebounced(threshold: number): boolean {
    const lastAlert = this.lastAlertByThreshold.get(threshold);
    if (!lastAlert) return false;
    return Date.now() - lastAlert < DEBOUNCE_MS;
  }
}

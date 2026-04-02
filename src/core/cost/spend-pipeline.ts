/**
 * SpendPipeline — wires SpendEmitter to persistence and alerting
 *
 * Call initSpendPipeline() once at startup to connect:
 * SpendEmitter → SpendRecordWriter (persistence)
 * SpendEmitter → BudgetMonitor (alerting)
 */

import { SpendEmitter } from './spend-record.js';
import { SpendRecordWriter } from './spend-record-writer.js';
import { BudgetMonitor } from './budget-monitor.js';
import type { BudgetAlert } from './budget-monitor.js';
import type { BillingBudgetConfig } from './spend-aggregator.js';

let initialized = false;

export interface SpendPipelineOptions {
  /** Directory for JSONL spend files (default: .specweave/state/spend) */
  spendDir: string;
  /** Budget configuration from config.json billing.budgets */
  budgetConfig?: BillingBudgetConfig;
  /** Callback when budget alert fires */
  onBudgetAlert?: (alert: BudgetAlert) => void;
}

/**
 * Initialize the spend tracking pipeline.
 * Safe to call multiple times — only initializes once.
 */
export function initSpendPipeline(options: SpendPipelineOptions): void {
  if (initialized) return;
  initialized = true;

  const emitter = SpendEmitter.getInstance();
  const writer = new SpendRecordWriter(options.spendDir);

  // Persist every spend record to JSONL
  emitter.onSpend(record => {
    try {
      writer.write(record);
    } catch {
      // Fail silently — don't crash the LLM call for a write failure
    }
  });

  // Budget alerting (if configured)
  if (options.budgetConfig?.monthly || options.onBudgetAlert) {
    const monitor = new BudgetMonitor(
      options.spendDir,
      options.budgetConfig,
      options.onBudgetAlert ?? (() => {}),
    );

    emitter.onSpend(record => {
      try {
        monitor.check(record);
      } catch {
        // Fail silently
      }
    });
  }
}

/**
 * Reset initialization state (for testing)
 */
export function resetSpendPipeline(): void {
  initialized = false;
  SpendEmitter.getInstance().removeAllListeners();
}

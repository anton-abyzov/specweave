/**
 * BudgetMonitor tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BudgetMonitor } from '../../../src/core/cost/budget-monitor.js';
import { SpendRecordWriter } from '../../../src/core/cost/spend-record-writer.js';
import { createSpendRecord } from '../../../src/core/cost/spend-record.js';
import type { SpendRecord } from '../../../src/core/cost/spend-record.js';
import type { BillingBudgetConfig } from '../../../src/core/cost/spend-aggregator.js';

describe('BudgetMonitor', () => {
  let tmpDir: string;
  let writer: SpendRecordWriter;
  let alertCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-test-'));
    writer = new SpendRecordWriter(tmpDir);
    alertCallback = vi.fn();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function seedSpend(cost: number): SpendRecord {
    const record = createSpendRecord({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      input_tokens: 1000,
      output_tokens: 500,
      cost_usd: cost,
      cost_source: 'calculated',
    });
    writer.write(record);
    return record;
  }

  it('emits warning alert at 80% threshold', () => {
    const config: BillingBudgetConfig = { monthly: 50, alertThresholds: [0.8, 1.0] };
    // Seed $40 of spend
    for (let i = 0; i < 40; i++) {
      seedSpend(1.0);
    }

    const monitor = new BudgetMonitor(tmpDir, config, alertCallback);
    // Process a new record that pushes past 80%
    const record = seedSpend(0.50);
    monitor.check(record);

    expect(alertCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        threshold: 0.8,
        currentSpend: expect.any(Number),
        monthlyLimit: 50,
      }),
    );
  });

  it('emits critical alert at 100% threshold', () => {
    const config: BillingBudgetConfig = { monthly: 50, alertThresholds: [0.8, 1.0] };
    // Seed $50 of spend
    for (let i = 0; i < 50; i++) {
      seedSpend(1.0);
    }

    const monitor = new BudgetMonitor(tmpDir, config, alertCallback);
    const record = seedSpend(0.50);
    monitor.check(record);

    expect(alertCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical',
        threshold: 1.0,
      }),
    );
  });

  it('does not emit when no budget configured', () => {
    const monitor = new BudgetMonitor(tmpDir, undefined, alertCallback);
    const record = seedSpend(100);
    monitor.check(record);

    expect(alertCallback).not.toHaveBeenCalled();
  });

  it('debounces duplicate alerts within 5 minutes', () => {
    const config: BillingBudgetConfig = { monthly: 50, alertThresholds: [0.8, 1.0] };
    for (let i = 0; i < 41; i++) {
      seedSpend(1.0);
    }

    const monitor = new BudgetMonitor(tmpDir, config, alertCallback);
    const record1 = seedSpend(0.10);
    monitor.check(record1);
    expect(alertCallback).toHaveBeenCalledTimes(1);

    // Second check within debounce window
    const record2 = seedSpend(0.10);
    monitor.check(record2);
    expect(alertCallback).toHaveBeenCalledTimes(1); // Still 1, debounced
  });
});

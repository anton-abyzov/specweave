/**
 * SpendAggregator tests (covers T-007 config types, T-008 aggregator, T-009 API data)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SpendAggregator } from '../../../src/core/cost/spend-aggregator.js';
import { SpendRecordWriter } from '../../../src/core/cost/spend-record-writer.js';
import { createSpendRecord } from '../../../src/core/cost/spend-record.js';
import type { BillingBudgetConfig } from '../../../src/core/cost/spend-aggregator.js';

describe('SpendAggregator', () => {
  let tmpDir: string;
  let aggregator: SpendAggregator;
  let writer: SpendRecordWriter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agg-test-'));
    writer = new SpendRecordWriter(tmpDir);

    // Use current month for budget tests to work regardless of when tests run
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');

    // Seed test data: 5 days, 3 providers (within current month)
    const data = [
      { ts: `${y}-${m}-02T10:00:00.000Z`, provider: 'anthropic', model: 'claude-sonnet-4-6', input: 1000, output: 500, cost: 0.01 },
      { ts: `${y}-${m}-02T14:00:00.000Z`, provider: 'openai', model: 'gpt-4o', input: 2000, output: 800, cost: 0.03 },
      { ts: `${y}-${m}-05T10:00:00.000Z`, provider: 'anthropic', model: 'claude-opus-4-6', input: 500, output: 200, cost: 0.008 },
      { ts: `${y}-${m}-10T10:00:00.000Z`, provider: 'google', model: 'gemini-2.5-pro', input: 1500, output: 600, cost: 0.02 },
      { ts: `${y}-${m}-10T15:00:00.000Z`, provider: 'anthropic', model: 'claude-sonnet-4-6', input: 800, output: 300, cost: 0.005 },
      { ts: `${y}-${m}-15T10:00:00.000Z`, provider: 'openai', model: 'gpt-4o-mini', input: 3000, output: 1000, cost: 0.002 },
      { ts: `${y}-${m}-20T10:00:00.000Z`, provider: 'mistral', model: 'mistral-large-latest', input: 700, output: 350, cost: 0.006 },
    ];

    for (const d of data) {
      const record = createSpendRecord({
        provider: d.provider,
        model: d.model,
        input_tokens: d.input,
        output_tokens: d.output,
        cost_usd: d.cost,
        cost_source: 'calculated',
      });
      (record as any).timestamp = d.ts;
      writer.write(record);
    }

    aggregator = new SpendAggregator(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getDailyRollups', () => {
    it('returns one rollup per day with spend data', () => {
      const rollups = aggregator.getDailyRollups();
      // 5 distinct days: 03-15, 03-16, 03-18, 03-20, 03-25
      expect(rollups).toHaveLength(5);
    });

    it('each rollup contains date, total_cost, total_tokens, providers', () => {
      const rollups = aggregator.getDailyRollups();
      // First day has both anthropic + openai records (0.01 + 0.03 = 0.04)
      const firstDay = rollups[0];
      expect(firstDay).toBeDefined();
      expect(firstDay.total_cost).toBeCloseTo(0.04, 2);
      expect(firstDay.total_tokens).toBe(4300); // 1000+500+2000+800
      expect(firstDay.providers).toBeDefined();
      expect(Object.keys(firstDay.providers)).toContain('anthropic');
      expect(Object.keys(firstDay.providers)).toContain('openai');
    });

    it('sorts rollups ascending by date', () => {
      const rollups = aggregator.getDailyRollups();
      for (let i = 1; i < rollups.length; i++) {
        expect(rollups[i].date > rollups[i - 1].date).toBe(true);
      }
    });

    it('supports date range filtering', () => {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const rollups = aggregator.getDailyRollups(
        new Date(Date.UTC(y, m, 5, 0, 0, 0)),
        new Date(Date.UTC(y, m, 15, 23, 59, 59)),
      );
      // Days: 05, 10, 15
      expect(rollups).toHaveLength(3);
    });
  });

  describe('getProviderBreakdown', () => {
    it('returns per-provider cost summary', () => {
      const breakdown = aggregator.getProviderBreakdown();
      expect(Object.keys(breakdown)).toContain('anthropic');
      expect(Object.keys(breakdown)).toContain('openai');
      expect(Object.keys(breakdown)).toContain('google');
      expect(Object.keys(breakdown)).toContain('mistral');
    });

    it('sums costs correctly per provider', () => {
      const breakdown = aggregator.getProviderBreakdown();
      // anthropic: 0.01 + 0.008 + 0.005 = 0.023
      expect(breakdown['anthropic'].total_cost).toBeCloseTo(0.023, 3);
      expect(breakdown['anthropic'].sessions).toBe(3);
    });
  });

  describe('getBudgetStatus', () => {
    it('returns budget status with percentage', () => {
      const config: BillingBudgetConfig = { monthly: 1.0 };
      const status = aggregator.getBudgetStatus(config);

      const totalCost = 0.01 + 0.03 + 0.008 + 0.02 + 0.005 + 0.002 + 0.006;
      expect(status.currentSpend).toBeCloseTo(totalCost, 3);
      expect(status.monthlyLimit).toBe(1.0);
      expect(status.percentUsed).toBeCloseTo((totalCost / 1.0) * 100, 1);
    });

    it('returns null when no budget configured', () => {
      const status = aggregator.getBudgetStatus(undefined);
      expect(status).toBeNull();
    });
  });

  describe('cache invalidation', () => {
    it('refreshes rollups when new data is written', () => {
      const rollups1 = aggregator.getDailyRollups();
      expect(rollups1).toHaveLength(5);

      // Add new record on a different day within the same month
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, '0');
      const record = createSpendRecord({
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        input_tokens: 100,
        output_tokens: 50,
        cost_usd: 0.001,
        cost_source: 'calculated',
      });
      (record as any).timestamp = `${y}-${m}-25T10:00:00.000Z`;
      writer.write(record);

      // Force cache invalidation
      aggregator.invalidateCache();
      const rollups2 = aggregator.getDailyRollups();
      expect(rollups2).toHaveLength(6); // New day added
    });
  });
});

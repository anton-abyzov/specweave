/**
 * SpendAggregator — daily rollups and provider breakdown from spend records
 *
 * Reads SpendRecord JSONL files and computes:
 * - Daily cost rollups with per-provider breakdown
 * - Overall provider cost summary
 * - Budget status (current spend vs configured limits)
 *
 * Uses mtime-based cache invalidation (same pattern as CostAggregator).
 */

import * as fs from 'fs';
import * as path from 'path';
import { SpendRecordReader } from './spend-record-reader.js';
import type { SpendRecord } from './spend-record.js';

export interface DailyRollup {
  date: string; // YYYY-MM-DD
  total_cost: number;
  total_tokens: number;
  sessions: number;
  providers: Record<string, ProviderDaySummary>;
}

interface ProviderDaySummary {
  cost: number;
  tokens: number;
  sessions: number;
}

export interface ProviderBreakdown {
  total_cost: number;
  total_tokens: number;
  sessions: number;
  models: Record<string, { cost: number; tokens: number; sessions: number }>;
}

export interface BillingBudgetConfig {
  monthly?: number;
  perIncrement?: number;
  alertThresholds?: number[];
}

export interface BudgetStatus {
  currentSpend: number;
  monthlyLimit: number;
  percentUsed: number;
}

export class SpendAggregator {
  private readonly reader: SpendRecordReader;
  private readonly dir: string;
  private cache: { records: SpendRecord[]; mtimeHash: string } | null = null;

  constructor(dir: string) {
    this.dir = dir;
    this.reader = new SpendRecordReader(dir);
  }

  /**
   * Get daily cost rollups, optionally filtered by date range
   */
  getDailyRollups(from?: Date, to?: Date): DailyRollup[] {
    const records = this.getRecords();
    const filtered = from && to
      ? records.filter(r => {
          const ts = new Date(r.timestamp);
          return ts >= from && ts <= to;
        })
      : records;

    const byDay = new Map<string, DailyRollup>();

    for (const record of filtered) {
      const date = record.timestamp.slice(0, 10); // YYYY-MM-DD

      if (!byDay.has(date)) {
        byDay.set(date, { date, total_cost: 0, total_tokens: 0, sessions: 0, providers: {} });
      }

      const day = byDay.get(date)!;
      day.total_cost += record.cost_usd;
      day.total_tokens += record.input_tokens + record.output_tokens;
      day.sessions += 1;

      if (!day.providers[record.provider]) {
        day.providers[record.provider] = { cost: 0, tokens: 0, sessions: 0 };
      }
      day.providers[record.provider].cost += record.cost_usd;
      day.providers[record.provider].tokens += record.input_tokens + record.output_tokens;
      day.providers[record.provider].sessions += 1;
    }

    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get cost breakdown by provider
   */
  getProviderBreakdown(): Record<string, ProviderBreakdown> {
    const records = this.getRecords();
    const breakdown: Record<string, ProviderBreakdown> = {};

    for (const record of records) {
      if (!breakdown[record.provider]) {
        breakdown[record.provider] = { total_cost: 0, total_tokens: 0, sessions: 0, models: {} };
      }

      const pb = breakdown[record.provider];
      pb.total_cost += record.cost_usd;
      pb.total_tokens += record.input_tokens + record.output_tokens;
      pb.sessions += 1;

      if (!pb.models[record.model]) {
        pb.models[record.model] = { cost: 0, tokens: 0, sessions: 0 };
      }
      pb.models[record.model].cost += record.cost_usd;
      pb.models[record.model].tokens += record.input_tokens + record.output_tokens;
      pb.models[record.model].sessions += 1;
    }

    return breakdown;
  }

  /**
   * Get budget status for current month
   */
  getBudgetStatus(config: BillingBudgetConfig | undefined | null): BudgetStatus | null {
    if (!config?.monthly) return null;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const records = this.getRecords();
    const monthRecords = records.filter(r => {
      const ts = new Date(r.timestamp);
      return ts >= monthStart && ts <= monthEnd;
    });

    const currentSpend = monthRecords.reduce((sum, r) => sum + r.cost_usd, 0);

    return {
      currentSpend,
      monthlyLimit: config.monthly,
      percentUsed: (currentSpend / config.monthly) * 100,
    };
  }

  /**
   * Force cache invalidation
   */
  invalidateCache(): void {
    this.cache = null;
  }

  private getRecords(): SpendRecord[] {
    const hash = this.computeMtimeHash();

    if (this.cache && this.cache.mtimeHash === hash) {
      return this.cache.records;
    }

    const records = this.reader.readAll();
    this.cache = { records, mtimeHash: hash };
    return records;
  }

  private computeMtimeHash(): string {
    if (!fs.existsSync(this.dir)) return '';

    const files = fs.readdirSync(this.dir)
      .filter(f => f.endsWith('.jsonl'))
      .sort();

    return files
      .map(f => {
        const stat = fs.statSync(path.join(this.dir, f));
        return `${f}:${stat.mtimeMs}:${stat.size}`;
      })
      .join('|');
  }
}

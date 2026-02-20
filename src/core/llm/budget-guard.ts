/**
 * Budget Guard Provider
 *
 * Decorator that wraps any LLMProvider and enforces spending limits.
 * Tracks daily/monthly costs, fires notifications, and blocks requests
 * when budget is exceeded.
 *
 * Usage persistence: Stores cost data in a JSON file that survives restarts.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type {
  LLMProvider,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
  BudgetConfig,
} from './types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

interface UsageCounters {
  daily: { date: string; costUSD: number; requests: number };
  monthly: { month: string; costUSD: number; requests: number };
  total: { costUSD: number; requests: number };
}

interface NotificationInput {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

type NotifyFn = (input: NotificationInput) => void;

/**
 * Error thrown when budget limit is exceeded
 */
export class BudgetExceededError extends Error {
  public readonly budgetType: 'daily' | 'monthly';
  public readonly currentCost: number;
  public readonly limit: number;

  constructor(budgetType: 'daily' | 'monthly', currentCost: number, limit: number) {
    super(
      `Workers AI ${budgetType} budget exceeded: $${currentCost.toFixed(4)} / $${limit.toFixed(2)} limit`
    );
    this.name = 'BudgetExceededError';
    this.budgetType = budgetType;
    this.currentCost = currentCost;
    this.limit = limit;
    Object.setPrototypeOf(this, BudgetExceededError.prototype);
  }
}

export class BudgetGuardProvider implements LLMProvider {
  get name() { return this.inner.name; }
  get defaultModel() { return this.inner.defaultModel; }

  private inner: LLMProvider;
  private budget: BudgetConfig;
  private usageFilePath: string;
  private notify?: NotifyFn;
  private logger: Logger;

  constructor(
    inner: LLMProvider,
    budget: BudgetConfig,
    usageFilePath: string,
    notify?: NotifyFn,
    logger?: Logger,
  ) {
    this.inner = inner;
    this.budget = budget;
    this.usageFilePath = usageFilePath;
    this.notify = notify;
    this.logger = logger || consoleLogger;
  }

  async analyze(prompt: string, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    const usage = await this.loadUsage();

    // Check budgets BEFORE making the request
    if (usage.daily.costUSD >= this.budget.dailyLimitUSD) {
      throw new BudgetExceededError('daily', usage.daily.costUSD, this.budget.dailyLimitUSD);
    }
    if (usage.monthly.costUSD >= this.budget.monthlyLimitUSD) {
      throw new BudgetExceededError('monthly', usage.monthly.costUSD, this.budget.monthlyLimitUSD);
    }

    // Make the actual request
    const result = await this.inner.analyze(prompt, options);

    // Update usage counters
    usage.daily.costUSD += result.estimatedCost;
    usage.daily.requests += 1;
    usage.monthly.costUSD += result.estimatedCost;
    usage.monthly.requests += 1;
    usage.total.costUSD += result.estimatedCost;
    usage.total.requests += 1;

    // Save updated usage
    await this.saveUsage(usage);

    // Fire notifications
    this.fireNotifications(usage, result);

    return result;
  }

  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    // Budget check happens inside analyze() which analyzeStructured delegates to via inner
    const usage = await this.loadUsage();

    if (usage.daily.costUSD >= this.budget.dailyLimitUSD) {
      throw new BudgetExceededError('daily', usage.daily.costUSD, this.budget.dailyLimitUSD);
    }
    if (usage.monthly.costUSD >= this.budget.monthlyLimitUSD) {
      throw new BudgetExceededError('monthly', usage.monthly.costUSD, this.budget.monthlyLimitUSD);
    }

    const result = await this.inner.analyzeStructured(prompt, options);

    usage.daily.costUSD += result.estimatedCost;
    usage.daily.requests += 1;
    usage.monthly.costUSD += result.estimatedCost;
    usage.monthly.requests += 1;
    usage.total.costUSD += result.estimatedCost;
    usage.total.requests += 1;

    await this.saveUsage(usage);

    return result;
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    return this.inner.estimateCost(inputTokens, outputTokens, model);
  }

  async isAvailable(): Promise<boolean> {
    return this.inner.isAvailable();
  }

  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    return this.inner.getStatus();
  }

  private async loadUsage(): Promise<UsageCounters> {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    try {
      const raw = await readFile(this.usageFilePath, 'utf-8');
      const data: UsageCounters = JSON.parse(raw);

      // Reset daily counter if date changed
      if (data.daily.date !== today) {
        data.daily = { date: today, costUSD: 0, requests: 0 };
      }

      // Reset monthly counter if month changed
      if (data.monthly.month !== currentMonth) {
        data.monthly = { month: currentMonth, costUSD: 0, requests: 0 };
      }

      return data;
    } catch {
      // File doesn't exist or is corrupted — start fresh
      return {
        daily: { date: today, costUSD: 0, requests: 0 },
        monthly: { month: currentMonth, costUSD: 0, requests: 0 },
        total: { costUSD: 0, requests: 0 },
      };
    }
  }

  private async saveUsage(usage: UsageCounters): Promise<void> {
    try {
      await mkdir(path.dirname(this.usageFilePath), { recursive: true });
      await writeFile(this.usageFilePath, JSON.stringify(usage, null, 2));
    } catch (error: any) {
      this.logger.warn(`Failed to save usage data: ${error.message}`);
    }
  }

  private fireNotifications(usage: UsageCounters, result: AnalyzeResult): void {
    if (!this.notify) return;

    // Notify on every use
    if (this.budget.notifyOnUse) {
      this.notify({
        type: 'cost-alert',
        severity: 'info',
        title: 'Workers AI used',
        message: `$${result.estimatedCost.toFixed(4)} spent (${result.model}). Daily: $${usage.daily.costUSD.toFixed(4)}/$${this.budget.dailyLimitUSD.toFixed(2)}`,
        data: {
          provider: this.inner.name,
          model: result.model,
          cost: result.estimatedCost,
          dailyCost: usage.daily.costUSD,
          dailyLimit: this.budget.dailyLimitUSD,
        },
      });
    }

    // Check if budget exceeded after this request (still let the request through)
    if (usage.daily.costUSD >= this.budget.dailyLimitUSD) {
      this.notify({
        type: 'cost-alert',
        severity: 'critical',
        title: 'Workers AI daily budget exceeded',
        message: `Daily spend $${usage.daily.costUSD.toFixed(4)} exceeds $${this.budget.dailyLimitUSD.toFixed(2)} limit. Next request will be blocked.`,
        data: { dailyCost: usage.daily.costUSD, dailyLimit: this.budget.dailyLimitUSD },
      });
      return; // Don't also fire threshold warning
    }

    // Check threshold warning
    const dailyPercent = (usage.daily.costUSD / this.budget.dailyLimitUSD) * 100;
    if (dailyPercent >= this.budget.notifyThresholdPercent) {
      this.notify({
        type: 'cost-alert',
        severity: 'warning',
        title: 'Workers AI budget threshold reached',
        message: `Daily spend at ${dailyPercent.toFixed(0)}% ($${usage.daily.costUSD.toFixed(4)}/$${this.budget.dailyLimitUSD.toFixed(2)})`,
        data: { dailyCost: usage.daily.costUSD, dailyLimit: this.budget.dailyLimitUSD, percent: dailyPercent },
      });
    }
  }
}

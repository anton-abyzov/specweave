import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CostAggregator } from '../../../src/dashboard/server/data/cost-aggregator.js';

// The CostAggregator derives logDir from projectRoot as:
//   ~/.claude/projects/-{slug}  where slug = projectRoot minus leading / with / → -
// For testing, we set HOME to a temp dir so the logDir resolves inside it.

describe('CostAggregator - billing context', () => {
  let tempHome: string;
  let logDir: string;
  let aggregator: CostAggregator;
  const projectRoot = '/test/project';
  let origHome: string | undefined;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-agg-test-'));
    origHome = process.env.HOME;
    process.env.HOME = tempHome;

    // CostAggregator logDir = $HOME/.claude/projects/-test-project
    logDir = path.join(tempHome, '.claude', 'projects', '-test-project');
    fs.mkdirSync(logDir, { recursive: true });

    aggregator = new CostAggregator(projectRoot);
  });

  afterEach(() => {
    process.env.HOME = origHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  function writeSession(sessionId: string, entries: Record<string, unknown>[]): void {
    const filePath = path.join(logDir, `${sessionId}.jsonl`);
    fs.writeFileSync(filePath, entries.map(e => JSON.stringify(e)).join('\n'));
  }

  function makeAssistantEntry(model: string, usage: Record<string, number>, timestamp: string) {
    return {
      type: 'assistant',
      timestamp,
      message: {
        model,
        usage: {
          input_tokens: usage.input ?? 0,
          output_tokens: usage.output ?? 0,
          cache_creation_input_tokens: usage.cacheWrite ?? 0,
          cache_read_input_tokens: usage.cacheRead ?? 0,
        },
      },
    };
  }

  describe('billingContext field', () => {
    it('should default to planType "api" when no billingConfig is passed', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries();

      expect(result.billingContext).toBeDefined();
      expect(result.billingContext.planType).toBe('api');
      expect(result.billingContext.monthlyAmount).toBeUndefined();
    });

    it('should return subscription context when billingConfig has planType "subscription"', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries(200, {
        planType: 'subscription',
        monthlyAmount: 200,
      });

      expect(result.billingContext).toBeDefined();
      expect(result.billingContext.planType).toBe('subscription');
      expect(result.billingContext.monthlyAmount).toBe(200);
    });
  });

  describe('isMaxPlan config-driven detection', () => {
    it('should set isMaxPlan to true when planType is "subscription"', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries(200, { planType: 'subscription' });

      expect(result.isMaxPlan).toBe(true);
    });

    it('should set isMaxPlan to false when planType is "api"', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries(200, { planType: 'api' });

      expect(result.isMaxPlan).toBe(false);
    });

    it('should set isMaxPlan to false when no billingConfig provided', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries();

      expect(result.isMaxPlan).toBe(false);
    });
  });

  describe('totalCost is always API-equivalent', () => {
    it('should compute non-zero totalCost even for subscription plans', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', { input: 10000, output: 5000 }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries(200, {
        planType: 'subscription',
        monthlyAmount: 200,
      });

      // Cost = (10000 * 15 + 5000 * 75) / 1_000_000 = (150000 + 375000) / 1_000_000 = 0.525
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalCost).toBeCloseTo(0.525, 4);
    });
  });

  describe('cost calculation accuracy', () => {
    it('should calculate Opus costs correctly with all token types', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-opus-4-6', {
          input: 100000,
          output: 50000,
          cacheWrite: 200000,
          cacheRead: 1000000,
        }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries();

      // Cost = (100000*15 + 50000*75 + 200000*18.75 + 1000000*1.50) / 1_000_000
      //      = (1_500_000 + 3_750_000 + 3_750_000 + 1_500_000) / 1_000_000
      //      = 10_500_000 / 1_000_000 = 10.50
      expect(result.totalCost).toBeCloseTo(10.50, 4);

      // Savings = 1000000 * (15 - 1.50) / 1_000_000 = 13.50
      expect(result.totalSavings).toBeCloseTo(13.50, 4);
    });

    it('should calculate Sonnet costs correctly', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-sonnet-4-5-20250929', {
          input: 100000,
          output: 50000,
        }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries();

      // Cost = (100000*3 + 50000*15) / 1_000_000 = (300_000 + 750_000) / 1_000_000 = 1.05
      expect(result.totalCost).toBeCloseTo(1.05, 4);
    });

    it('should calculate Haiku costs correctly', async () => {
      writeSession('session-001', [
        makeAssistantEntry('claude-haiku-4-5-20251001', {
          input: 100000,
          output: 50000,
        }, '2026-02-15T10:00:00Z'),
      ]);

      const result = await aggregator.getTokenSummaries();

      // Cost = (100000*0.80 + 50000*4) / 1_000_000 = (80_000 + 200_000) / 1_000_000 = 0.28
      expect(result.totalCost).toBeCloseTo(0.28, 4);
    });
  });

  describe('empty sessions', () => {
    it('should return zero cost with api billing context for empty log dir', async () => {
      // logDir exists but is empty
      const result = await aggregator.getTokenSummaries();

      expect(result.totalCost).toBe(0);
      expect(result.totalSavings).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.sessionCount).toBe(0);
      expect(result.billingContext).toBeDefined();
      expect(result.billingContext.planType).toBe('api');
    });
  });
});

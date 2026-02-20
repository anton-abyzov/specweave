/**
 * Budget Guard Tests
 *
 * Tests for the BudgetGuardProvider decorator that enforces spending limits.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider, AnalyzeResult, AnalyzeOptions } from '../../../../src/core/llm/types.js';

// Hoist mocks
const { mockFsReadFile, mockFsWriteFile, mockFsMkdir, mockFsAccess } = vi.hoisted(() => ({
  mockFsReadFile: vi.fn(),
  mockFsWriteFile: vi.fn(),
  mockFsMkdir: vi.fn(),
  mockFsAccess: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: mockFsReadFile,
  writeFile: mockFsWriteFile,
  mkdir: mockFsMkdir,
  access: mockFsAccess,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  Logger: {},
  consoleLogger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

import { BudgetGuardProvider, BudgetExceededError } from '../../../../src/core/llm/budget-guard.js';
import type { BudgetConfig } from '../../../../src/core/llm/types.js';

function createMockProvider(overrides: Partial<LLMProvider> = {}): LLMProvider {
  return {
    name: 'workers-ai',
    defaultModel: '@cf/openai/gpt-oss-120b',
    analyze: vi.fn().mockResolvedValue({
      content: 'response',
      usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      estimatedCost: 0.001,
      model: '@cf/openai/gpt-oss-120b',
      durationMs: 200,
      wasRetry: false,
    } satisfies AnalyzeResult),
    analyzeStructured: vi.fn().mockResolvedValue({
      data: { result: 'test' },
      usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      estimatedCost: 0.001,
    }),
    estimateCost: vi.fn().mockReturnValue(0.001),
    isAvailable: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockResolvedValue({ available: true, latencyMs: 50 }),
    ...overrides,
  };
}

const defaultBudget: BudgetConfig = {
  dailyLimitUSD: 1.00,
  monthlyLimitUSD: 10.00,
  notifyOnUse: true,
  notifyThresholdPercent: 80,
};

describe('BudgetGuardProvider', () => {
  const usagePath = '/tmp/test-usage.json';
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotify = vi.fn();
    // Default: no existing usage file
    mockFsReadFile.mockRejectedValue(new Error('ENOENT'));
    mockFsWriteFile.mockResolvedValue(undefined);
    mockFsMkdir.mockResolvedValue(undefined);
  });

  describe('analyze passthrough', () => {
    it('should call inner provider analyze when under budget', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const result = await guard.analyze('Test prompt');

      expect(inner.analyze).toHaveBeenCalledWith('Test prompt', undefined);
      expect(result.content).toBe('response');
    });

    it('should pass options through to inner provider', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const options: AnalyzeOptions = { temperature: 0.1, maxTokens: 2048 };
      await guard.analyze('Prompt', options);

      expect(inner.analyze).toHaveBeenCalledWith('Prompt', options);
    });

    it('should delegate name and defaultModel to inner provider', () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      expect(guard.name).toBe('workers-ai');
      expect(guard.defaultModel).toBe('@cf/openai/gpt-oss-120b');
    });
  });

  describe('daily budget enforcement', () => {
    it('should throw BudgetExceededError when daily limit exceeded', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const today = new Date().toISOString().slice(0, 10);
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: today, costUSD: 1.05, requests: 100 },
        monthly: { month: today.slice(0, 7), costUSD: 5.00, requests: 500 },
        total: { costUSD: 20.00, requests: 1000 },
      }));

      await expect(guard.analyze('Prompt')).rejects.toThrow(BudgetExceededError);
      expect(inner.analyze).not.toHaveBeenCalled();
    });

    it('should allow requests when daily cost is under limit', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const today = new Date().toISOString().slice(0, 10);
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: today, costUSD: 0.50, requests: 50 },
        monthly: { month: today.slice(0, 7), costUSD: 5.00, requests: 500 },
        total: { costUSD: 20.00, requests: 1000 },
      }));

      const result = await guard.analyze('Prompt');
      expect(result.content).toBe('response');
    });
  });

  describe('monthly budget enforcement', () => {
    it('should throw BudgetExceededError when monthly limit exceeded', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const today = new Date().toISOString().slice(0, 10);
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: today, costUSD: 0.10, requests: 10 },
        monthly: { month: today.slice(0, 7), costUSD: 10.50, requests: 5000 },
        total: { costUSD: 50.00, requests: 10000 },
      }));

      await expect(guard.analyze('Prompt')).rejects.toThrow(BudgetExceededError);
    });
  });

  describe('date rollover', () => {
    it('should reset daily counter when date changes', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      // Usage from yesterday — should be reset
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: '2025-01-01', costUSD: 999.00, requests: 99999 },
        monthly: { month: new Date().toISOString().slice(0, 7), costUSD: 5.00, requests: 500 },
        total: { costUSD: 999.00, requests: 99999 },
      }));

      const result = await guard.analyze('Prompt');
      expect(result.content).toBe('response');
    });

    it('should reset monthly counter when month changes', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: '2025-01-01', costUSD: 0, requests: 0 },
        monthly: { month: '2025-01', costUSD: 999.00, requests: 99999 },
        total: { costUSD: 999.00, requests: 99999 },
      }));

      const result = await guard.analyze('Prompt');
      expect(result.content).toBe('response');
    });
  });

  describe('cost tracking persistence', () => {
    it('should save updated usage after successful request', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      await guard.analyze('Prompt');

      expect(mockFsWriteFile).toHaveBeenCalled();
      const savedData = JSON.parse(mockFsWriteFile.mock.calls[0][1] as string);
      expect(savedData.daily.costUSD).toBe(0.001);
      expect(savedData.daily.requests).toBe(1);
      expect(savedData.total.costUSD).toBe(0.001);
    });
  });

  describe('notifications', () => {
    it('should fire info notification on every use when notifyOnUse is true', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      await guard.analyze('Prompt');

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cost-alert',
          severity: 'info',
        })
      );
    });

    it('should not fire info notification when notifyOnUse is false', async () => {
      const inner = createMockProvider();
      const budget: BudgetConfig = { ...defaultBudget, notifyOnUse: false };
      const guard = new BudgetGuardProvider(inner, budget, usagePath, mockNotify);

      await guard.analyze('Prompt');

      // Should not have any info-level notifications
      const infoCalls = mockNotify.mock.calls.filter(
        (c: any[]) => c[0]?.severity === 'info'
      );
      expect(infoCalls).toHaveLength(0);
    });

    it('should fire warning notification at threshold percent', async () => {
      const inner = createMockProvider({
        analyze: vi.fn().mockResolvedValue({
          content: 'response',
          usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
          estimatedCost: 0.05,
          model: '@cf/openai/gpt-oss-120b',
          durationMs: 200,
          wasRetry: false,
        }),
      });

      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const today = new Date().toISOString().slice(0, 10);
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: today, costUSD: 0.78, requests: 50 },
        monthly: { month: today.slice(0, 7), costUSD: 5.00, requests: 500 },
        total: { costUSD: 20.00, requests: 1000 },
      }));

      await guard.analyze('Prompt');

      // 0.78 + 0.05 = 0.83, which is 83% of $1.00 daily limit → should fire warning
      const warningCalls = mockNotify.mock.calls.filter(
        (c: any[]) => c[0]?.severity === 'warning'
      );
      expect(warningCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should fire critical notification when budget is exceeded after request', async () => {
      const inner = createMockProvider({
        analyze: vi.fn().mockResolvedValue({
          content: 'response',
          usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
          estimatedCost: 0.10,
          model: '@cf/openai/gpt-oss-120b',
          durationMs: 200,
          wasRetry: false,
        }),
      });

      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const today = new Date().toISOString().slice(0, 10);
      mockFsReadFile.mockResolvedValue(JSON.stringify({
        daily: { date: today, costUSD: 0.95, requests: 90 },
        monthly: { month: today.slice(0, 7), costUSD: 5.00, requests: 500 },
        total: { costUSD: 20.00, requests: 1000 },
      }));

      await guard.analyze('Prompt');

      // 0.95 + 0.10 = 1.05, over the $1.00 daily limit
      const criticalCalls = mockNotify.mock.calls.filter(
        (c: any[]) => c[0]?.severity === 'critical'
      );
      expect(criticalCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('BudgetExceededError', () => {
    it('should have proper name and budget type', () => {
      const error = new BudgetExceededError('daily', 1.05, 1.00);
      expect(error.name).toBe('BudgetExceededError');
      expect(error.budgetType).toBe('daily');
      expect(error.currentCost).toBe(1.05);
      expect(error.limit).toBe(1.00);
      expect(error.message).toContain('daily');
    });
  });

  describe('delegate methods', () => {
    it('should delegate estimateCost to inner provider', () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      guard.estimateCost(1000, 500);
      expect(inner.estimateCost).toHaveBeenCalledWith(1000, 500, undefined);
    });

    it('should delegate isAvailable to inner provider', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      expect(await guard.isAvailable()).toBe(true);
    });

    it('should delegate getStatus to inner provider', async () => {
      const inner = createMockProvider();
      const guard = new BudgetGuardProvider(inner, defaultBudget, usagePath, mockNotify);

      const status = await guard.getStatus();
      expect(status.available).toBe(true);
    });
  });
});

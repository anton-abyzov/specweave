/**
 * Fallback Provider Tests
 *
 * Tests for the FallbackProvider wrapper that tries primary, then fallback on failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider, AnalyzeResult } from '../../../../src/core/llm/types.js';

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

import { FallbackProvider } from '../../../../src/core/llm/fallback-provider.js';
import { BudgetExceededError } from '../../../../src/core/llm/budget-guard.js';

function createMockProvider(
  name: string,
  overrides: Partial<LLMProvider> = {}
): LLMProvider {
  return {
    name: name as any,
    defaultModel: `model-${name}`,
    analyze: vi.fn().mockResolvedValue({
      content: `response from ${name}`,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      estimatedCost: 0.001,
      model: `model-${name}`,
      durationMs: 100,
      wasRetry: false,
    } satisfies AnalyzeResult),
    analyzeStructured: vi.fn().mockResolvedValue({
      data: { source: name },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      estimatedCost: 0.001,
    }),
    estimateCost: vi.fn().mockReturnValue(0.001),
    isAvailable: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockResolvedValue({ available: true, latencyMs: 50 }),
    ...overrides,
  };
}

describe('FallbackProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('primary success', () => {
    it('should use primary provider when it succeeds', async () => {
      const primary = createMockProvider('workers-ai');
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      const result = await provider.analyze('Test prompt');

      expect(result.content).toBe('response from workers-ai');
      expect(primary.analyze).toHaveBeenCalledOnce();
      expect(fallback.analyze).not.toHaveBeenCalled();
    });

    it('should use primary name and model', () => {
      const primary = createMockProvider('workers-ai');
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      expect(provider.name).toBe('workers-ai');
      expect(provider.defaultModel).toBe('model-workers-ai');
    });
  });

  describe('fallback on primary failure', () => {
    it('should fall back when primary throws', async () => {
      const primary = createMockProvider('workers-ai', {
        analyze: vi.fn().mockRejectedValue(new Error('API error')),
      });
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      const result = await provider.analyze('Test prompt');

      expect(result.content).toBe('response from claude-code');
      expect(result.wasRetry).toBe(true);
      expect(primary.analyze).toHaveBeenCalledOnce();
      expect(fallback.analyze).toHaveBeenCalledOnce();
    });

    it('should fall back on BudgetExceededError', async () => {
      const primary = createMockProvider('workers-ai', {
        analyze: vi.fn().mockRejectedValue(
          new BudgetExceededError('daily', 1.05, 1.00)
        ),
      });
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      const result = await provider.analyze('Test prompt');

      expect(result.content).toBe('response from claude-code');
      expect(fallback.analyze).toHaveBeenCalledOnce();
    });

    it('should pass the same options to fallback', async () => {
      const primary = createMockProvider('workers-ai', {
        analyze: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      const options = { temperature: 0.1, maxTokens: 2048 };
      await provider.analyze('Prompt', options);

      expect(fallback.analyze).toHaveBeenCalledWith('Prompt', options);
    });
  });

  describe('both fail', () => {
    it('should throw fallback error when both providers fail', async () => {
      const primary = createMockProvider('workers-ai', {
        analyze: vi.fn().mockRejectedValue(new Error('Primary error')),
      });
      const fallback = createMockProvider('claude-code', {
        analyze: vi.fn().mockRejectedValue(new Error('Fallback error')),
      });
      const provider = new FallbackProvider(primary, fallback);

      await expect(provider.analyze('Prompt')).rejects.toThrow('Fallback error');
    });
  });

  describe('analyzeStructured fallback', () => {
    it('should fall back analyzeStructured on primary failure', async () => {
      const primary = createMockProvider('workers-ai', {
        analyzeStructured: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      const result = await provider.analyzeStructured('Prompt', {
        schema: { type: 'object' as const },
      });

      expect(result.data).toEqual({ source: 'claude-code' });
    });
  });

  describe('delegate methods', () => {
    it('should report available if either provider is available', async () => {
      const primary = createMockProvider('workers-ai', {
        isAvailable: vi.fn().mockResolvedValue(false),
      });
      const fallback = createMockProvider('claude-code', {
        isAvailable: vi.fn().mockResolvedValue(true),
      });
      const provider = new FallbackProvider(primary, fallback);

      expect(await provider.isAvailable()).toBe(true);
    });

    it('should report unavailable if both providers are unavailable', async () => {
      const primary = createMockProvider('workers-ai', {
        isAvailable: vi.fn().mockResolvedValue(false),
      });
      const fallback = createMockProvider('claude-code', {
        isAvailable: vi.fn().mockResolvedValue(false),
      });
      const provider = new FallbackProvider(primary, fallback);

      expect(await provider.isAvailable()).toBe(false);
    });

    it('should use primary estimateCost', () => {
      const primary = createMockProvider('workers-ai');
      const fallback = createMockProvider('claude-code');
      const provider = new FallbackProvider(primary, fallback);

      provider.estimateCost(1000, 500);
      expect(primary.estimateCost).toHaveBeenCalledWith(1000, 500, undefined);
    });
  });
});

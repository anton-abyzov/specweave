/**
 * SpendTrackingProvider decorator tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpendTrackingProvider } from '../../../src/core/cost/spend-tracking-provider.js';
import { SpendEmitter } from '../../../src/core/cost/spend-record.js';
import type { LLMProvider, AnalyzeResult, AnalyzeOptions, StructuredOptions } from '../../../src/core/llm/types.js';

function createMockProvider(overrides: Partial<AnalyzeResult> = {}): LLMProvider {
  const result: AnalyzeResult = {
    content: 'test response',
    usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
    estimatedCost: 0.01,
    model: 'claude-sonnet-4-6',
    durationMs: 200,
    wasRetry: false,
    ...overrides,
  };

  return {
    name: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    analyze: vi.fn().mockResolvedValue(result),
    analyzeStructured: vi.fn().mockResolvedValue({ data: {}, usage: result.usage, estimatedCost: 0.01 }),
    estimateCost: vi.fn().mockReturnValue(0.01),
    isAvailable: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockResolvedValue({ available: true }),
  };
}

describe('SpendTrackingProvider', () => {
  let emitter: SpendEmitter;
  let spendListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitter = SpendEmitter.getInstance();
    emitter.removeAllListeners();
    spendListener = vi.fn();
    emitter.on('spend', spendListener);
  });

  it('emits SpendRecord on analyze() with token usage', async () => {
    const inner = createMockProvider();
    const provider = new SpendTrackingProvider(inner);

    await provider.analyze('test prompt');

    expect(spendListener).toHaveBeenCalledOnce();
    const record = spendListener.mock.calls[0][0];
    expect(record.provider).toBe('anthropic');
    expect(record.model).toBe('claude-sonnet-4-6');
    expect(record.input_tokens).toBe(1000);
    expect(record.output_tokens).toBe(500);
    expect(record.cost_usd).toBeGreaterThan(0);
    expect(record.cost_source).toBe('calculated');
  });

  it('captures cached and reasoning tokens when available', async () => {
    const inner = createMockProvider({
      usage: {
        inputTokens: 2000,
        outputTokens: 800,
        totalTokens: 2800,
        cachedTokens: 500,
        reasoningTokens: 200,
      } as any,
    });
    const provider = new SpendTrackingProvider(inner);

    await provider.analyze('test');

    const record = spendListener.mock.calls[0][0];
    expect(record.cached_tokens).toBe(500);
    expect(record.reasoning_tokens).toBe(200);
  });

  it('does not emit when provider response has no usage', async () => {
    const inner = createMockProvider();
    (inner.analyze as any).mockResolvedValue({
      content: 'response',
      usage: undefined,
      estimatedCost: 0,
      model: 'claude-sonnet-4-6',
      durationMs: 100,
      wasRetry: false,
    });
    const provider = new SpendTrackingProvider(inner);

    await provider.analyze('test');

    expect(spendListener).not.toHaveBeenCalled();
  });

  it('does not throw when provider analyze fails', async () => {
    const inner = createMockProvider();
    (inner.analyze as any).mockRejectedValue(new Error('API error'));
    const provider = new SpendTrackingProvider(inner);

    await expect(provider.analyze('test')).rejects.toThrow('API error');
    expect(spendListener).not.toHaveBeenCalled();
  });

  it('includes increment_id from context', async () => {
    const inner = createMockProvider();
    const provider = new SpendTrackingProvider(inner, {
      incrementId: '0654-multi-model-spend-tracking',
      project: 'specweave',
    });

    await provider.analyze('test');

    const record = spendListener.mock.calls[0][0];
    expect(record.increment_id).toBe('0654-multi-model-spend-tracking');
    expect(record.project).toBe('specweave');
  });

  it('delegates all LLMProvider methods to inner provider', async () => {
    const inner = createMockProvider();
    const provider = new SpendTrackingProvider(inner);

    expect(provider.name).toBe('anthropic');
    expect(provider.defaultModel).toBe('claude-sonnet-4-6');
    expect(provider.estimateCost(100, 50)).toBe(0.01);
    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(provider.getStatus()).resolves.toEqual({ available: true });
  });

  it('includes duration_ms from provider result', async () => {
    const inner = createMockProvider({ durationMs: 3500 });
    const provider = new SpendTrackingProvider(inner);

    await provider.analyze('test');

    const record = spendListener.mock.calls[0][0];
    expect(record.duration_ms).toBe(3500);
  });
});

/**
 * SpendTrackingProvider — LLMProvider decorator
 *
 * Wraps any LLMProvider to capture token usage from every analyze() call
 * and emit a SpendRecord via the SpendEmitter singleton. Uses the same
 * decorator pattern as the existing BudgetGuardProvider.
 *
 * Zero changes required to individual provider implementations.
 */

import type {
  LLMProvider,
  LLMProviderType,
  AnalyzeResult,
  AnalyzeOptions,
  StructuredOptions,
} from '../llm/types.js';
import { SpendEmitter, createSpendRecord } from './spend-record.js';
import { ModelPricingRegistry } from './model-pricing-registry.js';

export interface SpendTrackingContext {
  incrementId?: string;
  project?: string;
  sessionId?: string;
}

/**
 * Decorator that intercepts LLMProvider.analyze() results and emits
 * SpendRecords for every successful request with token usage data.
 */
export class SpendTrackingProvider implements LLMProvider {
  private readonly inner: LLMProvider;
  private readonly emitter: SpendEmitter;
  private readonly registry: ModelPricingRegistry;
  private readonly context: SpendTrackingContext;

  constructor(inner: LLMProvider, context: SpendTrackingContext = {}) {
    this.inner = inner;
    this.emitter = SpendEmitter.getInstance();
    this.registry = ModelPricingRegistry.getInstance();
    this.context = context;
  }

  get name(): LLMProviderType {
    return this.inner.name;
  }

  get defaultModel(): string {
    return this.inner.defaultModel;
  }

  async analyze(prompt: string, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    const result = await this.inner.analyze(prompt, options);
    this.emitSpendRecord(result);
    return result;
  }

  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>,
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    const result = await this.inner.analyzeStructured(prompt, options);
    if (result.usage) {
      this.emitSpendRecord({
        content: '',
        usage: result.usage,
        estimatedCost: result.estimatedCost,
        model: this.inner.defaultModel,
        durationMs: 0,
        wasRetry: false,
      });
    }
    return result;
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    return this.inner.estimateCost(inputTokens, outputTokens, model);
  }

  isAvailable(): Promise<boolean> {
    return this.inner.isAvailable();
  }

  getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    return this.inner.getStatus();
  }

  private emitSpendRecord(result: AnalyzeResult): void {
    if (!result.usage) return;

    // Usage may contain extended fields beyond the base AnalyzeResult type
    // (e.g., cachedTokens from Claude, reasoning_tokens from OpenAI o-series)
    const usage: Record<string, number | undefined> = result.usage as Record<string, number | undefined>;
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const cachedTokens = usage.cachedTokens
      ?? usage.cacheReadInputTokens
      ?? usage.cache_read_input_tokens
      ?? 0;
    const cacheWriteTokens = usage.cacheWriteTokens
      ?? usage.cacheCreationInputTokens
      ?? usage.cache_creation_input_tokens
      ?? 0;
    const reasoningTokens = usage.reasoningTokens
      ?? usage.reasoning_tokens
      ?? 0;

    const pricingEntry = this.registry.get(result.model);
    const costUsd = this.registry.calculateCost(result.model, {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      cache_write_tokens: cacheWriteTokens,
    });

    // Determine cost_source: 'local' for local models, 'calculated' for priced models, 'unknown' otherwise
    let costSource: 'calculated' | 'api_reported' | 'unknown' | 'local' = 'unknown';
    if (pricingEntry?.costSource === 'local') {
      costSource = 'local';
    } else if (costUsd > 0) {
      costSource = 'calculated';
    }

    const record = createSpendRecord({
      provider: this.inner.name,
      model: result.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      cache_write_tokens: cacheWriteTokens,
      reasoning_tokens: reasoningTokens,
      cost_usd: costUsd,
      cost_source: costSource,
      project: this.context.project,
      increment_id: this.context.incrementId,
      session_id: this.context.sessionId,
      duration_ms: result.durationMs,
    });

    this.emitter.emitSpend(record);
  }
}

/**
 * ModelPricingRegistry
 *
 * O(1) lookup for model pricing across all supported providers.
 * Replaces the flat PRICING objects with a unified registry that
 * supports multi-provider pricing with cache token rates.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Pricing entry for a single model
 */
export interface ModelPricingEntry {
  provider: string;
  model: string;
  /** USD per 1M input tokens */
  inputPer1M: number;
  /** USD per 1M output tokens */
  outputPer1M: number;
  /** USD per 1M cached read tokens (optional) */
  cacheReadPer1M?: number;
  /** USD per 1M cache write tokens (optional) */
  cacheWritePer1M?: number;
  /** How the cost is sourced */
  costSource: 'bundled' | 'local';
}

interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  cache_write_tokens?: number;
}

interface BundledPricing {
  version: string;
  models: Record<string, {
    provider: string;
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  }>;
  localProviders: string[];
  familyPatterns: Record<string, string>;
}

/**
 * Singleton registry for model pricing data.
 * Loads pricing from bundled-pricing.json on first access.
 */
export class ModelPricingRegistry {
  private static instance: ModelPricingRegistry;
  private entries: Map<string, ModelPricingEntry> = new Map();
  private providers: Set<string> = new Set();
  private localProviders: Set<string> = new Set();
  private familyPatterns: Map<string, string> = new Map();

  private constructor() {
    this.loadBundledPricing();
  }

  static getInstance(): ModelPricingRegistry {
    if (!ModelPricingRegistry.instance) {
      ModelPricingRegistry.instance = new ModelPricingRegistry();
    }
    return ModelPricingRegistry.instance;
  }

  /**
   * Get pricing for a model by its ID.
   * Supports exact match, family patterns (opus/sonnet/haiku),
   * and local model detection (ollama/).
   */
  get(modelId: string): ModelPricingEntry | null {
    // Exact match
    if (this.entries.has(modelId)) {
      return this.entries.get(modelId)!;
    }

    // Check for local model prefix (ollama/xxx)
    const prefix = modelId.split('/')[0];
    if (this.localProviders.has(prefix)) {
      return {
        provider: prefix,
        model: modelId,
        inputPer1M: 0,
        outputPer1M: 0,
        costSource: 'local',
      };
    }

    // Family pattern matching (e.g., "opus" → claude-opus-4-6)
    const lower = modelId.toLowerCase();
    for (const [pattern, canonical] of this.familyPatterns) {
      if (lower.includes(pattern) && this.entries.has(canonical)) {
        const entry = this.entries.get(canonical)!;
        return { ...entry, model: modelId };
      }
    }

    return null;
  }

  /**
   * Calculate cost in USD for a model and token counts
   */
  calculateCost(modelId: string, tokens: TokenCounts): number {
    const entry = this.get(modelId);
    if (!entry) return 0;

    let cost = 0;
    cost += (tokens.input_tokens / 1_000_000) * entry.inputPer1M;
    cost += (tokens.output_tokens / 1_000_000) * entry.outputPer1M;

    if (tokens.cached_tokens && entry.cacheReadPer1M) {
      cost += (tokens.cached_tokens / 1_000_000) * entry.cacheReadPer1M;
    }
    if (tokens.cache_write_tokens && entry.cacheWritePer1M) {
      cost += (tokens.cache_write_tokens / 1_000_000) * entry.cacheWritePer1M;
    }

    return cost;
  }

  /**
   * List all known provider identifiers
   */
  listProviders(): string[] {
    return [...this.providers];
  }

  /**
   * List all known model IDs
   */
  listModels(): string[] {
    return [...this.entries.keys()];
  }

  private loadBundledPricing(): void {
    const data: BundledPricing = require('./bundled-pricing.json');

    for (const [modelId, info] of Object.entries(data.models)) {
      const entry: ModelPricingEntry = {
        provider: info.provider,
        model: modelId,
        inputPer1M: info.input,
        outputPer1M: info.output,
        cacheReadPer1M: info.cacheRead,
        cacheWritePer1M: info.cacheWrite,
        costSource: 'bundled',
      };
      this.entries.set(modelId, entry);
      this.providers.add(info.provider);
    }

    this.localProviders = new Set(data.localProviders);
    for (const provider of data.localProviders) {
      this.providers.add(provider);
    }

    for (const [pattern, canonical] of Object.entries(data.familyPatterns)) {
      this.familyPatterns.set(pattern, canonical);
    }
  }
}

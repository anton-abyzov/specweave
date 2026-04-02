/**
 * ModelPricingRegistry tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelPricingRegistry } from '../../../src/core/cost/model-pricing-registry.js';
import type { ModelPricingEntry } from '../../../src/core/cost/model-pricing-registry.js';

describe('ModelPricingRegistry', () => {
  let registry: ModelPricingRegistry;

  beforeEach(() => {
    registry = ModelPricingRegistry.getInstance();
  });

  describe('Anthropic models', () => {
    it('returns correct pricing for claude-opus-4-6', () => {
      const entry = registry.get('claude-opus-4-6');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('anthropic');
      expect(entry!.inputPer1M).toBe(5);
      expect(entry!.outputPer1M).toBe(25);
      expect(entry!.cacheReadPer1M).toBe(0.50);
      expect(entry!.cacheWritePer1M).toBe(6.25);
    });

    it('returns correct pricing for claude-sonnet-4-6', () => {
      const entry = registry.get('claude-sonnet-4-6');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('anthropic');
      expect(entry!.inputPer1M).toBe(3);
      expect(entry!.outputPer1M).toBe(15);
    });

    it('returns correct pricing for claude-haiku-4-5', () => {
      const entry = registry.get('claude-haiku-4-5-20251001');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('anthropic');
      expect(entry!.inputPer1M).toBe(1);
      expect(entry!.outputPer1M).toBe(5);
    });
  });

  describe('OpenAI models', () => {
    it('returns pricing for gpt-4o', () => {
      const entry = registry.get('gpt-4o');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('openai');
      expect(entry!.inputPer1M).toBeGreaterThan(0);
      expect(entry!.outputPer1M).toBeGreaterThan(0);
    });

    it('returns pricing for o3', () => {
      const entry = registry.get('o3');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('openai');
    });

    it('returns pricing for gpt-4o-mini', () => {
      const entry = registry.get('gpt-4o-mini');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('openai');
    });
  });

  describe('Google models', () => {
    it('returns pricing for gemini-2.5-pro', () => {
      const entry = registry.get('gemini-2.5-pro');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('google');
    });

    it('returns pricing for gemini-2.5-flash', () => {
      const entry = registry.get('gemini-2.5-flash');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('google');
    });
  });

  describe('Other providers', () => {
    it('returns pricing for mistral-large', () => {
      const entry = registry.get('mistral-large-latest');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('mistral');
    });

    it('returns pricing for llama models on groq', () => {
      const entry = registry.get('groq/llama-3.3-70b');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('groq');
    });
  });

  describe('Unknown and local models', () => {
    it('returns null for nonexistent model', () => {
      const entry = registry.get('nonexistent-model-xyz');
      expect(entry).toBeNull();
    });

    it('returns local entry for ollama models', () => {
      const entry = registry.get('ollama/llama3');
      expect(entry).not.toBeNull();
      expect(entry!.provider).toBe('ollama');
      expect(entry!.inputPer1M).toBe(0);
      expect(entry!.outputPer1M).toBe(0);
      expect(entry!.costSource).toBe('local');
    });
  });

  describe('listProviders', () => {
    it('includes all required providers', () => {
      const providers = registry.listProviders();
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers).toContain('google');
      expect(providers).toContain('mistral');
      expect(providers).toContain('groq');
      expect(providers).toContain('together');
      expect(providers).toContain('aws-bedrock');
      expect(providers).toContain('azure-openai');
    });
  });

  describe('calculateCost', () => {
    it('calculates cost for known model', () => {
      const cost = registry.calculateCost('claude-sonnet-4-6', {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
      });
      // $3 input + $15 output = $18
      expect(cost).toBe(18);
    });

    it('calculates cost with cache tokens', () => {
      const cost = registry.calculateCost('claude-opus-4-6', {
        input_tokens: 1_000_000,
        output_tokens: 500_000,
        cached_tokens: 200_000,
        cache_write_tokens: 100_000,
      });
      // $5 input + $12.5 output + $0.10 cache read + $0.625 cache write = $18.225
      expect(cost).toBeCloseTo(18.225, 2);
    });

    it('returns 0 for unknown model', () => {
      const cost = registry.calculateCost('nonexistent-model', {
        input_tokens: 1000,
        output_tokens: 500,
      });
      expect(cost).toBe(0);
    });

    it('returns 0 for local model', () => {
      const cost = registry.calculateCost('ollama/llama3', {
        input_tokens: 1000,
        output_tokens: 500,
      });
      expect(cost).toBe(0);
    });
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      const a = ModelPricingRegistry.getInstance();
      const b = ModelPricingRegistry.getInstance();
      expect(a).toBe(b);
    });
  });
});

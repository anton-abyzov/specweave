/**
 * Tests for src/core/llm/model-capabilities.ts.
 *
 * These gates exist because getting either one wrong is a hard 400 rather than a
 * degraded response: sampling params were removed on Opus 4.7+ / Sonnet 5, and
 * structured outputs are unavailable on Sonnet 4.6 — which is exactly what this
 * repo's `sonnet` alias resolves to.
 */

import { describe, it, expect } from 'vitest';
import {
  acceptsSamplingParams,
  supportsStructuredOutputs,
  toStrictJsonSchema,
  buildOutputConfig,
} from '../../../../src/core/llm/model-capabilities.js';
import { MODEL_ALIASES } from '../../../../src/core/llm/types.js';

describe('acceptsSamplingParams', () => {
  it('rejects sampling params on Opus 4.7 and newer', () => {
    expect(acceptsSamplingParams('claude-opus-4-7')).toBe(false);
    expect(acceptsSamplingParams('claude-opus-4-8')).toBe(false);
    expect(acceptsSamplingParams('claude-opus-5-0')).toBe(false);
  });

  it('still allows them on Opus 4.6 and older', () => {
    expect(acceptsSamplingParams('claude-opus-4-6')).toBe(true);
    expect(acceptsSamplingParams('claude-opus-4-5-20251101')).toBe(true);
  });

  it('allows them on Sonnet 4.6 but not Sonnet 5', () => {
    expect(acceptsSamplingParams('claude-sonnet-4-6')).toBe(true);
    expect(acceptsSamplingParams('claude-sonnet-5-0')).toBe(false);
  });

  it('allows them on every Haiku', () => {
    expect(acceptsSamplingParams('claude-haiku-4-5-20251001')).toBe(true);
  });

  it('is conservative about ids it cannot parse', () => {
    expect(acceptsSamplingParams('opus')).toBe(false);
    expect(acceptsSamplingParams('')).toBe(false);
  });

  it('covers the repo aliases: sonnet and haiku still take temperature, opus does not', () => {
    expect(acceptsSamplingParams(MODEL_ALIASES.opus)).toBe(false);
    expect(acceptsSamplingParams(MODEL_ALIASES.sonnet)).toBe(true);
    expect(acceptsSamplingParams(MODEL_ALIASES.haiku)).toBe(true);
  });
});

describe('supportsStructuredOutputs', () => {
  it('is available on Opus 4.7+, Sonnet 5+ and Haiku 4.5+', () => {
    expect(supportsStructuredOutputs('claude-opus-4-8')).toBe(true);
    expect(supportsStructuredOutputs('claude-sonnet-5-0')).toBe(true);
    expect(supportsStructuredOutputs('claude-haiku-4-5-20251001')).toBe(true);
  });

  it('is NOT available on Sonnet 4.6 — the repo default for the `sonnet` alias', () => {
    expect(supportsStructuredOutputs('claude-sonnet-4-6')).toBe(false);
    expect(supportsStructuredOutputs(MODEL_ALIASES.sonnet)).toBe(false);
  });

  it('is conservative about ids it cannot parse', () => {
    expect(supportsStructuredOutputs('opus')).toBe(false);
  });
});

describe('toStrictJsonSchema', () => {
  it('pins additionalProperties and requires every property, at every depth', () => {
    const strict = toStrictJsonSchema({
      type: 'object',
      properties: {
        verdict: { type: 'string' },
        threats: {
          type: 'array',
          items: {
            type: 'object',
            properties: { category: { type: 'string' }, note: { type: 'string' } },
            required: ['category'],
          },
        },
      },
      required: ['verdict'],
    });

    expect(strict.additionalProperties).toBe(false);
    expect(strict.required).toEqual(['verdict', 'threats']);

    const items = (strict.properties as any).threats.items;
    expect(items.additionalProperties).toBe(false);
    expect(items.required).toEqual(['category', 'note']);
  });

  it('does not mutate the caller schema', () => {
    const original = { type: 'object', properties: { a: { type: 'string' } }, required: [] };
    toStrictJsonSchema(original);
    expect(original).not.toHaveProperty('additionalProperties');
    expect(original.required).toEqual([]);
  });

  it('leaves schemas with no object nodes alone', () => {
    expect(toStrictJsonSchema({ type: 'string' })).toEqual({ type: 'string' });
  });
});

describe('buildOutputConfig', () => {
  const format = { type: 'json_schema' as const, schema: { type: 'object', properties: { a: { type: 'string' } } } };

  it('returns undefined when there is nothing to send', () => {
    expect(buildOutputConfig('claude-opus-4-8', undefined)).toBeUndefined();
    expect(buildOutputConfig('claude-opus-4-8', {})).toBeUndefined();
  });

  it('normalises the schema on a model that supports structured outputs', () => {
    const out = buildOutputConfig('claude-opus-4-8', { format });
    expect((out!.format as any).schema.additionalProperties).toBe(false);
  });

  it('drops the format on a model that does not, rather than sending a doomed request', () => {
    expect(buildOutputConfig('claude-sonnet-4-6', { format })).toBeUndefined();
  });

  it('keeps effort even when the format is dropped', () => {
    expect(buildOutputConfig('claude-sonnet-4-6', { effort: 'high', format })).toEqual({ effort: 'high' });
  });
});

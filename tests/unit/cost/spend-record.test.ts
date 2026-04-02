/**
 * SpendRecord type and SpendEmitter tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpendEmitter, createSpendRecord } from '../../../src/core/cost/spend-record.js';
import type { SpendRecord } from '../../../src/core/cost/spend-record.js';

describe('SpendRecord', () => {
  describe('createSpendRecord', () => {
    it('creates a record with all required fields', () => {
      const record = createSpendRecord({
        provider: 'anthropic',
        model: 'claude-opus-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.0175,
        cost_source: 'calculated',
      });

      expect(record.id).toBeDefined();
      expect(record.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(record.timestamp).toBeDefined();
      expect(record.provider).toBe('anthropic');
      expect(record.model).toBe('claude-opus-4-6');
      expect(record.input_tokens).toBe(1000);
      expect(record.output_tokens).toBe(500);
      expect(record.cached_tokens).toBe(0);
      expect(record.cache_write_tokens).toBe(0);
      expect(record.reasoning_tokens).toBe(0);
      expect(record.cost_usd).toBe(0.0175);
      expect(record.cost_source).toBe('calculated');
      expect(record.project).toBeUndefined();
      expect(record.increment_id).toBeUndefined();
      expect(record.session_id).toBeUndefined();
      expect(record.duration_ms).toBeUndefined();
    });

    it('includes optional fields when provided', () => {
      const record = createSpendRecord({
        provider: 'openai',
        model: 'gpt-4o',
        input_tokens: 2000,
        output_tokens: 800,
        cached_tokens: 500,
        cache_write_tokens: 0,
        reasoning_tokens: 200,
        cost_usd: 0.05,
        cost_source: 'calculated',
        project: 'specweave',
        increment_id: '0654-multi-model-spend-tracking',
        session_id: 'sess-123',
        duration_ms: 3500,
      });

      expect(record.provider).toBe('openai');
      expect(record.cached_tokens).toBe(500);
      expect(record.reasoning_tokens).toBe(200);
      expect(record.project).toBe('specweave');
      expect(record.increment_id).toBe('0654-multi-model-spend-tracking');
      expect(record.session_id).toBe('sess-123');
      expect(record.duration_ms).toBe(3500);
    });

    it('serializes to JSON with all required fields', () => {
      const record = createSpendRecord({
        provider: 'google',
        model: 'gemini-2.5-pro',
        input_tokens: 100,
        output_tokens: 50,
        cost_usd: 0.001,
        cost_source: 'calculated',
      });

      const json = JSON.parse(JSON.stringify(record));
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('provider');
      expect(json).toHaveProperty('model');
      expect(json).toHaveProperty('input_tokens');
      expect(json).toHaveProperty('output_tokens');
      expect(json).toHaveProperty('cached_tokens');
      expect(json).toHaveProperty('cache_write_tokens');
      expect(json).toHaveProperty('reasoning_tokens');
      expect(json).toHaveProperty('cost_usd');
      expect(json).toHaveProperty('cost_source');
    });
  });
});

describe('SpendEmitter', () => {
  let emitter: SpendEmitter;

  beforeEach(() => {
    emitter = SpendEmitter.getInstance();
    emitter.removeAllListeners();
  });

  it('is a singleton', () => {
    const a = SpendEmitter.getInstance();
    const b = SpendEmitter.getInstance();
    expect(a).toBe(b);
  });

  it('emits spend events to registered listeners', () => {
    const listener = vi.fn();
    emitter.on('spend', listener);

    const record = createSpendRecord({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      input_tokens: 500,
      output_tokens: 200,
      cost_usd: 0.0045,
      cost_source: 'calculated',
    });

    emitter.emit('spend', record);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(record);
  });

  it('supports multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    emitter.on('spend', listener1);
    emitter.on('spend', listener2);

    const record = createSpendRecord({
      provider: 'openai',
      model: 'gpt-4o',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
      cost_source: 'calculated',
    });

    emitter.emit('spend', record);

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('allows removing listeners', () => {
    const listener = vi.fn();
    emitter.on('spend', listener);
    emitter.off('spend', listener);

    emitter.emit('spend', createSpendRecord({
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      input_tokens: 10,
      output_tokens: 5,
      cost_usd: 0.0001,
      cost_source: 'calculated',
    }));

    expect(listener).not.toHaveBeenCalled();
  });
});

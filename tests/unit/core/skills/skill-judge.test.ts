/**
 * Tests for the judge API request builder (thinking + model resolution)
 *
 * Behavior under test:
 * - Adaptive thinking IS an API parameter: every request to a model that accepts
 *   it (Opus and Sonnet 4.6+) carries `thinking: { type: "adaptive" }`, so the
 *   judge never runs with thinking off on the models it is meant for.
 * - Depth comes from `output_config.effort` (default "high").
 * - Haiku 4.5 predates adaptive thinking; there both parameters are omitted.
 * - `thinking: { type: "enabled", budget_tokens }` is rejected (400) on 4.7+ and
 *   is never emitted.
 * - Model aliases ("opus") are resolved to a real model ID before the call.
 */

import { describe, it, expect } from 'vitest';
import { buildJudgeApiRequest } from '../../../../src/core/skills/skill-judge.js';

describe('buildJudgeApiRequest', () => {
  const base = {
    system: 'system-prompt',
    userPrompt: 'user-prompt',
    maxTokens: 8000,
  };

  it('always includes adaptive thinking', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'claude-opus-4-8' });
    expect(request.thinking).toEqual({ type: 'adaptive' });
  });

  it('defaults output_config.effort to high', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'claude-opus-4-8' });
    expect(request.output_config).toEqual({ effort: 'high' });
  });

  it('honors an explicit effort', () => {
    const request = buildJudgeApiRequest({
      ...base,
      model: 'claude-opus-4-8',
      effort: 'max',
    });
    expect(request.output_config).toEqual({ effort: 'max' });
  });

  it('never emits budget_tokens', () => {
    for (const model of ['claude-opus-4-8', 'claude-opus-4-6-20250801', 'opus']) {
      const request = buildJudgeApiRequest({ ...base, model });
      expect(JSON.stringify(request)).not.toContain('budget_tokens');
      expect(request.thinking).not.toHaveProperty('budget_tokens');
    }
  });

  it('sends adaptive thinking and effort on Opus 4.6 and Sonnet 4.6 as well', () => {
    for (const model of ['claude-opus-4-6-20250801', 'sonnet']) {
      const request = buildJudgeApiRequest({ ...base, model });
      expect(request.thinking).toEqual({ type: 'adaptive' });
      expect(request.output_config).toEqual({ effort: 'high' });
    }
  });

  it('omits thinking and output_config on a model that predates adaptive thinking', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'haiku', effort: 'max' });
    expect(request.model).toBe('claude-haiku-4-5-20251001');
    expect(request).not.toHaveProperty('thinking');
    expect(request).not.toHaveProperty('output_config');
  });

  it('resolves a model alias to a real model ID', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'opus' });
    expect(request.model).toBe('claude-opus-4-8');
  });

  it('passes a full model ID through unchanged', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'claude-opus-4-7-20260101' });
    expect(request.model).toBe('claude-opus-4-7-20260101');
  });

  it('places cacheBlocks before the dynamic prompt text in the user message', () => {
    const request = buildJudgeApiRequest({
      ...base,
      model: 'opus',
      cacheBlocks: [
        { type: 'text', text: 'CLAUDE.md contents', cache_control: { type: 'ephemeral' } },
      ],
    });

    const messages = request.messages as Array<{ role: string; content: Array<Record<string, unknown>> }>;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content[0]).toMatchObject({
      type: 'text',
      text: 'CLAUDE.md contents',
      cache_control: { type: 'ephemeral' },
    });
    expect(messages[0].content[1]).toEqual({ type: 'text', text: 'user-prompt' });
  });

  it('sends the prompt as a plain string when there are no cacheBlocks', () => {
    const request = buildJudgeApiRequest({ ...base, model: 'opus' });
    expect(request.messages).toEqual([{ role: 'user', content: 'user-prompt' }]);
  });
});

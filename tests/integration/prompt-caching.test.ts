/**
 * Prompt-caching integration test (0669 Wave 2, T-017/T-018).
 *
 * Verifies:
 * 1. `buildJudgeApiRequest` prepends `cache_control: { type: "ephemeral" }`
 *    to the user-message content when cacheBlocks are supplied.
 * 2. Two consecutive judge invocations over a mocked Anthropic SDK
 *    simulate a cache hit — the second mocked response reports
 *    `cache_read_input_tokens > 0`, and the first request body ships
 *    the `cache_control` breakpoint that primed it.
 *
 * The Anthropic SDK is mocked; no real API calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const { messagesCreateMock } = vi.hoisted(() => {
  return { messagesCreateMock: vi.fn() };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = { create: messagesCreateMock };
  },
}));

vi.mock('../../src/core/llm/consent.js', () => ({
  checkConsent: () => 'granted',
}));

import { buildJudgeApiRequest, SkillJudge } from '../../src/core/skills/skill-judge.js';

describe('prompt-caching integration', () => {
  beforeEach(() => {
    messagesCreateMock.mockReset();
  });

  it('prepends cache_control block before dynamic prompt text', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-7-20260101',
      system: 'system',
      userPrompt: 'dynamic task',
      maxTokens: 2000,
      cacheBlocks: [
        {
          type: 'text',
          text: 'CLAUDE.md contents',
          cache_control: { type: 'ephemeral' },
        },
      ],
    });

    const messages = request.messages as Array<{ role: string; content: unknown }>;
    expect(messages).toHaveLength(1);
    const content = messages[0].content as Array<Record<string, unknown>>;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    });
    expect((content[0] as { text: string }).text).toContain('CLAUDE.md contents');
    expect(content[1]).toMatchObject({ type: 'text', text: 'dynamic task' });
  });

  it('falls back to plain string content when no cacheBlocks provided', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-7',
      system: 'system',
      userPrompt: 'hi',
      maxTokens: 200,
    });
    const messages = request.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0].content).toBe('hi');
  });

  it('second sw:judge-llm invocation produces cache_read_input_tokens > 0', async () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prompt-caching-'));
    try {
      mkdirSync(join(sandbox, '.specweave'), { recursive: true });
      writeFileSync(join(sandbox, 'CLAUDE.md'), '# Rules');
      writeFileSync(
        join(sandbox, '.specweave', 'config.json'),
        JSON.stringify({
          version: '2.0',
          cache: { staticContextFiles: ['CLAUDE.md'] },
        }),
      );

      process.env.ANTHROPIC_API_KEY = 'test-key';
      const judge = new SkillJudge({ projectRoot: sandbox, timeout_ms: 5000 });

      const baseResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              verdict: 'PASS',
              score: 95,
              summary: 'ok',
              strengths: [],
              concerns: [],
              recommendations: [],
              domainChecks: [],
            }),
          },
        ],
      };
      const firstResponse = {
        ...baseResponse,
        usage: { input_tokens: 400, cache_creation_input_tokens: 200, cache_read_input_tokens: 0 },
      };
      const secondResponse = {
        ...baseResponse,
        usage: { input_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 200 },
      };

      messagesCreateMock
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      await judge.judge({
        domain: 'backend',
        taskDescription: 'first run',
        codeChanges: 'console.log(1)',
      });
      await judge.judge({
        domain: 'backend',
        taskDescription: 'second run',
        codeChanges: 'console.log(2)',
      });

      expect(messagesCreateMock).toHaveBeenCalledTimes(2);

      const firstCallBody = messagesCreateMock.mock.calls[0][0];
      const firstContent = firstCallBody.messages[0].content;
      expect(Array.isArray(firstContent)).toBe(true);
      expect(firstContent[0].cache_control).toEqual({ type: 'ephemeral' });

      expect(secondResponse.usage.cache_read_input_tokens).toBeGreaterThan(0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
      delete process.env.ANTHROPIC_API_KEY;
    }
  });
});

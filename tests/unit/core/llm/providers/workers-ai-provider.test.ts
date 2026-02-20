/**
 * Workers AI Provider Tests
 *
 * Tests for Cloudflare Workers AI HTTP-based provider.
 * Mocks global fetch to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const { mockExtractJson, mockExtractRequiredFieldsFromSchema } = vi.hoisted(() => ({
  mockExtractJson: vi.fn(),
  mockExtractRequiredFieldsFromSchema: vi.fn(),
}));

vi.mock('../../../../../src/utils/llm-json-extractor.js', () => ({
  extractJson: mockExtractJson,
  extractRequiredFieldsFromSchema: mockExtractRequiredFieldsFromSchema,
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  Logger: {},
  consoleLogger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { WorkersAIProvider } from '../../../../../src/core/llm/providers/workers-ai-provider.js';

describe('WorkersAIProvider', () => {
  const defaultConfig = {
    accountId: 'test-account-123',
    apiToken: 'test-token-abc',
  };

  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should set default model to @cf/openai/gpt-oss-120b', () => {
      const provider = new WorkersAIProvider(defaultConfig);
      expect(provider.defaultModel).toBe('@cf/openai/gpt-oss-120b');
    });

    it('should set name to workers-ai', () => {
      const provider = new WorkersAIProvider(defaultConfig);
      expect(provider.name).toBe('workers-ai');
    });

    it('should accept custom model', () => {
      const provider = new WorkersAIProvider({
        ...defaultConfig,
        model: '@cf/meta/llama-3.1-70b-instruct',
      });
      expect(provider.defaultModel).toBe('@cf/meta/llama-3.1-70b-instruct');
    });
  });

  describe('analyze', () => {
    it('should send correct request to Workers AI API', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'Test response' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      const result = await provider.analyze('Hello world');

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(
        'https://api.cloudflare.com/client/v4/accounts/test-account-123/ai/run/@cf/openai/gpt-oss-120b'
      );
      expect(options?.method).toBe('POST');
      expect(options?.headers).toMatchObject({
        'Authorization': 'Bearer test-token-abc',
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(options?.body as string);
      expect(body.messages).toEqual([
        { role: 'user', content: 'Hello world' },
      ]);
    });

    it('should include system prompt as system message', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'Response' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      await provider.analyze('User prompt', { systemPrompt: 'Be helpful' });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.messages).toEqual([
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'User prompt' },
      ]);
    });

    it('should pass max_tokens and temperature', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'Response' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      await provider.analyze('Prompt', { maxTokens: 2048, temperature: 0.1 });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.max_tokens).toBe(2048);
      expect(body.temperature).toBe(0.1);
    });

    it('should include reasoning effort when configured', async () => {
      const provider = new WorkersAIProvider({
        ...defaultConfig,
        reasoningEffort: 'high',
      });

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'Response' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      await provider.analyze('Prompt');

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.reasoning).toEqual({ effort: 'high' });
    });

    it('should return AnalyzeResult with content and usage', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'The answer is 42' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      const result = await provider.analyze('Question');

      expect(result.content).toBe('The answer is 42');
      expect(result.model).toBe('@cf/openai/gpt-oss-120b');
      expect(result.wasRetry).toBe(false);
      expect(result.usage.inputTokens).toBeGreaterThan(0);
      expect(result.usage.outputTokens).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw on non-200 response', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        'Unauthorized',
        { status: 401 }
      ));

      await expect(provider.analyze('Prompt')).rejects.toThrow('Workers AI request failed');
    });

    it('should throw when success is false', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: null,
          success: false,
          errors: [{ message: 'Model not found' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      await expect(provider.analyze('Prompt')).rejects.toThrow('Model not found');
    });

    it('should use model override from options', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'Response' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      await provider.analyze('Prompt', { model: '@cf/meta/llama-3.1-8b-instruct' });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/ai/run/@cf/meta/llama-3.1-8b-instruct');
    });
  });

  describe('analyzeStructured', () => {
    it('should append JSON schema to prompt and parse response', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: '{"name": "test", "score": 95}' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      mockExtractRequiredFieldsFromSchema.mockReturnValue(['name', 'score']);
      mockExtractJson.mockReturnValue({
        success: true,
        data: { name: 'test', score: 95 },
      });

      const result = await provider.analyzeStructured('Analyze this', {
        schema: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            score: { type: 'number' as const },
          },
          required: ['name', 'score'],
        },
      });

      expect(result.data).toEqual({ name: 'test', score: 95 });
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it('should throw if JSON extraction fails', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: { response: 'not valid json' },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      mockExtractRequiredFieldsFromSchema.mockReturnValue([]);
      mockExtractJson.mockReturnValue({
        success: false,
        error: 'No JSON found',
      });

      await expect(
        provider.analyzeStructured('Prompt', {
          schema: { type: 'object' as const },
        })
      ).rejects.toThrow('Failed to parse structured response');
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost based on MODEL_PRICING for gpt-oss-120b', () => {
      const provider = new WorkersAIProvider(defaultConfig);
      // 1M input tokens at $0.35, 1M output tokens at $0.75
      const cost = provider.estimateCost(1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(1.1, 2); // 0.35 + 0.75
    });

    it('should return 0 for zero tokens', () => {
      const provider = new WorkersAIProvider(defaultConfig);
      expect(provider.estimateCost(0, 0)).toBe(0);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API responds with model list', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({
          result: [{ name: '@cf/openai/gpt-oss-120b' }],
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return false when API is unreachable', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      expect(await provider.isAvailable()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return available with latency on success', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockResolvedValueOnce(new Response(
        JSON.stringify({ result: [], success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));

      const status = await provider.getStatus();
      expect(status.available).toBe(true);
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unavailable with error on failure', async () => {
      const provider = new WorkersAIProvider(defaultConfig);

      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      const status = await provider.getStatus();
      expect(status.available).toBe(false);
      expect(status.error).toBe('Connection refused');
    });
  });
});

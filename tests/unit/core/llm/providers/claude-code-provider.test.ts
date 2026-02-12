/**
 * Claude Code Provider Tests
 *
 * Tests for:
 * - ClaudeCodeProvider constructor and defaults
 * - analyze method (with retries)
 * - analyzeStructured method
 * - estimateCost
 * - isAvailable / getStatus
 * - isClaudeCodeAvailable / getClaudeCodeStatus
 * - Helper functions: getClaudeAuthDir, isClaudeCliInstalled, hasClaudeAuth
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const { mockSpawn, mockDetectClaudeCli, mockGetCleanEnv, mockExtractJson, mockExtractRequiredFieldsFromSchema } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockDetectClaudeCli: vi.fn(),
  mockGetCleanEnv: vi.fn(),
  mockExtractJson: vi.fn(),
  mockExtractRequiredFieldsFromSchema: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: mockSpawn,
}));

vi.mock('../../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getCleanEnv: mockGetCleanEnv,
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

vi.mock('../../../../../src/utils/llm-json-extractor.js', () => ({
  extractJson: mockExtractJson,
  extractRequiredFieldsFromSchema: mockExtractRequiredFieldsFromSchema,
}));

// Mock fs for hasClaudeAuth
const { mockFsExistsSync } = vi.hoisted(() => ({
  mockFsExistsSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockFsExistsSync,
}));

import {
  ClaudeCodeProvider,
  isClaudeCodeAvailable,
  getClaudeCodeStatus,
} from '../../../../../src/core/llm/providers/claude-code-provider.js';

/**
 * Helper to create a mock child process
 */
function createMockProcess(opts: {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: Error | null;
} = {}) {
  const { exitCode = 0, stdout = '', stderr = '', error = null } = opts;

  const proc = {
    stdout: {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data' && stdout) {
          // Use setTimeout to simulate async
          setTimeout(() => cb(Buffer.from(stdout)), 0);
        }
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data' && stderr) {
          setTimeout(() => cb(Buffer.from(stderr)), 0);
        }
      }),
    },
    on: vi.fn((event: string, cb: Function) => {
      if (event === 'close') {
        setTimeout(() => cb(exitCode), 5);
      }
      if (event === 'error' && error) {
        setTimeout(() => cb(error), 0);
      }
    }),
    kill: vi.fn(),
  };

  return proc;
}

function makeClaudeOutput(overrides: any = {}) {
  return JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    duration_ms: 1000,
    duration_api_ms: 800,
    num_turns: 1,
    result: 'Test response',
    session_id: 'test-session',
    total_cost_usd: 0,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    ...overrides,
  });
}

describe('ClaudeCodeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCleanEnv.mockReturnValue({});
    mockDetectClaudeCli.mockReturnValue({ commandExists: true, available: true });
    mockFsExistsSync.mockReturnValue(false);
  });

  describe('constructor', () => {
    it('should use default values', () => {
      const provider = new ClaudeCodeProvider();

      expect(provider.name).toBe('claude-code');
      expect(provider.defaultModel).toBe('opus');
    });

    it('should accept custom config', () => {
      const provider = new ClaudeCodeProvider({
        model: 'sonnet',
        maxTokens: 8192,
        timeout: 60000,
      });

      expect(provider.defaultModel).toBe('sonnet');
    });
  });

  describe('analyze', () => {
    it('should execute claude command and return result', async () => {
      const output = makeClaudeOutput({ result: 'Hello world' });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyze('Say hello');

      expect(result.content).toBe('Hello world');
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
      expect(result.estimatedCost).toBe(0);
      expect(result.model).toBe('opus');
      expect(result.wasRetry).toBe(false);
    });

    it('should pass --dangerously-skip-permissions by default', async () => {
      const output = makeClaudeOutput();
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      await provider.analyze('test prompt');

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('should not pass --dangerously-skip-permissions when skipPermissions is false', async () => {
      const output = makeClaudeOutput();
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider({ skipPermissions: false });
      await provider.analyze('test prompt');

      const args = mockSpawn.mock.calls[0][1];
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    it('should pass system prompt when provided', async () => {
      const output = makeClaudeOutput();
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      await provider.analyze('test', { systemPrompt: 'You are helpful' });

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--system-prompt');
      expect(args).toContain('You are helpful');
    });

    it('should use model override from options', async () => {
      const output = makeClaudeOutput();
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyze('test', { model: 'haiku' });

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('haiku');
      expect(result.model).toBe('haiku');
    });

    it('should throw on non-zero exit code', async () => {
      const proc = createMockProcess({ exitCode: 1, stderr: 'CLI error' });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider({ timeout: 500 });
      await expect(provider.analyze('test', { retries: 0 })).rejects.toThrow(
        'Claude Code exited with code 1'
      );
    });

    it('should throw on error output from Claude', async () => {
      const output = makeClaudeOutput({ is_error: true, result: 'Rate limited' });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      await expect(provider.analyze('test', { retries: 0 })).rejects.toThrow(
        'Claude Code returned error: Rate limited'
      );
    });

    it('should retry on failure', async () => {
      // First call fails, second succeeds
      const failProc = createMockProcess({ exitCode: 1, stderr: 'Temporary error' });
      const successOutput = makeClaudeOutput({ result: 'Success' });
      const successProc = createMockProcess({ stdout: successOutput });

      mockSpawn.mockReturnValueOnce(failProc).mockReturnValueOnce(successProc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyze('test', { retries: 1 });

      expect(result.content).toBe('Success');
      expect(result.wasRetry).toBe(true);
      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });

    it('should throw after all retries exhausted', async () => {
      const failProc1 = createMockProcess({ exitCode: 1, stderr: 'Error 1' });
      const failProc2 = createMockProcess({ exitCode: 1, stderr: 'Error 2' });

      mockSpawn.mockReturnValueOnce(failProc1).mockReturnValueOnce(failProc2);

      const provider = new ClaudeCodeProvider();
      await expect(provider.analyze('test', { retries: 1 })).rejects.toThrow();
    });

    it('should handle JSON output with extra text', async () => {
      const jsonOutput = JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        duration_ms: 500,
        duration_api_ms: 400,
        num_turns: 1,
        result: 'parsed correctly',
        session_id: 'sess1',
        total_cost_usd: 0,
        usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      });
      // stdout has extra text before JSON
      const stdout = `Some debug output\n${jsonOutput}`;
      const proc = createMockProcess({ stdout });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyze('test', { retries: 0 });

      expect(result.content).toBe('parsed correctly');
    });

    it('should throw on completely unparseable output', async () => {
      const proc = createMockProcess({ stdout: 'not json at all' });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      await expect(provider.analyze('test', { retries: 0 })).rejects.toThrow(
        'Failed to parse Claude Code output'
      );
    });

    it('should handle process spawn error', async () => {
      const proc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: Function) => {
          if (event === 'error') {
            setTimeout(() => cb(new Error('spawn ENOENT')), 0);
          }
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      await expect(provider.analyze('test', { retries: 0 })).rejects.toThrow('spawn ENOENT');
    });

    it('should handle missing usage data gracefully', async () => {
      const output = makeClaudeOutput({ usage: undefined });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyze('test', { retries: 0 });

      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
      expect(result.usage.totalTokens).toBe(0);
    });
  });

  describe('analyzeStructured', () => {
    it('should parse structured JSON response', async () => {
      const output = makeClaudeOutput({ result: '{"key": "value"}' });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      mockExtractRequiredFieldsFromSchema.mockReturnValue(['key']);
      mockExtractJson.mockReturnValue({
        success: true,
        data: { key: 'value' },
        rawResponse: '{"key": "value"}',
        extractedJson: '{"key": "value"}',
        error: null,
        extractionMethod: 'pure',
      });

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyzeStructured('test', {
        schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
      });

      expect(result.data).toEqual({ key: 'value' });
      expect(result.estimatedCost).toBe(0);
    });

    it('should throw in strict mode when JSON extraction fails', async () => {
      const output = makeClaudeOutput({ result: 'not json' });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      mockExtractRequiredFieldsFromSchema.mockReturnValue([]);
      mockExtractJson.mockReturnValue({
        success: false,
        data: null,
        rawResponse: 'not json',
        extractedJson: null,
        error: 'No JSON found',
        extractionMethod: 'failed',
      });

      const provider = new ClaudeCodeProvider();
      await expect(
        provider.analyzeStructured('test', {
          schema: { type: 'object' },
          strict: true,
          retries: 0,
        })
      ).rejects.toThrow('Failed to parse structured response');
    });

    it('should return fallback data in non-strict mode when extraction fails', async () => {
      const output = makeClaudeOutput({ result: 'not json' });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      mockExtractRequiredFieldsFromSchema.mockReturnValue([]);
      mockExtractJson.mockReturnValue({
        success: false,
        data: null,
        rawResponse: 'not json',
        extractedJson: null,
        error: 'No JSON found',
        extractionMethod: 'failed',
      });

      const provider = new ClaudeCodeProvider();
      const result = await provider.analyzeStructured('test', {
        schema: { type: 'object' },
        strict: false,
        retries: 0,
      });

      expect((result.data as any).error).toBe('parse_failed');
      expect((result.data as any).raw).toBe('not json');
    });
  });

  describe('estimateCost', () => {
    it('should always return 0 (MAX subscription)', () => {
      const provider = new ClaudeCodeProvider();
      expect(provider.estimateCost(1000, 500)).toBe(0);
    });
  });

  describe('isAvailable', () => {
    it('should return true when status check passes', async () => {
      const output = makeClaudeOutput({ is_error: false });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when status check fails', async () => {
      const proc = createMockProcess({ exitCode: 1, stderr: 'CLI error' });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return available status with latency', async () => {
      const output = makeClaudeOutput({ is_error: false });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const status = await provider.getStatus();

      expect(status.available).toBe(true);
      expect(status.latencyMs).toBeDefined();
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unavailable on error', async () => {
      const proc = createMockProcess({ exitCode: 1, stderr: 'not found' });
      mockSpawn.mockReturnValue(proc);

      const provider = new ClaudeCodeProvider();
      const status = await provider.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe('isClaudeCodeAvailable', () => {
    it('should return false when CLI is not installed', async () => {
      mockDetectClaudeCli.mockReturnValue({ commandExists: false, available: false });

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(false);
    });

    it('should check CLI availability and return result', async () => {
      mockDetectClaudeCli.mockReturnValue({ commandExists: true, available: true });

      // Mock the provider.isAvailable check (spawns a process)
      const output = makeClaudeOutput({ is_error: false });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(true);
    });

    it('should return false on unexpected error', async () => {
      mockDetectClaudeCli.mockImplementation(() => {
        throw new Error('Unexpected');
      });

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getClaudeCodeStatus', () => {
    it('should return full status when CLI is installed', async () => {
      mockDetectClaudeCli.mockReturnValue({ commandExists: true, available: true });

      const output = makeClaudeOutput({ is_error: false });
      const proc = createMockProcess({ stdout: output });
      mockSpawn.mockReturnValue(proc);

      const status = await getClaudeCodeStatus();

      expect(status.cliInstalled).toBe(true);
      expect(status.available).toBe(true);
      expect(status.platform).toBeDefined();
    });

    it('should report CLI not found', async () => {
      mockDetectClaudeCli.mockReturnValue({ commandExists: false, available: false });

      const status = await getClaudeCodeStatus();

      expect(status.cliInstalled).toBe(false);
      expect(status.available).toBe(false);
      expect(status.error).toContain('Claude CLI not found');
    });

    it('should handle provider error gracefully', async () => {
      mockDetectClaudeCli.mockReturnValue({ commandExists: true, available: true });
      mockFsExistsSync.mockReturnValue(false);

      const proc = createMockProcess({ exitCode: 1, stderr: 'Provider failure' });
      mockSpawn.mockReturnValue(proc);

      const status = await getClaudeCodeStatus();

      expect(status.cliInstalled).toBe(true);
      expect(status.available).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('hook-router semantic prefixes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    delete process.env.SPECWEAVE_DISABLE_HOOKS;
  });

  it('prefixes block reason with [GUARD] when handler returns block', async () => {
    vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => ({
      findProjectRoot: vi.fn().mockReturnValue('/test'),
      createContext: vi.fn().mockReturnValue({
        projectRoot: '/test',
        stateDir: '/test/.specweave/state',
        logsDir: '/test/.specweave/logs',
        configPath: '/test/.specweave/config.json',
        timestamp: '2026-04-06T00:00:00.000Z',
      }),
      parseStdinJson: vi.fn().mockReturnValue({ tool_name: 'TeamCreate' }),
      logHook: vi.fn(),
    }));

    vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
      handle: vi.fn().mockResolvedValue({
        decision: 'block',
        reason: 'Increment Required Before Team Creation.',
      }),
    }));

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    const result = await hookRouter('pre-tool-use', '{}');
    expect(result.decision).toBe('block');
    expect(result.reason).toMatch(/^\[GUARD\]/);
    expect(result.reason).toContain('Increment Required Before Team Creation.');
  });

  it('prefixes error log with [ERROR] when handler throws', async () => {
    const mockLogHook = vi.fn();

    vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => ({
      findProjectRoot: vi.fn().mockReturnValue('/test'),
      createContext: vi.fn().mockReturnValue({
        projectRoot: '/test',
        stateDir: '/test/.specweave/state',
        logsDir: '/test/.specweave/logs',
        configPath: '/test/.specweave/config.json',
        timestamp: '2026-04-06T00:00:00.000Z',
      }),
      parseStdinJson: vi.fn().mockReturnValue({ tool_name: 'Edit' }),
      logHook: mockLogHook,
    }));

    vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
      handle: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    }));

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    await hookRouter('pre-tool-use', '{}');

    // logHook should be called with [ERROR] prefix
    expect(mockLogHook).toHaveBeenCalled();
    const errorCall = mockLogHook.mock.calls.find(
      (call: unknown[]) => typeof call[2] === 'string' && call[2].includes('Database connection failed'),
    );
    expect(errorCall).toBeDefined();
    expect(errorCall![2]).toMatch(/^\[ERROR\]/);
  });

  it('does NOT prefix allow results with [GUARD]', async () => {
    vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => ({
      findProjectRoot: vi.fn().mockReturnValue('/test'),
      createContext: vi.fn().mockReturnValue({
        projectRoot: '/test',
        stateDir: '/test/.specweave/state',
        logsDir: '/test/.specweave/logs',
        configPath: '/test/.specweave/config.json',
        timestamp: '2026-04-06T00:00:00.000Z',
      }),
      parseStdinJson: vi.fn().mockReturnValue({}),
      logHook: vi.fn(),
    }));

    vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
      handle: vi.fn().mockResolvedValue({ decision: 'allow' }),
    }));

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    const result = await hookRouter('pre-tool-use', '{}');
    expect(result.decision).toBe('allow');
    expect(result.reason).toBeUndefined();
  });

  it('applies [GUARD] prefix to all three pre-tool-use guards consistently', async () => {
    const guardReasons = [
      "Direct status change to 'completed' is blocked for 0042.",
      'Strict Interview Enforcement: Interview Required.',
      'Increment Required Before Team Creation.',
    ];

    for (const reason of guardReasons) {
      vi.resetModules();

      vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => ({
        findProjectRoot: vi.fn().mockReturnValue('/test'),
        createContext: vi.fn().mockReturnValue({
          projectRoot: '/test',
          stateDir: '/test/.specweave/state',
          logsDir: '/test/.specweave/logs',
          configPath: '/test/.specweave/config.json',
          timestamp: '2026-04-06T00:00:00.000Z',
        }),
        parseStdinJson: vi.fn().mockReturnValue({}),
        logHook: vi.fn(),
      }));

      vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
        handle: vi.fn().mockResolvedValue({ decision: 'block', reason }),
      }));

      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('pre-tool-use', '{}');
      expect(result.reason).toMatch(/^\[GUARD\]/);
      expect(result.reason).toContain(reason);
    }
  });
});

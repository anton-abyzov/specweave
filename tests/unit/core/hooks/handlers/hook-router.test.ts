import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the handler modules so we don't load real handlers
vi.mock('../../../../../src/core/hooks/handlers/utils.js', () => ({
  findProjectRoot: vi.fn().mockReturnValue(null),
  createContext: vi.fn().mockReturnValue({
    projectRoot: '/test',
    stateDir: '/test/.specweave/state',
    logsDir: '/test/.specweave/logs',
    configPath: '/test/.specweave/config.json',
    timestamp: '2026-03-27T00:00:00.000Z',
  }),
  parseStdinJson: vi.fn().mockReturnValue({}),
  logHook: vi.fn(),
}));

describe('hooks/handlers/hook-router', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.SPECWEAVE_DISABLE_HOOKS;
  });

  describe('hookRouter', () => {
    it('returns safe default for unknown event type', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('nonexistent-event', '{}');
      expect(result).toHaveProperty('continue', true);
    });

    it('returns safe default when SPECWEAVE_DISABLE_HOOKS=1', async () => {
      process.env.SPECWEAVE_DISABLE_HOOKS = '1';

      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('pre-compact', '{}');
      expect(result).toHaveProperty('continue', true);
    });

    it('returns approve for user-prompt-submit when no project', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('user-prompt-submit', '{}');
      expect(result).toHaveProperty('decision', 'approve');
    });

    it('returns allow for pre-tool-use when no project', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('pre-tool-use', '{}');
      expect(result).toHaveProperty('decision', 'allow');
    });

    it('returns continue for post-tool-use when no project', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('post-tool-use', '{}');
      expect(result).toHaveProperty('continue', true);
    });

    it('returns approve for stop hooks when no project', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('stop-reflect', '{}');
      expect(result).toHaveProperty('decision', 'approve');
    });

    it('never throws even on internal error', async () => {
      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      // Pass malformed input — should not throw
      const result = await hookRouter('pre-compact', 'COMPLETELY_INVALID{{{{');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('continue', true);
    });
  });
});

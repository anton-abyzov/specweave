/**
 * user-prompt-submit hook handler tests
 *
 * Tests: built-in command skip, SW command fast-path, project scope guard,
 * active increment context injection, TDD mode context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { tmpdir } from 'os';
import type { HookInput, HookContext } from '../../../../../src/core/hooks/handlers/types.js';

// Mock fs before importing handler
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Partial-mock: override only the sync methods this test drives, but preserve
// the real module — transitive deps (banner-check → doctor → config-manager …)
// do `import { promises as fs } from 'fs'`, so the mock MUST keep `promises`
// (and other exports) or those modules crash at load.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    ...mockFs,
    default: { ...actual, ...mockFs },
  };
});

import { handle } from '../../../../../src/core/hooks/handlers/user-prompt-submit.js';

let testLogsDir: string;

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    projectRoot: '/fake/project',
    stateDir: '/fake/project/.specweave/state',
    logsDir: testLogsDir,
    configPath: '/fake/project/.specweave/config.json',
    timestamp: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

function makeInput(prompt: string): HookInput {
  return { prompt };
}

describe('user-prompt-submit handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Unique temp dir per test — fs is mocked so no real I/O, but paths are isolated
    testLogsDir = path.join(tmpdir(), `sw-test-logs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    // Default: project exists with valid config
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    mockFs.readdirSync.mockReturnValue([]);
  });

  describe('built-in command detection', () => {
    const builtins = ['/help', '/clear', '/config', '/status', '/context', '/compact', '/cost'];

    it.each(builtins)('should approve %s immediately without context injection', async (cmd) => {
      const result = await handle(makeInput(cmd), makeContext());
      expect(result.decision).toBe('approve');
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('should approve built-in commands with arguments', async () => {
      const result = await handle(makeInput('/help something'), makeContext());
      expect(result.decision).toBe('approve');
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('should NOT treat /sw:do as a built-in', async () => {
      const result = await handle(makeInput('/sw:do'), makeContext());
      expect(result.decision).toBe('approve');
      // SW commands get approved but may have context
    });
  });

  describe('SW command fast-path', () => {
    it('should approve /sw: commands', async () => {
      const result = await handle(makeInput('/sw:increment "feature"'), makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve /sw- prefixed commands', async () => {
      const result = await handle(makeInput('/sw-github:push'), makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve case-insensitive /SW: commands', async () => {
      const result = await handle(makeInput('/SW:DO'), makeContext());
      expect(result.decision).toBe('approve');
    });
  });

  describe('project scope guard', () => {
    it('should block SW skills when .specweave/config.json does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handle(makeInput('/sw:increment "test"'), makeContext());
      expect(result.decision).toBe('block');
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('Not Initialized');
    });

    it('should NOT block non-SW prompts even without .specweave', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handle(makeInput('write a function'), makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should respect SPECWEAVE_DISABLE_GUARD env var', async () => {
      mockFs.existsSync.mockReturnValue(false);
      process.env.SPECWEAVE_DISABLE_GUARD = '1';

      const result = await handle(makeInput('/sw:increment "test"'), makeContext());
      expect(result.decision).toBe('approve');

      delete process.env.SPECWEAVE_DISABLE_GUARD;
    });
  });

  describe('active increment context injection', () => {
    it('should inject active increment context when increments exist', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p.includes('config.json')) return true;
        if (p.includes('increments')) return true;
        return true;
      });
      mockFs.readdirSync.mockReturnValue(['0001-my-feature'] as any);
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('metadata.json')) {
          return JSON.stringify({ status: 'active', name: 'my-feature' });
        }
        if (String(p).includes('tasks.md')) {
          return '### T-001: Task one\n[ ] pending\n### T-002: Task two\n[x] completed';
        }
        if (String(p).includes('config.json')) {
          return JSON.stringify({ version: '1.0.0' });
        }
        return '';
      });

      const result = await handle(makeInput('implement the feature'), makeContext());
      expect(result.decision).toBe('approve');
      expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
      expect(result.hookSpecificOutput?.additionalContext).toContain('0001-my-feature');
    });

    it('should not inject context for empty increments directory', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      const result = await handle(makeInput('write some code'), makeContext());
      expect(result.decision).toBe('approve');
    });
  });

  describe('TDD mode context injection', () => {
    it('should inject TDD context when config has TDD enabled', async () => {
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0',
            testing: { defaultTestMode: 'TDD', tddEnforcement: 'strict' },
          });
        }
        return '';
      });
      mockFs.readdirSync.mockReturnValue([]);

      const result = await handle(makeInput('implement the feature'), makeContext());
      expect(result.decision).toBe('approve');
      expect(result.hookSpecificOutput?.additionalContext).toContain('TDD');
    });

    it('should not inject TDD context when TDD is off', async () => {
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0',
            testing: { defaultTestMode: 'test-after' },
          });
        }
        return '';
      });
      mockFs.readdirSync.mockReturnValue([]);

      const result = await handle(makeInput('write code'), makeContext());
      // Should not have TDD in context
      const ctx = result.hookSpecificOutput?.additionalContext ?? '';
      expect(ctx).not.toContain('TDD');
    });
  });

  describe('IDE metadata stripping', () => {
    it('should strip IDE metadata before checking built-in commands', async () => {
      const prompt = '<ide_opened_file>/some/file.ts</ide_opened_file> /help';
      const result = await handle(makeInput(prompt), makeContext());
      expect(result.decision).toBe('approve');
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompt', async () => {
      const result = await handle(makeInput(''), makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should handle undefined prompt', async () => {
      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should never throw', async () => {
      mockFs.existsSync.mockImplementation(() => { throw new Error('fs explosion'); });
      const result = await handle(makeInput('/sw:do'), makeContext());
      expect(result.decision).toBe('approve');
    });
  });
});

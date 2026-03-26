/**
 * stop-auto hook handler tests
 *
 * Tests: auto-mode session detection, staleness, task scanning, always approve.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { HookInput, HookContext } from '../../../../../src/core/hooks/handlers/types.js';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

import { handle } from '../../../../../src/core/hooks/handlers/stop-auto.js';

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    projectRoot: '/fake/project',
    stateDir: '/fake/project/.specweave/state',
    logsDir: '/fake/project/.specweave/logs',
    configPath: '/fake/project/.specweave/config.json',
    timestamp: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('stop-auto handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() });
    delete process.env.CLAUDE_SESSION_ID;
  });

  describe('no auto-mode session', () => {
    it('should approve when no auto-mode.json exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });
  });

  describe('with auto-mode session', () => {
    beforeEach(() => {
      process.env.CLAUDE_SESSION_ID = 'test-session-123';
    });

    afterEach(() => {
      delete process.env.CLAUDE_SESSION_ID;
    });

    it('should approve when session file exists but is not active', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) {
          return JSON.stringify({ active: false });
        }
        return '{}';
      });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve when session is stale (expired)', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) return true;
        if (String(p).includes('config.json')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) {
          return JSON.stringify({ active: true, maxSessionAge: 3600 });
        }
        if (String(p).includes('config.json')) {
          return JSON.stringify({ auto: { maxSessionAge: 3600 } });
        }
        return '{}';
      });
      // Session file modified 2 hours ago
      mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() - 7200 * 1000 });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve with progress context when tasks are pending', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) return true;
        if (String(p).includes('config.json')) return true;
        if (String(p).includes('increments')) return true;
        if (String(p).includes('metadata.json')) return true;
        if (String(p).includes('tasks.md')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) {
          return JSON.stringify({ active: true });
        }
        if (String(p).includes('config.json')) {
          return JSON.stringify({ auto: { maxSessionAge: 7200 } });
        }
        if (String(p).includes('metadata.json')) {
          return JSON.stringify({ status: 'active' });
        }
        if (String(p).includes('tasks.md')) {
          return '### T-001\n[ ] pending task\n### T-002\n[x] done task';
        }
        return '{}';
      });
      mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() });
      mockFs.readdirSync.mockReturnValue(['0001-feature'] as any);

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve when all tasks are complete', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) return true;
        if (String(p).includes('config.json')) return true;
        if (String(p).includes('increments')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('auto-mode.json')) {
          return JSON.stringify({ active: true });
        }
        if (String(p).includes('config.json')) {
          return JSON.stringify({});
        }
        return '{}';
      });
      mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() });
      mockFs.readdirSync.mockReturnValue([]);

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });
  });

  describe('edge cases', () => {
    it('should never throw', async () => {
      mockFs.existsSync.mockImplementation(() => { throw new Error('boom'); });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should handle missing session ID gracefully', async () => {
      delete process.env.CLAUDE_SESSION_ID;

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs before importing utils
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

const mockedFs = vi.mocked(fs);

describe('hooks/handlers/utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('findProjectRoot', () => {
    it('returns project root when .specweave/config.json exists', async () => {
      const { findProjectRoot } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      const cwd = '/users/test/project/subdir';
      mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === '/users/test/project/.specweave/config.json';
      });

      const result = findProjectRoot(cwd);
      expect(result).toBe('/users/test/project');
    });

    it('returns null when no .specweave/config.json found', async () => {
      const { findProjectRoot } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      mockedFs.existsSync.mockReturnValue(false);

      const result = findProjectRoot('/users/test/no-project');
      expect(result).toBeNull();
    });
  });

  describe('createContext', () => {
    it('builds HookContext with correct paths', async () => {
      const { createContext } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      const ctx = createContext('/users/test/project');
      expect(ctx.projectRoot).toBe('/users/test/project');
      expect(ctx.stateDir).toBe(
        path.join('/users/test/project', '.specweave', 'state'),
      );
      expect(ctx.logsDir).toBe(
        path.join('/users/test/project', '.specweave', 'logs'),
      );
      expect(ctx.configPath).toBe(
        path.join('/users/test/project', '.specweave', 'config.json'),
      );
      expect(ctx.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('readStdin', () => {
    it('parses valid JSON from stdin string', async () => {
      const { parseStdinJson } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      const result = parseStdinJson('{"tool_name":"Edit"}');
      expect(result).toEqual({ tool_name: 'Edit' });
    });

    it('returns empty object on invalid JSON', async () => {
      const { parseStdinJson } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      const result = parseStdinJson('not json');
      expect(result).toEqual({});
    });

    it('returns empty object on empty string', async () => {
      const { parseStdinJson } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      const result = parseStdinJson('');
      expect(result).toEqual({});
    });
  });

  describe('logHook', () => {
    it('appends log entry to hooks.log', async () => {
      const { logHook, createContext } = await import(
        '../../../../../src/core/hooks/handlers/utils.js'
      );

      mockedFs.existsSync.mockReturnValue(true);
      const ctx = createContext('/users/test/project');

      logHook(ctx, 'pre-compact', 'test message');

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
      expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('hooks.log'),
        expect.stringContaining('pre-compact'),
      );
    });
  });
});

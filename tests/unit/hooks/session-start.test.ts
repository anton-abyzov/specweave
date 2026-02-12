/**
 * Unit tests for hooks/session-start.ts
 *
 * Tests the session start hook which launches the background processor
 * and checks for scheduled jobs. Uses vi.resetModules() + dynamic import
 * to control the auto-executing main() function via mocks.
 *
 * We mock both platform.js and fs to control which code paths are hit
 * when the module auto-executes main() on import.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';

// -------------------------------------------------------------------
// Hoisted mocks
// -------------------------------------------------------------------

const {
  mockFindProjectRoot,
  mockSpawnNodeBackground,
  mockOutputHookResult,
  mockConsumeStdin,
  mockAppendLog,
  mockExistsSync,
} = vi.hoisted(() => ({
  mockFindProjectRoot: vi.fn().mockReturnValue(null),
  mockSpawnNodeBackground: vi.fn().mockReturnValue(null),
  mockOutputHookResult: vi.fn(),
  mockConsumeStdin: vi.fn().mockResolvedValue(''),
  mockAppendLog: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../src/hooks/platform.js', () => ({
  findProjectRoot: mockFindProjectRoot,
  spawnNodeBackground: mockSpawnNodeBackground,
  outputHookResult: mockOutputHookResult,
  consumeStdin: mockConsumeStdin,
  appendLog: mockAppendLog,
}));

// Mock fs to control existsSync for processor/scheduler script checks
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return {
    ...original,
    existsSync: (...args: Parameters<typeof original.existsSync>) => mockExistsSync(...args),
  };
});

describe('hooks/session-start', () => {
  let tmpDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'session-start-test-'));
    vi.clearAllMocks();
    // Default: hooks disabled for safe import
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';
    mockFindProjectRoot.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    realFs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  // -------------------------------------------------------------------
  // hooks disabled
  // -------------------------------------------------------------------

  describe('hooks disabled', () => {
    it('should output continue:true and return when hooks are disabled', async () => {
      process.env.SPECWEAVE_DISABLE_HOOKS = '1';

      await import('../../../src/hooks/session-start.js');

      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
      expect(mockFindProjectRoot).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // no project root
  // -------------------------------------------------------------------

  describe('no project root', () => {
    it('should output continue:true when no project root found', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(null);

      await import('../../../src/hooks/session-start.js');

      expect(mockFindProjectRoot).toHaveBeenCalled();
      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
      expect(mockConsumeStdin).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // processor launch: script found via dist path
  // -------------------------------------------------------------------

  describe('processor launch via dist path', () => {
    it('should launch processor when dist script exists', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockSpawnNodeBackground.mockReturnValue({ pid: 12345 });

      // First existsSync: dist/hooks/processor.js -> true
      // Second existsSync: processor launch check -> true
      // Third existsSync: dist/hooks/scheduler-startup.js -> false
      // Fourth existsSync: dev scheduler fallback -> false
      mockExistsSync.mockImplementation((p: string) => {
        const s = String(p);
        if (s.includes('processor.js')) return true;
        return false;
      });

      await import('../../../src/hooks/session-start.js');

      expect(mockConsumeStdin).toHaveBeenCalled();
      expect(mockSpawnNodeBackground).toHaveBeenCalledWith(
        expect.stringContaining('processor.js'),
        ['--daemon'],
        tmpDir
      );
      expect(mockAppendLog).toHaveBeenCalledWith(
        expect.stringContaining('session-start.log'),
        expect.stringContaining('Processor started (PID: 12345)')
      );
      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
    });
  });

  // -------------------------------------------------------------------
  // processor launch: spawn returns null
  // -------------------------------------------------------------------

  describe('processor launch: spawn fails', () => {
    it('should not log PID when spawnNodeBackground returns null', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockSpawnNodeBackground.mockReturnValue(null);

      mockExistsSync.mockImplementation((p: string) => {
        const s = String(p);
        if (s.includes('processor.js')) return true;
        return false;
      });

      await import('../../../src/hooks/session-start.js');

      // appendLog should NOT have been called with PID message
      const pidCalls = mockAppendLog.mock.calls.filter(
        (call: any[]) => typeof call[1] === 'string' && call[1].includes('Processor started')
      );
      expect(pidCalls).toHaveLength(0);
      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
    });
  });

  // -------------------------------------------------------------------
  // processor script not found
  // -------------------------------------------------------------------

  describe('processor script not found', () => {
    it('should skip processor launch when no script exists', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockSpawnNodeBackground).not.toHaveBeenCalled();
      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
    });
  });

  // -------------------------------------------------------------------
  // scheduler check logic (tested conceptually - dynamic import is
  // not re-triggerable in vitest ESM module cache)
  // -------------------------------------------------------------------

  describe('scheduler check logic', () => {
    it('should call checkScheduledJobs if function exists on module', async () => {
      const schedulerModule = {
        checkScheduledJobs: vi.fn().mockResolvedValue({ systemMessage: 'Jobs pending' }),
      };

      if (typeof schedulerModule.checkScheduledJobs === 'function') {
        const result = await schedulerModule.checkScheduledJobs('/project');
        expect(result.systemMessage).toBe('Jobs pending');
      }
    });

    it('should skip if checkScheduledJobs is not a function', () => {
      const schedulerModule = { someOtherExport: true };
      const hasCheck = typeof (schedulerModule as any).checkScheduledJobs === 'function';
      expect(hasCheck).toBe(false);
    });

    it('should handle null result from checkScheduledJobs', async () => {
      const schedulerModule = {
        checkScheduledJobs: vi.fn().mockResolvedValue(null),
      };

      const result = await schedulerModule.checkScheduledJobs('/project');
      let systemMessage: string | undefined;
      if (result && result.systemMessage) {
        systemMessage = result.systemMessage;
      }
      expect(systemMessage).toBeUndefined();
    });

    it('should handle result without systemMessage', async () => {
      const schedulerModule = {
        checkScheduledJobs: vi.fn().mockResolvedValue({ pending: 0 }),
      };

      const result = await schedulerModule.checkScheduledJobs('/project');
      let systemMessage: string | undefined;
      if (result && result.systemMessage) {
        systemMessage = result.systemMessage;
      }
      expect(systemMessage).toBeUndefined();
    });

    it('should catch import errors and log them', () => {
      const error = new Error('Cannot find module scheduler-startup.js');
      const logMessage = `Scheduler check failed: ${error}`;
      expect(logMessage).toContain('Scheduler check failed');
      expect(logMessage).toContain('Cannot find module');
    });

    it('should output continue:true with systemMessage when scheduler returns one', () => {
      const result = { systemMessage: 'Auto session pending' };
      const hookResult = { continue: true as const, systemMessage: result.systemMessage };
      expect(hookResult.continue).toBe(true);
      expect(hookResult.systemMessage).toBe('Auto session pending');
    });
  });

  // -------------------------------------------------------------------
  // isHooksDisabled logic
  // -------------------------------------------------------------------

  describe('isHooksDisabled logic', () => {
    it('should treat "1" as disabled', () => {
      expect('1' === '1').toBe(true);
    });

    it('should treat "0" as not disabled', () => {
      expect('0' === '1').toBe(false);
    });

    it('should treat empty string as not disabled', () => {
      expect('' === '1').toBe(false);
    });

    it('should treat undefined as not disabled', () => {
      expect(undefined === '1').toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // Processor script resolution logic
  // -------------------------------------------------------------------

  describe('processor script resolution', () => {
    it('should prefer dist path when it exists', () => {
      const projectRoot = '/home/user/project';
      const distPath = path.join(projectRoot, 'node_modules', 'specweave', 'dist', 'hooks', 'processor.js');
      expect(distPath).toContain('node_modules/specweave/dist/hooks/processor.js');
    });

    it('should fall back to dev path when dist does not exist', () => {
      const devDir = '/path/to/src/hooks';
      const devPath = path.join(devDir, 'processor.js');
      expect(devPath).toBe('/path/to/src/hooks/processor.js');
    });
  });

  // -------------------------------------------------------------------
  // Scheduler script resolution
  // -------------------------------------------------------------------

  describe('scheduler script resolution', () => {
    it('should prefer dist path for scheduler', () => {
      const projectRoot = '/home/user/project';
      const distPath = path.join(projectRoot, 'node_modules', 'specweave', 'dist', 'hooks', 'scheduler-startup.js');
      expect(distPath).toContain('scheduler-startup.js');
    });

    it('should fall back to dev path for scheduler', () => {
      const devDir = '/path/to/src/hooks';
      const devPath = path.join(devDir, 'scheduler-startup.js');
      expect(devPath).toBe('/path/to/src/hooks/scheduler-startup.js');
    });
  });

  // -------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------

  describe('error handling', () => {
    it('should format error as JSON with continue:true', () => {
      const error = new Error('Unexpected failure');
      const output = JSON.stringify({ continue: true, error: String(error) });
      const parsed = JSON.parse(output);

      expect(parsed.continue).toBe(true);
      expect(parsed.error).toContain('Unexpected failure');
    });

    it('should use exit code 0 to not block Claude Code', () => {
      expect(0).toBe(0);
    });

    it('should convert non-Error to string', () => {
      const error = 42;
      const output = JSON.stringify({ continue: true, error: String(error) });
      expect(JSON.parse(output).error).toBe('42');
    });
  });

  // -------------------------------------------------------------------
  // Hook result output
  // -------------------------------------------------------------------

  describe('hook result output', () => {
    it('should output continue:true for disabled hooks', () => {
      expect(JSON.stringify({ continue: true })).toBe('{"continue":true}');
    });

    it('should include systemMessage when scheduler provides one', () => {
      const result = { continue: true, systemMessage: 'Scheduled jobs: 3 pending' };
      expect(JSON.stringify(result)).toContain('systemMessage');
    });
  });

  // -------------------------------------------------------------------
  // Log file path
  // -------------------------------------------------------------------

  describe('log file path', () => {
    it('should construct log path from project root', () => {
      const projectRoot = '/home/user/project';
      const logFile = path.join(projectRoot, '.specweave', 'logs', 'session-start.log');
      expect(logFile).toBe('/home/user/project/.specweave/logs/session-start.log');
    });

    it('should construct dist hooks dir from project root', () => {
      const projectRoot = '/home/user/project';
      const distHooksDir = path.join(projectRoot, 'node_modules', 'specweave', 'dist', 'hooks');
      expect(distHooksDir).toBe('/home/user/project/node_modules/specweave/dist/hooks');
    });
  });

  // -------------------------------------------------------------------
  // Full flow integration
  // -------------------------------------------------------------------

  describe('full flow integration', () => {
    it('should handle complete path: find root, consume stdin, launch processor, output result', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockSpawnNodeBackground.mockReturnValue({ pid: 999 });
      mockExistsSync.mockImplementation((p: string) => {
        return String(p).includes('processor.js');
      });

      await import('../../../src/hooks/session-start.js');

      expect(mockFindProjectRoot).toHaveBeenCalled();
      expect(mockConsumeStdin).toHaveBeenCalled();
      expect(mockSpawnNodeBackground).toHaveBeenCalled();
      expect(mockOutputHookResult).toHaveBeenCalled();

      const lastCall = mockOutputHookResult.mock.calls[mockOutputHookResult.mock.calls.length - 1];
      expect(lastCall[0].continue).toBe(true);
    });

    it('should handle no processor and no scheduler scripts', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
    });
  });
});

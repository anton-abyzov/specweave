/**
 * HookExecutor Tests
 *
 * Comprehensive tests for the HookExecutor class that executes hooks
 * as child processes and analyzes their output for errors, warnings,
 * and performance issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'child_process';
import type { EventEmitter } from 'events';
import type { Readable } from 'stream';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockSpawn, mockGetCleanEnv } = vi.hoisted(() => {
  const mockSpawn = vi.fn();
  const mockGetCleanEnv = vi.fn().mockReturnValue({
    PATH: '/usr/bin',
    HOME: '/home/test',
  });
  return { mockSpawn, mockGetCleanEnv };
});

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

vi.mock('../../../../src/utils/clean-env.js', () => ({
  getCleanEnv: mockGetCleanEnv,
}));

import { HookExecutor } from '../../../../src/core/hooks/HookExecutor.js';
import type {
  HookDefinition,
  ExecutorConfig,
} from '../../../../src/core/hooks/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockChildProcess {
  stdout: { on: ReturnType<typeof vi.fn> };
  stderr: { on: ReturnType<typeof vi.fn> };
  on: ReturnType<typeof vi.fn>;
  killed: boolean;
  kill: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock child process with controllable stdout, stderr, and events.
 *
 * Returns both the mock object and trigger functions to simulate process
 * lifecycle events (data on stdout/stderr, close, error).
 */
function createMockChildProcess(): {
  proc: MockChildProcess;
  emitStdout: (data: string) => void;
  emitStderr: (data: string) => void;
  emitClose: (code: number | null) => void;
  emitError: (err: Error) => void;
} {
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  const stdoutListeners: Array<(data: Buffer | string) => void> = [];
  const stderrListeners: Array<(data: Buffer | string) => void> = [];

  const proc: MockChildProcess = {
    stdout: {
      on: vi.fn((event: string, cb: (data: Buffer | string) => void) => {
        if (event === 'data') stdoutListeners.push(cb);
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: (data: Buffer | string) => void) => {
        if (event === 'data') stderrListeners.push(cb);
      }),
    },
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    killed: false,
    kill: vi.fn(() => {
      proc.killed = true;
    }),
  };

  return {
    proc,
    emitStdout: (data: string) => {
      for (const cb of stdoutListeners) cb(data);
    },
    emitStderr: (data: string) => {
      for (const cb of stderrListeners) cb(data);
    },
    emitClose: (code: number | null) => {
      for (const cb of (listeners['close'] || [])) cb(code);
    },
    emitError: (err: Error) => {
      for (const cb of (listeners['error'] || [])) cb(err);
    },
  };
}

function makeConfig(overrides: Partial<ExecutorConfig> = {}): ExecutorConfig {
  return {
    timeout: 5000,
    captureStdout: true,
    captureStderr: true,
    testIncrementId: '__test-increment__',
    ...overrides,
  };
}

function makeHook(overrides: Partial<HookDefinition> = {}): HookDefinition {
  return {
    name: 'update-ac-status',
    plugin: 'specweave',
    path: '/projects/plugins/specweave/hooks/update-ac-status.sh',
    type: 'shell',
    dependencies: [],
    trigger: 'post-tool-use',
    testable: true,
    critical: false,
    ...overrides,
  };
}

/**
 * Sets up mockSpawn to return the given mock child process and
 * schedules the provided callback after a microtask (to simulate async).
 */
function setupSpawn(
  proc: MockChildProcess,
  afterSpawn?: () => void,
): void {
  mockSpawn.mockImplementation(() => {
    if (afterSpawn) {
      // Use setTimeout(0) to let the promise setup complete before emitting
      setTimeout(afterSpawn, 0);
    }
    return proc;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HookExecutor', () => {
  let executor: HookExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    executor = new HookExecutor(makeConfig());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // createDefaultConfig
  // =========================================================================
  describe('createDefaultConfig', () => {
    it('should return a config with 5000ms timeout', () => {
      const config = HookExecutor.createDefaultConfig();
      expect(config.timeout).toBe(5000);
    });

    it('should enable stdout capture by default', () => {
      const config = HookExecutor.createDefaultConfig();
      expect(config.captureStdout).toBe(true);
    });

    it('should enable stderr capture by default', () => {
      const config = HookExecutor.createDefaultConfig();
      expect(config.captureStderr).toBe(true);
    });

    it('should use __health-check-test__ as testIncrementId', () => {
      const config = HookExecutor.createDefaultConfig();
      expect(config.testIncrementId).toBe('__health-check-test__');
    });
  });

  // =========================================================================
  // executeHook - successful execution
  // =========================================================================
  describe('executeHook - successful execution', () => {
    it('should return success true when exit code is 0 and no errors', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should capture stdout when captureStdout is enabled', async () => {
      const { proc, emitStdout, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStdout('hook output line 1\n');
        emitStdout('hook output line 2\n');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe('hook output line 1\nhook output line 2\n');
    });

    it('should capture stderr when captureStderr is enabled', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('debug info\n');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stderr).toBe('debug info\n');
    });

    it('should not capture stdout when captureStdout is disabled', async () => {
      executor = new HookExecutor(makeConfig({ captureStdout: false }));
      const { proc, emitStdout, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStdout('should not appear');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe('');
    });

    it('should not capture stderr when captureStderr is disabled', async () => {
      executor = new HookExecutor(makeConfig({ captureStderr: false }));
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('should not appear');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stderr).toBe('');
    });

    it('should include hook name and plugin in result', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(
        makeHook({ name: 'my-hook', plugin: 'my-plugin' }),
      );

      expect(result.hook).toBe('my-hook');
      expect(result.plugin).toBe('my-plugin');
    });

    it('should include a valid ISO timestamp', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should measure execution time', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        // Advance fake timers by 100ms before closing
        vi.advanceTimersByTime(100);
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should return empty errors and warnings for clean execution', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should report performanceIssue as false when no expected duration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.performanceIssue).toBe(false);
    });

    it('should have undefined performanceRatio when no expectedDuration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.performanceRatio).toBeUndefined();
    });
  });

  // =========================================================================
  // executeHook - spawn arguments
  // =========================================================================
  describe('executeHook - spawn arguments', () => {
    it('should use bash command for shell hooks', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(makeHook({ type: 'shell' }));

      expect(mockSpawn).toHaveBeenCalledWith(
        'bash',
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should use node command for typescript hooks', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'typescript',
          path: '/projects/plugins/specweave/hooks/my-hook.ts',
        }),
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should use node command for javascript hooks', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'javascript',
          path: '/projects/plugins/specweave/hooks/my-hook.js',
        }),
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should pass hook path as arg for shell hooks', async () => {
      const hookPath = '/projects/plugins/specweave/hooks/update-ac-status.sh';
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(makeHook({ type: 'shell', path: hookPath }));

      expect(mockSpawn).toHaveBeenCalledWith(
        'bash',
        [hookPath],
        expect.any(Object),
      );
    });

    it('should pass compiled JS path and testIncrementId for TS hooks', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'typescript',
          path: 'plugins/specweave/lib/hooks/my-hook.ts',
        }),
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['dist/plugins/specweave/lib/hooks/my-hook.js', '__test-increment__'],
        expect.any(Object),
      );
    });

    it('should set cwd to directory of hook file', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({ path: '/projects/plugins/specweave/hooks/my-hook.sh' }),
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/projects/plugins/specweave/hooks',
        }),
      );
    });

    it('should use clean environment with NODE_ENV=test', async () => {
      mockGetCleanEnv.mockReturnValue({ PATH: '/usr/bin' });
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(makeHook());

      expect(mockGetCleanEnv).toHaveBeenCalled();
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: { PATH: '/usr/bin', NODE_ENV: 'test' },
        }),
      );
    });

    it('should pass configured timeout to spawn options', async () => {
      executor = new HookExecutor(makeConfig({ timeout: 10000 }));
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(makeHook());

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });
  });

  // =========================================================================
  // executeHook - exit codes and failures
  // =========================================================================
  describe('executeHook - exit codes', () => {
    it('should return success false when exit code is non-zero', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(1));

      const result = await executor.executeHook(makeHook());

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should treat null exit code as 0', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(null));

      const result = await executor.executeHook(makeHook());

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should return success false when exit code is 0 but errors detected', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr("ERR_MODULE_NOT_FOUND Cannot find module './missing'");
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // executeHook - process error handling
  // =========================================================================
  describe('executeHook - process errors', () => {
    it('should handle spawn error (e.g., command not found)', async () => {
      const { proc, emitError } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitError(new Error('spawn bash ENOENT'));
      });

      const result = await executor.executeHook(makeHook());

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.stderr).toContain('spawn bash ENOENT');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('runtime');
      expect(result.errors[0].message).toContain('Hook execution failed');
      expect(result.errors[0].fixable).toBe(false);
    });

    it('should handle non-Error objects thrown during execution', async () => {
      const { proc } = createMockChildProcess();
      // Simulate a non-Error rejection
      mockSpawn.mockImplementation(() => {
        throw 'string error';
      });

      const result = await executor.executeHook(makeHook());

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.stderr).toBe('string error');
      expect(result.errors[0].message).toContain('string error');
    });

    it('should return empty stdout on process error', async () => {
      const { proc, emitError } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitError(new Error('EPERM'));
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe('');
    });

    it('should return empty warnings on process error', async () => {
      const { proc, emitError } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitError(new Error('EPERM'));
      });

      const result = await executor.executeHook(makeHook());

      expect(result.warnings).toEqual([]);
    });

    it('should set performanceIssue to false on process error', async () => {
      const { proc, emitError } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitError(new Error('EPERM'));
      });

      const result = await executor.executeHook(makeHook());

      expect(result.performanceIssue).toBe(false);
    });
  });

  // =========================================================================
  // executeHook - timeout handling
  // =========================================================================
  describe('executeHook - timeout', () => {
    it('should kill process and reject on timeout', async () => {
      const { proc } = createMockChildProcess();
      // Never emit close/error - the process hangs
      setupSpawn(proc);

      const promise = executor.executeHook(makeHook());

      // Advance timers past the timeout threshold
      vi.advanceTimersByTime(6000);

      const result = await promise;

      expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('timeout');
    });

    it('should use configured timeout value', async () => {
      executor = new HookExecutor(makeConfig({ timeout: 2000 }));
      const { proc } = createMockChildProcess();
      setupSpawn(proc);

      const promise = executor.executeHook(makeHook());

      vi.advanceTimersByTime(2500);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('2000ms');
    });

    it('should not kill process if it completes before timeout', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitClose(0);
      });

      await executor.executeHook(makeHook());

      // Process was not killed since it completed
      expect(proc.kill).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error detection - import errors
  // =========================================================================
  describe('detectErrors - import errors', () => {
    it('should detect ERR_MODULE_NOT_FOUND errors', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr("ERR_MODULE_NOT_FOUND Cannot find module './utils'");
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const importErrors = result.errors.filter((e) => e.type === 'import');
      expect(importErrors.length).toBeGreaterThan(0);
      expect(importErrors[0].message).toContain("Cannot find module './utils'");
    });

    it('should suggest adding .js extension for imports without extension', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr("ERR_MODULE_NOT_FOUND Cannot find module './utils'");
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const importError = result.errors.find((e) => e.type === 'import');
      expect(importError?.suggestion).toContain('.js');
      expect(importError?.fixable).toBe(true);
    });

    it('should suggest verifying path for imports with .js extension', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr("ERR_MODULE_NOT_FOUND Cannot find module './utils.js'");
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const importError = result.errors.find((e) => e.type === 'import');
      expect(importError?.suggestion).toContain('Verify module exists');
      expect(importError?.fixable).toBe(false);
    });

    it('should return no import error when no module match in stderr', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('ERR_MODULE_NOT_FOUND some other error format');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      // No "Cannot find module" match, so no import error added
      const importErrors = result.errors.filter((e) => e.type === 'import');
      expect(importErrors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Error detection - static method errors
  // =========================================================================
  describe('detectErrors - static method errors', () => {
    it('should detect static vs instance method errors', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('Did you mean to access the static member ClassName.method?');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const runtimeError = result.errors.find(
        (e) => e.type === 'runtime' && e.message.includes('static method'),
      );
      expect(runtimeError).toBeDefined();
      expect(runtimeError?.suggestion).toContain('ClassName.methodName()');
      expect(runtimeError?.fixable).toBe(false);
    });
  });

  // =========================================================================
  // Error detection - syntax errors
  // =========================================================================
  describe('detectErrors - syntax errors', () => {
    it('should detect SyntaxError in stderr', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('SyntaxError: Unexpected identifier');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const syntaxError = result.errors.find((e) => e.type === 'syntax');
      expect(syntaxError).toBeDefined();
      expect(syntaxError?.message).toBe('Unexpected identifier');
      expect(syntaxError?.fixable).toBe(false);
    });

    it('should handle SyntaxError without specific message', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('SyntaxError\nstack trace follows');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const syntaxError = result.errors.find((e) => e.type === 'syntax');
      expect(syntaxError).toBeDefined();
      expect(syntaxError?.message).toBe('Syntax error in hook code');
    });
  });

  // =========================================================================
  // Error detection - JSON parse errors
  // =========================================================================
  describe('detectErrors - JSON parse errors', () => {
    it('should detect JSON parse errors', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('Unexpected token < in JSON at position 0');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const jsonError = result.errors.find((e) => e.type === 'validation');
      expect(jsonError).toBeDefined();
      expect(jsonError?.message).toBe('Invalid JSON input to hook');
      expect(jsonError?.suggestion).toContain('schema');
      expect(jsonError?.fixable).toBe(false);
    });

    it('should not detect JSON error when only Unexpected token without JSON', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('Unexpected token < in input');
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const jsonErrors = result.errors.filter((e) => e.type === 'validation');
      expect(jsonErrors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Error detection - multiple errors
  // =========================================================================
  describe('detectErrors - multiple errors', () => {
    it('should detect multiple error types from the same stderr', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr(
          "ERR_MODULE_NOT_FOUND Cannot find module './missing'\n" +
            'SyntaxError: Unexpected end of input\n' +
            'Unexpected token } in JSON at position 5',
        );
        emitClose(1);
      });

      const result = await executor.executeHook(makeHook());

      const errorTypes = result.errors.map((e) => e.type);
      expect(errorTypes).toContain('import');
      expect(errorTypes).toContain('syntax');
      expect(errorTypes).toContain('validation');
    });
  });

  // =========================================================================
  // Warning detection - performance
  // =========================================================================
  describe('detectWarnings - performance', () => {
    it('should warn when execution time exceeds 2x expected duration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        vi.advanceTimersByTime(500);
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: 100 });
      const result = await executor.executeHook(hook);

      const perfWarning = result.warnings.find((w) => w.type === 'performance');
      expect(perfWarning).toBeDefined();
      expect(perfWarning?.severity).toBe('medium');
      expect(perfWarning?.recommendation).toContain('Optimize');
    });

    it('should not warn when within 2x expected duration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: 10000 });
      const result = await executor.executeHook(hook);

      const perfWarnings = result.warnings.filter(
        (w) => w.type === 'performance',
      );
      expect(perfWarnings).toHaveLength(0);
    });

    it('should not warn when expectedDuration is undefined', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        vi.advanceTimersByTime(5000);
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: undefined });
      const result = await executor.executeHook(hook);

      const perfWarnings = result.warnings.filter(
        (w) => w.type === 'performance',
      );
      expect(perfWarnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // Warning detection - deprecation
  // =========================================================================
  describe('detectWarnings - deprecation', () => {
    it('should detect DeprecationWarning in stderr', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('(node:1234) DeprecationWarning: Buffer() is deprecated');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      const depWarning = result.warnings.find((w) => w.type === 'deprecation');
      expect(depWarning).toBeDefined();
      expect(depWarning?.severity).toBe('low');
      expect(depWarning?.recommendation).toContain('current APIs');
    });

    it('should not flag deprecation when not present', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('some normal error output');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      const depWarnings = result.warnings.filter(
        (w) => w.type === 'deprecation',
      );
      expect(depWarnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // Performance issue check
  // =========================================================================
  describe('performanceIssue flag', () => {
    it('should set performanceIssue true when exceeding 2x expected', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        vi.advanceTimersByTime(500);
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: 100 });
      const result = await executor.executeHook(hook);

      expect(result.performanceIssue).toBe(true);
    });

    it('should set performanceIssue false when within threshold', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: 10000 });
      const result = await executor.executeHook(hook);

      expect(result.performanceIssue).toBe(false);
    });

    it('should set performanceIssue false when no expectedDuration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.performanceIssue).toBe(false);
    });
  });

  // =========================================================================
  // Performance ratio
  // =========================================================================
  describe('performanceRatio', () => {
    it('should calculate ratio as executionTime / expectedDuration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        vi.advanceTimersByTime(300);
        emitClose(0);
      });

      const hook = makeHook({ expectedDuration: 100 });
      const result = await executor.executeHook(hook);

      expect(result.performanceRatio).toBeDefined();
      expect(typeof result.performanceRatio).toBe('number');
      // ratio should be executionTime / expectedDuration
      expect(result.performanceRatio).toBeGreaterThan(0);
    });

    it('should return undefined ratio when no expectedDuration', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.performanceRatio).toBeUndefined();
    });
  });

  // =========================================================================
  // extractImportErrorDetails
  // =========================================================================
  describe('extractImportErrorDetails', () => {
    it('should extract module path from stderr', () => {
      const stderr = "Cannot find module './utils/helpers'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details).not.toBeNull();
      expect(details?.modulePath).toBe('./utils/helpers');
    });

    it('should extract importing file from stderr when available', () => {
      const stderr =
        "Cannot find module './utils' imported from '/projects/hooks/main.ts'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.importingFile).toBe('/projects/hooks/main.ts');
    });

    it('should fall back to hookPath when importing file not in stderr', () => {
      const stderr = "Cannot find module './utils'";
      const details = executor.extractImportErrorDetails(
        stderr,
        '/projects/hooks/my-hook.ts',
      );

      expect(details?.importingFile).toBe('/projects/hooks/my-hook.ts');
    });

    it('should detect missing .js extension', () => {
      const stderr = "Cannot find module './utils'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.hasExtension).toBe(false);
      expect(details?.suggestedPath).toBe('./utils.js');
      expect(details?.fixConfidence).toBe('high');
    });

    it('should detect present .js extension', () => {
      const stderr = "Cannot find module './utils.js'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.hasExtension).toBe(true);
      expect(details?.suggestedPath).toBe('./utils.js');
      expect(details?.fixConfidence).toBe('medium');
    });

    it('should return null when no module match found', () => {
      const stderr = 'Some other error without module reference';
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details).toBeNull();
    });

    it('should set importStatement to empty string', () => {
      const stderr = "Cannot find module './utils'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.importStatement).toBe('');
    });

    it('should set medium confidence for node_modules imports', () => {
      const stderr =
        "Cannot find module 'node_modules/some-package/missing'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.fixConfidence).toBe('medium');
    });

    it('should set high confidence for relative imports without extension', () => {
      const stderr = "Cannot find module '../helpers/format'";
      const details = executor.extractImportErrorDetails(stderr, '/hook.ts');

      expect(details?.fixConfidence).toBe('high');
    });
  });

  // =========================================================================
  // Hook args - TypeScript path transformation
  // =========================================================================
  describe('getHookArgs - path transformations', () => {
    it('should replace .ts extension with .js for TS hooks', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'typescript',
          path: 'plugins/specweave/lib/hooks/my-hook.ts',
        }),
      );

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs[0]).toContain('.js');
      expect(spawnArgs[0]).not.toContain('.ts');
    });

    it('should prefix with dist/ for plugins path', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'typescript',
          path: 'plugins/my-plugin/hooks/hook.ts',
        }),
      );

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs[0]).toMatch(/^dist\/plugins\//);
    });

    it('should include testIncrementId as second arg for TS hooks', async () => {
      executor = new HookExecutor(
        makeConfig({ testIncrementId: 'custom-id' }),
      );
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      await executor.executeHook(
        makeHook({
          type: 'typescript',
          path: 'plugins/specweave/lib/hooks/hook.ts',
        }),
      );

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs[1]).toBe('custom-id');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle empty stdout and stderr', async () => {
      const { proc, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => emitClose(0));

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });

    it('should handle very large stdout output', async () => {
      const { proc, emitStdout, emitClose } = createMockChildProcess();
      const largeOutput = 'x'.repeat(100000);
      setupSpawn(proc, () => {
        emitStdout(largeOutput);
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe(largeOutput);
    });

    it('should accumulate multiple stdout chunks', async () => {
      const { proc, emitStdout, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStdout('chunk1');
        emitStdout('chunk2');
        emitStdout('chunk3');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stdout).toBe('chunk1chunk2chunk3');
    });

    it('should accumulate multiple stderr chunks', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr('err1');
        emitStderr('err2');
        emitClose(0);
      });

      const result = await executor.executeHook(makeHook());

      expect(result.stderr).toBe('err1err2');
    });

    it('should handle hook with all error types simultaneously', async () => {
      const { proc, emitStderr, emitClose } = createMockChildProcess();
      setupSpawn(proc, () => {
        emitStderr(
          "ERR_MODULE_NOT_FOUND Cannot find module './x'\n" +
            'Did you mean to access the static member Foo.bar?\n' +
            'SyntaxError: Invalid or unexpected token\n' +
            'Unexpected token } in JSON at position 10\n' +
            '(node:999) DeprecationWarning: old API',
        );
        emitClose(1);
      });

      const result = await executor.executeHook(
        makeHook({ expectedDuration: 1 }),
      );

      expect(result.success).toBe(false);
      const errorTypes = result.errors.map((e) => e.type);
      expect(errorTypes).toContain('import');
      expect(errorTypes).toContain('runtime');
      expect(errorTypes).toContain('syntax');
      expect(errorTypes).toContain('validation');
    });
  });
});

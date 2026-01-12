/**
 * Tests for CommandInvoker - Security-focused tests for command injection prevention
 *
 * @module tests/unit/core/workflow/command-invoker.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock function that will be used to track calls and provide return values
const mockExecFileAsync = vi.fn();

// Mock child_process.execFile with util.promisify support
// Node's promisify has special handling for execFile that returns { stdout, stderr }
vi.mock('child_process', () => {
  // Create execFile function with util.promisify.custom symbol
  const execFileFn = (
    cmd: string,
    args: string[],
    options: object,
    callback?: (error: Error | null, stdout: string, stderr: string) => void
  ) => {
    if (callback) {
      const result = mockExecFileAsync(cmd, args, options);
      if (result instanceof Promise) {
        result.then(
          (res: { stdout: string; stderr: string }) => callback(null, res.stdout, res.stderr),
          (err: Error) => callback(err, '', '')
        );
      }
    }
    return {} as unknown;
  };

  // Add custom promisify implementation that returns Promise<{stdout, stderr}>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (execFileFn as any)[Symbol.for('nodejs.util.promisify.custom')] = (
    cmd: string,
    args: string[],
    options: object
  ) => {
    return mockExecFileAsync(cmd, args, options);
  };

  return { execFile: execFileFn };
});

// Import after mocking
import { CommandInvoker, ErrorSeverity } from '../../../../src/core/workflow/command-invoker.js';

describe('CommandInvoker', () => {
  let invoker: CommandInvoker;

  beforeEach(() => {
    invoker = new CommandInvoker();
    mockExecFileAsync.mockReset();
    // Default mock - resolve successfully
    mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('invoke - Security', () => {
    describe('Command Injection Prevention', () => {
      it('should reject command names with semicolons', async () => {
        const result = await invoker.invoke('plan; rm -rf /');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject command names with pipes', async () => {
        const result = await invoker.invoke('plan | cat /etc/passwd');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject command names with backticks', async () => {
        const result = await invoker.invoke('plan`whoami`');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject command names with $() substitution', async () => {
        const result = await invoker.invoke('plan$(whoami)');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject command names with ampersand', async () => {
        const result = await invoker.invoke('plan && malicious');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject command names with spaces', async () => {
        const result = await invoker.invoke('plan malicious');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid command name');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should accept valid command names with hyphens', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

        const result = await invoker.invoke('sync-tasks');

        expect(result.error).toBeUndefined();
        expect(mockExecFileAsync).toHaveBeenCalled();
      });

      it('should accept valid command names with underscores', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

        const result = await invoker.invoke('sync_tasks');

        expect(result.error).toBeUndefined();
        expect(mockExecFileAsync).toHaveBeenCalled();
      });
    });

    describe('Argument Injection Prevention', () => {
      it('should reject arguments with semicolons', async () => {
        const result = await invoker.invoke('plan', {
          args: ['--id', '0001; rm -rf /']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(result.error).toContain('dangerous characters');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with pipe operators', async () => {
        const result = await invoker.invoke('plan', {
          args: ['0001 | cat /etc/passwd']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with backticks', async () => {
        const result = await invoker.invoke('plan', {
          args: ['`whoami`']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with $() command substitution', async () => {
        const result = await invoker.invoke('plan', {
          args: ['$(cat /etc/passwd)']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with quotes that could escape', async () => {
        const result = await invoker.invoke('plan', {
          args: ["'; DROP TABLE users; --"]
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with double quotes', async () => {
        const result = await invoker.invoke('plan', {
          args: ['"; rm -rf /; "']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with redirection operators', async () => {
        const result = await invoker.invoke('plan', {
          args: ['> /tmp/malicious']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should reject arguments with curly braces', async () => {
        const result = await invoker.invoke('plan', {
          args: ['{echo,malicious}']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid argument');
        expect(mockExecFileAsync).not.toHaveBeenCalled();
      });

      it('should accept safe arguments with alphanumeric and hyphens', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

        const result = await invoker.invoke('plan', {
          args: ['--increment', '0001-feature-name', '--dry-run']
        });

        expect(result.error).toBeUndefined();
        expect(mockExecFileAsync).toHaveBeenCalled();
      });

      it('should accept safe arguments with numbers', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

        const result = await invoker.invoke('validate', {
          args: ['0001', '0002', '0003']
        });

        expect(result.error).toBeUndefined();
        expect(mockExecFileAsync).toHaveBeenCalled();
      });
    });

    describe('execFile usage (no shell)', () => {
      it('should use execFile with npx as command', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'output', stderr: '' });

        await invoker.invoke('plan');

        expect(mockExecFileAsync).toHaveBeenCalled();
        const callArgs = mockExecFileAsync.mock.calls[0];
        expect(callArgs[0]).toBe('npx');
      });

      it('should pass arguments as array elements, not concatenated', async () => {
        mockExecFileAsync.mockResolvedValue({ stdout: 'output', stderr: '' });

        await invoker.invoke('validate', {
          args: ['0001', '--verbose']
        });

        const callArgs = mockExecFileAsync.mock.calls[0];
        const argsArray = callArgs[1] as string[];

        // Arguments should be passed as array
        expect(argsArray).toContain('specweave');
        expect(argsArray).toContain('validate');
        expect(argsArray).toContain('0001');
        expect(argsArray).toContain('--verbose');
      });
    });
  });

  describe('invoke - Functionality', () => {
    it('should return success result on successful execution', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'Command output', stderr: '' });

      const result = await invoker.invoke('plan', { captureOutput: true });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Command output');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should return failure result on command error', async () => {
      const error = new Error('Command failed') as Error & {
        code: number;
        stderr: string;
      };
      error.code = 1;
      error.stderr = 'Error output';

      mockExecFileAsync.mockRejectedValue(error);

      const result = await invoker.invoke('plan');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Command failed');
    });

    it('should respect timeout option', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await invoker.invoke('plan', { timeout: 5000 });

      expect(mockExecFileAsync).toHaveBeenCalled();
      const options = mockExecFileAsync.mock.calls[0][2];
      expect(options.timeout).toBe(5000);
    });

    it('should respect cwd option', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await invoker.invoke('plan', { cwd: '/custom/path' });

      expect(mockExecFileAsync).toHaveBeenCalled();
      const options = mockExecFileAsync.mock.calls[0][2];
      expect(options.cwd).toBe('/custom/path');
    });

    it('should not capture output by default', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'Some output', stderr: '' });

      const result = await invoker.invoke('plan');

      expect(result.stdout).toBeUndefined();
    });

    it('should capture output when captureOutput is true', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'Captured output', stderr: '' });

      const result = await invoker.invoke('plan', { captureOutput: true });

      expect(result.stdout).toBe('Captured output');
    });
  });

  describe('invokeWithRetry', () => {
    it('should return immediately on success', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

      const result = await invoker.invokeWithRetry('plan', {}, 3);

      expect(result.success).toBe(true);
      expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      let attempts = 0;

      mockExecFileAsync.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('ECONNREFUSED') as Error & { code: number };
          error.code = 1;
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: 'success', stderr: '' });
      });

      const result = await invoker.invokeWithRetry('plan', {}, 3);

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    }, 15000); // Increase timeout for retry test

    it('should not retry on critical errors', async () => {
      const error = new Error('command not found') as Error & { code: number };
      error.code = 127;

      mockExecFileAsync.mockRejectedValue(error);

      const result = await invoker.invokeWithRetry('plan', {}, 3);

      expect(result.success).toBe(false);
      expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('classifyError', () => {
    it('should classify ENOENT as critical', () => {
      const result = { success: false, exitCode: 1, error: 'ENOENT: no such file', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should classify command not found as critical', () => {
      const result = { success: false, exitCode: 127, error: 'command not found', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should classify permission denied as critical', () => {
      const result = { success: false, exitCode: 1, error: 'permission denied', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should classify ECONNREFUSED as warning (transient)', () => {
      const result = { success: false, exitCode: 1, error: 'ECONNREFUSED', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.WARNING);
    });

    it('should classify ETIMEDOUT as warning (transient)', () => {
      const result = { success: false, exitCode: 1, error: 'ETIMEDOUT', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.WARNING);
    });

    it('should classify generic errors as error', () => {
      const result = { success: false, exitCode: 1, error: 'Something went wrong', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.ERROR);
    });

    it('should handle stderr for classification', () => {
      const result = { success: false, exitCode: 1, stderr: 'ENOENT', executionTime: 0 };
      expect(invoker.classifyError(result)).toBe(ErrorSeverity.CRITICAL);
    });
  });
});

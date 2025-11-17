/**
 * Command Invoker - Programmatic command execution
 *
 * Provides utilities to invoke SpecWeave commands programmatically
 * from within the workflow orchestration system.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/command-invoker
 * @since v0.22.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Command invocation options
 */
export interface InvokeOptions {
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Capture stdout */
  captureOutput?: boolean;
}

/**
 * Command invocation result
 */
export interface InvokeResult {
  /** Command succeeded */
  success: boolean;
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout?: string;
  /** Standard error */
  stderr?: string;
  /** Error message */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Error severity level
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Command Invoker - Execute SpecWeave commands programmatically
 */
export class CommandInvoker {
  /**
   * Invoke a SpecWeave command
   *
   * @param command - Command name (e.g., 'plan', 'do', 'validate')
   * @param options - Invocation options
   * @returns Command execution result
   */
  async invoke(command: string, options: InvokeOptions = {}): Promise<InvokeResult> {
    const startTime = Date.now();

    try {
      // Build command string
      const args = options.args || [];
      const commandString = `npx specweave ${command} ${args.join(' ')}`;

      // Execute command
      const { stdout, stderr } = await execAsync(commandString, {
        cwd: options.cwd || process.cwd(),
        timeout: options.timeout || 300000, // 5 min default
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        exitCode: 0,
        stdout: options.captureOutput ? stdout : undefined,
        stderr: stderr || undefined,
        executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        exitCode: error.code || 1,
        stdout: options.captureOutput ? error.stdout : undefined,
        stderr: error.stderr || undefined,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Invoke command with automatic retry on transient failures
   *
   * @param command - Command name
   * @param options - Invocation options
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Command execution result
   */
  async invokeWithRetry(
    command: string,
    options: InvokeOptions = {},
    maxRetries: number = 3
  ): Promise<InvokeResult> {
    let lastResult: InvokeResult | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      const result = await this.invoke(command, options);

      if (result.success) {
        return result;
      }

      // Check if error is retryable
      const severity = this.classifyError(result);
      if (severity === ErrorSeverity.CRITICAL) {
        // Don't retry critical errors
        return result;
      }

      lastResult = result;

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    return lastResult!;
  }

  /**
   * Classify error severity
   *
   * @param result - Command result
   * @returns Error severity level
   */
  classifyError(result: InvokeResult): ErrorSeverity {
    const error = result.error || result.stderr || '';

    // Critical errors (don't retry)
    if (error.includes('ENOENT') || error.includes('command not found')) {
      return ErrorSeverity.CRITICAL;
    }

    if (error.includes('permission denied') || error.includes('EACCES')) {
      return ErrorSeverity.CRITICAL;
    }

    // Transient errors (retry)
    if (error.includes('ECONNREFUSED') || error.includes('ETIMEDOUT')) {
      return ErrorSeverity.WARNING;
    }

    // Default to error
    return ErrorSeverity.ERROR;
  }

  /**
   * Delay execution
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

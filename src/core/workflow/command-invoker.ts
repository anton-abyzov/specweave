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

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Validate and sanitize command name to prevent injection
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function validateCommandName(command: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(command)) {
    throw new Error(`Invalid command name: ${command}. Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }
  return command;
}

/**
 * Validate command arguments to prevent injection
 * Rejects arguments containing shell metacharacters
 */
function validateArgs(args: string[]): string[] {
  const DANGEROUS_PATTERNS = /[;&|`$(){}[\]<>\\'"!#*?~]/;

  for (const arg of args) {
    if (DANGEROUS_PATTERNS.test(arg)) {
      throw new Error(`Invalid argument: "${arg}". Contains potentially dangerous characters.`);
    }
  }
  return args;
}

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
      // Validate command and arguments to prevent injection attacks
      const validatedCommand = validateCommandName(command);
      const validatedArgs = validateArgs(options.args || []);

      // Build arguments array for execFile (no shell interpretation)
      // Using npx to run specweave command
      const execArgs = ['specweave', validatedCommand, ...validatedArgs];

      // Execute command using execFile - arguments are never interpreted by shell
      const { stdout, stderr } = await execFileAsync('npx', execArgs, {
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
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const execError = error as {
        code?: number;
        stdout?: string;
        stderr?: string;
        message?: string;
      };

      return {
        success: false,
        exitCode: execError.code || 1,
        stdout: options.captureOutput ? execError.stdout : undefined,
        stderr: execError.stderr || undefined,
        error: execError.message || String(error),
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
   */
  classifyError(result: InvokeResult): ErrorSeverity {
    const error = result.error || result.stderr || '';

    const CRITICAL_PATTERNS = ['ENOENT', 'command not found', 'permission denied', 'EACCES'];
    const TRANSIENT_PATTERNS = ['ECONNREFUSED', 'ETIMEDOUT'];

    if (CRITICAL_PATTERNS.some(pattern => error.includes(pattern))) {
      return ErrorSeverity.CRITICAL;
    }

    if (TRANSIENT_PATTERNS.some(pattern => error.includes(pattern))) {
      return ErrorSeverity.WARNING;
    }

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

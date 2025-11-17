/**
 * Hook Executor
 *
 * Executes hooks in isolated environment and validates results.
 * Detects import errors, runtime errors, timeouts, and performance issues.
 *
 * Part of increment 0037: Hook Health Check System
 */

import { spawn } from 'child_process';
import * as path from 'path';
import {
  HookDefinition,
  HookExecutionResult,
  HookError,
  HookWarning,
  ExecutorConfig,
  ImportErrorDetails
} from './types.js';

/**
 * Hook Executor - Validates hook execution
 */
export class HookExecutor {
  private config: ExecutorConfig;

  constructor(config: ExecutorConfig) {
    this.config = config;
  }

  /**
   * Execute hook and capture result
   */
  async executeHook(hook: HookDefinition): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const { exitCode, stdout, stderr } = await this.runHookProcess(hook);
      const executionTime = Date.now() - startTime;

      // Analyze execution result
      const errors = this.detectErrors(stderr, hook);
      const warnings = this.detectWarnings(stdout, stderr, executionTime, hook);
      const performanceIssue = this.checkPerformance(executionTime, hook);

      const success = exitCode === 0 && errors.length === 0;

      return {
        hook: hook.name,
        plugin: hook.plugin,
        success,
        exitCode,
        stdout,
        stderr,
        executionTime,
        errors,
        warnings,
        timestamp,
        performanceIssue,
        performanceRatio: hook.expectedDuration
          ? executionTime / hook.expectedDuration
          : undefined
      };
    } catch (error) {
      // Execution failed completely
      const executionTime = Date.now() - startTime;

      return {
        hook: hook.name,
        plugin: hook.plugin,
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        executionTime,
        errors: [{
          type: 'runtime',
          message: `Hook execution failed: ${error instanceof Error ? error.message : String(error)}`,
          fixable: false
        }],
        warnings: [],
        timestamp,
        performanceIssue: false
      };
    }
  }

  /**
   * Run hook as child process
   */
  private async runHookProcess(hook: HookDefinition): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const args = this.getHookArgs(hook);
      const command = this.getHookCommand(hook);

      const childProcess = spawn(command, args, {
        cwd: path.dirname(hook.path),
        env: { ...process.env, NODE_ENV: 'test' },
        timeout: this.config.timeout
      });

      let stdout = '';
      let stderr = '';

      if (this.config.captureStdout) {
        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (this.config.captureStderr) {
        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode || 0,
          stdout,
          stderr
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGTERM');
          reject(new Error(`Hook execution timeout (${this.config.timeout}ms)`));
        }
      }, this.config.timeout);
    });
  }

  /**
   * Get command to execute hook
   */
  private getHookCommand(hook: HookDefinition): string {
    if (hook.type === 'shell') {
      return 'bash';
    } else {
      return 'node';
    }
  }

  /**
   * Get arguments for hook execution
   */
  private getHookArgs(hook: HookDefinition): string[] {
    if (hook.type === 'shell') {
      return [hook.path];
    } else {
      // For TypeScript hooks, run the compiled JavaScript
      const jsPath = hook.path.replace(/\.ts$/, '.js').replace('/lib/hooks/', '/lib/hooks/');
      const distPath = jsPath.replace(/^plugins\//, 'dist/plugins/');
      return [distPath, this.config.testIncrementId];
    }
  }

  /**
   * Detect errors in hook execution
   */
  private detectErrors(stderr: string, hook: HookDefinition): HookError[] {
    const errors: HookError[] = [];

    // Detect import errors (ERR_MODULE_NOT_FOUND)
    if (stderr.includes('ERR_MODULE_NOT_FOUND')) {
      const importError = this.parseImportError(stderr);
      if (importError) {
        errors.push({
          type: 'import',
          message: importError.message,
          suggestion: importError.suggestion,
          fixable: importError.fixable
        });
      }
    }

    // Detect static vs instance method errors
    if (stderr.includes('Did you mean to access the static member')) {
      errors.push({
        type: 'runtime',
        message: 'Using instance method instead of static method',
        suggestion: 'Use ClassName.methodName() instead of this.methodName()',
        fixable: false // Requires code review
      });
    }

    // Detect syntax errors
    if (stderr.includes('SyntaxError')) {
      const syntaxMatch = stderr.match(/SyntaxError: (.+)/);
      errors.push({
        type: 'syntax',
        message: syntaxMatch ? syntaxMatch[1] : 'Syntax error in hook code',
        fixable: false
      });
    }

    // Detect JSON parse errors
    if (stderr.includes('Unexpected token') && stderr.includes('JSON')) {
      errors.push({
        type: 'validation',
        message: 'Invalid JSON input to hook',
        suggestion: 'Validate hook input format matches expected schema',
        fixable: false
      });
    }

    return errors;
  }

  /**
   * Parse import error from stderr
   */
  private parseImportError(stderr: string): HookError | null {
    const moduleMatch = stderr.match(/Cannot find module '(.+?)'/);
    if (!moduleMatch) {
      return null;
    }

    const missingModule = moduleMatch[1];
    const hasExtension = missingModule.endsWith('.js');

    let suggestion = '';
    let fixable = false;

    if (!hasExtension) {
      suggestion = `Add .js extension: import from '${missingModule}.js'`;
      fixable = true;
    } else {
      suggestion = `Verify module exists at path: ${missingModule}`;
      fixable = false;
    }

    return {
      type: 'import',
      message: `Cannot find module '${missingModule}'`,
      suggestion,
      fixable
    };
  }

  /**
   * Detect warnings in hook execution
   */
  private detectWarnings(
    stdout: string,
    stderr: string,
    executionTime: number,
    hook: HookDefinition
  ): HookWarning[] {
    const warnings: HookWarning[] = [];

    // Performance warning
    if (hook.expectedDuration && executionTime > hook.expectedDuration * 2) {
      warnings.push({
        type: 'performance',
        message: `Hook took ${executionTime}ms (expected ${hook.expectedDuration}ms)`,
        severity: 'medium',
        recommendation: 'Optimize hook performance or increase expected duration'
      });
    }

    // Deprecation warnings
    if (stderr.includes('DeprecationWarning')) {
      warnings.push({
        type: 'deprecation',
        message: 'Hook uses deprecated APIs',
        severity: 'low',
        recommendation: 'Update to use current APIs'
      });
    }

    return warnings;
  }

  /**
   * Check if hook has performance issues
   */
  private checkPerformance(executionTime: number, hook: HookDefinition): boolean {
    if (!hook.expectedDuration) {
      return false;
    }

    // Performance issue if >2x expected duration
    return executionTime > hook.expectedDuration * 2;
  }

  /**
   * Extract import error details for auto-fixing
   */
  extractImportErrorDetails(stderr: string, hookPath: string): ImportErrorDetails | null {
    const moduleMatch = stderr.match(/Cannot find module '(.+?)'/);
    const importingMatch = stderr.match(/imported from '(.+?)'/);

    if (!moduleMatch) {
      return null;
    }

    const modulePath = moduleMatch[1];
    const importingFile = importingMatch ? importingMatch[1] : hookPath;

    // Check if .js extension is missing
    const hasExtension = modulePath.endsWith('.js');
    const suggestedPath = hasExtension ? modulePath : `${modulePath}.js`;

    // Determine fix confidence
    let fixConfidence: 'high' | 'medium' | 'low' = 'medium';
    if (!hasExtension && !modulePath.includes('node_modules')) {
      fixConfidence = 'high'; // High confidence for relative imports missing .js
    }

    return {
      modulePath,
      importingFile,
      importStatement: '', // Would need to parse file to get exact statement
      hasExtension,
      suggestedPath,
      fixConfidence
    };
  }

  /**
   * Create default executor config
   */
  static createDefaultConfig(): ExecutorConfig {
    return {
      timeout: 5000, // 5 seconds
      captureStdout: true,
      captureStderr: true,
      testIncrementId: '__health-check-test__'
    };
  }
}

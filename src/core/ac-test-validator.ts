/**
 * AC Test Validator
 *
 * Validates that all Acceptance Criteria linked to a task have passing tests
 * before allowing the task to be marked complete.
 *
 * **CRITICAL QUALITY GATE**: This is the enforcement point that prevents
 * tasks from being marked complete without validated ACs.
 *
 * Workflow:
 * 1. Task completion requested via TodoWrite
 * 2. Validator extracts task's satisfiesACs field
 * 3. Validator finds corresponding test files from Test Plan section
 * 4. Validator runs tests using configured test runner (vitest/jest)
 * 5. If ALL tests pass → Allow completion, auto-check ACs in spec.md
 * 6. If ANY test fails → Block completion, show detailed error
 */

import { Task } from '../generators/spec/task-parser.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Test validation result
 */
export interface ACTestValidationResult {
  /** Whether all tests passed */
  passed: boolean;

  /** Task ID being validated */
  taskId: string;

  /** AC-IDs this task satisfies */
  acIds: string[];

  /** Test results by AC-ID */
  testResults: Map<string, ACTestResult>;

  /** Overall summary */
  summary: {
    totalACs: number;
    acsTested: number;
    acsUntested: number;
    testsPassed: number;
    testsFailed: number;
  };

  /** Detailed error messages (if validation failed) */
  errors: string[];
}

/**
 * Test result for a single AC
 */
export interface ACTestResult {
  acId: string;
  testFile?: string;
  testCases: string[];
  passed: boolean;
  duration: number;
  error?: string;
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  /** Test runner command (e.g., "npm test", "vitest run") */
  command: string;

  /** Test file pattern (glob pattern for test files) */
  pattern: string;

  /** Working directory for test execution */
  cwd: string;

  /** Environment variables for test execution */
  env?: Record<string, string>;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * AC Test Validator - Core validation engine
 */
export class ACTestValidator {
  private config: TestRunnerConfig;

  constructor(config: TestRunnerConfig) {
    this.config = {
      timeout: 30000, // 30 second default timeout
      ...config
    };
  }

  /**
   * Validate all ACs for a task have passing tests
   *
   * @param task - Task to validate (must have satisfiesACs field)
   * @param projectRoot - Project root directory
   * @returns Validation result
   */
  async validateTask(task: Task, projectRoot: string): Promise<ACTestValidationResult> {
    const startTime = Date.now();

    // Initialize result
    const result: ACTestValidationResult = {
      passed: false,
      taskId: task.id,
      acIds: task.satisfiesACs || [],
      testResults: new Map(),
      summary: {
        totalACs: 0,
        acsTested: 0,
        acsUntested: 0,
        testsPassed: 0,
        testsFailed: 0
      },
      errors: []
    };

    // Check if task has ACs to validate
    if (!task.satisfiesACs || task.satisfiesACs.length === 0) {
      result.errors.push(`Task ${task.id} has no Acceptance Criteria linked (satisfiesACs field missing or empty)`);
      return result;
    }

    result.summary.totalACs = task.satisfiesACs.length;

    // Extract test file from task's Test Plan section
    const testFile = this.extractTestFile(task);
    if (!testFile) {
      result.errors.push(`Task ${task.id} has no Test Plan section or test file specified`);
      return result;
    }

    // Check test file exists
    const testFilePath = path.join(projectRoot, testFile);
    if (!await fs.pathExists(testFilePath)) {
      result.errors.push(`Test file not found: ${testFile}`);
      return result;
    }

    // Run tests for each AC
    for (const acId of task.satisfiesACs) {
      const acTestResult = await this.validateAC(acId, testFile, projectRoot);
      result.testResults.set(acId, acTestResult);

      if (acTestResult.passed) {
        result.summary.acsTested++;
        result.summary.testsPassed++;
      } else {
        result.summary.acsUntested++;
        result.summary.testsFailed++;
        result.errors.push(`AC ${acId} tests failed: ${acTestResult.error || 'Unknown error'}`);
      }
    }

    // Overall pass/fail
    result.passed = result.summary.testsFailed === 0 && result.summary.acsTested === result.summary.totalACs;

    const duration = Date.now() - startTime;
    console.log(`\n${chalk.blue('[AC Test Validator]')} Validated task ${task.id} in ${duration}ms`);

    return result;
  }

  /**
   * Validate a single AC has passing tests
   */
  private async validateAC(
    acId: string,
    testFile: string,
    projectRoot: string
  ): Promise<ACTestResult> {
    const startTime = Date.now();

    const result: ACTestResult = {
      acId,
      testFile,
      testCases: [],
      passed: false,
      duration: 0
    };

    try {
      // Run test file with filter for AC-ID
      // Most test runners support filtering: vitest -t "AC-US1-01", jest --testNamePattern="AC-US1-01"
      const command = this.buildTestCommand(testFile, acId);

      console.log(`  ${chalk.gray('Running:')} ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.config.cwd,
        env: { ...process.env, ...this.config.env },
        timeout: this.config.timeout
      });

      // Parse test output (basic implementation - can be enhanced)
      const output = stdout + stderr;
      result.testCases = this.extractTestCases(output, acId);

      // Check for test failures
      const hasFailures = output.includes('FAIL') ||
                         output.includes('failed') ||
                         output.includes('✗') ||
                         output.includes('0 passed');

      result.passed = !hasFailures && result.testCases.length > 0;

      if (!result.passed) {
        result.error = this.extractFailureMessage(output);
      }

    } catch (error: any) {
      result.passed = false;
      result.error = error.message || 'Test execution failed';

      // Check if it's a timeout
      if (error.killed && error.signal === 'SIGTERM') {
        result.error = `Test timeout (exceeded ${this.config.timeout}ms)`;
      }
    }

    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Build test command with AC-ID filter
   */
  private buildTestCommand(testFile: string, acId: string): string {
    // Detect test runner from config command
    const command = this.config.command.toLowerCase();

    if (command.includes('vitest')) {
      // Vitest: vitest run <file> -t "AC-US1-01"
      return `${this.config.command} ${testFile} -t "${acId}"`;
    } else if (command.includes('jest')) {
      // Jest: jest <file> --testNamePattern="AC-US1-01"
      return `${this.config.command} ${testFile} --testNamePattern="${acId}"`;
    } else if (command.includes('npm test')) {
      // NPM script - try to pass args
      return `${this.config.command} -- ${testFile} -t "${acId}"`;
    } else {
      // Default: assume vitest-style
      return `${this.config.command} ${testFile} -t "${acId}"`;
    }
  }

  /**
   * Extract test case names from test output
   */
  private extractTestCases(output: string, acId: string): string[] {
    const testCases: string[] = [];

    // Look for lines containing the AC-ID and test indicators
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(acId) && (line.includes('✓') || line.includes('PASS') || line.includes('√'))) {
        // Extract test name (basic heuristic)
        const match = line.match(/✓\s+(.+)/) || line.match(/PASS\s+(.+)/);
        if (match) {
          testCases.push(match[1].trim());
        }
      }
    }

    return testCases;
  }

  /**
   * Extract failure message from test output
   */
  private extractFailureMessage(output: string): string {
    const lines = output.split('\n');

    // Find first error/failure message
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('FAIL') || line.includes('✗') || line.includes('Error:')) {
        // Collect next few lines for context
        const errorLines = lines.slice(i, i + 5).join('\n');
        return errorLines.substring(0, 200); // Truncate long messages
      }
    }

    // Fallback: return last few lines
    return lines.slice(-5).join('\n');
  }

  /**
   * Extract test file path from task description (Test Plan section)
   */
  private extractTestFile(task: Task): string | null {
    if (!task.description) return null;

    // Look for Test Plan section with file path
    // Format: **Test Plan**:
    //         - **File**: `tests/unit/component.test.ts`
    const testFileRegex = /\*\*File\*\*:\s*`([^`]+)`/;
    const match = task.description.match(testFileRegex);

    return match ? match[1] : null;
  }

  /**
   * Format validation result for display
   */
  formatResult(result: ACTestValidationResult): string {
    const lines: string[] = [];

    lines.push(chalk.bold(`\nAC Test Validation: ${result.taskId}`));
    lines.push(chalk.gray('─'.repeat(60)));

    // Summary
    lines.push(chalk.bold('Summary:'));
    lines.push(`  Total ACs: ${result.summary.totalACs}`);
    lines.push(`  ACs Tested: ${chalk.green(result.summary.acsTested)}`);
    lines.push(`  ACs Untested: ${chalk.red(result.summary.acsUntested)}`);
    lines.push(`  Tests Passed: ${chalk.green(result.summary.testsPassed)}`);
    lines.push(`  Tests Failed: ${chalk.red(result.summary.testsFailed)}`);

    // Overall status
    lines.push('');
    if (result.passed) {
      lines.push(chalk.green.bold('✓ VALIDATION PASSED'));
      lines.push(chalk.green('All Acceptance Criteria have passing tests. Task can be marked complete.'));
    } else {
      lines.push(chalk.red.bold('✗ VALIDATION FAILED'));
      lines.push(chalk.red('Task cannot be marked complete until all AC tests pass.'));
    }

    // Errors
    if (result.errors.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Errors:'));
      result.errors.forEach(error => {
        lines.push(chalk.red(`  • ${error}`));
      });
    }

    // Test details
    if (result.testResults.size > 0) {
      lines.push('');
      lines.push(chalk.bold('Test Results:'));
      result.testResults.forEach((acResult, acId) => {
        const icon = acResult.passed ? chalk.green('✓') : chalk.red('✗');
        const status = acResult.passed ? chalk.green('PASSED') : chalk.red('FAILED');
        lines.push(`  ${icon} ${acId}: ${status} (${acResult.duration}ms)`);

        if (acResult.testCases.length > 0) {
          acResult.testCases.forEach(testCase => {
            lines.push(chalk.gray(`    - ${testCase}`));
          });
        }

        if (acResult.error) {
          lines.push(chalk.red(`    Error: ${acResult.error}`));
        }
      });
    }

    lines.push(chalk.gray('─'.repeat(60)));

    return lines.join('\n');
  }
}

/**
 * Create AC test validator from project config
 */
export async function createACTestValidator(projectRoot: string): Promise<ACTestValidator> {
  // Read test configuration from package.json or specweave config
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let testCommand = 'npm test';

  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);

    // Detect test runner
    if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
      testCommand = 'npx vitest run';
    } else if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
      testCommand = 'npx jest';
    }
  }

  const config: TestRunnerConfig = {
    command: testCommand,
    pattern: 'tests/**/*.test.ts',
    cwd: projectRoot,
    timeout: 30000
  };

  return new ACTestValidator(config);
}

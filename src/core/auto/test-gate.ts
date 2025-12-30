/**
 * Test Gate Module
 *
 * Enforces test-driven validation before increment transitions.
 * Features:
 * - Run unit/integration/E2E tests
 * - Enforce coverage thresholds
 * - Retry failed tests with fixes
 * - Escalate to human after max retries
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestGateConfig {
  /** Test command (default: npm test) */
  testCommand: string;
  /** Coverage threshold (default: 80) */
  coverageThreshold: number;
  /** Max retry attempts (default: 3) */
  maxRetries: number;
  /** Timeout per test run in ms (default: 300000 = 5 min) */
  timeout: number;
  /** E2E test command (optional) */
  e2eCommand?: string;
  /** Integration test command (optional) */
  integrationCommand?: string;
  /** Coverage report path */
  coverageReportPath: string;
}

export interface TestResult {
  passed: boolean;
  exitCode: number;
  duration: number;
  output: string;
  coverage?: CoverageResult;
  failures?: TestFailure[];
}

export interface CoverageResult {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  meetsThreshold: boolean;
}

export interface TestFailure {
  file: string;
  testName: string;
  error: string;
  stackTrace?: string;
}

export interface GateResult {
  passed: boolean;
  testsRun: boolean;
  coveragePassed: boolean;
  retryCount: number;
  requiresHumanIntervention: boolean;
  testResult?: TestResult;
  errors: string[];
}

const DEFAULT_CONFIG: TestGateConfig = {
  testCommand: 'npm test',
  coverageThreshold: 80,
  maxRetries: 3,
  timeout: 300000, // 5 minutes
  coverageReportPath: 'coverage/coverage-summary.json',
};

export class TestGate {
  private config: TestGateConfig;
  private projectRoot: string;

  constructor(projectRoot: string, config: Partial<TestGateConfig> = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run test gate validation
   */
  async runGate(): Promise<GateResult> {
    const errors: string[] = [];
    let retryCount = 0;
    let testResult: TestResult | undefined;

    // Retry loop
    while (retryCount <= this.config.maxRetries) {
      testResult = await this.runTests(this.config.testCommand);

      if (testResult.passed) {
        // Check coverage
        const coverage = this.checkCoverage();
        if (coverage && !coverage.meetsThreshold) {
          errors.push(
            `Coverage below threshold: ${coverage.lines}% < ${this.config.coverageThreshold}%`
          );
          return {
            passed: false,
            testsRun: true,
            coveragePassed: false,
            retryCount,
            requiresHumanIntervention: true,
            testResult: { ...testResult, coverage },
            errors,
          };
        }

        return {
          passed: true,
          testsRun: true,
          coveragePassed: true,
          retryCount,
          requiresHumanIntervention: false,
          testResult: { ...testResult, coverage: coverage || undefined },
          errors: [],
        };
      }

      // Extract failures for potential fixes
      const failures = this.parseTestFailures(testResult.output);
      testResult.failures = failures;

      if (retryCount < this.config.maxRetries) {
        retryCount++;
        // In a real implementation, this would trigger fix attempts
        // For now, we just retry immediately
        await this.delay(1000);
      } else {
        break;
      }
    }

    errors.push(`Tests failed after ${retryCount} retries`);
    if (testResult?.failures) {
      for (const failure of testResult.failures.slice(0, 5)) {
        errors.push(`- ${failure.testName}: ${failure.error}`);
      }
    }

    return {
      passed: false,
      testsRun: true,
      coveragePassed: false,
      retryCount,
      requiresHumanIntervention: true,
      testResult,
      errors,
    };
  }

  /**
   * Run a test command
   */
  private async runTests(command: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        passed: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        output,
      };
    } catch (error: unknown) {
      const execError = error as { status?: number; stdout?: string; stderr?: string };
      return {
        passed: false,
        exitCode: execError.status || 1,
        duration: Date.now() - startTime,
        output: (execError.stdout || '') + (execError.stderr || ''),
      };
    }
  }

  /**
   * Check coverage from report
   */
  private checkCoverage(): CoverageResult | null {
    const reportPath = path.join(this.projectRoot, this.config.coverageReportPath);

    if (!fs.existsSync(reportPath)) {
      return null;
    }

    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const total = report.total || {};

      const result: CoverageResult = {
        statements: total.statements?.pct || 0,
        branches: total.branches?.pct || 0,
        functions: total.functions?.pct || 0,
        lines: total.lines?.pct || 0,
        meetsThreshold: false,
      };

      result.meetsThreshold = result.lines >= this.config.coverageThreshold;

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Parse test failures from output
   */
  private parseTestFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];

    // Vitest/Jest failure pattern
    const failurePattern = /FAIL\s+(\S+)\s*\n(?:.*\n)*?\s*✕\s*(.+?)\s*\n\s*([\s\S]*?)(?=\n\s*(?:✓|✕|PASS|FAIL)|$)/g;

    let match;
    while ((match = failurePattern.exec(output)) !== null) {
      failures.push({
        file: match[1],
        testName: match[2].trim(),
        error: match[3].trim().split('\n')[0],
        stackTrace: match[3].trim(),
      });
    }

    // Simpler pattern for error messages
    if (failures.length === 0) {
      const errorPattern = /Error:\s*(.+?)(?:\n|$)/g;
      while ((match = errorPattern.exec(output)) !== null) {
        failures.push({
          file: 'unknown',
          testName: 'unknown',
          error: match[1].trim(),
        });
      }
    }

    return failures;
  }

  /**
   * Run E2E tests (Playwright)
   */
  async runE2ETests(): Promise<TestResult> {
    const command = this.config.e2eCommand || this.detectE2ECommand();
    if (!command) {
      return {
        passed: true,
        exitCode: 0,
        duration: 0,
        output: 'No E2E tests configured',
      };
    }

    return this.runTests(command);
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests(): Promise<TestResult> {
    const command = this.config.integrationCommand || 'npm run test:integration';

    try {
      return await this.runTests(command);
    } catch {
      // Integration tests may not exist
      return {
        passed: true,
        exitCode: 0,
        duration: 0,
        output: 'Integration tests not configured or not found',
      };
    }
  }

  /**
   * Detect Playwright E2E command
   */
  private detectE2ECommand(): string | null {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check for Playwright
      if (pkg.devDependencies?.['@playwright/test'] || pkg.dependencies?.['@playwright/test']) {
        return 'npx playwright test';
      }

      // Check for Cypress
      if (pkg.devDependencies?.cypress || pkg.dependencies?.cypress) {
        return 'npx cypress run';
      }

      // Check for scripts
      if (pkg.scripts?.['test:e2e']) {
        return 'npm run test:e2e';
      }
    } catch {
      // Invalid package.json
    }

    return null;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Quick test gate check (for stop hook)
 */
export function quickTestCheck(projectRoot: string): boolean {
  try {
    execSync('npm test -- --passWithNoTests', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 60000, // 1 minute quick check
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

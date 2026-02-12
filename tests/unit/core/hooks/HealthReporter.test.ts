/**
 * HealthReporter Tests
 *
 * Comprehensive tests for the HealthReporter static class that formats
 * hook health check results in 4 formats: console, markdown, JSON, JUnit XML.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWriteFile } = vi.hoisted(() => ({
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  writeFile: mockWriteFile,
}));

import { HealthReporter } from '../../../../src/core/hooks/HealthReporter.js';
import type {
  HealthCheckResult,
  ReportOptions,
  HookExecutionResult,
  HealthSummary,
} from '../../../../src/core/hooks/types.js';

// ---------------------------------------------------------------------------
// Test fixture factories
// ---------------------------------------------------------------------------

function makeHookResult(overrides: Partial<HookExecutionResult> = {}): HookExecutionResult {
  return {
    hook: 'update-ac-status',
    plugin: 'specweave',
    success: true,
    exitCode: 0,
    stdout: '',
    stderr: '',
    executionTime: 42,
    errors: [],
    warnings: [],
    timestamp: '2025-06-01T12:00:00.000Z',
    performanceIssue: false,
    ...overrides,
  };
}

function makeFailedHookResult(overrides: Partial<HookExecutionResult> = {}): HookExecutionResult {
  return makeHookResult({
    hook: 'validate-spec',
    plugin: 'specweave',
    success: false,
    exitCode: 1,
    stderr: 'Error: spec.md not found',
    errors: [
      {
        type: 'runtime',
        message: 'spec.md not found in increment directory',
        suggestion: 'Run specweave init to create spec.md',
        fixable: true,
      },
    ],
    warnings: [
      {
        type: 'best-practice',
        message: 'Missing AC definitions',
        severity: 'medium',
      },
    ],
    ...overrides,
  });
}

function makeSummary(overrides: Partial<HealthSummary> = {}): HealthSummary {
  return {
    status: 'pass',
    message: 'All hooks healthy',
    recommendations: [],
    fixableIssues: 0,
    manualIssues: 0,
    slowHooks: [],
    criticalHooksFailed: [],
    ...overrides,
  };
}

function makeHealthyResult(overrides: Partial<HealthCheckResult> = {}): HealthCheckResult {
  return {
    timestamp: '2025-06-01T12:00:00.000Z',
    totalHooks: 3,
    passedHooks: 3,
    failedHooks: 0,
    criticalFailures: 0,
    overallHealth: 'healthy',
    results: [
      makeHookResult({ hook: 'update-ac-status' }),
      makeHookResult({ hook: 'tdd-enforcement', executionTime: 15 }),
      makeHookResult({ hook: 'living-specs', executionTime: 30 }),
    ],
    summary: makeSummary(),
    totalExecutionTime: 87,
    projectRoot: '/projects/my-app',
    ...overrides,
  };
}

function makeDegradedResult(): HealthCheckResult {
  return makeHealthyResult({
    passedHooks: 2,
    failedHooks: 1,
    overallHealth: 'degraded',
    results: [
      makeHookResult({ hook: 'update-ac-status' }),
      makeHookResult({ hook: 'tdd-enforcement', executionTime: 15 }),
      makeFailedHookResult(),
    ],
    summary: makeSummary({
      status: 'warn',
      message: 'Some hooks need attention',
      recommendations: ['Fix spec.md path resolution', 'Run specweave check-hooks --fix'],
      fixableIssues: 1,
      slowHooks: [],
    }),
  });
}

function makeUnhealthyResult(): HealthCheckResult {
  return makeHealthyResult({
    passedHooks: 0,
    failedHooks: 3,
    criticalFailures: 2,
    overallHealth: 'unhealthy',
    results: [
      makeFailedHookResult({ hook: 'update-ac-status', plugin: 'specweave' }),
      makeFailedHookResult({ hook: 'tdd-enforcement', plugin: 'specweave' }),
      makeFailedHookResult({ hook: 'living-specs', plugin: 'specweave' }),
    ],
    summary: makeSummary({
      status: 'fail',
      message: 'Critical failures detected',
      recommendations: ['Reinstall hooks', 'Check plugin installation'],
      criticalHooksFailed: ['update-ac-status', 'tdd-enforcement'],
    }),
  });
}

function makeResultWithSlowHooks(): HealthCheckResult {
  return makeHealthyResult({
    overallHealth: 'degraded',
    results: [
      makeHookResult({ hook: 'update-ac-status', executionTime: 42 }),
      makeHookResult({ hook: 'slow-hook', executionTime: 5200, performanceIssue: true }),
      makeHookResult({ hook: 'very-slow-hook', executionTime: 12000, performanceIssue: true }),
    ],
    summary: makeSummary({
      status: 'warn',
      message: 'Performance issues detected',
      slowHooks: ['slow-hook', 'very-slow-hook'],
    }),
  });
}

function defaultOptions(overrides: Partial<ReportOptions> = {}): ReportOptions {
  return {
    format: 'console',
    detailed: false,
    color: false,
    failuresOnly: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // createDefaultOptions
  // =========================================================================
  describe('createDefaultOptions', () => {
    it('should return console format by default', () => {
      const opts = HealthReporter.createDefaultOptions();
      expect(opts.format).toBe('console');
    });

    it('should default color to true', () => {
      const opts = HealthReporter.createDefaultOptions();
      expect(opts.color).toBe(true);
    });

    it('should default detailed to false', () => {
      const opts = HealthReporter.createDefaultOptions();
      expect(opts.detailed).toBe(false);
    });

    it('should default failuresOnly to false', () => {
      const opts = HealthReporter.createDefaultOptions();
      expect(opts.failuresOnly).toBe(false);
    });

    it('should not include outputPath by default', () => {
      const opts = HealthReporter.createDefaultOptions();
      expect(opts.outputPath).toBeUndefined();
    });

    it('should accept a custom format parameter', () => {
      expect(HealthReporter.createDefaultOptions('markdown').format).toBe('markdown');
      expect(HealthReporter.createDefaultOptions('json').format).toBe('json');
      expect(HealthReporter.createDefaultOptions('junit').format).toBe('junit');
    });
  });

  // =========================================================================
  // generateReport - dispatch & file output
  // =========================================================================
  describe('generateReport', () => {
    it('should dispatch to console formatter by default', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'console' }),
      );
      // Console reports contain the header
      expect(report).toContain('Hook Health Check');
    });

    it('should dispatch to markdown formatter', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('# ');
    });

    it('should dispatch to json formatter', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'json' }),
      );
      const parsed = JSON.parse(report);
      expect(parsed.totalHooks).toBe(3);
    });

    it('should dispatch to junit formatter', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('<?xml');
      expect(report).toContain('<testsuite');
    });

    it('should fall back to console for unknown format', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'unknown' as any }),
      );
      expect(report).toContain('Hook Health Check');
    });

    it('should write report to file when outputPath is set', async () => {
      const opts = defaultOptions({ outputPath: '/tmp/report.txt' });
      const report = await HealthReporter.generateReport(makeHealthyResult(), opts);
      expect(mockWriteFile).toHaveBeenCalledWith('/tmp/report.txt', report, 'utf-8');
    });

    it('should not write file when outputPath is absent', async () => {
      await HealthReporter.generateReport(makeHealthyResult(), defaultOptions());
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should return the report string regardless of file writing', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ outputPath: '/tmp/out.txt' }),
      );
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Console format
  // =========================================================================
  describe('Console format', () => {
    it('should include the header line', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Hook Health Check');
    });

    it('should show healthy status icon and message', async () => {
      const result = makeHealthyResult();
      const report = await HealthReporter.generateReport(result, defaultOptions());
      expect(report).toContain('All hooks healthy');
    });

    it('should show degraded status icon', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions(),
      );
      expect(report).toContain('Some hooks need attention');
    });

    it('should show unhealthy status icon', async () => {
      const report = await HealthReporter.generateReport(
        makeUnhealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Critical failures detected');
    });

    it('should list all hooks when failuresOnly is false', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ failuresOnly: false }),
      );
      expect(report).toContain('update-ac-status');
      expect(report).toContain('tdd-enforcement');
      expect(report).toContain('validate-spec');
    });

    it('should list only failed hooks when failuresOnly is true', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ failuresOnly: true }),
      );
      expect(report).toContain('validate-spec');
      expect(report).not.toContain('update-ac-status');
      expect(report).not.toContain('tdd-enforcement');
    });

    it('should show summary stats with total hooks count', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Total Hooks: 3');
    });

    it('should show passed count', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Passed: 3');
    });

    it('should show failed count when failures exist', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions(),
      );
      expect(report).toContain('Failed: 1');
    });

    it('should not show failed line when there are zero failures', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).not.toContain('Failed:');
    });

    it('should show critical count when critical failures exist', async () => {
      const report = await HealthReporter.generateReport(
        makeUnhealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Critical: 2');
    });

    it('should show total execution time', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Total Time: 87ms');
    });

    it('should show recommendations when present', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions(),
      );
      expect(report).toContain('Recommendations');
      expect(report).toContain('Fix spec.md path resolution');
      expect(report).toContain('Run specweave check-hooks --fix');
    });

    it('should not show recommendations section when empty', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).not.toContain('Recommendations');
    });

    it('should show slow hooks section when present', async () => {
      const report = await HealthReporter.generateReport(
        makeResultWithSlowHooks(),
        defaultOptions(),
      );
      expect(report).toContain('Slow Hooks');
      expect(report).toContain('slow-hook (5200ms)');
      expect(report).toContain('very-slow-hook (12000ms)');
    });

    it('should not show slow hooks section when empty', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).not.toContain('Slow Hooks');
    });

    it('should show execution time per hook', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('(42ms)');
      expect(report).toContain('(15ms)');
      expect(report).toContain('(30ms)');
    });

    // -- Color tests ---
    it('should include ANSI codes when color is enabled', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ color: true }),
      );
      // Bold ANSI code for header
      expect(report).toContain('\x1b[1m');
      // Reset ANSI code
      expect(report).toContain('\x1b[0m');
    });

    it('should not include ANSI codes when color is disabled', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ color: false }),
      );
      expect(report).not.toContain('\x1b[');
    });

    // -- Detailed mode ---
    it('should show error messages in detailed mode for failed hooks', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ detailed: true }),
      );
      expect(report).toContain('spec.md not found in increment directory');
    });

    it('should show suggestions in detailed mode', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ detailed: true }),
      );
      expect(report).toContain('Run specweave init to create spec.md');
    });

    it('should show warnings in detailed mode', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ detailed: true }),
      );
      expect(report).toContain('Missing AC definitions');
    });

    it('should not show error details when detailed is false', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ detailed: false }),
      );
      // The inline error message should not appear, only the hook status line
      expect(report).not.toContain('Suggestion:');
    });

    it('should include Last Check timestamp', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions(),
      );
      expect(report).toContain('Last Check:');
    });
  });

  // =========================================================================
  // Markdown format
  // =========================================================================
  describe('Markdown format', () => {
    it('should start with a level-1 heading', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('# ');
      expect(report).toContain('Hook Health Check Report');
    });

    it('should include overall health with emoji for healthy', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('HEALTHY');
    });

    it('should include overall health with emoji for degraded', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('DEGRADED');
    });

    it('should include overall health with emoji for unhealthy', async () => {
      const report = await HealthReporter.generateReport(
        makeUnhealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('UNHEALTHY');
    });

    it('should include Summary section with stats', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('## Summary');
      expect(report).toContain('**Total Hooks**: 3');
      expect(report).toContain('**Passed**: ');
      expect(report).toContain('**Failed**: ');
    });

    it('should include Hook Results section with table header', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('## Hook Results');
      expect(report).toContain('| Hook | Plugin | Status | Time (ms) | Errors | Warnings |');
      expect(report).toContain('|------|--------|--------|-----------|--------|----------|');
    });

    it('should include table rows for each hook result', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('| update-ac-status | specweave |');
      expect(report).toContain('| tdd-enforcement | specweave |');
      expect(report).toContain('| living-specs | specweave |');
    });

    it('should show Pass/Fail status in table rows', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('Pass');
      expect(report).toContain('Fail');
    });

    it('should include Failures Detail section for failed hooks', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('## Failures Detail');
      expect(report).toContain('### ');
      expect(report).toContain('validate-spec');
    });

    it('should not include Failures Detail section when all pass', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).not.toContain('## Failures Detail');
    });

    it('should include error messages in failure details', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('**Error**: spec.md not found in increment directory');
    });

    it('should include suggestions in failure details', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('**Suggestion**: Run specweave init to create spec.md');
    });

    it('should include Recommendations section when present', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('Recommendations');
      expect(report).toContain('- Fix spec.md path resolution');
    });

    it('should not include Recommendations section when empty', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).not.toContain('Recommendations');
    });

    it('should include execution time in summary', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('**Total Time**: 87ms');
    });
  });

  // =========================================================================
  // JSON format
  // =========================================================================
  describe('JSON format', () => {
    it('should produce valid JSON output', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'json' }),
      );
      expect(() => JSON.parse(report)).not.toThrow();
    });

    it('should contain all top-level result fields', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'json' }),
      );
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('totalHooks');
      expect(parsed).toHaveProperty('passedHooks');
      expect(parsed).toHaveProperty('failedHooks');
      expect(parsed).toHaveProperty('criticalFailures');
      expect(parsed).toHaveProperty('overallHealth');
      expect(parsed).toHaveProperty('results');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('totalExecutionTime');
      expect(parsed).toHaveProperty('projectRoot');
    });

    it('should preserve numeric values', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'json' }),
      );
      const parsed = JSON.parse(report);
      expect(parsed.totalHooks).toBe(3);
      expect(parsed.passedHooks).toBe(3);
      expect(parsed.failedHooks).toBe(0);
      expect(parsed.totalExecutionTime).toBe(87);
    });

    it('should preserve hook execution results array', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'json' }),
      );
      const parsed = JSON.parse(report);
      expect(parsed.results).toHaveLength(3);
      expect(parsed.results[2].success).toBe(false);
      expect(parsed.results[2].errors).toHaveLength(1);
    });

    it('should use 2-space indentation (pretty-printed)', async () => {
      const result = makeHealthyResult();
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'json' }),
      );
      const expected = JSON.stringify(result, null, 2);
      expect(report).toBe(expected);
    });
  });

  // =========================================================================
  // JUnit format
  // =========================================================================
  describe('JUnit format', () => {
    it('should start with XML declaration', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it('should contain testsuite element', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('<testsuite name="Hook Health Check"');
      expect(report).toContain('</testsuite>');
    });

    it('should include tests count attribute', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('tests="3"');
    });

    it('should include failures count attribute', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('failures="1"');
    });

    it('should include time attribute in seconds on testsuite', async () => {
      const result = makeHealthyResult({ totalExecutionTime: 1500 });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('time="1.5"');
    });

    it('should contain testcase elements for each hook', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('<testcase name="update-ac-status"');
      expect(report).toContain('<testcase name="tdd-enforcement"');
      expect(report).toContain('<testcase name="living-specs"');
    });

    it('should include classname attribute with plugin name', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('classname="specweave"');
    });

    it('should include time attribute in seconds on testcase', async () => {
      const result = makeHealthyResult({
        results: [makeHookResult({ executionTime: 250 })],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('time="0.25"');
    });

    it('should include failure elements for failed hooks', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('<failure message=');
      expect(report).toContain('</failure>');
    });

    it('should not include failure elements for passing hooks', async () => {
      const report = await HealthReporter.generateReport(
        makeHealthyResult(),
        defaultOptions({ format: 'junit' }),
      );
      expect(report).not.toContain('<failure');
    });

    it('should escape XML special characters in error messages', async () => {
      const result = makeDegradedResult();
      result.results[2] = makeFailedHookResult({
        errors: [
          {
            type: 'runtime',
            message: 'Error: <module> not found & "path" is \'invalid\'',
            suggestion: 'Check <path> & fix "quotes"',
            fixable: false,
          },
        ],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('&lt;module&gt;');
      expect(report).toContain('&amp;');
      expect(report).toContain('&quot;path&quot;');
      expect(report).toContain('&apos;invalid&apos;');
    });

    it('should escape ampersands in suggestion text', async () => {
      const result = makeHealthyResult({
        results: [
          makeFailedHookResult({
            errors: [
              {
                type: 'runtime',
                message: 'failed',
                suggestion: 'Use A & B',
                fixable: false,
              },
            ],
          }),
        ],
        failedHooks: 1,
        passedHooks: 0,
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('A &amp; B');
    });

    it('should handle errors without suggestions', async () => {
      const result = makeHealthyResult({
        results: [
          makeFailedHookResult({
            errors: [
              {
                type: 'runtime',
                message: 'Unexpected error',
                fixable: false,
              },
            ],
          }),
        ],
        failedHooks: 1,
        passedHooks: 0,
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('<failure message="Unexpected error">');
    });

    it('should produce well-formed XML with closing tags', async () => {
      const report = await HealthReporter.generateReport(
        makeDegradedResult(),
        defaultOptions({ format: 'junit' }),
      );
      // Every opened testcase should be closed
      const openCount = (report.match(/<testcase /g) || []).length;
      const closeCount = (report.match(/<\/testcase>/g) || []).length;
      expect(openCount).toBe(closeCount);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('should handle empty results array', async () => {
      const result = makeHealthyResult({
        totalHooks: 0,
        passedHooks: 0,
        results: [],
      });
      const report = await HealthReporter.generateReport(result, defaultOptions());
      expect(report).toContain('Total Hooks: 0');
    });

    it('should handle empty results in markdown format', async () => {
      const result = makeHealthyResult({
        totalHooks: 0,
        passedHooks: 0,
        results: [],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'markdown' }),
      );
      expect(report).toContain('**Total Hooks**: 0');
    });

    it('should handle empty results in junit format', async () => {
      const result = makeHealthyResult({
        totalHooks: 0,
        passedHooks: 0,
        results: [],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      expect(report).toContain('tests="0"');
      expect(report).toContain('</testsuite>');
    });

    it('should handle hooks with multiple errors in detailed console', async () => {
      const result = makeHealthyResult({
        failedHooks: 1,
        passedHooks: 2,
        results: [
          makeHookResult(),
          makeHookResult({ hook: 'tdd-enforcement' }),
          makeFailedHookResult({
            errors: [
              { type: 'runtime', message: 'Error one', fixable: false },
              { type: 'import', message: 'Error two', suggestion: 'Fix import', fixable: true },
            ],
          }),
        ],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ detailed: true }),
      );
      expect(report).toContain('Error one');
      expect(report).toContain('Error two');
      expect(report).toContain('Fix import');
    });

    it('should handle hooks with multiple errors in junit', async () => {
      const result = makeHealthyResult({
        failedHooks: 1,
        passedHooks: 0,
        totalHooks: 1,
        results: [
          makeFailedHookResult({
            errors: [
              { type: 'runtime', message: 'First failure', fixable: false },
              { type: 'timeout', message: 'Second failure', suggestion: 'Increase timeout', fixable: true },
            ],
          }),
        ],
      });
      const report = await HealthReporter.generateReport(
        result,
        defaultOptions({ format: 'junit' }),
      );
      const failureCount = (report.match(/<failure /g) || []).length;
      expect(failureCount).toBe(2);
    });
  });
});

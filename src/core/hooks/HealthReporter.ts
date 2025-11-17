/**
 * Health Reporter
 *
 * Formats and outputs hook health check results.
 * Supports multiple formats: console, markdown, JSON, JUnit XML.
 *
 * Part of increment 0037: Hook Health Check System
 */

import * as fs from 'fs-extra';
import {
  HealthCheckResult,
  ReportOptions,
  ReportFormat,
  HookExecutionResult
} from './types.js';

/**
 * Health Reporter - Formats and outputs results
 */
export class HealthReporter {
  /**
   * Generate report in specified format
   */
  static async generateReport(
    result: HealthCheckResult,
    options: ReportOptions
  ): Promise<string> {
    let report: string;

    switch (options.format) {
      case 'console':
        report = this.formatConsoleReport(result, options);
        break;
      case 'markdown':
        report = this.formatMarkdownReport(result, options);
        break;
      case 'json':
        report = this.formatJsonReport(result);
        break;
      case 'junit':
        report = this.formatJUnitReport(result);
        break;
      default:
        report = this.formatConsoleReport(result, options);
    }

    // Write to file if outputPath specified
    if (options.outputPath) {
      await fs.writeFile(options.outputPath, report, 'utf-8');
    }

    return report;
  }

  /**
   * Format console output with colors
   */
  private static formatConsoleReport(
    result: HealthCheckResult,
    options: ReportOptions
  ): string {
    const lines: string[] = [];
    const { color, failuresOnly, detailed } = options;

    // Header
    lines.push('');
    lines.push(this.colorize('🏥 Hook Health Check', 'bold', color));
    lines.push(this.colorize('═'.repeat(60), 'dim', color));
    lines.push('');

    // Overall status
    const statusIcon = result.overallHealth === 'healthy' ? '✅' : result.overallHealth === 'degraded' ? '⚠️' : '❌';
    const statusColor = result.overallHealth === 'healthy' ? 'green' : result.overallHealth === 'degraded' ? 'yellow' : 'red';

    lines.push(this.colorize(`${statusIcon} ${result.summary.message}`, statusColor, color));
    lines.push('');

    // Hook results
    const resultsToShow = failuresOnly
      ? result.results.filter(r => !r.success)
      : result.results;

    if (resultsToShow.length > 0) {
      lines.push(this.colorize('Hooks Checked:', 'bold', color));

      for (const hookResult of resultsToShow) {
        lines.push(this.formatHookResult(hookResult, detailed, color));
      }

      lines.push('');
    }

    // Summary stats
    lines.push(this.colorize('Summary:', 'bold', color));
    lines.push(`  Total Hooks: ${result.totalHooks}`);
    lines.push(`  ${this.colorize(`✅ Passed: ${result.passedHooks}`, 'green', color)}`);

    if (result.failedHooks > 0) {
      lines.push(`  ${this.colorize(`❌ Failed: ${result.failedHooks}`, 'red', color)}`);
    }

    if (result.criticalFailures > 0) {
      lines.push(`  ${this.colorize(`🚨 Critical: ${result.criticalFailures}`, 'red', color)}`);
    }

    lines.push(`  ⏱️  Total Time: ${result.totalExecutionTime}ms`);
    lines.push('');

    // Recommendations
    if (result.summary.recommendations.length > 0) {
      lines.push(this.colorize('💡 Recommendations:', 'bold', color));
      for (const rec of result.summary.recommendations) {
        lines.push(`  • ${rec}`);
      }
      lines.push('');
    }

    // Performance issues
    if (result.summary.slowHooks.length > 0) {
      lines.push(this.colorize('🐌 Slow Hooks:', 'yellow', color));
      for (const slowHook of result.summary.slowHooks) {
        const hookResult = result.results.find(r => r.hook === slowHook);
        if (hookResult) {
          lines.push(`  • ${slowHook} (${hookResult.executionTime}ms)`);
        }
      }
      lines.push('');
    }

    // Footer
    lines.push(this.colorize(`Last Check: ${new Date(result.timestamp).toLocaleString()}`, 'dim', color));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format single hook result for console
   */
  private static formatHookResult(
    result: HookExecutionResult,
    detailed: boolean,
    color: boolean
  ): string {
    const icon = result.success ? '✅' : '❌';
    const hookColor = result.success ? 'green' : 'red';
    const hookLine = `  ${icon} ${result.plugin}/${result.hook} (${result.executionTime}ms)`;

    if (!detailed || result.success) {
      return this.colorize(hookLine, hookColor, color);
    }

    // Detailed error output
    const lines: string[] = [this.colorize(hookLine, hookColor, color)];

    for (const error of result.errors) {
      lines.push(`     ${this.colorize('Error:', 'red', color)} ${error.message}`);
      if (error.suggestion) {
        lines.push(`     ${this.colorize('💡 Suggestion:', 'yellow', color)} ${error.suggestion}`);
      }
    }

    for (const warning of result.warnings) {
      lines.push(`     ${this.colorize('⚠️  Warning:', 'yellow', color)} ${warning.message}`);
    }

    return lines.join('\n');
  }

  /**
   * Format markdown report
   */
  private static formatMarkdownReport(
    result: HealthCheckResult,
    options: ReportOptions
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('# 🏥 Hook Health Check Report');
    lines.push('');
    lines.push(`**Generated**: ${new Date(result.timestamp).toLocaleString()}`);
    lines.push(`**Overall Health**: ${this.healthToEmoji(result.overallHealth)} ${result.overallHealth.toUpperCase()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Hooks**: ${result.totalHooks}`);
    lines.push(`- **Passed**: ✅ ${result.passedHooks}`);
    lines.push(`- **Failed**: ❌ ${result.failedHooks}`);
    lines.push(`- **Critical Failures**: 🚨 ${result.criticalFailures}`);
    lines.push(`- **Total Time**: ${result.totalExecutionTime}ms`);
    lines.push('');

    // Hook Results Table
    lines.push('## Hook Results');
    lines.push('');
    lines.push('| Hook | Plugin | Status | Time (ms) | Errors | Warnings |');
    lines.push('|------|--------|--------|-----------|--------|----------|');

    for (const hookResult of result.results) {
      const status = hookResult.success ? '✅ Pass' : '❌ Fail';
      const errors = hookResult.errors.length;
      const warnings = hookResult.warnings.length;

      lines.push(`| ${hookResult.hook} | ${hookResult.plugin} | ${status} | ${hookResult.executionTime} | ${errors} | ${warnings} |`);
    }

    lines.push('');

    // Failures Detail
    const failures = result.results.filter(r => !r.success);
    if (failures.length > 0) {
      lines.push('## Failures Detail');
      lines.push('');

      for (const failure of failures) {
        lines.push(`### ❌ ${failure.hook}`);
        lines.push('');

        for (const error of failure.errors) {
          lines.push(`**Error**: ${error.message}`);
          if (error.suggestion) {
            lines.push(`💡 **Suggestion**: ${error.suggestion}`);
          }
          lines.push('');
        }
      }
    }

    // Recommendations
    if (result.summary.recommendations.length > 0) {
      lines.push('## 💡 Recommendations');
      lines.push('');

      for (const rec of result.summary.recommendations) {
        lines.push(`- ${rec}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format JSON report
   */
  private static formatJsonReport(result: HealthCheckResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Format JUnit XML report (for CI/CD)
   */
  private static formatJUnitReport(result: HealthCheckResult): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<testsuite name="Hook Health Check" tests="${result.totalHooks}" failures="${result.failedHooks}" time="${result.totalExecutionTime / 1000}">`);

    for (const hookResult of result.results) {
      lines.push(`  <testcase name="${hookResult.hook}" classname="${hookResult.plugin}" time="${hookResult.executionTime / 1000}">`);

      if (!hookResult.success) {
        for (const error of hookResult.errors) {
          lines.push(`    <failure message="${this.escapeXml(error.message)}">`);
          lines.push(`      ${this.escapeXml(error.suggestion || '')}`);
          lines.push(`    </failure>`);
        }
      }

      lines.push('  </testcase>');
    }

    lines.push('</testsuite>');

    return lines.join('\n');
  }

  /**
   * Colorize text for console output
   */
  private static colorize(text: string, color: string, enabled: boolean): string {
    if (!enabled) {
      return text;
    }

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      reset: '\x1b[0m'
    };

    const colorCode = colors[color] || '';
    const resetCode = colors.reset;

    return `${colorCode}${text}${resetCode}`;
  }

  /**
   * Convert health status to emoji
   */
  private static healthToEmoji(health: string): string {
    const emojiMap: Record<string, string> = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🔴'
    };

    return emojiMap[health] || '⚪';
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Create default report options
   */
  static createDefaultOptions(format: ReportFormat = 'console'): ReportOptions {
    return {
      format,
      detailed: false,
      color: true,
      failuresOnly: false
    };
  }
}

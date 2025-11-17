/**
 * Hook Health Checker
 *
 * Main orchestrator for hook health monitoring system.
 * Coordinates scanning, execution, validation, and reporting.
 *
 * Part of increment 0037: Hook Health Check System
 */

import { HookScanner } from './HookScanner.js';
import { HookExecutor } from './HookExecutor.js';
import {
  HookDefinition,
  HealthCheckResult,
  HealthCheckConfig,
  HealthSummary,
  HookExecutionResult
} from './types.js';

/**
 * Hook Health Checker - Main orchestrator
 */
export class HookHealthChecker {
  private config: HealthCheckConfig;
  private scanner: HookScanner;
  private executor: HookExecutor;

  constructor(config: HealthCheckConfig) {
    this.config = config;

    // Initialize scanner
    const scannerConfig = {
      projectRoot: config.projectRoot,
      pluginDirs: [] as string[],  // Will be populated by findPluginDirectories
      includeNonTestable: !config.criticalOnly
    };
    this.scanner = new HookScanner(scannerConfig);

    // Initialize executor
    const executorConfig = {
      timeout: config.timeout,
      captureStdout: true,
      captureStderr: true,
      testIncrementId: '__health-check-test__'
    };
    this.executor = new HookExecutor(executorConfig);
  }

  /**
   * Run full health check on all hooks
   */
  async checkAllHooks(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // 1. Discover all hooks
    const pluginDirs = await HookScanner.findPluginDirectories(this.config.projectRoot);
    (this.scanner as any).config.pluginDirs = pluginDirs;

    let allHooks = await this.scanner.scanHooks();

    // 2. Filter hooks if needed
    if (this.config.criticalOnly) {
      allHooks = allHooks.filter(h => h.critical);
    }

    if (this.config.hooksToCheck.length > 0) {
      allHooks = allHooks.filter(h => this.config.hooksToCheck.includes(h.name));
    }

    // 3. Execute all hooks
    const results: HookExecutionResult[] = [];

    for (const hook of allHooks) {
      if (!hook.testable && !this.config.verbose) {
        continue; // Skip non-testable hooks in non-verbose mode
      }

      const result = await this.executor.executeHook(hook);
      results.push(result);
    }

    // 4. Calculate overall health
    const totalExecutionTime = Date.now() - startTime;
    const overallHealth = this.calculateOverallHealth(results);
    const summary = this.generateSummary(results);

    return {
      timestamp: new Date().toISOString(),
      totalHooks: results.length,
      passedHooks: results.filter(r => r.success).length,
      failedHooks: results.filter(r => !r.success).length,
      criticalFailures: results.filter(r => !r.success && this.isHookCritical(r.hook, allHooks)).length,
      overallHealth,
      results,
      summary,
      totalExecutionTime,
      projectRoot: this.config.projectRoot
    };
  }

  /**
   * Check specific hook by name
   */
  async checkHook(hookName: string): Promise<HookExecutionResult | null> {
    const pluginDirs = await HookScanner.findPluginDirectories(this.config.projectRoot);
    (this.scanner as any).config.pluginDirs = pluginDirs;

    const allHooks = await this.scanner.scanHooks();
    const hook = allHooks.find(h => h.name === hookName);

    if (!hook) {
      return null;
    }

    return await this.executor.executeHook(hook);
  }

  /**
   * Get all discovered hooks
   */
  async scanHooks(): Promise<HookDefinition[]> {
    const pluginDirs = await HookScanner.findPluginDirectories(this.config.projectRoot);
    (this.scanner as any).config.pluginDirs = pluginDirs;

    return await this.scanner.scanHooks();
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(results: HookExecutionResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (results.length === 0) {
      return 'healthy'; // No hooks to check
    }

    const failedCount = results.filter(r => !r.success).length;
    const total = results.length;
    const failureRate = failedCount / total;

    // Check for critical failures
    const criticalFailures = results.filter(r => !r.success && this.isResultCritical(r));

    if (criticalFailures.length > 0) {
      return 'unhealthy'; // Any critical failure = unhealthy
    }

    if (failureRate > 0.3) {
      return 'degraded'; // >30% failure rate = degraded
    }

    if (failureRate > 0) {
      return 'degraded'; // Any failures = degraded
    }

    return 'healthy';
  }

  /**
   * Check if result is for a critical hook
   */
  private isResultCritical(result: HookExecutionResult): boolean {
    const criticalHooks = ['post-task-completion', 'user-prompt-submit'];
    return criticalHooks.includes(result.hook);
  }

  /**
   * Check if hook name is critical
   */
  private isHookCritical(hookName: string, allHooks: HookDefinition[]): boolean {
    const hook = allHooks.find(h => h.name === hookName);
    return hook?.critical || false;
  }

  /**
   * Generate health summary with recommendations
   */
  private generateSummary(results: HookExecutionResult[]): HealthSummary {
    const failedResults = results.filter(r => !r.success);
    const fixableIssues = failedResults.filter(r =>
      r.errors.some(e => e.fixable)
    ).length;
    const manualIssues = failedResults.length - fixableIssues;

    const recommendations: string[] = [];
    const slowHooks: string[] = [];
    const criticalHooksFailed: string[] = [];

    // Analyze results and generate recommendations
    for (const result of results) {
      // Performance issues
      if (result.performanceIssue) {
        slowHooks.push(result.hook);
        recommendations.push(`Optimize ${result.hook} (${result.executionTime}ms)`);
      }

      // Failures
      if (!result.success) {
        if (this.isResultCritical(result)) {
          criticalHooksFailed.push(result.hook);
        }

        // Generate specific recommendations from errors
        for (const error of result.errors) {
          if (error.suggestion) {
            recommendations.push(`${result.hook}: ${error.suggestion}`);
          }
        }
      }
    }

    // Add auto-fix recommendation if applicable
    if (fixableIssues > 0) {
      recommendations.unshift(`Run with --fix to automatically repair ${fixableIssues} issue(s)`);
    }

    // Determine overall status
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = '';

    if (criticalHooksFailed.length > 0) {
      status = 'fail';
      message = `${criticalHooksFailed.length} critical hook(s) failed: ${criticalHooksFailed.join(', ')}`;
    } else if (failedResults.length > 0) {
      status = 'warn';
      message = `${failedResults.length} hook(s) failed (non-critical)`;
    } else if (slowHooks.length > 0) {
      status = 'warn';
      message = `${slowHooks.length} hook(s) have performance issues`;
    } else {
      status = 'pass';
      message = 'All hooks are healthy';
    }

    return {
      status,
      message,
      recommendations,
      fixableIssues,
      manualIssues,
      slowHooks,
      criticalHooksFailed
    };
  }

  /**
   * Create default health check config
   */
  static createDefaultConfig(projectRoot: string): HealthCheckConfig {
    return {
      projectRoot,
      timeout: 5000,
      autoFix: false,
      verbose: false,
      criticalOnly: false,
      hooksToCheck: [],
      performanceThreshold: 2.0,
      failOnWarnings: false
    };
  }
}

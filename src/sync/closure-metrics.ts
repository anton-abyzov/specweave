/**
 * Closure Metrics - Telemetry for External Tool Sync Operations (v0.34.0)
 *
 * Tracks closure success/failure rates for GitHub, JIRA, and ADO.
 * Persists metrics to .specweave/state/closure-metrics.json
 *
 * Usage:
 *   const metrics = new ClosureMetrics(projectRoot);
 *   metrics.recordClosure('github', 100, true); // Success
 *   metrics.recordClosure('jira', 'TEST-123', false, 'Rate limited'); // Failure
 *   metrics.getSummary(); // Get aggregated stats
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';

export type ExternalTool = 'github' | 'jira' | 'ado';

export interface ClosureRecord {
  tool: ExternalTool;
  itemId: string | number;
  incrementId: string;
  success: boolean;
  error?: string;
  timestamp: string;
  durationMs?: number;
}

export interface ToolMetrics {
  totalAttempts: number;
  successful: number;
  failed: number;
  successRate: number;
  lastSuccess?: string;
  lastFailure?: string;
  avgDurationMs?: number;
  recentErrors: string[];
}

export interface ClosureMetricsSummary {
  github: ToolMetrics;
  jira: ToolMetrics;
  ado: ToolMetrics;
  overall: {
    totalAttempts: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  lastUpdated: string;
}

interface PersistedMetrics {
  version: number;
  records: ClosureRecord[];
  summary: ClosureMetricsSummary;
}

const METRICS_VERSION = 1;
const MAX_RECORDS = 1000; // Keep last 1000 records
const MAX_RECENT_ERRORS = 10; // Keep last 10 errors per tool

export class ClosureMetrics {
  private projectRoot: string;
  private metricsFile: string;
  private logger: Logger;
  private currentIncrementId: string;
  private operationStartTime: number = 0;

  constructor(options: {
    projectRoot: string;
    incrementId?: string;
    logger?: Logger;
  }) {
    this.projectRoot = options.projectRoot;
    this.currentIncrementId = options.incrementId || 'unknown';
    this.logger = options.logger || consoleLogger;

    const stateDir = join(this.projectRoot, '.specweave/state');
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }
    this.metricsFile = join(stateDir, 'closure-metrics.json');
  }

  /**
   * Start timing an operation
   */
  startOperation(): void {
    this.operationStartTime = Date.now();
  }

  /**
   * Record a closure operation result
   */
  recordClosure(
    tool: ExternalTool,
    itemId: string | number,
    success: boolean,
    error?: string
  ): void {
    const durationMs = this.operationStartTime > 0
      ? Date.now() - this.operationStartTime
      : undefined;

    const record: ClosureRecord = {
      tool,
      itemId,
      incrementId: this.currentIncrementId,
      success,
      error,
      timestamp: new Date().toISOString(),
      durationMs,
    };

    const metrics = this.loadMetrics();
    metrics.records.push(record);

    // Trim to max records
    if (metrics.records.length > MAX_RECORDS) {
      metrics.records = metrics.records.slice(-MAX_RECORDS);
    }

    // Update summary
    this.updateSummary(metrics);

    this.saveMetrics(metrics);

    // Reset timer
    this.operationStartTime = 0;
  }

  /**
   * Record multiple closures in batch
   */
  recordBatch(
    tool: ExternalTool,
    results: Array<{ itemId: string | number; success: boolean; error?: string }>
  ): void {
    const metrics = this.loadMetrics();

    for (const result of results) {
      const record: ClosureRecord = {
        tool,
        itemId: result.itemId,
        incrementId: this.currentIncrementId,
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
      metrics.records.push(record);
    }

    // Trim to max records
    if (metrics.records.length > MAX_RECORDS) {
      metrics.records = metrics.records.slice(-MAX_RECORDS);
    }

    this.updateSummary(metrics);
    this.saveMetrics(metrics);
  }

  /**
   * Get metrics summary
   */
  getSummary(): ClosureMetricsSummary {
    const metrics = this.loadMetrics();
    return metrics.summary;
  }

  /**
   * Get recent failures for alerting
   */
  getRecentFailures(hours: number = 24): ClosureRecord[] {
    const metrics = this.loadMetrics();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    return metrics.records.filter(
      r => !r.success && r.timestamp >= cutoff
    );
  }

  /**
   * Check if failure rate exceeds threshold (for alerting)
   */
  isFailureRateHigh(tool: ExternalTool, threshold: number = 0.2): boolean {
    const summary = this.getSummary();
    const toolMetrics = summary[tool];

    // Only alert if we have enough data (at least 5 attempts)
    if (toolMetrics.totalAttempts < 5) {
      return false;
    }

    const failureRate = 1 - toolMetrics.successRate;
    return failureRate > threshold;
  }

  /**
   * Format summary for display
   */
  formatSummary(): string {
    const summary = this.getSummary();
    const lines: string[] = [];

    lines.push('📊 Closure Sync Metrics');
    lines.push('═══════════════════════════════════════');

    const formatTool = (name: string, metrics: ToolMetrics): string[] => {
      const result: string[] = [];
      if (metrics.totalAttempts === 0) {
        result.push(`  ${name}: No data`);
        return result;
      }

      const successPct = (metrics.successRate * 100).toFixed(1);
      const statusIcon = metrics.successRate >= 0.9 ? '✅' : metrics.successRate >= 0.7 ? '⚠️' : '❌';

      result.push(`  ${name}: ${statusIcon} ${successPct}% success (${metrics.successful}/${metrics.totalAttempts})`);

      if (metrics.avgDurationMs) {
        result.push(`       Avg duration: ${metrics.avgDurationMs.toFixed(0)}ms`);
      }

      if (metrics.lastFailure && metrics.recentErrors.length > 0) {
        result.push(`       Last error: ${metrics.recentErrors[0]}`);
      }

      return result;
    };

    lines.push(...formatTool('GitHub', summary.github));
    lines.push(...formatTool('JIRA  ', summary.jira));
    lines.push(...formatTool('ADO   ', summary.ado));

    lines.push('───────────────────────────────────────');

    const overallPct = (summary.overall.successRate * 100).toFixed(1);
    lines.push(`  Overall: ${overallPct}% success (${summary.overall.successful}/${summary.overall.totalAttempts})`);
    lines.push(`  Last updated: ${summary.lastUpdated}`);

    return lines.join('\n');
  }

  /**
   * Reset metrics (for testing or fresh start)
   */
  reset(): void {
    const metrics = this.createEmptyMetrics();
    this.saveMetrics(metrics);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private loadMetrics(): PersistedMetrics {
    if (!existsSync(this.metricsFile)) {
      return this.createEmptyMetrics();
    }

    try {
      const content = readFileSync(this.metricsFile, 'utf-8');
      const metrics = JSON.parse(content) as PersistedMetrics;

      // Version migration if needed
      if (metrics.version !== METRICS_VERSION) {
        this.logger.log('📊 Migrating metrics to new version...');
        return this.createEmptyMetrics();
      }

      return metrics;
    } catch (error) {
      this.logger.log(`⚠️ Failed to load metrics: ${error}`);
      return this.createEmptyMetrics();
    }
  }

  private saveMetrics(metrics: PersistedMetrics): void {
    try {
      writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      this.logger.log(`⚠️ Failed to save metrics: ${error}`);
    }
  }

  private createEmptyMetrics(): PersistedMetrics {
    const emptyToolMetrics: ToolMetrics = {
      totalAttempts: 0,
      successful: 0,
      failed: 0,
      successRate: 1,
      recentErrors: [],
    };

    return {
      version: METRICS_VERSION,
      records: [],
      summary: {
        github: { ...emptyToolMetrics },
        jira: { ...emptyToolMetrics },
        ado: { ...emptyToolMetrics },
        overall: {
          totalAttempts: 0,
          successful: 0,
          failed: 0,
          successRate: 1,
        },
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  private updateSummary(metrics: PersistedMetrics): void {
    const tools: ExternalTool[] = ['github', 'jira', 'ado'];

    // Calculate per-tool metrics
    for (const tool of tools) {
      const toolRecords = metrics.records.filter(r => r.tool === tool);
      const successful = toolRecords.filter(r => r.success).length;
      const failed = toolRecords.filter(r => !r.success).length;
      const total = toolRecords.length;

      // Get durations for average calculation
      const durations = toolRecords
        .filter(r => r.durationMs !== undefined)
        .map(r => r.durationMs!);

      const avgDurationMs = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : undefined;

      // Get recent errors
      const recentErrors = toolRecords
        .filter(r => !r.success && r.error)
        .slice(-MAX_RECENT_ERRORS)
        .map(r => r.error!)
        .reverse();

      // Find last success/failure timestamps
      const lastSuccessRecord = toolRecords.filter(r => r.success).pop();
      const lastFailureRecord = toolRecords.filter(r => !r.success).pop();

      metrics.summary[tool] = {
        totalAttempts: total,
        successful,
        failed,
        successRate: total > 0 ? successful / total : 1,
        lastSuccess: lastSuccessRecord?.timestamp,
        lastFailure: lastFailureRecord?.timestamp,
        avgDurationMs,
        recentErrors,
      };
    }

    // Calculate overall metrics
    const allRecords = metrics.records;
    const totalSuccessful = allRecords.filter(r => r.success).length;
    const totalFailed = allRecords.filter(r => !r.success).length;
    const totalAttempts = allRecords.length;

    metrics.summary.overall = {
      totalAttempts,
      successful: totalSuccessful,
      failed: totalFailed,
      successRate: totalAttempts > 0 ? totalSuccessful / totalAttempts : 1,
    };

    metrics.summary.lastUpdated = new Date().toISOString();
  }
}

/**
 * Factory function for creating metrics instance
 */
export function createClosureMetrics(
  projectRoot: string,
  incrementId?: string,
  logger?: Logger
): ClosureMetrics {
  return new ClosureMetrics({ projectRoot, incrementId, logger });
}

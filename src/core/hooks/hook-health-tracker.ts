import { HookLogEntry } from './hook-logger.js';

export type HookStatus = 'OK' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';

export interface HookHealth {
  hookName: string;
  status: HookStatus;
  successRate: number;
  avgDuration: number;
  lastRun: string | null;
  totalExecutions: number;
  consecutiveFailures: number;
  recommendations: string[];
}

/**
 * Hook health tracking and analysis
 *
 * Analyzes hook execution logs to determine health status:
 * - OK: >90% success rate, no recent consecutive failures
 * - DEGRADED: 50-90% success rate OR 3+ warnings in last 10 executions
 * - FAILED: <50% success rate OR 3+ consecutive failures
 * - UNKNOWN: No execution data available
 *
 * @example
 * ```typescript
 * const tracker = new HookHealthTracker();
 * const logger = new HookLogger('.specweave/logs/hooks');
 * const logs = await logger.readLogs('session-start', 100);
 *
 * const health = tracker.analyze('session-start', logs);
 * console.log(`Status: ${health.status}`);
 * console.log(`Success rate: ${(health.successRate * 100).toFixed(1)}%`);
 * ```
 */
export class HookHealthTracker {
  private readonly WINDOW_HOURS = 24;
  private readonly DEGRADED_THRESHOLD = 0.5;
  private readonly OK_THRESHOLD = 0.9;
  private readonly CONSECUTIVE_FAILURE_THRESHOLD = 3;

  /**
   * Analyze hook health from execution logs
   *
   * @param hookName - Name of the hook
   * @param logs - Log entries (should be sorted by timestamp, most recent first)
   * @param referenceTime - Reference time for 24h window (default: now)
   * @returns Health analysis
   */
  analyze(hookName: string, logs: HookLogEntry[], referenceTime?: Date): HookHealth {
    if (logs.length === 0) {
      return {
        hookName,
        status: 'UNKNOWN',
        successRate: 0,
        avgDuration: 0,
        lastRun: null,
        totalExecutions: 0,
        consecutiveFailures: 0,
        recommendations: ['No execution data available']
      };
    }

    // Filter logs to 24h window
    const now = referenceTime || new Date();
    const windowStart = new Date(now.getTime() - this.WINDOW_HOURS * 60 * 60 * 1000);

    const recentLogs = logs
      .filter(log => {
        if (!log.timestamp) return false;
        const logTime = new Date(log.timestamp);
        return logTime >= windowStart && logTime <= now;
      })
      .sort((a, b) => {
        // Sort by timestamp descending (most recent first)
        const timeA = new Date(a.timestamp!).getTime();
        const timeB = new Date(b.timestamp!).getTime();
        return timeB - timeA;
      });

    if (recentLogs.length === 0) {
      return {
        hookName,
        status: 'UNKNOWN',
        successRate: 0,
        avgDuration: 0,
        lastRun: logs[0]?.timestamp || null,
        totalExecutions: 0,
        consecutiveFailures: 0,
        recommendations: ['No recent executions in last 24h']
      };
    }

    // Calculate metrics
    const successCount = recentLogs.filter(l => l.status === 'success').length;
    const successRate = successCount / recentLogs.length;

    const durations = recentLogs.filter(l => l.duration !== undefined).map(l => l.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const lastRun = recentLogs[0]?.timestamp || null;

    // Count consecutive failures (from most recent backwards)
    let consecutiveFailures = 0;
    for (const log of recentLogs) {
      if (log.status === 'error') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    // Determine status
    let status: HookStatus;
    if (consecutiveFailures >= this.CONSECUTIVE_FAILURE_THRESHOLD) {
      status = 'FAILED';
    } else if (successRate < this.DEGRADED_THRESHOLD) {
      status = 'FAILED';
    } else if (successRate < this.OK_THRESHOLD) {
      status = 'DEGRADED';
    } else {
      // Check for recent warnings
      const recentWarnings = recentLogs.slice(0, Math.min(10, recentLogs.length))
        .filter(l => l.status === 'warning').length;

      if (recentWarnings >= 3) {
        status = 'DEGRADED';
      } else {
        status = 'OK';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (status === 'FAILED') {
      recommendations.push('Run `specweave check-hooks` to diagnose issues');
      if (consecutiveFailures >= 3) {
        recommendations.push('Multiple consecutive failures detected');
      }
      recommendations.push('Check `.specweave/logs/hooks/${hookName}.log` for details');
    } else if (status === 'DEGRADED') {
      recommendations.push('Run `specweave check-hooks` to identify problems');
      if (avgDuration > 5000) {
        recommendations.push('Hook execution is slow (>5s) - may timeout');
      }
    }

    return {
      hookName,
      status,
      successRate,
      avgDuration: Math.round(avgDuration),
      lastRun,
      totalExecutions: recentLogs.length,
      consecutiveFailures,
      recommendations
    };
  }

  /**
   * Analyze health for multiple hooks
   *
   * @param hooks - Map of hook names to their log entries
   * @returns Array of health analyses
   */
  analyzeAll(hooks: Map<string, HookLogEntry[]>): HookHealth[] {
    const results: HookHealth[] = [];

    for (const [hookName, logs] of hooks.entries()) {
      results.push(this.analyze(hookName, logs));
    }

    return results.sort((a, b) => {
      // Sort by status severity, then by name
      const statusOrder = { FAILED: 0, DEGRADED: 1, OK: 2, UNKNOWN: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.hookName.localeCompare(b.hookName);
    });
  }
}

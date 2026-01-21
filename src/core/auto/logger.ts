/**
 * Auto Logger
 * Structured logging for auto sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutoLogEntry, SessionSummary, IncrementCompletionReport } from './types.js';
import { consoleLogger as baseLogger } from '../../utils/logger.js';
import { isSpecWeaveInitialized, ensureSpecWeaveDir } from '../../utils/fs-native.js';

const LOGS_DIR = '.specweave/logs';

export class AutoLogger {
  private projectRoot: string;
  private logsDir: string;
  private sessionId: string;
  private logFile: string;
  private entries: AutoLogEntry[] = [];
  private loggingEnabled: boolean;

  constructor(projectRoot: string, sessionId: string) {
    this.projectRoot = projectRoot;
    this.logsDir = path.join(projectRoot, LOGS_DIR);
    this.sessionId = sessionId;
    this.logFile = path.join(this.logsDir, `auto-${sessionId}.json`);
    // Only enable logging if SpecWeave is initialized (has config.json)
    this.loggingEnabled = this.ensureLogsDir();
  }

  private ensureLogsDir(): boolean {
    // CRITICAL: Only create logs dir if SpecWeave is properly initialized
    if (!isSpecWeaveInitialized(this.projectRoot)) {
      baseLogger.warn('AutoLogger: SpecWeave not initialized, logging disabled');
      return false;
    }
    return ensureSpecWeaveDir(this.logsDir, this.projectRoot);
  }

  /**
   * Log a session event
   */
  log(
    event: AutoLogEntry['event'],
    details: Record<string, unknown> = {}
  ): void {
    const entry: AutoLogEntry = {
      timestamp: new Date().toISOString(),
      iteration: this.getCurrentIteration(),
      sessionId: this.sessionId,
      event,
      details,
    };

    this.entries.push(entry);
    this.appendToFile(entry);

    // Also log to base logger for visibility
    const level = event === 'error' ? 'error' : event.includes('fail') ? 'warn' : 'info';
    baseLogger[level](`[Auto] ${event}: ${JSON.stringify(details)}`);
  }

  /**
   * Log session start
   */
  logStart(incrementQueue: string[]): void {
    this.log('start', {
      incrementQueue,
      queueLength: incrementQueue.length,
    });
  }

  /**
   * Log iteration start
   */
  logIteration(iteration: number, currentIncrement: string | null): void {
    this.log('iteration', {
      iteration,
      currentIncrement,
    });
  }

  /**
   * Log task completion
   */
  logTaskComplete(
    taskId: string,
    incrementId: string,
    result: {
      duration: number;
      testsRun?: number;
      testsPassed?: number;
      filesModified?: string[];
    }
  ): void {
    this.log('task_complete', {
      taskId,
      incrementId,
      ...result,
    });
  }

  /**
   * Log task failure
   */
  logTaskFailed(
    taskId: string,
    incrementId: string,
    error: string,
    attempt: number
  ): void {
    this.log('task_failed', {
      taskId,
      incrementId,
      error,
      attempt,
    });
  }

  /**
   * Log human gate triggered
   */
  logGateTriggered(operation: string, pattern: string): void {
    this.log('gate_triggered', {
      operation,
      pattern,
    });
  }

  /**
   * Log human gate approved
   */
  logGateApproved(operation: string): void {
    this.log('gate_approved', { operation });
  }

  /**
   * Log human gate blocked
   */
  logGateBlocked(operation: string, reason: string): void {
    this.log('gate_blocked', { operation, reason });
  }

  /**
   * Log circuit breaker state change
   */
  logCircuitOpen(service: string, failures: number): void {
    this.log('circuit_open', { service, failures });
  }

  /**
   * Log circuit breaker close
   */
  logCircuitClose(service: string): void {
    this.log('circuit_close', { service });
  }

  /**
   * Log sync operation
   */
  logSync(target: string, itemsCount: number, success: boolean): void {
    this.log('sync', {
      target,
      itemsCount,
      success,
    });
  }

  /**
   * Log session completion
   */
  logComplete(summary: Partial<SessionSummary>): void {
    this.log('complete', summary);
  }

  /**
   * Log session cancellation
   */
  logCancel(reason: string): void {
    this.log('cancel', { reason });
  }

  /**
   * Log error
   */
  logError(error: string, context?: Record<string, unknown>): void {
    this.log('error', { error, ...context });
  }

  /**
   * Get current iteration from entries
   */
  private getCurrentIteration(): number {
    const iterationEvents = this.entries.filter((e) => e.event === 'iteration');
    return iterationEvents.length;
  }

  /**
   * Append entry to log file
   */
  private appendToFile(entry: AutoLogEntry): void {
    if (!this.loggingEnabled) {
      return; // Skip file logging if SpecWeave not initialized
    }
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line, 'utf-8');
    } catch (error) {
      baseLogger.error(`Failed to append to auto log: ${error}`);
    }
  }

  /**
   * Load entries from existing log file
   */
  loadFromFile(): boolean {
    try {
      if (!fs.existsSync(this.logFile)) {
        return false;
      }

      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      this.entries = lines.map((line) => JSON.parse(line));
      return true;
    } catch (error) {
      baseLogger.error(`Failed to load auto log: ${error}`);
      return false;
    }
  }

  /**
   * Filter entries by event type
   */
  private filterByEvent(event: AutoLogEntry['event']): AutoLogEntry[] {
    return this.entries.filter((e) => e.event === event);
  }

  /**
   * Generate session summary from log entries
   */
  generateSummary(): SessionSummary {
    const startEntry = this.entries.find((e) => e.event === 'start');
    const completeEntry = this.entries.find((e) => e.event === 'complete' || e.event === 'cancel');
    const taskCompletes = this.filterByEvent('task_complete');
    const taskFails = this.filterByEvent('task_failed');

    const startTime = startEntry?.timestamp ?? new Date().toISOString();
    const endTime = completeEntry?.timestamp ?? new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

    // Calculate average coverage from task completions
    const coverages = taskCompletes
      .map((e) => e.details.coveragePercent as number | undefined)
      .filter((c): c is number => c !== undefined);
    const avgCoverage = coverages.length > 0
      ? coverages.reduce((a, b) => a + b, 0) / coverages.length
      : 0;

    return {
      sessionId: this.sessionId,
      startTime,
      endTime,
      duration: durationMs,
      iterations: this.filterByEvent('iteration').length,
      incrementsCompleted: new Set(taskCompletes.map((e) => e.details.incrementId as string)).size,
      incrementsFailed: new Set(taskFails.map((e) => e.details.incrementId as string)).size,
      totalTasks: taskCompletes.length + taskFails.length,
      totalTests: taskCompletes.reduce((sum, e) => sum + ((e.details.testsRun as number) ?? 0), 0),
      averageCoverage: Math.round(avgCoverage * 10) / 10,
      humanGatesTriggered: this.filterByEvent('gate_triggered').length,
      circuitBreakerTrips: this.filterByEvent('circuit_open').length,
      syncOperations: this.filterByEvent('sync').length,
      success: completeEntry?.event === 'complete',
      endReason: (completeEntry?.details?.reason as string) ?? 'unknown',
    };
  }

  /**
   * Generate increment completion report
   */
  generateIncrementReport(incrementId: string): IncrementCompletionReport | null {
    const incrementTasks = this.entries.filter(
      (e) =>
        (e.event === 'task_complete' || e.event === 'task_failed') &&
        e.details.incrementId === incrementId
    );

    if (incrementTasks.length === 0) {
      return null;
    }

    const taskCompletes = incrementTasks.filter((e) => e.event === 'task_complete');
    const taskFails = incrementTasks.filter((e) => e.event === 'task_failed');

    const firstTask = incrementTasks[0];
    const lastTask = incrementTasks[incrementTasks.length - 1];

    const startTime = firstTask.timestamp;
    const endTime = lastTask.timestamp;
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Calculate metrics
    const testsRun = taskCompletes.reduce(
      (sum, e) => sum + ((e.details.testsRun as number) ?? 0),
      0
    );
    const testsPassed = taskCompletes.reduce(
      (sum, e) => sum + ((e.details.testsPassed as number) ?? 0),
      0
    );

    const coverages = taskCompletes
      .map((e) => e.details.coveragePercent as number | undefined)
      .filter((c): c is number => c !== undefined);
    const avgCoverage = coverages.length > 0
      ? coverages.reduce((a, b) => a + b, 0) / coverages.length
      : 0;

    // Count gates and circuits for this increment
    const gatesTriggered = this.entries.filter(
      (e) => e.event === 'gate_triggered'
    ).length;
    const gatesApproved = this.entries.filter(
      (e) => e.event === 'gate_approved'
    ).length;
    const circuitTrips = this.entries.filter(
      (e) => e.event === 'circuit_open'
    ).length;
    const syncs = this.entries.filter((e) => e.event === 'sync').length;

    return {
      incrementId,
      sessionId: this.sessionId,
      startTime,
      endTime,
      duration: endDate.getTime() - startDate.getTime(),
      tasksCompleted: taskCompletes.length,
      tasksTotal: incrementTasks.length,
      testsPassed,
      testsTotal: testsRun,
      coveragePercent: Math.round(avgCoverage * 10) / 10,
      humanGatesTriggered: gatesTriggered,
      humanGatesApproved: gatesApproved,
      circuitBreakerTrips: circuitTrips,
      syncOperations: syncs,
      success: taskFails.length === 0,
      endReason: taskFails.length > 0 ? 'task_failures' : undefined,
    };
  }

  /**
   * Get all entries
   */
  getEntries(): AutoLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * Write summary to markdown file
   */
  writeSummaryMarkdown(summary: SessionSummary): string {
    if (!this.loggingEnabled) {
      baseLogger.info('AutoLogger: Summary not written (SpecWeave not initialized)');
      return '';
    }
    const summaryPath = path.join(this.logsDir, `auto-${this.sessionId}-summary.md`);

    const durationStr = formatDuration(summary.duration);
    const success = summary.success ? '✅ Success' : '❌ Failed';

    const content = `# Auto Session Summary

**Session ID**: ${summary.sessionId}
**Status**: ${success}
**End Reason**: ${summary.endReason}

## Timeline

| Metric | Value |
|--------|-------|
| Start Time | ${summary.startTime} |
| End Time | ${summary.endTime} |
| Duration | ${durationStr} |
| Iterations | ${summary.iterations} |

## Increments

| Metric | Value |
|--------|-------|
| Completed | ${summary.incrementsCompleted} |
| Failed | ${summary.incrementsFailed} |

## Tasks & Tests

| Metric | Value |
|--------|-------|
| Total Tasks | ${summary.totalTasks} |
| Total Tests | ${summary.totalTests} |
| Average Coverage | ${summary.averageCoverage}% |

## Safety Gates

| Metric | Value |
|--------|-------|
| Human Gates Triggered | ${summary.humanGatesTriggered} |
| Circuit Breaker Trips | ${summary.circuitBreakerTrips} |

## Sync Operations

| Metric | Value |
|--------|-------|
| Total Syncs | ${summary.syncOperations} |

---

*Generated by SpecWeave Auto*
`;

    fs.writeFileSync(summaryPath, content, 'utf-8');
    return summaryPath;
  }
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

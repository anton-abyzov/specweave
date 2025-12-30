/**
 * Report Generator for Auto Sessions
 *
 * Generates markdown reports for:
 * - Session summaries
 * - Per-increment completion reports
 * - Cancellation summaries
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AutoSession } from './types.js';

export interface SessionReport {
  sessionId: string;
  status: 'completed' | 'cancelled' | 'failed';
  startTime: string;
  endTime: string;
  duration: string;
  iterations: number;
  increments: IncrementReport[];
  humanGates: GateReport[];
  circuitBreakers: CircuitBreakerReport[];
  summary: ReportSummary;
}

export interface IncrementReport {
  id: string;
  status: 'completed' | 'failed' | 'skipped' | 'in-progress';
  tasksCompleted: number;
  totalTasks: number;
  duration?: string;
  errors?: string[];
}

export interface GateReport {
  pattern: string;
  operation: string;
  requestedAt: string;
  outcome: 'approved' | 'denied' | 'timeout';
  responseTime?: string;
}

export interface CircuitBreakerReport {
  service: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure?: string;
  queuedOperations: number;
}

export interface ReportSummary {
  successRate: number;
  averageIterationsPerIncrement: number;
  totalTasksCompleted: number;
  humanInterventions: number;
  circuitBreakerTrips: number;
}

/**
 * Generate a session report from session state
 */
export function generateSessionReport(
  session: AutoSession,
  projectRoot: string
): SessionReport {
  const endTime = new Date().toISOString();
  const startDate = new Date(session.startTime);
  const endDate = new Date(endTime);
  const durationMs = endDate.getTime() - startDate.getTime();
  const duration = formatDuration(durationMs);

  // Collect increment reports
  const increments: IncrementReport[] = [];
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  // Completed increments
  for (const incId of session.completedIncrements || []) {
    increments.push(getIncrementReport(incId, incrementsDir, 'completed'));
  }

  // Failed increments
  for (const incId of session.failedIncrements || []) {
    increments.push(getIncrementReport(incId, incrementsDir, 'failed'));
  }

  // Current increment (if in progress)
  if (session.currentIncrement && session.status !== 'completed') {
    increments.push(getIncrementReport(session.currentIncrement, incrementsDir, 'in-progress'));
  }

  // Remaining queue (skipped)
  const remainingQueue = session.incrementQueue.filter(
    (id) =>
      !session.completedIncrements?.includes(id) &&
      !session.failedIncrements?.includes(id) &&
      id !== session.currentIncrement
  );
  for (const incId of remainingQueue) {
    increments.push({ id: incId, status: 'skipped', tasksCompleted: 0, totalTasks: 0 });
  }

  // Human gates
  const humanGates: GateReport[] = [];
  if (session.humanGates.approved) {
    for (const pattern of session.humanGates.approved) {
      humanGates.push({
        pattern,
        operation: pattern,
        requestedAt: session.startTime,
        outcome: 'approved',
      });
    }
  }
  if (session.humanGates.blocked) {
    for (const pattern of session.humanGates.blocked) {
      humanGates.push({
        pattern,
        operation: pattern,
        requestedAt: session.startTime,
        outcome: 'denied',
      });
    }
  }

  // Circuit breakers
  const circuitBreakers: CircuitBreakerReport[] = Object.entries(session.circuitBreakers || {}).map(
    ([service, cb]) => ({
      service,
      state: cb.state,
      failures: cb.failures,
      lastFailure: cb.lastFailure,
      queuedOperations: 0, // Queued operations tracked separately in circuit breaker module
    })
  );

  // Calculate summary
  const completedIncrements = session.completedIncrements?.length || 0;
  const totalIncrements = session.incrementQueue.length;
  const successRate = totalIncrements > 0 ? (completedIncrements / totalIncrements) * 100 : 0;

  const totalTasksCompleted = increments.reduce((sum, inc) => sum + inc.tasksCompleted, 0);

  const summary: ReportSummary = {
    successRate: Math.round(successRate),
    averageIterationsPerIncrement:
      completedIncrements > 0 ? Math.round(session.iteration / completedIncrements) : 0,
    totalTasksCompleted,
    humanInterventions: humanGates.length,
    circuitBreakerTrips: circuitBreakers.filter((cb) => cb.failures > 0).length,
  };

  return {
    sessionId: session.sessionId,
    status: session.status === 'completed' ? 'completed' : session.status === 'cancelled' ? 'cancelled' : 'failed',
    startTime: session.startTime,
    endTime,
    duration,
    iterations: session.iteration,
    increments,
    humanGates,
    circuitBreakers,
    summary,
  };
}

/**
 * Get report for a single increment
 */
function getIncrementReport(
  incrementId: string,
  incrementsDir: string,
  status: 'completed' | 'failed' | 'in-progress'
): IncrementReport {
  const incDir = findIncrementDir(incrementId, incrementsDir);
  if (!incDir) {
    return {
      id: incrementId,
      status,
      tasksCompleted: 0,
      totalTasks: 0,
    };
  }

  const tasksPath = path.join(incDir, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    return { id: incrementId, status, tasksCompleted: 0, totalTasks: 0 };
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');
  const totalTasks = (content.match(/^### T-\d+:/gm) || []).length;
  const completedTasks = (content.match(/\*\*Status\*\*:\s*\[x\]/g) || []).length;

  return {
    id: incrementId,
    status,
    tasksCompleted: completedTasks,
    totalTasks,
  };
}

/**
 * Find increment directory (handles prefix matching)
 */
function findIncrementDir(incrementId: string, incrementsDir: string): string | null {
  const direct = path.join(incrementsDir, incrementId);
  if (fs.existsSync(direct)) return direct;

  try {
    const entries = fs.readdirSync(incrementsDir);
    const match = entries.find((e) => e.startsWith(incrementId));
    if (match) return path.join(incrementsDir, match);
  } catch {
    // Directory doesn't exist
  }
  return null;
}

/**
 * Format duration from milliseconds to human readable
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(report: SessionReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Auto Session Report`);
  lines.push('');
  lines.push(`**Session ID**: ${report.sessionId}`);
  lines.push(`**Status**: ${getStatusEmoji(report.status)} ${report.status.toUpperCase()}`);
  lines.push('');

  // Timing
  lines.push('## Timing');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Start | ${report.startTime} |`);
  lines.push(`| End | ${report.endTime} |`);
  lines.push(`| Duration | ${report.duration} |`);
  lines.push(`| Iterations | ${report.iterations} |`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Success Rate | ${report.summary.successRate}% |`);
  lines.push(`| Tasks Completed | ${report.summary.totalTasksCompleted} |`);
  lines.push(`| Avg Iterations/Increment | ${report.summary.averageIterationsPerIncrement} |`);
  lines.push(`| Human Interventions | ${report.summary.humanInterventions} |`);
  lines.push(`| Circuit Breaker Trips | ${report.summary.circuitBreakerTrips} |`);
  lines.push('');

  // Increments
  lines.push('## Increments');
  lines.push('');
  lines.push(`| Increment | Status | Tasks |`);
  lines.push(`|-----------|--------|-------|`);
  for (const inc of report.increments) {
    const statusEmoji = getStatusEmoji(inc.status);
    lines.push(`| ${inc.id} | ${statusEmoji} ${inc.status} | ${inc.tasksCompleted}/${inc.totalTasks} |`);
  }
  lines.push('');

  // Human Gates (if any)
  if (report.humanGates.length > 0) {
    lines.push('## Human Gates');
    lines.push('');
    lines.push(`| Pattern | Outcome |`);
    lines.push(`|---------|---------|`);
    for (const gate of report.humanGates) {
      const emoji = gate.outcome === 'approved' ? '✅' : gate.outcome === 'denied' ? '❌' : '⏰';
      lines.push(`| ${gate.pattern} | ${emoji} ${gate.outcome} |`);
    }
    lines.push('');
  }

  // Circuit Breakers (if any tripped)
  const trippedBreakers = report.circuitBreakers.filter((cb) => cb.failures > 0);
  if (trippedBreakers.length > 0) {
    lines.push('## Circuit Breakers');
    lines.push('');
    lines.push(`| Service | State | Failures | Queued |`);
    lines.push(`|---------|-------|----------|--------|`);
    for (const cb of trippedBreakers) {
      lines.push(`| ${cb.service} | ${cb.state} | ${cb.failures} | ${cb.queuedOperations} |`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated at ${new Date().toISOString()} by SpecWeave Auto*`);

  return lines.join('\n');
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'cancelled':
      return '🛑';
    case 'in-progress':
      return '🔄';
    case 'skipped':
      return '⏭️';
    default:
      return '❓';
  }
}

/**
 * Save report to file
 */
export function saveReport(report: SessionReport, projectRoot: string): string {
  const logsDir = path.join(projectRoot, '.specweave', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const filename = `${report.sessionId}-summary.md`;
  const filepath = path.join(logsDir, filename);
  const content = generateMarkdownReport(report);

  fs.writeFileSync(filepath, content);
  return filepath;
}

/**
 * Generate quick cancellation summary (for console output)
 */
export function generateCancellationSummary(session: AutoSession): string {
  const lines: string[] = [];

  lines.push('🛑 Session Cancelled');
  lines.push('');
  lines.push(`Session ID: ${session.sessionId}`);
  lines.push(`Iterations completed: ${session.iteration}`);
  lines.push('');

  const completed = session.completedIncrements?.length || 0;
  const total = session.incrementQueue.length;

  lines.push(`Increments: ${completed}/${total} completed`);

  if (session.currentIncrement) {
    lines.push(`Current: ${session.currentIncrement} (in progress)`);
  }

  const remaining = session.incrementQueue.filter(
    (id) => !session.completedIncrements?.includes(id) && id !== session.currentIncrement
  );
  if (remaining.length > 0) {
    lines.push(`Remaining: ${remaining.join(', ')}`);
  }

  lines.push('');
  lines.push('💡 Progress is saved. Resume anytime with /sw:do');

  return lines.join('\n');
}

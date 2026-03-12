/**
 * Sync Status CLI Command
 *
 * Shows overall sync health: retry queue, circuit breaker states,
 * rate limit info, and recent errors.
 *
 * Usage: specweave sync-status
 *
 * @module cli/commands/sync-status
 */

import * as path from 'path';
import { SyncRetryQueue } from '../../core/sync/sync-retry-queue.js';
import { CircuitBreakerRegistry } from '../../core/sync/circuit-breaker-registry.js';
import { SyncResilienceAuditLogger } from '../../core/sync/sync-resilience-audit-logger.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface SyncStatusResult {
  retryQueuePending: number;
  retryQueueFailed: number;
  circuitBreakers: Record<string, string>;
  recentErrors: number;
  hasIssues: boolean;
  exitCode: number;
}

export async function syncStatusCommand(
  projectRoot: string,
  deps?: {
    retryQueue?: SyncRetryQueue;
    registry?: CircuitBreakerRegistry;
    auditLogger?: SyncResilienceAuditLogger;
  },
): Promise<SyncStatusResult> {
  const statePath = path.join(projectRoot, '.specweave', 'state');
  const retryQueue = deps?.retryQueue ?? new SyncRetryQueue({ statePath });
  const registry = deps?.registry ?? new CircuitBreakerRegistry();
  const auditLogger = deps?.auditLogger ?? new SyncResilienceAuditLogger({ statePath });

  const result: SyncStatusResult = {
    retryQueuePending: 0,
    retryQueueFailed: 0,
    circuitBreakers: {},
    recentErrors: 0,
    hasIssues: false,
    exitCode: 0,
  };

  // Retry queue
  try {
    const entries = await retryQueue.getAll();
    result.retryQueuePending = entries.filter((e) => e.status === 'pending').length;
    result.retryQueueFailed = entries.filter((e) => e.status === 'failed').length;
  } catch {
    // Queue file missing — treat as empty
  }

  // Circuit breakers
  const breakerStates = registry.getAll();
  for (const [provider, stateObj] of Object.entries(breakerStates)) {
    result.circuitBreakers[provider] = stateObj.state;
  }

  // Recent errors (last 24h)
  try {
    const recent = await auditLogger.readRecent(24);
    result.recentErrors = recent.filter(
      (e) => e.outcome === 'failure' || e.outcome === 'skipped_circuit_open' || e.outcome === 'skipped_rate_limit',
    ).length;
  } catch {
    // Audit file missing
  }

  // Determine health
  const hasOpenCircuits = Object.values(result.circuitBreakers).some((s) => s === 'open');
  result.hasIssues = result.retryQueuePending > 0 || result.retryQueueFailed > 0 || hasOpenCircuits;
  result.exitCode = result.hasIssues ? 1 : 0;

  // Output
  logger.log('Sync Status');
  logger.log('===========\n');

  // Retry queue section
  logger.log('Retry Queue:');
  if (result.retryQueuePending === 0 && result.retryQueueFailed === 0) {
    logger.log('  Empty (no pending retries)\n');
  } else {
    logger.log(`  Pending: ${result.retryQueuePending}`);
    if (result.retryQueueFailed > 0) {
      logger.log(`  Failed:  ${result.retryQueueFailed} (manual review needed)`);
    }
    logger.log('');
  }

  // Circuit breakers section
  logger.log('Circuit Breakers:');
  if (Object.keys(result.circuitBreakers).length === 0) {
    logger.log('  No circuit breakers active\n');
  } else {
    for (const [provider, state] of Object.entries(result.circuitBreakers)) {
      const indicator = state === 'open' ? '[OPEN]' : '[closed]';
      logger.log(`  ${provider}: ${indicator}`);
    }
    logger.log('');
  }

  // Recent errors section
  logger.log('Recent Errors (24h):');
  logger.log(`  ${result.recentErrors} error(s)\n`);

  // Summary
  if (result.hasIssues) {
    logger.log('Status: ISSUES DETECTED');
    if (result.retryQueuePending > 0) logger.log('  Run: specweave sync-retry');
    if (hasOpenCircuits) logger.log('  Circuit breakers will auto-reset after 5 minutes');
  } else {
    logger.log('Status: HEALTHY');
  }

  return result;
}

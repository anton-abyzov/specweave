/**
 * Sync Retry Command
 *
 * Processes the sync retry queue, attempting failed syncs with
 * exponential backoff. Entries past max attempts are marked failed.
 *
 * Usage: specweave sync-retry [--dry-run] [--force] [--clear]
 *
 * @module cli/commands/sync-retry
 */

import * as path from 'path';
import { SyncRetryQueue, RetryEntry } from '../../core/sync/sync-retry-queue.js';
import { SyncResilienceAuditLogger } from '../../core/sync/sync-resilience-audit-logger.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface SyncRetryOptions {
  dryRun?: boolean;
  force?: boolean;
  clear?: boolean;
}

export interface SyncRetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  cleared: boolean;
}

export async function syncRetryCommand(
  projectRoot: string,
  options: SyncRetryOptions = {},
  deps?: {
    retryQueue?: SyncRetryQueue;
    syncFn?: (entry: RetryEntry) => Promise<void>;
  },
): Promise<SyncRetryResult> {
  const statePath = path.join(projectRoot, '.specweave', 'state');
  const retryQueue = deps?.retryQueue ?? new SyncRetryQueue({ statePath });
  const syncFn = deps?.syncFn;

  const result: SyncRetryResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cleared: false,
  };

  // --clear: empty the queue
  if (options.clear) {
    const entries = await retryQueue.getAll();
    for (const entry of entries) {
      await retryQueue.remove(entry.id);
    }
    result.cleared = true;
    logger.log(`Cleared ${entries.length} entries from retry queue.`);
    return result;
  }

  const entries = await retryQueue.getAll();
  const pending = entries.filter((e) => e.status === 'pending');

  if (pending.length === 0) {
    logger.log('Retry queue is empty.');
    return result;
  }

  logger.log(`Processing ${pending.length} pending retry entries...`);

  const now = Date.now();

  for (const entry of pending) {
    // Skip entries not yet due (unless --force)
    if (!options.force && new Date(entry.nextRetryAt).getTime() > now) {
      result.skipped++;
      if (!options.dryRun) {
        logger.log(`  ⏳ Skipped ${entry.provider}/${entry.incrementId} — not yet due`);
      }
      continue;
    }

    result.processed++;

    if (options.dryRun) {
      logger.log(`  [dry-run] Would retry: ${entry.provider}/${entry.incrementId} (attempt ${entry.attemptCount})`);
      continue;
    }

    // Check if max attempts reached
    if (entry.attemptCount >= entry.maxAttempts) {
      await retryQueue.markFailed(entry.id);
      result.failed++;
      logger.log(`  ❌ ${entry.provider}/${entry.incrementId} — max attempts reached, marked failed`);
      continue;
    }

    // Attempt sync
    if (!syncFn) {
      logger.log(`  ⚠️ No sync function available — skipping actual sync`);
      result.skipped++;
      continue;
    }

    try {
      await syncFn(entry);
      await retryQueue.remove(entry.id);
      result.succeeded++;
      logger.log(`  ✅ ${entry.provider}/${entry.incrementId} — sync succeeded, removed from queue`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      result.failed++;

      // Increment attempt count and re-enqueue with updated backoff
      const newAttemptCount = entry.attemptCount + 1;
      if (newAttemptCount >= entry.maxAttempts) {
        await retryQueue.markFailed(entry.id);
        logger.log(`  ❌ ${entry.provider}/${entry.incrementId} — failed (${errMsg}), max attempts reached`);
      } else {
        // Remove old entry and re-enqueue with incremented attempt count
        await retryQueue.remove(entry.id);
        await retryQueue.enqueue({
          incrementId: entry.incrementId,
          provider: entry.provider,
          featureId: entry.featureId,
          projectPath: entry.projectPath,
          projectName: entry.projectName,
          error: errMsg,
          attemptCount: newAttemptCount,
        });
        logger.log(`  ⚠️ ${entry.provider}/${entry.incrementId} — failed (${errMsg}), will retry later (attempt ${newAttemptCount}/${entry.maxAttempts})`);
      }
    }
  }

  logger.log(`\nRetry summary: ${result.succeeded} succeeded, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}

/**
 * Drain retry queue for a specific increment.
 * Used by onIncrementDone() to process retries before closure.
 */
export async function drainRetryQueueForIncrement(
  projectRoot: string,
  incrementId: string,
  syncFn?: (entry: RetryEntry) => Promise<void>,
): Promise<{ attempted: number; succeeded: number }> {
  const statePath = path.join(projectRoot, '.specweave', 'state');
  const retryQueue = new SyncRetryQueue({ statePath });
  const entries = await retryQueue.getByIncrement(incrementId);
  const pending = entries.filter((e) => e.status === 'pending');

  let attempted = 0;
  let succeeded = 0;

  for (const entry of pending) {
    attempted++;
    if (!syncFn) continue;

    try {
      await syncFn(entry);
      await retryQueue.remove(entry.id);
      succeeded++;
    } catch {
      // Don't block closure on retry failures
      if (entry.attemptCount >= entry.maxAttempts) {
        await retryQueue.markFailed(entry.id);
      }
    }
  }

  return { attempted, succeeded };
}

#!/usr/bin/env node
/**
 * Session Start Reconcile Worker (NEW in v0.28.33)
 *
 * Lightweight background worker that runs GitHub reconciliation on session start.
 * Called by session-start-reconcile.sh in detached mode.
 *
 * Features:
 * - Silent mode: Minimal output, errors logged to debug log
 * - Non-blocking: Parent shell exits immediately
 * - Idempotent: Safe to run multiple times
 */

import { GitHubReconciler } from '../vendor/sync/github-reconciler.js';

// Silent logger - only logs errors
const silentLogger = {
  log: () => {}, // Suppress normal logs
  error: (msg: string, ...args: any[]) => console.error(`[reconcile] ${msg}`, ...args),
};

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] session-start-reconcile-worker: Starting...`);

  const projectRoot = process.cwd();

  try {
    const reconciler = new GitHubReconciler({
      projectRoot,
      dryRun: false,
      logger: silentLogger as any,
    });

    const result = await reconciler.reconcile();

    // Log summary
    if (result.mismatches > 0) {
      console.log(`[${new Date().toISOString()}] session-start-reconcile-worker: Fixed ${result.closed} closed, ${result.reopened} reopened`);
    } else {
      console.log(`[${new Date().toISOString()}] session-start-reconcile-worker: No drift detected (${result.scanned} increments)`);
    }

    if (result.errors.length > 0) {
      console.error(`[${new Date().toISOString()}] session-start-reconcile-worker: ${result.errors.length} error(s)`);
      result.errors.forEach(err => console.error(`  - ${err}`));
    }

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] session-start-reconcile-worker: Error - ${error.message}`);
  }

  console.log(`[${new Date().toISOString()}] session-start-reconcile-worker: Complete`);
}

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] session-start-reconcile-worker: Fatal error - ${error}`);
  process.exit(0); // Non-blocking
});

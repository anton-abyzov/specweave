#!/usr/bin/env node
/**
 * Sync Increment Closure Hook (NEW in v0.28.1)
 *
 * This script handles the CLOSURE flow for increments - closing GitHub issues
 * when an increment is marked as "completed".
 *
 * CRITICAL FIX: Previously, User Story GitHub issues were CREATED but NEVER CLOSED.
 * This script ensures proper closure of all related issues.
 *
 * Called by: post-increment-completion.sh (after increment status → "completed")
 *
 * Flow:
 * 1. Load SyncCoordinator for the increment
 * 2. Call syncIncrementClosure() which:
 *    - Ensures all GitHub issues exist (idempotent)
 *    - Closes all User Story issues with completion comment
 * 3. Report results
 *
 * Usage:
 *   node sync-increment-closure.js <increment-id>
 *
 * Environment:
 *   GITHUB_TOKEN - Required for GitHub API access
 */

import { SyncCoordinator } from '../../../../dist/src/sync/sync-coordinator.js';
import { consoleLogger } from '../vendor/utils/logger.js';

/**
 * Main function to sync increment closure
 */
async function syncIncrementClosure(incrementId: string): Promise<{
  success: boolean;
  closedIssues: number[];
  errors: string[];
}> {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔒 SYNC INCREMENT CLOSURE: ${incrementId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const projectRoot = process.cwd();

    const coordinator = new SyncCoordinator({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });

    const result = await coordinator.syncIncrementClosure();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result.success) {
      console.log('✅ INCREMENT CLOSURE SYNC COMPLETED');
      console.log(`   Issues closed: ${result.closedIssues.length}`);
      if (result.closedIssues.length > 0) {
        console.log(`   Issue numbers: ${result.closedIssues.join(', ')}`);
      }
    } else {
      console.log('⚠️  INCREMENT CLOSURE SYNC HAD ERRORS');
      console.log(`   Issues closed: ${result.closedIssues.length}`);
      console.log(`   Errors: ${result.errors.length}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: result.success,
      closedIssues: result.closedIssues,
      errors: result.errors
    };
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR in sync increment closure:', error.message);
    return {
      success: false,
      closedIssues: [],
      errors: [error.message]
    };
  }
}

// CLI Interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node sync-increment-closure.js <increment-id>');
    console.error('Example: node sync-increment-closure.js 0059-progressive-plugin');
    process.exit(1);
  }

  syncIncrementClosure(incrementId)
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Increment closure sync completed successfully');
        process.exit(0);
      } else {
        console.error('\n⚠️  Increment closure sync had errors (non-blocking)');
        // Exit 0 to not block the hook chain
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      // Exit 0 to not block the hook chain
      process.exit(0);
    });
}

export { syncIncrementClosure };

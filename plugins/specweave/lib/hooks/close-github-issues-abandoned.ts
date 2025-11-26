#!/usr/bin/env node
/**
 * Close GitHub Issues for Abandoned Increment (NEW in v0.28.33)
 *
 * Called by post-increment-status-change.sh when an increment is abandoned.
 * Closes all GitHub issues (main + User Stories) with abandon comment.
 *
 * Usage:
 *   node close-github-issues-abandoned.js <increment-id> [reason]
 *
 * Environment:
 *   GITHUB_TOKEN - Required for GitHub API access
 */

import { GitHubReconciler } from '../vendor/sync/github-reconciler.js';
import { consoleLogger } from '../vendor/utils/logger.js';

async function main(): Promise<void> {
  const incrementId = process.argv[2];
  const reason = process.argv[3] || 'Increment abandoned';

  if (!incrementId) {
    console.error('Usage: node close-github-issues-abandoned.js <increment-id> [reason]');
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🗑️  CLOSING GITHUB ISSUES (ABANDONED): ${incrementId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const projectRoot = process.cwd();

  const result = await GitHubReconciler.closeAbandonedIncrementIssues(
    projectRoot,
    incrementId,
    reason,
    consoleLogger
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (result.closed > 0) {
    console.log(`✅ Closed ${result.closed} GitHub issue(s)`);
  } else {
    console.log('ℹ️  No issues needed closing (all already closed or none linked)');
  }
  if (result.errors.length > 0) {
    console.log(`⚠️  ${result.errors.length} error(s):`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Exit 0 to not block hook chain
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(0); // Non-blocking
});

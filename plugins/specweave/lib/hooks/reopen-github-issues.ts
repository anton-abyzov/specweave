#!/usr/bin/env node
/**
 * Reopen GitHub Issues Hook (NEW in v0.28.33)
 *
 * Called by post-increment-status-change.sh when an increment is resumed.
 * Reopens all GitHub issues (main + User Stories) for the increment.
 *
 * Usage:
 *   node reopen-github-issues.js <increment-id> [reason]
 *
 * Environment:
 *   GITHUB_TOKEN - Required for GitHub API access
 */

import { GitHubReconciler } from '../vendor/sync/github-reconciler.js';
import { consoleLogger } from '../vendor/utils/logger.js';

async function main(): Promise<void> {
  const incrementId = process.argv[2];
  const reason = process.argv[3] || 'Increment resumed';

  if (!incrementId) {
    console.error('Usage: node reopen-github-issues.js <increment-id> [reason]');
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`▶️  REOPENING GITHUB ISSUES: ${incrementId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const projectRoot = process.cwd();

  const result = await GitHubReconciler.reopenIncrementIssues(
    projectRoot,
    incrementId,
    reason,
    consoleLogger
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (result.reopened > 0) {
    console.log(`✅ Reopened ${result.reopened} GitHub issue(s)`);
  } else {
    console.log('ℹ️  No issues needed reopening (all already open or none linked)');
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

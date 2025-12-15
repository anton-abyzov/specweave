#!/usr/bin/env node
/**
 * Auto-Create External Issue Hook Helper (v1.0.19)
 *
 * Called by post-increment-planning.sh to automatically create
 * external issues (GitHub/JIRA/ADO) for new increments.
 *
 * Usage:
 *   node auto-create-external-issue.js <increment-id>
 *
 * Example:
 *   node auto-create-external-issue.js 0001-feature-name
 *
 * Exit codes:
 *   0 - Success (or skipped - no action needed)
 *   1 - Error
 */

import { autoCreateExternalIssue, AutoCreateResult } from '../sync/external-issue-auto-creator.js';
import { consoleLogger } from '../utils/logger.js';

async function main(): Promise<void> {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node auto-create-external-issue.js <increment-id>');
    console.error('Example: node auto-create-external-issue.js 0001-feature-name');
    process.exit(1);
  }

  console.log(`\n🔗 Auto-creating external issue for ${incrementId}...`);

  const projectRoot = process.cwd();
  const result = await autoCreateExternalIssue(projectRoot, incrementId, consoleLogger);

  printResult(result);

  // Exit 0 even on skip (not an error)
  process.exit(result.success ? 0 : 1);
}

function printResult(result: AutoCreateResult): void {
  if (result.skipped) {
    console.log(`   ℹ️  Skipped: ${result.skipReason}`);
    return;
  }

  if (result.success) {
    console.log(`   ✅ Created ${result.provider} issue: ${result.issueNumber}`);
    if (result.issueUrl) {
      console.log(`   🔗 ${result.issueUrl}`);
    }
  } else {
    console.error(`   ❌ Failed to create ${result.provider} issue: ${result.error}`);
  }
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

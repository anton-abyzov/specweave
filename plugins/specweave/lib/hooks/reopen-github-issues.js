#!/usr/bin/env node
import { GitHubReconciler } from "../vendor/sync/github-reconciler.js";
import { consoleLogger } from "../vendor/utils/logger.js";
async function main() {
  const incrementId = process.argv[2];
  const reason = process.argv[3] || "Increment resumed";
  if (!incrementId) {
    console.error("Usage: node reopen-github-issues.js <increment-id> [reason]");
    process.exit(1);
  }
  console.log("\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  console.log(`\u25B6\uFE0F  REOPENING GITHUB ISSUES: ${incrementId}`);
  console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  const projectRoot = process.cwd();
  const result = await GitHubReconciler.reopenIncrementIssues(
    projectRoot,
    incrementId,
    reason,
    consoleLogger
  );
  console.log("\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  if (result.reopened > 0) {
    console.log(`\u2705 Reopened ${result.reopened} GitHub issue(s)`);
  } else {
    console.log("\u2139\uFE0F  No issues needed reopening (all already open or none linked)");
  }
  if (result.errors.length > 0) {
    console.log(`\u26A0\uFE0F  ${result.errors.length} error(s):`);
    result.errors.forEach((err) => console.log(`   - ${err}`));
  }
  console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n");
  process.exit(0);
}
main().catch((error) => {
  console.error("\u274C Fatal error:", error);
  process.exit(0);
});

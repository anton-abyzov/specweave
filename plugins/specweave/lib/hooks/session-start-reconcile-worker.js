#!/usr/bin/env node
import { GitHubReconciler } from "../vendor/sync/github-reconciler.js";
const silentLogger = {
  log: () => {
  },
  // Suppress normal logs
  error: (msg, ...args) => console.error(`[reconcile] ${msg}`, ...args)
};
async function main() {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: Starting...`);
  const projectRoot = process.cwd();
  try {
    const reconciler = new GitHubReconciler({
      projectRoot,
      dryRun: false,
      logger: silentLogger
    });
    const result = await reconciler.reconcile();
    if (result.mismatches > 0) {
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: Fixed ${result.closed} closed, ${result.reopened} reopened`);
    } else {
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: No drift detected (${result.scanned} increments)`);
    }
    if (result.errors.length > 0) {
      console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: ${result.errors.length} error(s)`);
      result.errors.forEach((err) => console.error(`  - ${err}`));
    }
  } catch (error) {
    console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: Error - ${error.message}`);
  }
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: Complete`);
}
main().catch((error) => {
  console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] session-start-reconcile-worker: Fatal error - ${error}`);
  process.exit(0);
});

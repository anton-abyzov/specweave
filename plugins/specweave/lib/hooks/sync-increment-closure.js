#!/usr/bin/env node
import { SyncCoordinator } from "../../../../dist/src/sync/sync-coordinator.js";
import { consoleLogger } from "../vendor/utils/logger.js";
async function syncIncrementClosure(incrementId) {
  try {
    console.log("\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    console.log(`\u{1F512} SYNC INCREMENT CLOSURE: ${incrementId}`);
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    const projectRoot = process.cwd();
    const coordinator = new SyncCoordinator({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });
    const result = await coordinator.syncIncrementClosure();
    console.log("\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    if (result.success) {
      console.log("\u2705 INCREMENT CLOSURE SYNC COMPLETED");
      console.log(`   Issues closed: ${result.closedIssues.length}`);
      if (result.closedIssues.length > 0) {
        console.log(`   Issue numbers: ${result.closedIssues.join(", ")}`);
      }
    } else {
      console.log("\u26A0\uFE0F  INCREMENT CLOSURE SYNC HAD ERRORS");
      console.log(`   Issues closed: ${result.closedIssues.length}`);
      console.log(`   Errors: ${result.errors.length}`);
    }
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n");
    return {
      success: result.success,
      closedIssues: result.closedIssues,
      errors: result.errors
    };
  } catch (error) {
    console.error("\n\u274C FATAL ERROR in sync increment closure:", error.message);
    return {
      success: false,
      closedIssues: [],
      errors: [error.message]
    };
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("Usage: node sync-increment-closure.js <increment-id>");
    console.error("Example: node sync-increment-closure.js 0059-progressive-plugin");
    process.exit(1);
  }
  syncIncrementClosure(incrementId).then((result) => {
    if (result.success) {
      console.log("\n\u2705 Increment closure sync completed successfully");
      process.exit(0);
    } else {
      console.error("\n\u26A0\uFE0F  Increment closure sync had errors (non-blocking)");
      process.exit(0);
    }
  }).catch((error) => {
    console.error("\n\u274C Fatal error:", error);
    process.exit(0);
  });
}
export {
  syncIncrementClosure
};

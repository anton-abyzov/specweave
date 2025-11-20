#!/usr/bin/env node
import { ACStatusManager } from "../vendor/core/increment/ac-status-manager.js";
async function updateACStatus(incrementId) {
  try {
    const projectRoot = process.cwd();
    if (process.env.SKIP_AC_SYNC === "true") {
      console.log("\u2139\uFE0F  AC sync skipped (SKIP_AC_SYNC=true)");
      return;
    }
    console.log(`\u{1F504} Syncing AC status for increment ${incrementId}...`);
    const manager = new ACStatusManager(projectRoot);
    const result = await manager.syncACStatus(incrementId);
    if (result.warnings && result.warnings.length > 0) {
      console.log("\n\u26A0\uFE0F  Warnings:");
      result.warnings.forEach((warning) => console.log(`   ${warning}`));
    }
    if (result.conflicts && result.conflicts.length > 0) {
      console.log("\n\u26A0\uFE0F  Conflicts detected:");
      result.conflicts.forEach((conflict) => console.log(`   ${conflict}`));
    }
    if (result.updated && result.updated.length > 0) {
      console.log("\n\u2705 Updated AC checkboxes:");
      result.updated.forEach((acId) => console.log(`   ${acId} \u2192 [x]`));
      if (result.changes && result.changes.length > 0) {
        console.log("\n\u{1F4DD} Changes:");
        result.changes.forEach((change) => console.log(`   ${change}`));
      }
    } else if (result.synced) {
      console.log("\u2705 All ACs already in sync (no changes needed)");
    } else {
      console.log("\u2139\uFE0F  No AC updates needed");
    }
  } catch (error) {
    console.error("\u274C Error updating AC status:", error);
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("Usage: node update-ac-status.js <increment-id>");
    console.error("Example: node update-ac-status.js 0039-ultra-smart-next-command");
    process.exit(1);
  }
  updateACStatus(incrementId).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

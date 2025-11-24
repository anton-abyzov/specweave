#!/usr/bin/env node
import { USCompletionDetector } from "../../../../dist/src/core/us-completion-detector.js";
import { LivingDocsSync } from "../../../../dist/src/core/living-docs/living-docs-sync.js";
import { USSyncThrottle } from "../../../../dist/src/core/us-sync-throttle.js";
import { consoleLogger } from "../vendor/utils/logger.js";
async function syncCompletedUserStories(incrementId) {
  try {
    console.log(`
\u{1F3AF} [6/6] Detecting completed user stories for ${incrementId}...`);
    const projectRoot = process.cwd();
    const throttle = USSyncThrottle.getInstance({ projectRoot });
    if (throttle.shouldSkipSync(incrementId)) {
      const timeSinceLastSync = throttle.getTimeSinceLastSync(incrementId);
      const secondsRemaining = Math.ceil((6e4 - timeSinceLastSync) / 1e3);
      console.log(`\u23ED\uFE0F  US sync throttled (last sync ${Math.floor(timeSinceLastSync / 1e3)}s ago)`);
      console.log(`   \u2139\uFE0F  Sync will be available in ${secondsRemaining}s`);
      console.log(`   \u{1F4A1} Manual sync: /specweave:sync-progress ${incrementId}`);
      return {
        success: true,
        message: "Sync throttled",
        throttled: true,
        skipped: true
      };
    }
    const detector = new USCompletionDetector(projectRoot, {
      logger: consoleLogger
    });
    const newlyCompleted = await detector.getNewlyCompletedUSs(incrementId);
    if (newlyCompleted.length === 0) {
      console.log("\u2705 No newly completed user stories detected (no sync needed)");
      return {
        success: true,
        newlyCompleted: [],
        message: "No new completions"
      };
    }
    console.log(`
\u{1F389} DETECTED ${newlyCompleted.length} NEWLY COMPLETED USER STORIES:`);
    for (const us of newlyCompleted) {
      console.log(`   ${us.usId}: ${us.title} (${us.completedACs}/${us.totalACs} ACs complete)`);
    }
    const allCompletions = await detector.detectCompletions(incrementId);
    await detector.saveCompletionState(incrementId, allCompletions);
    console.log(`
\u{1F4DA} Syncing living docs for ${incrementId}...`);
    const livingDocsSync = new LivingDocsSync(projectRoot, {
      logger: consoleLogger
    });
    const syncResult = await livingDocsSync.syncIncrement(incrementId);
    if (syncResult.success) {
      console.log(`\u2705 Living docs synced successfully`);
      console.log(`   Feature: ${syncResult.featureId}`);
      console.log(`   Files updated: ${syncResult.filesCreated.length + syncResult.filesUpdated.length}`);
      console.log(`
\u{1F4E1} External tool sync completed (GitHub/JIRA/ADO updated if configured)`);
      throttle.recordSync(incrementId);
      console.log(`   \u23F1\uFE0F  Throttle recorded (next sync allowed in 60s)`);
    } else {
      console.warn(`\u26A0\uFE0F  Living docs sync had errors (see logs)`);
      console.warn(`   Errors: ${syncResult.errors.join(", ")}`);
    }
    return {
      success: true,
      newlyCompleted: newlyCompleted.map((us) => ({
        usId: us.usId,
        title: us.title,
        totalACs: us.totalACs,
        completedACs: us.completedACs
      })),
      syncResult,
      message: `${newlyCompleted.length} user stories synced`
    };
  } catch (error) {
    console.error("\u274C Error in US completion orchestrator:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Orchestrator error"
    };
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("Usage: node us-completion-orchestrator.js <increment-id>");
    console.error("Example: node us-completion-orchestrator.js 0053-safe-feature-deletion");
    process.exit(1);
  }
  syncCompletedUserStories(incrementId).then((result) => {
    if (result.success) {
      console.log("\n\u2705 US completion orchestration completed successfully");
      if (result.throttled) {
        console.log("   (Throttled - no sync performed)");
      }
      process.exit(0);
    } else {
      console.error("\n\u274C US completion orchestration failed");
      process.exit(1);
    }
  }).catch((error) => {
    console.error("\n\u274C Fatal error:", error);
    process.exit(1);
  });
}
export {
  syncCompletedUserStories
};

#!/usr/bin/env node
import { ACStatusManager } from "../vendor/core/increment/ac-status-manager.js";
import { SpecToLivingDocsSync } from "../../../../dist/src/sync/spec-to-living-docs-sync.js";
import { consoleLogger } from "../vendor/utils/logger.js";
import { readFileSync, existsSync } from "fs";
import * as path from "path";
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
      await syncACsToLivingDocs(projectRoot, incrementId);
      await syncACsToGitHub(projectRoot, incrementId);
    } else if (result.synced) {
      console.log("\u2705 All ACs already in sync (no changes needed)");
    } else {
      console.log("\u2139\uFE0F  No AC updates needed");
    }
  } catch (error) {
    console.error("\u274C Error updating AC status:", error);
  }
}
async function syncACsToLivingDocs(projectRoot, incrementId) {
  try {
    console.log("\n\u{1F4C2} Syncing spec.md \u2192 living docs US files...");
    const syncer = new SpecToLivingDocsSync({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });
    const result = await syncer.sync();
    if (result.success && result.filesUpdated > 0) {
      console.log(`   \u2705 Updated ${result.filesUpdated} living docs file(s)`);
      console.log(`   \u{1F4DD} Total ACs synced: ${result.totalACsUpdated}`);
      console.log(`   \u{1F4DD} Total tasks synced: ${result.totalTasksUpdated}`);
    } else if (result.success) {
      console.log("   \u2139\uFE0F  No living docs updates needed");
    } else {
      console.log("   \u26A0\uFE0F  Living docs sync had errors (non-blocking)");
    }
  } catch (error) {
    console.log(`   \u26A0\uFE0F  Living docs sync failed: ${error.message}`);
  }
}
async function syncACsToGitHub(projectRoot, incrementId) {
  try {
    const configPath = path.join(projectRoot, ".specweave/config.json");
    if (!existsSync(configPath)) {
      console.log("\u2139\uFE0F  No config.json found, skipping GitHub sync");
      return;
    }
    const configContent = readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    const isGitHubEnabled = config.sync?.github?.enabled || config.sync?.profiles && Object.values(config.sync.profiles).some(
      (p) => p?.provider === "github"
    ) || config.sync?.provider === "github";
    if (!isGitHubEnabled) {
      console.log("\u2139\uFE0F  GitHub sync not enabled, skipping");
      return;
    }
    const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems !== false;
    if (!canUpdateExternal) {
      console.log("\u2139\uFE0F  canUpdateExternalItems=false, skipping GitHub sync");
      return;
    }
    console.log("\n\u{1F517} Syncing AC checkboxes to GitHub...");
    const { GitHubACCheckboxSync } = await import("../../../../plugins/specweave-github/lib/github-ac-checkbox-sync.js");
    const sync = new GitHubACCheckboxSync({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });
    const syncResult = await sync.syncACCheckboxesToGitHub(config, {
      addComment: true
      // Post comment on GitHub issue when ACs are completed
    });
    if (syncResult.success && syncResult.updated > 0) {
      console.log(`   \u2705 Updated ${syncResult.updated} AC(s) in GitHub issues`);
      if (syncResult.issues.length > 0) {
        console.log(`   \u{1F4DD} Issues updated: ${syncResult.issues.join(", ")}`);
      }
    } else if (syncResult.success) {
      console.log("   \u2139\uFE0F  No GitHub updates needed");
    } else {
      console.log("   \u26A0\uFE0F  GitHub sync had errors (non-blocking)");
    }
  } catch (error) {
    console.log(`   \u26A0\uFE0F  GitHub sync failed: ${error.message}`);
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

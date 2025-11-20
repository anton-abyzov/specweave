#!/usr/bin/env node
import { promises as fs, existsSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { mkdirpSync } from "../utils/fs-native.js";
async function syncLivingDocs(incrementId) {
  try {
    console.log(`
\u{1F4DA} Checking living docs sync for increment: ${incrementId}`);
    // Load and validate config with error handling
    const configPath = path.join(process.cwd(), ".specweave", "config.json");
    let config = {};

    try {
      if (existsSync(configPath)) {
        const rawContent = await fs.readFile(configPath, "utf-8");
        config = JSON.parse(rawContent);
      } else {
        console.log("\u26A0\uFE0F  No config.json found, using safe defaults (all permissions disabled)");
        console.log("   To configure: Run 'specweave init' or create .specweave/config.json");
        config = { sync: { settings: {} } };
      }
    } catch (error) {
      console.error("\u274C Failed to load config.json:", error.message);
      console.error("   File may be corrupted or contain invalid JSON");
      console.error("   Using safe defaults (all permissions denied)");
      console.error("   To fix: Check .specweave/config.json for syntax errors");
      config = { sync: { settings: {} } };
    }
    const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;
    if (!syncEnabled) {
      console.log("\u2139\uFE0F  Living docs sync disabled in config");
      console.log("   To enable: Set hooks.post_task_completion.sync_living_docs = true");
      return;
    }
    console.log("\u2705 Living docs sync enabled");

    // ========================================================================
    // GATE 1: canUpsertInternalItems (v0.24.0+ - Internal Docs Permission)
    // ========================================================================
    // This permission controls whether SpecWeave can CREATE/UPDATE internal docs.
    // If false, ALL living docs sync is blocked (both local and external).
    const canUpsertInternal = config.sync?.settings?.canUpsertInternalItems ?? false;

    if (!canUpsertInternal) {
      console.log("\u26D4 Living docs sync BLOCKED (canUpsertInternalItems = false)");
      console.log("   To enable: Set sync.settings.canUpsertInternalItems = true in config.json");
      console.log("   No internal docs or external tools will be updated");
      return;
    }

    console.log("\u2705 Internal docs sync permitted (canUpsertInternalItems = true)");
    const intelligentEnabled = config.livingDocs?.intelligent?.enabled ?? false;
    let specCopied = false;
    let changedDocs = [];
    if (intelligentEnabled) {
      console.log("\u{1F9E0} Using intelligent sync mode (v0.18.0+)");
      const result = await intelligentSyncLivingDocs(incrementId, config);
      specCopied = result.success;
      changedDocs = result.changedFiles;
    } else {
      console.log("\u{1F4CA} Using hierarchical distribution mode (v2.1 - Epic + User Stories)");
      const result = await hierarchicalDistribution(incrementId);
      specCopied = result.success;
      changedDocs = result.changedFiles;
    }
    if (changedDocs.length === 0 && !specCopied) {
      console.log("\u2139\uFE0F  No living docs changed");
      return;
    }
    console.log(`\u{1F4C4} Changed/created ${changedDocs.length} file(s)`);

    // ========================================================================
    // CHECK PERMISSION: canUpdateExternalItems (v0.24.0 - Three-Permission Architecture)
    // ========================================================================
    // This permission controls whether SpecWeave can UPDATE externally-created items
    // (full content: title, description, ACs, tasks, comments).
    // If false, living docs sync happens locally but doesn't push to external tools.
    const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;

    if (!canUpdateExternal) {
      console.log("\u2139\uFE0F  GitHub sync skipped (canUpdateExternalItems = false)");
      console.log("   Living docs updated locally only");
      console.log("   To enable: Set sync.settings.canUpdateExternalItems = true in config.json");
      console.log("\u2705 Living docs sync complete (local only)\n");
      return;
    }

    // ========================================================================
    // GATE 3: autoSyncOnCompletion (v0.24.0+ - Automatic vs Manual Sync)
    // ========================================================================
    // This setting controls whether sync to external tools happens automatically
    // on increment completion or requires manual /specweave:sync-* commands.
    // DEFAULT: true (automatic sync enabled for better UX)
    const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;

    if (!autoSync) {
      console.log("\u26A0\uFE0F  Automatic external sync DISABLED (autoSyncOnCompletion = false)");
      console.log("   Living docs updated locally, but external tools NOT synced");
      console.log("   To sync manually: Run /specweave-github:sync or /specweave-jira:sync");
      console.log("   To enable auto-sync: Set sync.settings.autoSyncOnCompletion = true");
      console.log("\u2705 Living docs sync complete (manual external sync required)\n");
      return;
    }

    console.log("\u2705 Automatic external sync permitted (autoSyncOnCompletion = true)");

    // T-034E: Use FormatPreservationSyncService for origin-aware sync
    await syncWithFormatPreservation(incrementId);

    console.log("\u2705 Living docs sync complete\n");
  } catch (error) {
    console.error("\u274C Error syncing living docs:", error);
  }
}
async function intelligentSyncLivingDocs(incrementId, config) {
  console.log("   \u26A0\uFE0F  Intelligent sync not yet fully implemented");
  console.log("   Falling back to hierarchical distribution mode...");
  return await hierarchicalDistribution(incrementId);
}
async function hierarchicalDistribution(incrementId) {
  try {
    // ============================================================================
    // LONG-TERM FIX (2025-11-19): Use LivingDocsSync instead of old SpecDistributor
    // ============================================================================
    //
    // Why this change:
    // - Old SpecDistributor.distribute() method no longer exists (removed in v3.0.0)
    // - LivingDocsSync is the official, stable API for syncing increments
    // - Used by /specweave:sync-docs command - battle-tested and maintained
    // - Future-proof: Won't break when internal APIs change
    //
    // Architecture:
    // - LivingDocsSync delegates to FeatureIDManager, TaskProjectSpecificGenerator, etc.
    // - Handles greenfield/brownfield detection automatically
    // - Returns consistent SyncResult interface
    //
    // Previous broken code:
    //   const { SpecDistributor } = await import("../../../../dist/src/core/living-docs/index.js");
    //   const distributor = new SpecDistributor(projectRoot, { overwriteExisting: false, createBackups: true });
    //   const result = await distributor.distribute(incrementId);  // ❌ Method doesn't exist
    //
    // ============================================================================

    const { LivingDocsSync } = await import("../../../../dist/src/core/living-docs/living-docs-sync.js");

    console.log("   \u{1F4CA} Syncing increment to living docs structure...");
    const projectRoot = process.cwd();

    // ========================================================================
    // USE FEATURE ID FROM ENVIRONMENT (NEW in v0.23.0 - Increment 0047)
    // ========================================================================
    // If FEATURE_ID is provided via environment variable (extracted from spec.md),
    // use it directly instead of auto-generating. This ensures correct traceability.
    const explicitFeatureId = process.env.FEATURE_ID;
    if (explicitFeatureId) {
      console.log(`   \u{1F4CE} Using explicit feature ID from spec.md: ${explicitFeatureId}`);
    } else {
      console.log("   \u{1F504} Feature ID will be auto-generated from increment number");
    }

    // Create logger adapter for LivingDocsSync
    const logger = {
      log: (msg) => console.log(`   ${msg}`),
      error: (msg, err) => console.error(`   ${msg}`, err || ''),
      warn: (msg) => console.warn(`   ${msg}`)
    };

    const sync = new LivingDocsSync(projectRoot, { logger });
    const result = await sync.syncIncrement(incrementId, {
      dryRun: false,
      force: false,
      // Pass explicit feature ID if available (v0.23.0+)
      explicitFeatureId: explicitFeatureId || undefined
    });

    if (!result.success) {
      console.error(`   \u274C Sync failed with errors:`);
      for (const error of result.errors) {
        console.error(`      - ${error}`);
      }
      return { success: false, changedFiles: [] };
    }

    console.log(`   \u2705 Living docs sync complete:`);
    console.log(`      Feature ID: ${result.featureId}`);
    console.log(`      Files created/updated: ${result.filesCreated.length + result.filesUpdated.length}`);

    const changedFiles = [...result.filesCreated, ...result.filesUpdated];

    // NEW (v0.23.0): Sync tasks from tasks.md to living docs US files
    // Part of increment 0047-us-task-linkage implementation
    try {
      const { syncUSTasksToLivingDocs } = await import("./sync-us-tasks.js");
      const taskSyncResult = await syncUSTasksToLivingDocs(
        incrementId,
        projectRoot,
        result.featureId,
        {}
      );

      if (taskSyncResult.success && taskSyncResult.updatedFiles.length > 0) {
        changedFiles.push(...taskSyncResult.updatedFiles);
      }
    } catch (error) {
      // Don't fail entire sync if US-Task sync fails (graceful degradation)
      console.log(`   \u26A0\uFE0F  US-Task sync failed (non-fatal):`, error.message);
      console.log(`   \u{1F4A1} Tip: This is a new feature (v0.23.0) - may need task parser build`);
    }

    return {
      success: true,
      changedFiles
    };
  } catch (error) {
    console.error(`   \u274C Living docs sync failed: ${error}`);
    console.error(error.stack);
    console.error("   \u26A0\uFE0F  Living docs sync skipped due to error");
    console.error("   \u{1F4A1} Tip: Run /specweave:sync-docs manually to retry");
    return {
      success: false,
      changedFiles: []
    };
  }
}
async function extractAndMergeLivingDocs(incrementId) {
  try {
    const {
      parseIncrementSpec,
      parseLivingDocsSpec,
      extractSpecId,
      mergeUserStories,
      generateRelatedDocsLinks,
      writeLivingDocsSpec
    } = await import("../../../../dist/src/utils/spec-parser.js");
    const projectRoot = process.cwd();
    const incrementSpecPath = path.join(projectRoot, ".specweave", "increments", incrementId, "spec.md");
    if (!existsSync(incrementSpecPath)) {
      console.log(`\u26A0\uFE0F  Increment spec not found: ${incrementSpecPath}`);
      return false;
    }
    console.log(`   \u{1F4D6} Parsing increment spec: ${incrementId}`);
    const incrementSpec = await parseIncrementSpec(incrementSpecPath);
    if (incrementSpec.userStories.length === 0) {
      console.log(`\u2139\uFE0F  No user stories found in increment spec, skipping sync`);
      return false;
    }
    console.log(`   \u2705 Found ${incrementSpec.userStories.length} user stories in increment`);
    const specId = incrementSpec.implementsSpec || extractSpecId(incrementId);
    const livingDocsDir = path.join(projectRoot, ".specweave", "docs", "internal", "specs", "default");
    const livingDocsPath = path.join(livingDocsDir, `${specId}-${incrementId.replace(/^\d+-/, "")}.md`);
    const livingDocsExists = existsSync(livingDocsPath);
    if (livingDocsExists) {
      console.log(`   \u{1F4DA} Living docs spec exists, merging user stories...`);
      const livingSpec = await parseLivingDocsSpec(livingDocsPath);
      const mergedStories = mergeUserStories(
        livingSpec.userStories,
        incrementSpec.userStories,
        incrementId
      );
      const newStoriesCount = mergedStories.length - livingSpec.userStories.length;
      const existingEntry = livingSpec.implementationHistory.find((e) => e.increment === incrementId);
      if (!existingEntry) {
        livingSpec.implementationHistory.push({
          increment: incrementId,
          stories: incrementSpec.userStories.map((s) => s.id),
          status: "complete",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        });
      } else {
        existingEntry.status = "complete";
        existingEntry.date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      }
      livingSpec.userStories = mergedStories;
      livingSpec.lastUpdated = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await writeLivingDocsSpec(livingDocsPath, livingSpec);
      console.log(`   \u2705 Merged ${newStoriesCount} new user stories into living docs`);
      console.log(`   \u2705 Updated implementation history for ${incrementId}`);
    } else {
      console.log(`   \u{1F4DD} Creating new living docs spec: ${specId}`);
      const relatedDocs = generateRelatedDocsLinks(incrementSpec, projectRoot);
      const livingSpec = {
        id: specId,
        title: incrementSpec.title,
        featureArea: extractFeatureArea(incrementSpec.title),
        overview: incrementSpec.overview,
        userStories: incrementSpec.userStories.map((story) => ({
          ...story,
          implementedIn: incrementId,
          status: "complete"
        })),
        implementationHistory: [
          {
            increment: incrementId,
            stories: incrementSpec.userStories.map((s) => s.id),
            status: "complete",
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
          }
        ],
        relatedDocs,
        externalLinks: {},
        priority: incrementSpec.priority,
        status: "active",
        created: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      mkdirpSync(livingDocsDir);
      await writeLivingDocsSpec(livingDocsPath, livingSpec);
      console.log(`   \u2705 Created new living docs spec: ${specId}`);
      console.log(`   \u2705 Added ${incrementSpec.userStories.length} user stories`);
      console.log(`   \u2705 Generated links to ${relatedDocs.architecture.length} architecture docs`);
      console.log(`   \u2705 Generated links to ${relatedDocs.adrs.length} ADRs`);
    }
    return true;
  } catch (error) {
    console.error(`\u274C Error extracting/merging living docs: ${error}`);
    console.error(error.stack);
    return false;
  }
}
function extractFeatureArea(title) {
  return title.replace(/^(Increment \d+:\s*)?/, "").trim();
}
function detectChangedDocs() {
  try {
    const output = execSync("git diff --name-only .specweave/docs/ 2>/dev/null || true", {
      encoding: "utf-8",
      cwd: process.cwd()
    }).trim();
    if (!output) {
      return [];
    }
    const files = output.split("\n").filter((f) => f.endsWith(".md")).filter((f) => f.length > 0);
    return files;
  } catch (error) {
    console.warn("\u26A0\uFE0F  Could not detect git changes:", error);
    return [];
  }
}
async function syncToGitHub(incrementId, changedDocs) {
  try {
    console.log("\n\u{1F504} Syncing to GitHub...");
    const {
      loadIncrementMetadata,
      detectRepo,
      collectLivingDocs,
      updateIssueLivingDocs,
      postArchitectureComment
    } = await import("../../../../dist/plugins/specweave-github/lib/github-issue-updater.js");
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log("\u2139\uFE0F  No GitHub issue linked, skipping GitHub sync");
      return;
    }
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log("\u26A0\uFE0F  Could not detect GitHub repository, skipping GitHub sync");
      return;
    }
    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;
    console.log(`   Syncing to ${owner}/${repo}#${issueNumber}`);
    const livingDocs = await collectLivingDocs(incrementId);
    if (livingDocs.specs.length > 0 || livingDocs.architecture.length > 0 || livingDocs.diagrams.length > 0) {
      await updateIssueLivingDocs(issueNumber, livingDocs, owner, repo);
    }
    for (const docPath of changedDocs) {
      if (docPath.includes("/architecture/")) {
        await postArchitectureComment(issueNumber, docPath, owner, repo);
      }
    }
    console.log("\u2705 GitHub sync complete");
  } catch (error) {
    console.error("\u274C Error syncing to GitHub:", error);
    console.error("   (Non-blocking - continuing...)");
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("\u274C Usage: sync-living-docs <incrementId>");
    console.error("   Example: sync-living-docs 0006-llm-native-i18n");
    process.exit(1);
  }
  syncLivingDocs(incrementId).catch((error) => {
    console.error("\u274C Fatal error:", error);
  });
}

/**
 * Sync with format preservation (T-034E)
 * Routes sync based on origin metadata (external vs internal)
 */
async function syncWithFormatPreservation(incrementId) {
  try {
    console.log("\n🔄 Using format-preserving sync...");

    const { SyncCoordinator } = await import("../../../../dist/src/sync/sync-coordinator.js");

    const coordinator = new SyncCoordinator({
      projectRoot: process.cwd(),
      incrementId
    });

    const result = await coordinator.syncIncrementCompletion();

    if (result.success) {
      console.log(`✅ Format-preserving sync complete (${result.syncMode} mode)`);
      console.log(`   ${result.userStoriesSynced} user story/stories synced`);
    } else {
      console.log(`⚠️  Sync completed with ${result.errors.length} error(s)`);
      result.errors.forEach(err => console.error(`   - ${err}`));
    }
  } catch (error) {
    console.error("⚠️  Format-preserving sync error:", error);
    console.log("   Falling back to legacy sync...");
    // Don't fail - just log and continue
  }
}

export {
  syncLivingDocs
};

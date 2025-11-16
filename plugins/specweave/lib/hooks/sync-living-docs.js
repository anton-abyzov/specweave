#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
async function syncLivingDocs(incrementId) {
  try {
    console.log(`
\u{1F4DA} Checking living docs sync for increment: ${incrementId}`);
    const configPath = path.join(process.cwd(), ".specweave", "config.json");
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    }
    const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;
    if (!syncEnabled) {
      console.log("\u2139\uFE0F  Living docs sync disabled in config");
      console.log("   To enable: Set hooks.post_task_completion.sync_living_docs = true");
      return;
    }
    console.log("\u2705 Living docs sync enabled");
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
    await syncToGitHub(incrementId, changedDocs);
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
    const { SpecDistributor } = await import("../../../../src/core/living-docs/index.js");
    console.log("   \u{1F4CA} Parsing and distributing spec into hierarchical structure...");
    const projectRoot = process.cwd();
    const distributor = new SpecDistributor(projectRoot, {
      overwriteExisting: false,
      createBackups: true
    });
    const result = await distributor.distribute(incrementId);
    if (!result.success) {
      console.error(`   \u274C Distribution failed with errors:`);
      for (const error of result.errors) {
        console.error(`      - ${error}`);
      }
      return { success: false, changedFiles: [] };
    }
    console.log(`   \u2705 Hierarchical distribution complete:`);
    console.log(`      Epic ID: ${result.specId}`);
    console.log(`      User Stories: ${result.totalStories}`);
    console.log(`      Files created: ${result.totalFiles}`);
    console.log(`      Epic: ${path.basename(result.epicPath)}`);
    console.log(`      User story files: ${result.userStoryPaths.length}`);
    if (result.warnings.length > 0) {
      console.log(`   \u26A0\uFE0F  Warnings:`);
      for (const warning of result.warnings) {
        console.log(`      - ${warning}`);
      }
    }
    console.log("   \u{1F4CA} Updating acceptance criteria status from completed tasks...");
    await distributor.updateAcceptanceCriteriaStatus(incrementId);
    const changedFiles = [result.epicPath, ...result.userStoryPaths];
    return {
      success: true,
      changedFiles
    };
  } catch (error) {
    console.error(`   \u274C Hierarchical distribution failed: ${error}`);
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
    } = await import("../../../../src/utils/spec-parser.js");
    const projectRoot = process.cwd();
    const incrementSpecPath = path.join(projectRoot, ".specweave", "increments", incrementId, "spec.md");
    if (!fs.existsSync(incrementSpecPath)) {
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
    const livingDocsExists = fs.existsSync(livingDocsPath);
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
      await fs.ensureDir(livingDocsDir);
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
    } = await import("../../../specweave-github/lib/github-issue-updater.js");
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
export {
  syncLivingDocs
};

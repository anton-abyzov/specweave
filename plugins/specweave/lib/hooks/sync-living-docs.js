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
      console.log("\u{1F4CB} Using simple sync mode (legacy)");
      specCopied = await copyIncrementSpecToLivingDocs(incrementId);
      changedDocs = detectChangedDocs();
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
  try {
    const { syncIncrement } = await import("../../../../src/core/living-docs/index.js");
    console.log("   \u{1F4D6} Parsing and classifying spec sections...");
    const result = await syncIncrement(incrementId, {
      verbose: false,
      // We'll log our own summary
      dryRun: false,
      parser: {
        preserveCodeBlocks: true,
        preserveLinks: true,
        preserveImages: true
      },
      distributor: {
        generateFrontmatter: true,
        preserveOriginal: config.livingDocs?.intelligent?.preserveOriginal ?? true
      },
      linker: {
        generateBacklinks: config.livingDocs?.intelligent?.generateCrossLinks ?? true,
        updateExisting: true
      }
    });
    console.log(`   \u2705 Intelligent sync complete:`);
    console.log(`      Project: ${result.project.name} (${(result.project.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`      Files created: ${result.distribution.summary.filesCreated}`);
    console.log(`      Files updated: ${result.distribution.summary.filesUpdated}`);
    console.log(`      Cross-links: ${result.links.length}`);
    console.log(`      Duration: ${result.duration}ms`);
    const changedFiles = [
      ...result.distribution.created.map((f) => f.path),
      ...result.distribution.updated.map((f) => f.path)
    ];
    return {
      success: result.success,
      changedFiles
    };
  } catch (error) {
    console.error(`   \u274C Intelligent sync failed: ${error}`);
    console.error("   Falling back to simple sync mode...");
    const copied = await copyIncrementSpecToLivingDocs(incrementId);
    return {
      success: copied,
      changedFiles: copied ? [path.join(process.cwd(), ".specweave", "docs", "internal", "specs", `spec-${incrementId}.md`)] : []
    };
  }
}
async function copyIncrementSpecToLivingDocs(incrementId) {
  try {
    const incrementSpecPath = path.join(process.cwd(), ".specweave", "increments", incrementId, "spec.md");
    const livingDocsPath = path.join(process.cwd(), ".specweave", "docs", "internal", "specs", `spec-${incrementId}.md`);
    if (!fs.existsSync(incrementSpecPath)) {
      console.log(`\u26A0\uFE0F  Increment spec not found: ${incrementSpecPath}`);
      return false;
    }
    if (fs.existsSync(livingDocsPath)) {
      const incrementContent = await fs.readFile(incrementSpecPath, "utf-8");
      const livingDocsContent = await fs.readFile(livingDocsPath, "utf-8");
      if (incrementContent === livingDocsContent) {
        console.log(`\u2139\uFE0F  Living docs spec already up-to-date: spec-${incrementId}.md`);
        return false;
      }
    }
    await fs.ensureDir(path.dirname(livingDocsPath));
    await fs.copy(incrementSpecPath, livingDocsPath);
    console.log(`\u2705 Copied increment spec to living docs: spec-${incrementId}.md`);
    return true;
  } catch (error) {
    console.error(`\u274C Error copying increment spec: ${error}`);
    return false;
  }
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

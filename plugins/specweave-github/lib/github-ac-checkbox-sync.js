import { promises as fs, existsSync } from "fs";
import path from "path";
import yaml from "yaml";
import { GitHubClientV2 } from "./github-client-v2.js";
import { consoleLogger } from "../../specweave/lib/vendor/utils/logger.js";
import { autoDetectProjectIdSync } from "../../../src/utils/project-detection.js";
import { deriveFeatureId } from "../../specweave/lib/vendor/utils/feature-id-derivation.js";
import {
  ProviderRouter
} from "../../specweave/lib/vendor/sync/provider-router.js";
import {
  isProviderEnabled
} from "../../specweave/lib/vendor/sync/status-mapper.js";
import { resolvePermissions } from "../../specweave/lib/vendor/sync/config.js";
class GitHubACCheckboxSync {
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.projectId = autoDetectProjectIdSync(this.projectRoot) || "default";
    this.providerRouter = new ProviderRouter({ projectRoot: this.projectRoot, logger: this.logger });
  }
  /**
   * Sync AC checkbox state from spec.md to GitHub issue bodies.
   *
   * Uses efficient regex replacement to flip checkboxes without rebuilding
   * the entire issue body.
   */
  async syncACCheckboxesToGitHub(config, options = {}) {
    const result = { success: true, updated: 0, issues: [] };
    try {
      const githubEnabled = isProviderEnabled(config, "github");
      if (!githubEnabled) {
        this.logger.log("\u2139\uFE0F  GitHub sync disabled - skipping AC checkbox sync");
        return result;
      }
      const syncAny = config.sync;
      const perms = resolvePermissions(syncAny?.preset, void 0, config.sync?.settings);
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? perms.canUpsert;
      if (!canUpdateExternal) {
        this.logger.log("\u2139\uFE0F  External update disabled (canUpdateExternalItems=false)");
        return result;
      }
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log("\u2139\uFE0F  No user stories found for this increment");
        return result;
      }
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.providerRouter.detectGitHubRepo(githubConfig);
      if (!repoInfo) {
        this.logger.log("\u26A0\uFE0F  GitHub repository not configured");
        return result;
      }
      const defaultClient = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
      this.logger.log(`
\u{1F4CA} Syncing AC checkboxes to GitHub issues...`);
      this.logger.log(`   Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      const specPath = path.join(
        this.projectRoot,
        ".specweave/increments",
        this.incrementId,
        "spec.md"
      );
      if (!existsSync(specPath)) {
        this.logger.log("\u26A0\uFE0F  spec.md not found");
        return result;
      }
      const specContent = await fs.readFile(specPath, "utf-8");
      const acStatus = GitHubACCheckboxSync.parseACStatusFromSpec(specContent);
      this.logger.log(`   Found ${acStatus.size} ACs in spec.md`);
      for (const usFile of userStories) {
        const ghInfo = usFile.external_tools?.github;
        const issueNumber = ghInfo?.number || ghInfo?.issue || ghInfo?.issue_number || usFile.external_id;
        if (!issueNumber) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} - No GitHub issue linked`);
          continue;
        }
        const usAcStatus = /* @__PURE__ */ new Map();
        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) {
            usAcStatus.set(acId, completed);
          }
        }
        if (usAcStatus.size === 0) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} - No ACs to sync`);
          continue;
        }
        try {
          let client = defaultClient;
          const ghUrl = ghInfo?.url;
          if (ghUrl) {
            const repoMatch = ghUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\//);
            if (repoMatch && `${repoMatch[1]}/${repoMatch[2]}` !== `${repoInfo.owner}/${repoInfo.repo}`) {
              client = GitHubClientV2.fromRepo(repoMatch[1], repoMatch[2]);
            }
          }
          const issue = await client.getIssue(Number(issueNumber));
          if (!issue) {
            this.logger.log(`   \u26A0\uFE0F  ${usFile.id} - Issue #${issueNumber} not found`);
            continue;
          }
          let body = issue.body || "";
          const originalBody = body;
          let updatedCount = 0;
          for (const [acId, completed] of usAcStatus) {
            const checkboxState = completed ? "x" : " ";
            const escapedAcId = acId.replace(/-/g, "\\-");
            const boldRegex = new RegExp(`(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`, "g");
            const plainRegex = new RegExp(`(- \\[)[ x](\\] ${escapedAcId}:)`, "g");
            const beforeUpdate = body;
            body = body.replace(boldRegex, `$1${checkboxState}$2`);
            body = body.replace(plainRegex, `$1${checkboxState}$2`);
            if (body !== beforeUpdate) {
              updatedCount++;
            }
          }
          if (body === originalBody) {
            this.logger.log(`   \u23ED\uFE0F  ${usFile.id} #${issueNumber} - No checkbox changes`);
            continue;
          }
          await client.updateIssueBody(Number(issueNumber), body);
          result.updated += updatedCount;
          result.issues.push(Number(issueNumber));
          this.logger.log(`   \u2705 ${usFile.id} #${issueNumber} - Updated ${updatedCount} AC checkbox(es)`);
          if (options.addComment) {
            const completedCount = [...usAcStatus.values()].filter((v) => v).length;
            const totalCount = usAcStatus.size;
            const percentage = Math.round(completedCount / totalCount * 100);
            const commentBody = `## \u{1F4CA} Progress Update

**Acceptance Criteria**: ${completedCount}/${totalCount} (${percentage}%)

${[...usAcStatus.entries()].map(
              ([id, done]) => `- ${done ? "\u2705" : "\u2B1C"} ${id}`
            ).join("\n")}

---
\u{1F916} Auto-updated by SpecWeave AC Completion Gate`;
            await client.addComment(Number(issueNumber), commentBody);
            this.logger.log(`   \u{1F4AC} Added progress comment`);
          }
        } catch (error) {
          this.logger.log(`   \u26A0\uFE0F  ${usFile.id} - Failed to update #${issueNumber}: ${error}`);
          result.success = false;
        }
      }
      this.logger.log(`
\u{1F4CA} AC Checkbox Sync Complete`);
      this.logger.log(`   Updated: ${result.updated} checkbox(es) across ${result.issues.length} issue(s)`);
      return result;
    } catch (error) {
      this.logger.error("\u274C AC checkbox sync failed:", error);
      result.success = false;
      return result;
    }
  }
  /**
   * Parse AC checkbox status from spec.md content
   *
   * Handles both formats:
   * - `- [x] **AC-US5-01**: Description` (SpecWeave standard)
   * - `- [x] AC-US5-01: Description` (legacy)
   */
  static parseACStatusFromSpec(specContent) {
    const acStatus = /* @__PURE__ */ new Map();
    const lines = specContent.split("\n");
    const boldRegex = /^- \[([ x])\] \*\*(AC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+)\*\*:/;
    const plainRegex = /^- \[([ x])\] (AC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+):/;
    for (const line of lines) {
      let match = line.match(boldRegex);
      if (!match) {
        match = line.match(plainRegex);
      }
      if (match) {
        const completed = match[1] === "x";
        const acId = match[2];
        acStatus.set(acId, completed);
      }
    }
    return acStatus;
  }
  /**
   * Build the AC ID prefix for a given US ID.
   * US-001 → "AC-US1-", US-SPE-001 → "AC-SPE-US1-"
   */
  static buildACPrefix(usId) {
    const compoundMatch = usId.match(/^US-([A-Z]+)-(\d+)$/);
    if (compoundMatch) {
      return `AC-${compoundMatch[1]}-US${parseInt(compoundMatch[2], 10)}-`;
    }
    const simpleMatch = usId.match(/^US-(\d+)$/);
    if (simpleMatch) {
      return `AC-US${parseInt(simpleMatch[1], 10)}-`;
    }
    const fallback = usId.match(/(\d+)$/);
    const num = fallback ? parseInt(fallback[1], 10) : 0;
    return `AC-US${num}-`;
  }
  /**
   * Load user stories from living docs for the increment
   */
  async loadUserStoriesForIncrement() {
    const specFile = path.join(
      this.projectRoot,
      ".specweave/increments",
      this.incrementId,
      "spec.md"
    );
    if (!existsSync(specFile)) {
      return [];
    }
    const content = await fs.readFile(specFile, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }
    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;
    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot,
        ".specweave/increments",
        this.incrementId,
        "metadata.json"
      );
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, "utf-8"));
          featureId = metadata.feature_id || metadata.epic_id;
        } catch {
        }
      }
    }
    if (!featureId) {
      try {
        featureId = deriveFeatureId(this.incrementId);
      } catch {
        return [];
      }
    }
    const specsRoot = path.join(this.projectRoot, ".specweave/docs/internal/specs");
    const usFiles = [];
    const projectDirs = [];
    const primaryPath = path.join(specsRoot, this.projectId, featureId);
    if (existsSync(primaryPath)) {
      projectDirs.push(primaryPath);
    }
    if (existsSync(specsRoot)) {
      try {
        const allProjects = await fs.readdir(specsRoot);
        for (const proj of allProjects) {
          if (proj === this.projectId) continue;
          const projFeaturePath = path.join(specsRoot, proj, featureId);
          if (existsSync(projFeaturePath)) {
            projectDirs.push(projFeaturePath);
          }
        }
      } catch {
      }
    }
    if (projectDirs.length === 0) {
      return [];
    }
    for (const featurePath of projectDirs) {
      const files = await fs.readdir(featurePath);
      for (const file of files) {
        if (file.startsWith("us-") && file.endsWith(".md")) {
          const filePath = path.join(featurePath, file);
          const fileContent = await fs.readFile(filePath, "utf-8");
          const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
          if (match) {
            const fm = yaml.parse(match[1]);
            const externalTools = fm.external_tools || fm.external;
            usFiles.push({
              id: fm.id,
              title: fm.title,
              format_preservation: fm.format_preservation,
              external_title: fm.external_title,
              external_source: fm.external_source,
              external_id: fm.external_id,
              external_url: fm.external_url,
              imported_at: fm.imported_at,
              origin: fm.origin,
              external_tools: externalTools
            });
          }
        }
      }
    }
    return usFiles;
  }
}
export {
  GitHubACCheckboxSync
};

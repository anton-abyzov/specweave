import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { UserStoryIssueBuilder } from "./user-story-issue-builder.js";
import { CompletionCalculator } from "./completion-calculator.js";
import { DuplicateDetector } from "./duplicate-detector.js";
import { execFileNoThrow } from "../../vendor/utils/execFileNoThrow.js";
import { getGitHubAuthFromProject } from "../../vendor/utils/auth-helpers.js";
import { LockManager } from "../../../../../src/utils/lock-manager.js";
import { normalizeIssueBody } from "./github-body-utils.js";
import { ensureLabels, setLabelCacheDir } from "./label-cache.js";
import { MilestoneCache } from "./milestone-cache.js";
import { getIssueNumberFromMetadata } from "./metadata-issue-lookup.js";
class GitHubFeatureSync {
  constructor(client, specsDir, projectRoot) {
    // Cached default branch for the sync session (one API call per session)
    this.defaultBranch = null;
    this.client = client;
    this.specsDir = specsDir;
    this.projectRoot = projectRoot;
    this.calculator = new CompletionCalculator(projectRoot);
    this.token = getGitHubAuthFromProject(projectRoot).token;
  }
  /**
   * Detect the default branch from the GitHub API.
   * Caches the result per sync session to avoid repeated API calls.
   * Falls back to 'main' if API call fails.
   */
  async detectDefaultBranch() {
    if (this.defaultBranch) {
      return this.defaultBranch;
    }
    const owner = this.client.getOwner();
    const repo = this.client.getRepo();
    const result = await execFileNoThrow("gh", [
      "api",
      `repos/${owner}/${repo}`,
      "--jq",
      ".default_branch"
    ], { env: this.getGhEnv() });
    if (result.exitCode === 0 && result.stdout.trim()) {
      this.defaultBranch = result.stdout.trim();
    } else {
      console.warn(`   \u26A0\uFE0F  Failed to detect default branch, falling back to 'main': ${result.stderr}`);
      this.defaultBranch = "main";
    }
    return this.defaultBranch;
  }
  /**
   * Get environment object with GH_TOKEN for gh CLI commands.
   * This ensures the token from .env is passed to all gh operations,
   * regardless of `gh auth` status.
   */
  getGhEnv() {
    return this.token ? { ...process.env, GH_TOKEN: this.token } : process.env;
  }
  /**
   * Get the repo slug (owner/repo) for `-R` flag in gh CLI commands.
   * CRITICAL: All gh issue commands MUST use `-R` to target the correct repo,
   * not the repo inferred from the current working directory.
   */
  getRepoSlug() {
    return `${this.client.getOwner()}/${this.client.getRepo()}`;
  }
  /**
   * Sync Feature folder to GitHub (Milestone + User Story Issues)
   *
   * Process:
   * 1. Create/update GitHub Milestone for Feature
   * 2. Find all us-*.md files across all projects
   * 3. Create/update GitHub Issue for EACH user story
   * 4. Update frontmatter with GitHub issue links
   */
  async syncFeatureToGitHub(featureId, projectName) {
    const RATE_LIMIT_THRESHOLD = 250;
    try {
      const rateLimit = await this.client.checkRateLimit();
      if (rateLimit.remaining < RATE_LIMIT_THRESHOLD) {
        console.log(`
\u26A0\uFE0F  GitHub API rate limit low: ${rateLimit.remaining}/${rateLimit.limit} remaining`);
        console.log(`   \u23ED\uFE0F  Skipping sync for ${featureId} \u2014 will retry after ${rateLimit.reset.toISOString()}`);
        console.log(`   \u{1F4A1} Run /sw:progress-sync to retry when rate limit resets`);
        return {
          milestoneNumber: 0,
          milestoneUrl: "",
          issuesCreated: 0,
          issuesUpdated: 0,
          userStoriesProcessed: 0,
          rateLimitSkipped: true
        };
      }
    } catch (rateLimitError) {
      const msg = rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError);
      if (msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
        console.log(`
\u26A0\uFE0F  GitHub API unreachable: ${msg}`);
        console.log(`   \u23ED\uFE0F  Skipping sync for ${featureId} \u2014 network appears down`);
        return {
          milestoneNumber: 0,
          milestoneUrl: "",
          issuesCreated: 0,
          issuesUpdated: 0,
          userStoriesProcessed: 0,
          rateLimitSkipped: true
        };
      }
    }
    const owner = this.client.getOwner();
    const repo = this.client.getRepo();
    const lockDir = path.join(this.projectRoot, ".specweave", "state", "locks", `github-sync-${owner}-${repo}`);
    const lock = new LockManager(lockDir, 120);
    const acquired = await lock.acquire();
    if (!acquired) {
      console.log(`
\u23ED\uFE0F  Sync already in progress for ${featureId} (lock held by another process)`);
      console.log(`   \u{1F4A1} This prevents race conditions between task completion and status change syncs`);
      return {
        milestoneNumber: 0,
        milestoneUrl: "",
        issuesCreated: 0,
        issuesUpdated: 0,
        userStoriesProcessed: 0
      };
    }
    try {
      console.log(`
\u{1F504} Syncing Feature ${featureId} to GitHub...`);
      const stateDir = path.join(this.projectRoot, ".specweave", "state");
      setLabelCacheDir(stateDir);
      const featureFolder = await this.findFeatureFolder(featureId, projectName);
      if (!featureFolder) {
        console.log(`   \u26A0\uFE0F  Feature ${featureId} not found in ${this.specsDir} (no living docs and auto-create failed)`);
        console.log(`   \u{1F4A1} Run sw:sync-docs or sw:living-docs to generate living docs first`);
        return {
          milestoneNumber: 0,
          milestoneUrl: "",
          issuesCreated: 0,
          issuesUpdated: 0,
          userStoriesProcessed: 0
        };
      }
      const featurePath = path.join(featureFolder, "FEATURE.md");
      const featureData = await this.parseFeatureMd(featurePath);
      console.log(`   \u{1F4E6} Feature: ${featureData.title}`);
      console.log(`   \u{1F4CA} Status: ${featureData.status}`);
      let milestoneNumber = featureData.external_tools?.github?.id;
      let milestoneUrl = featureData.external_tools?.github?.url;
      if (!milestoneNumber) {
        console.log(`   \u{1F680} Creating GitHub Milestone...`);
        const milestone = await this.createMilestone(featureData);
        milestoneNumber = milestone.number;
        milestoneUrl = milestone.url;
        console.log(`   \u2705 Created Milestone #${milestoneNumber}`);
        await this.updateFeatureMd(featurePath, {
          type: "milestone",
          id: milestoneNumber,
          url: milestoneUrl
        });
      } else {
        console.log(`   \u267B\uFE0F  Using existing Milestone #${milestoneNumber}`);
        milestoneUrl = featureData.external_tools?.github?.url || milestoneUrl;
      }
      const userStories = await this.findUserStories(featureId, projectName);
      console.log(`
   \u{1F4DD} Found ${userStories.length} User Stories to sync...`);
      let issuesCreated = 0;
      let issuesUpdated = 0;
      const detectedBranch = await this.detectDefaultBranch();
      console.log(`   \u{1F33F} Default branch: ${detectedBranch}`);
      for (const userStory of userStories) {
        console.log(`
   \u{1F539} Processing ${userStory.id}: ${userStory.title}`);
        const repoInfo = {
          owner: this.client.getOwner(),
          repo: this.client.getRepo(),
          branch: detectedBranch
        };
        const builder = new UserStoryIssueBuilder(
          userStory.filePath,
          this.projectRoot,
          featureId,
          repoInfo
        );
        const issueContent = await builder.buildIssueBody();
        issueContent.status = userStory.status;
        let issueNumber;
        let wasUpdated = false;
        if (userStory.existingIssue) {
          console.log(`      \u267B\uFE0F  Issue #${userStory.existingIssue} exists in frontmatter`);
          try {
            await this.client.getIssue(userStory.existingIssue);
            await this.updateUserStoryIssue(userStory.existingIssue, issueContent, userStory.filePath);
            issuesUpdated++;
            console.log(`      \u2705 Updated Issue #${userStory.existingIssue}`);
            continue;
          } catch (err) {
            console.log(`      \u26A0\uFE0F  Issue #${userStory.existingIssue} deleted on GitHub, creating new`);
          }
        }
        try {
          const incrementsDir = path.join(this.projectRoot, ".specweave", "increments");
          const metadataIssueNumber = await getIssueNumberFromMetadata(incrementsDir, featureId, userStory.id);
          if (metadataIssueNumber) {
            console.log(`      \u26A1 Issue #${metadataIssueNumber} found in metadata (skipping dup detection)`);
            issueNumber = metadataIssueNumber;
            await this.updateUserStoryIssue(metadataIssueNumber, issueContent, userStory.filePath);
            issuesUpdated++;
            continue;
          }
        } catch (metadataErr) {
          console.warn(`      \u26A0\uFE0F  Metadata path failed: ${metadataErr.message}, falling back to dup detection`);
        }
        const titlePattern = `[${featureId}][${userStory.id}]`;
        const milestoneTitle = `${featureData.id}: ${featureData.title}`;
        console.log(`      \u{1F6E1}\uFE0F  Using DuplicateDetector (pattern: ${titlePattern})`);
        const result = await DuplicateDetector.createWithProtection({
          title: issueContent.title,
          body: issueContent.body,
          titlePattern,
          incrementId: userStory.id,
          labels: issueContent.labels,
          milestone: milestoneTitle,
          repo: `${this.client.getOwner()}/${this.client.getRepo()}`
        });
        issueNumber = result.issue.number;
        if (result.wasReused) {
          console.log(`      \u267B\uFE0F  Reused existing issue #${issueNumber} (duplicate prevented!)`);
          wasUpdated = true;
        } else {
          console.log(`      \u2705 Created issue #${issueNumber}`);
        }
        if (result.duplicatesFound > 0) {
          console.log(`      \u{1F6E1}\uFE0F  Duplicates detected: ${result.duplicatesFound}, auto-closed: ${result.duplicatesClosed}`);
        }
        await this.updateUserStoryFrontmatter(userStory.filePath, issueNumber);
        await this.backfillIncrementMetadata(featureId, userStory.id, issueNumber, milestoneNumber);
        await this.updateUserStoryIssue(issueNumber, issueContent, userStory.filePath);
        if (result.wasReused) {
          issuesUpdated++;
        } else {
          issuesCreated++;
        }
      }
      console.log(`
\u2705 Feature sync complete!`);
      console.log(`   Milestone: ${milestoneUrl}`);
      console.log(`   User Stories: ${userStories.length}`);
      console.log(`   Issues created: ${issuesCreated}`);
      console.log(`   Issues updated: ${issuesUpdated}`);
      return {
        milestoneNumber,
        milestoneUrl,
        issuesCreated,
        issuesUpdated,
        userStoriesProcessed: userStories.length
      };
    } finally {
      await lock.release();
    }
  }
  /**
   * Find Feature folder in specs directory.
   * Falls back to auto-creating from increment spec.md if living docs don't exist.
   */
  async findFeatureFolder(featureId, projectName) {
    if (projectName) {
      const projectSpecific = path.join(this.specsDir, projectName, featureId);
      if (existsSync(projectSpecific) && existsSync(path.join(projectSpecific, "FEATURE.md"))) {
        return projectSpecific;
      }
    }
    const projectFolders = await this.findProjectFolders();
    for (const projectFolder of projectFolders) {
      const featureFolder = path.join(projectFolder, featureId);
      if (existsSync(featureFolder) && existsSync(path.join(featureFolder, "FEATURE.md"))) {
        return featureFolder;
      }
    }
    const legacyFolder = path.join(this.specsDir, "_features", featureId);
    if (existsSync(legacyFolder)) {
      console.log(`   \u26A0\uFE0F  Found feature in legacy _features folder - consider migrating to project folder`);
      return legacyFolder;
    }
    console.log(`   \u2139\uFE0F  Feature folder not found in living docs, attempting auto-create from spec.md...`);
    const created = await this.createFeatureFolderFromSpec(featureId, projectFolders);
    if (created) {
      return created;
    }
    return null;
  }
  /**
   * Find the increment folder for a given feature ID.
   * Converts FS-271 -> finds 0271-xxx-xxx/ in .specweave/increments/
   */
  async findIncrementFolder(featureId) {
    const numMatch = featureId.match(/FS-0*(\d+)E?/i);
    if (!numMatch) return null;
    const num = parseInt(numMatch[1], 10);
    const paddedNum = String(num).padStart(4, "0");
    const incrementsDir = path.join(this.projectRoot, ".specweave/increments");
    if (!existsSync(incrementsDir)) return null;
    const entries = await readdir(incrementsDir);
    const match = entries.find((e) => e.startsWith(paddedNum + "-"));
    if (!match) return null;
    return path.join(incrementsDir, match);
  }
  /**
   * Auto-create a feature folder (FEATURE.md + us-NNN.md files) from an
   * increment's spec.md. This enables GitHub sync even when the living docs
   * builder hasn't run yet.
   */
  async createFeatureFolderFromSpec(featureId, projectFolders) {
    try {
      const incrementFolder = await this.findIncrementFolder(featureId);
      if (!incrementFolder) {
        console.log(`   \u26A0\uFE0F  No increment folder found for ${featureId}`);
        return null;
      }
      const specPath = path.join(incrementFolder, "spec.md");
      if (!existsSync(specPath)) {
        console.log(`   \u26A0\uFE0F  No spec.md found in ${path.basename(incrementFolder)}`);
        return null;
      }
      const specContent = await readFile(specPath, "utf-8");
      const fmMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter = {};
      if (fmMatch) {
        try {
          frontmatter = yaml.parse(fmMatch[1]) || {};
        } catch {
        }
      }
      const incrementBasename = path.basename(incrementFolder);
      const title = frontmatter.title || specContent.match(/^#\s+(.+)/m)?.[1]?.trim() || incrementBasename.replace(/^\d+-/, "").replace(/-/g, " ");
      const status = frontmatter.status || "active";
      const priority = frontmatter.priority || "P2";
      const created = frontmatter.created || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const incrementId = frontmatter.increment || incrementBasename;
      let targetProjectFolder = projectFolders[0];
      const projectMatch = specContent.match(/\*\*Project\*\*:\s*(\S+)/);
      if (projectMatch) {
        const projectName = projectMatch[1];
        const matchingFolder = projectFolders.find((f) => path.basename(f) === projectName);
        if (matchingFolder) {
          targetProjectFolder = matchingFolder;
        }
      }
      if (!targetProjectFolder) {
        console.log(`   \u26A0\uFE0F  No project folder available for feature creation`);
        return null;
      }
      const featureFolder = path.join(targetProjectFolder, featureId);
      await mkdir(featureFolder, { recursive: true });
      const userStories = this.parseUserStoriesFromSpec(specContent, featureId);
      const featureMd = this.buildFeatureMd(featureId, title, status, priority, created, incrementId, userStories);
      await writeFile(path.join(featureFolder, "FEATURE.md"), featureMd, "utf-8");
      for (const us of userStories) {
        const usFilename = `us-${us.id.replace("US-", "").padStart(3, "0")}-${this.slugify(us.title)}.md`;
        const usMd = this.buildUserStoryMd(us, featureId, incrementId);
        await writeFile(path.join(featureFolder, usFilename), usMd, "utf-8");
      }
      console.log(`   \u2705 Auto-created feature folder with ${userStories.length} user stories`);
      return featureFolder;
    } catch (error) {
      console.log(`   \u26A0\uFE0F  Failed to auto-create feature folder: ${error.message}`);
      return null;
    }
  }
  /**
   * Parse user stories from spec.md markdown content.
   */
  parseUserStoriesFromSpec(specContent, featureId) {
    const stories = [];
    const usRegex = /### (US-\d+):\s*(.+?)(?:\s*\((P\d)\))?\s*\n([\s\S]*?)(?=\n### US-|\n## |\n---\s*\n### US-|$)/g;
    let match;
    while ((match = usRegex.exec(specContent)) !== null) {
      const usId = match[1];
      const rawTitle = match[2].trim();
      const priority = match[3] || "P2";
      const body = match[4];
      if (rawTitle === "[Story Title]") continue;
      const projectMatch = body.match(/\*\*Project\*\*:\s*(\S+)/);
      const project = projectMatch ? projectMatch[1] : "specweave";
      const storyMatch = body.match(/\*\*As a\*\*\s+([\s\S]*?)(?=\n\*\*Acceptance Criteria|$)/);
      const storyText = storyMatch ? storyMatch[1].trim() : "";
      const acs = [];
      const acRegex = /- \[[ x]\] \*\*AC-[^*]+\*\*:\s*(.+)/g;
      let acMatch;
      while ((acMatch = acRegex.exec(body)) !== null) {
        acs.push(acMatch[0]);
      }
      const totalAcs = acs.length;
      const completedAcs = acs.filter((ac) => ac.startsWith("- [x]")).length;
      let status = "not-started";
      if (totalAcs > 0 && completedAcs === totalAcs) status = "complete";
      else if (completedAcs > 0) status = "active";
      stories.push({
        id: usId,
        title: rawTitle,
        priority,
        project,
        storyText,
        acceptanceCriteria: acs,
        status
      });
    }
    return stories;
  }
  /**
   * Build FEATURE.md content matching the living docs format.
   */
  buildFeatureMd(featureId, title, status, priority, created, incrementId, userStories) {
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const mappedStatus = status === "planned" ? "planning" : status === "completed" ? "complete" : status === "active" ? "active" : "planning";
    const fm = {
      id: featureId,
      title,
      type: "feature",
      status: mappedStatus,
      priority,
      created,
      lastUpdated: now,
      tldr: title,
      complexity: "medium",
      auto_created: true
    };
    const yamlFm = yaml.stringify(fm);
    let body = `
# ${title}

## TL;DR

**What**: ${title}
**Status**: ${mappedStatus} | **Priority**: ${priority}
**User Stories**: ${userStories.length}

## Overview

${title}

## Implementation History

| Increment | Status |
|-----------|--------|
| [${incrementId}](../../../../../increments/${incrementId}/spec.md) | ${mappedStatus} |

## User Stories
`;
    for (const us of userStories) {
      body += `
- [${us.id}: ${us.title}](./${us.id.toLowerCase()}.md)`;
    }
    return `---
${yamlFm}---${body}
`;
  }
  /**
   * Build us-NNN.md content matching the living docs format.
   */
  buildUserStoryMd(us, featureId, incrementId) {
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const fm = {
      id: us.id,
      feature: featureId,
      title: us.title,
      status: us.status,
      priority: us.priority,
      created: now,
      project: us.project
    };
    const yamlFm = yaml.stringify(fm);
    let body = `
# ${us.id}: ${us.title}

**Feature**: [${featureId}](./FEATURE.md)

`;
    if (us.storyText) {
      body += `${us.storyText}

`;
    }
    body += `---

## Acceptance Criteria

`;
    if (us.acceptanceCriteria.length > 0) {
      body += us.acceptanceCriteria.join("\n") + "\n";
    } else {
      body += `- [ ] **AC-${us.id.replace("US-", "US")}-01**: Pending specification
`;
    }
    body += `
---

## Implementation

**Increment**: [${incrementId}](../../../../../increments/${incrementId}/spec.md)
`;
    return `---
${yamlFm}---${body}
`;
  }
  /**
   * Convert a title to a URL-safe slug.
   */
  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 60);
  }
  /**
   * Backfill increment metadata.json with GitHub issue reference (v1.0.240)
   *
   * Writes in BOTH formats:
   * - OLD format (metadata.github.issues[]) for backward compatibility
   * - NEW format (metadata.externalLinks.github) for reconciler/closure flows
   * Non-blocking — errors are logged but don't halt sync.
   */
  async backfillIncrementMetadata(featureId, userStoryId, issueNumber, milestoneNumber) {
    try {
      const featureNumMatch = featureId.match(/FS-0*(\d+)E?/i);
      if (!featureNumMatch) return;
      const num = parseInt(featureNumMatch[1], 10);
      const paddedNum = String(num).padStart(4, "0");
      const incrementsDir = path.join(this.projectRoot, ".specweave/increments");
      if (!existsSync(incrementsDir)) return;
      const entries = await readdir(incrementsDir);
      const match = entries.find((e) => e.startsWith(paddedNum + "-"));
      if (!match) return;
      const metadataPath = path.join(incrementsDir, match, "metadata.json");
      if (!existsSync(metadataPath)) return;
      const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
      const issueUrl = `https://github.com/${this.client.getOwner()}/${this.client.getRepo()}/issues/${issueNumber}`;
      let changed = false;
      if (!metadata.github) metadata.github = {};
      if (!metadata.github.issues) metadata.github.issues = [];
      const existsOld = metadata.github.issues.some(
        (i) => i.userStory === userStoryId
      );
      if (!existsOld) {
        metadata.github.issues.push({
          userStory: userStoryId,
          number: issueNumber,
          url: issueUrl,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        metadata.github.lastSync = (/* @__PURE__ */ new Date()).toISOString();
        changed = true;
      }
      if (!metadata.externalLinks) metadata.externalLinks = {};
      if (!metadata.externalLinks.github) metadata.externalLinks.github = {};
      if (!metadata.externalLinks.github.issues) metadata.externalLinks.github.issues = {};
      const existsNew = metadata.externalLinks.github.issues[userStoryId];
      if (!existsNew) {
        metadata.externalLinks.github.issues[userStoryId] = {
          issueNumber,
          issueUrl,
          status: "active"
        };
        changed = true;
      }
      if (milestoneNumber && metadata.externalLinks.github.milestone !== milestoneNumber) {
        metadata.externalLinks.github.milestone = milestoneNumber;
        changed = true;
      }
      if (changed) {
        metadata.externalLinks.github.syncedAt = (/* @__PURE__ */ new Date()).toISOString();
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
        console.log(`      \u{1F4DD} Backfilled metadata.json for ${userStoryId} (dual-format)`);
      }
    } catch (error) {
      console.warn(`      \u26A0\uFE0F Metadata backfill failed: ${error.message}`);
    }
  }
  /**
   * Parse FEATURE.md frontmatter
   */
  async parseFeatureMd(featurePath) {
    const content = await readFile(featurePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`${featurePath}: Missing YAML frontmatter`);
    }
    return yaml.parse(match[1]);
  }
  /**
   * Find all User Story files for this feature across all projects
   */
  async findUserStories(featureId, projectName) {
    const userStories = [];
    let projectFolders;
    if (projectName) {
      const projectSpecific = path.join(this.specsDir, projectName);
      projectFolders = existsSync(projectSpecific) ? [projectSpecific] : [];
    } else {
      projectFolders = await this.findProjectFolders();
    }
    for (const projectFolder of projectFolders) {
      const featureSpecsFolder = path.join(projectFolder, featureId);
      if (!existsSync(featureSpecsFolder)) {
        continue;
      }
      const files = await readdir(featureSpecsFolder);
      const usFiles = files.filter((f) => f.startsWith("us-") && f.endsWith(".md"));
      for (const file of usFiles.sort()) {
        const filePath = path.join(featureSpecsFolder, file);
        const content = await readFile(filePath, "utf-8");
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) {
          console.warn(`   \u26A0\uFE0F  ${file}: Missing frontmatter, skipping`);
          continue;
        }
        const frontmatter = yaml.parse(match[1]);
        const projectName2 = path.basename(projectFolder);
        userStories.push({
          id: frontmatter.id || file.match(/us-(\d+)/)?.[0]?.toUpperCase() || "UNKNOWN",
          title: frontmatter.title || "Untitled User Story",
          filePath,
          project: projectName2,
          status: frontmatter.status || "not-started",
          existingIssue: frontmatter.external?.github?.issue || null
        });
      }
    }
    return userStories;
  }
  /**
   * Find all project folders (default, backend, frontend, etc.)
   */
  async findProjectFolders() {
    const folders = [];
    const specsRoot = this.specsDir;
    const entries = await readdir(specsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        folders.push(path.join(specsRoot, entry.name));
      }
    }
    return folders;
  }
  /**
   * Create GitHub Milestone for Feature (with duplicate detection + session cache)
   */
  async createMilestone(featureData) {
    const title = `${featureData.id}: ${featureData.title}`;
    const owner = this.client.getOwner();
    const repo = this.client.getRepo();
    const description = `Feature ${featureData.id}

Status: ${featureData.status}
Created: ${featureData.created}`;
    return MilestoneCache.getOrCreate(owner, repo, title, description, this.getGhEnv());
  }
  /**
   * Create GitHub Issue for User Story with AC/Task Verification
   *
   * ✅ VERIFICATION GATE FIX:
   * - Verifies actual completion before closing
   * - Prevents premature closure on creation
   */
  async createUserStoryIssue(issueContent, milestoneTitle, userStoryPath) {
    const repoSlug = `${this.client.getOwner()}/${this.client.getRepo()}`;
    await ensureLabels(repoSlug, issueContent.labels, this.getGhEnv());
    const result = await execFileNoThrow("gh", [
      "issue",
      "create",
      "--repo",
      repoSlug,
      "--title",
      issueContent.title,
      "--body",
      issueContent.body,
      "--milestone",
      milestoneTitle,
      ...issueContent.labels.flatMap((label) => ["--label", label])
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(`Failed to create GitHub Issue: ${result.stderr || result.stdout}`);
    }
    const match = result.stdout.match(/issues\/(\d+)/);
    if (!match) {
      throw new Error(`Failed to parse issue number from: ${result.stdout}`);
    }
    const issueNumber = parseInt(match[1], 10);
    const completion = await this.calculator.calculateCompletion(userStoryPath);
    if (completion.overallComplete) {
      await execFileNoThrow("gh", [
        "issue",
        "close",
        issueNumber.toString(),
        "--comment",
        this.calculator.buildCompletionComment(completion),
        "-R",
        repoSlug
      ], { env: this.getGhEnv() });
      console.log(
        `      \u2705 Created and verified complete: ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
      );
    } else {
      await this.postProgressCommentIfChanged(issueNumber, completion);
    }
    return issueNumber;
  }
  /**
   * Update existing GitHub Issue for User Story with AC/Task Verification
   *
   * ✅ VERIFICATION GATE FIX:
   * - OLD: Closed based on frontmatter `status: complete`
   * - NEW: Closes ONLY if all ACs and tasks are [x]
   *
   * This prevents Issue #574 type bugs (premature closure)
   */
  async updateUserStoryIssue(issueNumber, issueContent, userStoryPath) {
    const repoSlug = this.getRepoSlug();
    let shouldEdit = true;
    try {
      const viewResult = await execFileNoThrow("gh", [
        "issue",
        "view",
        issueNumber.toString(),
        "--json",
        "body",
        "--jq",
        ".body",
        "-R",
        repoSlug
      ], { env: this.getGhEnv() });
      if (viewResult.exitCode === 0 && viewResult.stdout) {
        const currentNormalized = normalizeIssueBody(viewResult.stdout);
        const newNormalized = normalizeIssueBody(issueContent.body);
        if (currentNormalized === newNormalized) {
          shouldEdit = false;
          console.log(`      \u23ED\uFE0F  Body unchanged, skipping gh issue edit for #${issueNumber}`);
        }
      }
    } catch {
    }
    if (shouldEdit) {
      await execFileNoThrow("gh", [
        "issue",
        "edit",
        issueNumber.toString(),
        "--title",
        issueContent.title,
        "--body",
        issueContent.body,
        "-R",
        repoSlug
      ], { env: this.getGhEnv() });
    }
    const completion = await this.calculator.calculateCompletion(userStoryPath);
    const { issue: issueData, lastComment } = await this.client.getIssueWithLastComment(issueNumber);
    const currentlyClosed = issueData.state === "closed";
    let mutatedIssue = false;
    if (completion.overallComplete) {
      if (!currentlyClosed) {
        const commentAlreadyPosted = lastComment?.body?.includes("\u2705 User Story Complete");
        if (commentAlreadyPosted) {
          await execFileNoThrow("gh", [
            "issue",
            "close",
            issueNumber.toString(),
            "-R",
            repoSlug
          ], { env: this.getGhEnv() });
          console.log(
            `      \u2705 Verified complete (comment already posted): ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
          );
        } else {
          await execFileNoThrow("gh", [
            "issue",
            "close",
            issueNumber.toString(),
            "--comment",
            this.calculator.buildCompletionComment(completion),
            "-R",
            repoSlug
          ], { env: this.getGhEnv() });
          console.log(
            `      \u2705 Verified complete: ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
          );
        }
        mutatedIssue = true;
      }
    } else {
      if (currentlyClosed) {
        await execFileNoThrow("gh", [
          "issue",
          "reopen",
          issueNumber.toString(),
          "--comment",
          this.calculator.buildReopenComment(completion, "Work verification failed"),
          "-R",
          repoSlug
        ], { env: this.getGhEnv() });
        console.log(
          `      \u26A0\uFE0F Reopened: ${completion.blockingAcs.length + completion.blockingTasks.length} items incomplete`
        );
        mutatedIssue = true;
      } else {
        await this.postProgressCommentIfChanged(issueNumber, completion, lastComment);
      }
    }
    await this.updateStatusLabels(
      issueNumber,
      completion,
      mutatedIssue ? void 0 : issueData,
      mutatedIssue ? void 0 : lastComment
    );
  }
  /**
   * Update status labels on GitHub issue based on completion state
   *
   * SMART LABEL MANAGEMENT:
   * - Only manages status:* labels (status:not_started, status:in-progress, status:completed)
   * - Preserves all other labels (priority, type, custom labels)
   * - Ensures exactly one status label is present
   */
  async updateStatusLabels(issueNumber, completion, cachedIssueData, cachedLastComment) {
    try {
      const issueData = cachedIssueData || await this.client.getIssue(issueNumber);
      const currentLabels = issueData.labels || [];
      const statusLabels = currentLabels.filter((label) => label.startsWith("status:"));
      const otherLabels = currentLabels.filter((label) => !label.startsWith("status:"));
      let newStatusLabel;
      if (completion.overallComplete) {
        newStatusLabel = "status:complete";
      } else if (completion.acsPercentage > 0 || completion.tasksPercentage > 0) {
        newStatusLabel = "status:active";
      } else if (
        // v0.35.1 FIX: For external-origin USs without ACs/tasks, use frontmatter status
        // This fixes issue #889 where external USs always showed "not_started"
        (completion.acsTotal === 0 || completion.acsTotal === void 0) && (completion.tasksTotal === 0 || completion.tasksTotal === void 0) && completion.frontmatterStatus
      ) {
        switch (completion.frontmatterStatus) {
          case "complete":
          case "completed":
            newStatusLabel = "status:complete";
            break;
          case "active":
          case "in-progress":
            newStatusLabel = "status:active";
            break;
          case "planning":
          case "not-started":
          default:
            newStatusLabel = "status:not_started";
        }
        console.log(`      \u2139\uFE0F  Using frontmatter status (no ACs/tasks): ${completion.frontmatterStatus} \u2192 ${newStatusLabel}`);
      } else {
        newStatusLabel = "status:not_started";
      }
      const needsUpdate = statusLabels.length !== 1 || !statusLabels.includes(newStatusLabel);
      if (!needsUpdate) {
        return;
      }
      if (statusLabels.length > 0) {
        await execFileNoThrow("gh", [
          "issue",
          "edit",
          issueNumber.toString(),
          "-R",
          this.getRepoSlug(),
          "--remove-label",
          ...statusLabels
        ], { env: this.getGhEnv() });
      }
      const result = await execFileNoThrow("gh", [
        "issue",
        "edit",
        issueNumber.toString(),
        "-R",
        this.getRepoSlug(),
        "--add-label",
        newStatusLabel
      ], { env: this.getGhEnv() });
      if (result.exitCode === 0) {
        console.log(`      \u{1F3F7}\uFE0F  Updated label: ${newStatusLabel}`);
      } else {
        console.warn(`      \u26A0\uFE0F  Failed to add label ${newStatusLabel}: ${result.stderr}`);
      }
      if (newStatusLabel === "status:complete" && issueData.state.toLowerCase() !== "closed") {
        try {
          const freshState = issueData.state.toLowerCase();
          if (freshState === "closed") {
            console.log(`      \u23ED\uFE0F  Issue #${issueNumber} already closed (skipping duplicate close)`);
          } else {
            const lastComment = cachedLastComment || await this.client.getLastComment(issueNumber);
            if (lastComment?.body?.includes("\u2705 User Story Complete")) {
              await execFileNoThrow("gh", [
                "issue",
                "close",
                issueNumber.toString(),
                "-R",
                this.getRepoSlug()
              ], { env: this.getGhEnv() });
              console.log(`      \u2705 Auto-closed issue #${issueNumber} (comment already posted)`);
            } else {
              const completionComment = this.calculator.buildCompletionComment(completion);
              await execFileNoThrow("gh", [
                "issue",
                "close",
                issueNumber.toString(),
                "-R",
                this.getRepoSlug(),
                "--comment",
                completionComment
              ], { env: this.getGhEnv() });
              console.log(`      \u2705 Auto-closed issue #${issueNumber} (status:complete)`);
            }
          }
        } catch (closeError) {
          console.warn(`      \u26A0\uFE0F  Failed to auto-close issue #${issueNumber}: ${closeError.message}`);
        }
      }
    } catch (error) {
      console.warn(`      \u26A0\uFE0F  Failed to update status labels: ${error.message}`);
    }
  }
  /**
   * Post progress comment only if it differs from the last comment
   *
   * DEDUPLICATION FIX (2025-11-24):
   * - Prevents posting identical consecutive comments
   * - Fetches last comment from issue
   * - Compares content (ignoring timestamps)
   * - Only posts if progress has changed
   *
   * Root Cause: updateUserStoryIssue() was posting progress comments on EVERY sync,
   * even when progress hadn't changed, causing 4+ duplicate comments.
   *
   * @param issueNumber - GitHub issue number
   * @param completion - Completion status with AC/task metrics
   */
  async postProgressCommentIfChanged(issueNumber, completion, cachedLastComment) {
    try {
      const repoSlug = this.getRepoSlug();
      let lastCommentBody = "";
      if (cachedLastComment) {
        lastCommentBody = cachedLastComment.body || "";
      } else {
        const fetchedComment = await this.client.getLastComment(issueNumber);
        lastCommentBody = fetchedComment?.body || "";
      }
      const newCommentBody = this.calculator.buildProgressComment(completion);
      const normalizeComment = (text) => {
        return text.replace(/🤖 Auto-updated by SpecWeave AC Completion Gate/g, "").replace(/\s+/g, " ").trim();
      };
      const normalizedLast = normalizeComment(lastCommentBody);
      const normalizedNew = normalizeComment(newCommentBody);
      if (normalizedLast === normalizedNew) {
        console.log(
          `      \u23ED\uFE0F  Progress unchanged (${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks) - skipping duplicate comment`
        );
        return;
      }
      await execFileNoThrow("gh", [
        "issue",
        "comment",
        issueNumber.toString(),
        "-R",
        repoSlug,
        "--body",
        newCommentBody
      ], { env: this.getGhEnv() });
      console.log(
        `      \u{1F4CA} Progress: ${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks (updated)`
      );
    } catch (error) {
      console.error(`      \u26A0\uFE0F  Failed to check/post progress comment: ${error.message}`);
    }
  }
  /**
   * Update FEATURE.md with GitHub Milestone link
   */
  async updateFeatureMd(featurePath, milestone) {
    const content = await readFile(featurePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`${featurePath}: Missing YAML frontmatter`);
    }
    const frontmatter = yaml.parse(match[1]);
    if (!frontmatter.external_tools) {
      frontmatter.external_tools = {};
    }
    frontmatter.external_tools.github = milestone;
    const newFrontmatter = yaml.stringify(frontmatter);
    const bodyContent = content.slice(match[0].length);
    const newContent = `---
${newFrontmatter}---${bodyContent}`;
    await writeFile(featurePath, newContent, "utf-8");
  }
  /**
   * Update User Story frontmatter with GitHub issue link
   */
  async updateUserStoryFrontmatter(userStoryPath, issueNumber) {
    const content = await readFile(userStoryPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`${userStoryPath}: Missing YAML frontmatter`);
    }
    const frontmatter = yaml.parse(match[1]);
    if (!frontmatter.external_tools) {
      frontmatter.external_tools = {};
    }
    if (!frontmatter.external_tools.github) {
      frontmatter.external_tools.github = {};
    }
    frontmatter.external_tools.github.issue = issueNumber;
    frontmatter.external_tools.github.url = `https://github.com/${this.client.getOwner()}/${this.client.getRepo()}/issues/${issueNumber}`;
    if (!frontmatter.external) {
      frontmatter.external = {};
    }
    if (!frontmatter.external.github) {
      frontmatter.external.github = {};
    }
    frontmatter.external.github.issue = issueNumber;
    frontmatter.external.github.url = frontmatter.external_tools.github.url;
    const newFrontmatter = yaml.stringify(frontmatter);
    const bodyContent = content.slice(match[0].length);
    const newContent = `---
${newFrontmatter}---${bodyContent}`;
    await writeFile(userStoryPath, newContent, "utf-8");
  }
}
export {
  GitHubFeatureSync
};

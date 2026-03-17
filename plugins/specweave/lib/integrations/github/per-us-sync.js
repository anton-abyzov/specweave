import { Octokit } from "@octokit/rest";
import { consoleLogger } from "../../../../../src/utils/logger.js";
class PerUSGitHubSync {
  constructor(token, projectMappings, options = {}) {
    this.token = token;
    this.projectMappings = projectMappings;
    this.octokit = new Octokit({ auth: token });
    this.logger = options.logger ?? consoleLogger;
  }
  /**
   * Sync all user stories to their respective GitHub repos
   *
   * @param userStories - User stories with explicit project fields
   * @param featureId - Feature ID (e.g., "FS-137")
   * @param options - Sync options
   */
  async syncUserStories(userStories, featureId, options = {}) {
    const synced = [];
    const failed = [];
    const externalRefs = {};
    const groups = this.groupByProject(userStories, options.defaultProject);
    this.logger.log(`\u{1F4E1} Per-US GitHub Sync: ${userStories.length} USs across ${groups.size} projects`);
    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.github;
      if (!mapping) {
        this.logger.warn(`   \u26A0\uFE0F  No GitHub mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            repo: "N/A",
            issueNumber: 0,
            url: "",
            action: "skipped",
            error: `No GitHub mapping for project "${projectId}"`
          });
        }
        continue;
      }
      for (const story of stories) {
        try {
          const result = await this.syncUserStory(story, mapping, featureId, options);
          synced.push({
            ...result,
            projectId
          });
          if (!options.dryRun && result.action !== "skipped") {
            externalRefs[story.id] = {
              github: {
                provider: "github",
                issueNumber: result.issueNumber,
                url: result.url,
                targetProject: projectId,
                lastSynced: (/* @__PURE__ */ new Date()).toISOString()
              }
            };
          }
        } catch (error) {
          failed.push({
            usId: story.id,
            projectId,
            repo: `${mapping.owner}/${mapping.repo}`,
            issueNumber: 0,
            url: "",
            action: "skipped",
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    const created = synced.filter((r) => r.action === "created").length;
    const updated = synced.filter((r) => r.action === "updated").length;
    const skipped = synced.filter((r) => r.action === "skipped").length;
    return {
      success: failed.length === 0,
      synced,
      failed,
      externalRefs,
      summary: {
        total: userStories.length,
        created,
        updated,
        skipped,
        failed: failed.length
      }
    };
  }
  /**
   * Sync a single user story to GitHub
   */
  async syncUserStory(story, mapping, featureId, options) {
    const title = `[${featureId}][${story.id}] ${story.title}`;
    const body = this.buildIssueBody(story, featureId);
    if (options.dryRun) {
      this.logger.log(`   \u{1F50D} [DRY-RUN] Would sync ${story.id} to ${mapping.owner}/${mapping.repo}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: 0,
        url: "",
        action: "skipped"
      };
    }
    const existingIssue = await this.findExistingIssue(mapping, story.id);
    if (existingIssue) {
      const response = await this.octokit.issues.update({
        owner: mapping.owner,
        repo: mapping.repo,
        issue_number: existingIssue.number,
        title,
        body
      });
      this.logger.log(`   \u{1F504} Updated ${story.id} \u2192 ${mapping.owner}/${mapping.repo}#${response.data.number}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: "updated"
      };
    } else {
      const response = await this.octokit.issues.create({
        owner: mapping.owner,
        repo: mapping.repo,
        title,
        body,
        labels: ["specweave", "user-story"]
      });
      this.logger.log(`   \u2705 Created ${story.id} \u2192 ${mapping.owner}/${mapping.repo}#${response.data.number}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: "created"
      };
    }
  }
  /**
   * Find existing issue by US ID in title
   *
   * Paginates through all issues to avoid missing matches on repos with 100+ issues.
   * Deduplicates by issue number before returning.
   */
  async findExistingIssue(mapping, usId) {
    try {
      const seenNumbers = /* @__PURE__ */ new Set();
      let page = 1;
      const perPage = 100;
      while (true) {
        const response = await this.octokit.issues.listForRepo({
          owner: mapping.owner,
          repo: mapping.repo,
          labels: "specweave",
          state: "all",
          per_page: perPage,
          page
        });
        for (const issue of response.data) {
          if (seenNumbers.has(issue.number)) continue;
          seenNumbers.add(issue.number);
          if (issue.title.includes(`[${usId}]`)) {
            return { number: issue.number };
          }
        }
        if (response.data.length < perPage) break;
        page++;
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * Build issue body from user story
   *
   * Includes full User Story format with description and Acceptance Criteria.
   * Uses `acceptanceCriteriaFull` if available (v1.0.59+) for AC descriptions,
   * otherwise falls back to AC IDs only.
   */
  buildIssueBody(story, featureId) {
    const lines = [];
    lines.push(`# ${story.title}`);
    lines.push("");
    if (story.description) {
      lines.push(story.description);
      lines.push("");
    }
    if (story.acceptanceCriteriaFull && story.acceptanceCriteriaFull.length > 0) {
      lines.push("## Acceptance Criteria");
      lines.push("");
      for (const ac of story.acceptanceCriteriaFull) {
        const checkbox = ac.completed ? "[x]" : "[ ]";
        lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
      }
      lines.push("");
    } else if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push("## Acceptance Criteria");
      lines.push("");
      for (const ac of story.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push(`**Feature**: ${featureId}`);
    lines.push(`**User Story**: ${story.id}`);
    if (story.project) {
      lines.push(`**Project**: ${story.project}`);
    }
    if (story.board) {
      lines.push(`**Board**: ${story.board}`);
    }
    return lines.join("\n");
  }
  /**
   * Group user stories by their explicit project field
   */
  groupByProject(userStories, defaultProject) {
    const groups = /* @__PURE__ */ new Map();
    for (const story of userStories) {
      const project = story.project || defaultProject || "default";
      if (!groups.has(project)) {
        groups.set(project, []);
      }
      groups.get(project).push(story);
    }
    return groups;
  }
}
async function syncACCheckboxesToGitHub(token, owner, repo, issueNumber, acStatus, options = {}) {
  const logger = options.logger ?? consoleLogger;
  const updated = [];
  try {
    const octokit = new Octokit({ auth: token });
    const issue = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });
    let body = issue.data.body || "";
    const originalBody = body;
    for (const [acId, completed] of acStatus) {
      const checkboxState = completed ? "x" : " ";
      const escapedAcId = acId.replace(/-/g, "\\-");
      const boldRegex = new RegExp(`(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`, "g");
      const plainRegex = new RegExp(`(- \\[)[ x](\\] ${escapedAcId}:)`, "g");
      const beforeUpdate = body;
      body = body.replace(boldRegex, `$1${checkboxState}$2`);
      body = body.replace(plainRegex, `$1${checkboxState}$2`);
      if (body !== beforeUpdate) {
        updated.push(acId);
      }
    }
    if (body === originalBody) {
      logger.log(`   \u23ED\uFE0F  No AC checkbox changes needed for issue #${issueNumber}`);
      return { success: true, updated: [] };
    }
    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
    logger.log(`   \u2705 Updated ${updated.length} AC checkboxes in issue #${issueNumber}`);
    if (options.addComment && updated.length > 0) {
      const completedCount = [...acStatus.values()].filter((v) => v).length;
      const totalCount = acStatus.size;
      const percentage = Math.round(completedCount / totalCount * 100);
      const commentBody = `## \u{1F4CA} Progress Update

**Acceptance Criteria**: ${completedCount}/${totalCount} (${percentage}%)

**Recently completed:**
${updated.filter((id) => acStatus.get(id)).map((id) => `- \u2705 ${id}`).join("\n")}

---
\u{1F916} Auto-updated by SpecWeave AC Completion Gate`;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: commentBody
      });
      logger.log(`   \u{1F4AC} Added progress comment to issue #${issueNumber}`);
    }
    return { success: true, updated };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`\u26A0\uFE0F  Failed to sync AC checkboxes to issue #${issueNumber}: ${errorMsg}`);
    return { success: false, error: errorMsg, updated: [] };
  }
}
function formatPerUSSyncResults(result) {
  const lines = [];
  lines.push("");
  lines.push("\u{1F4CA} Per-US GitHub Sync Results");
  lines.push("");
  const byProject = /* @__PURE__ */ new Map();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}**:`);
    for (const r of results) {
      const icon = r.action === "created" ? "\u2705" : r.action === "updated" ? "\u{1F504}" : r.error ? "\u274C" : "\u23ED\uFE0F";
      if (r.issueNumber > 0) {
        lines.push(`  ${icon} ${r.usId} \u2192 ${r.repo}#${r.issueNumber}`);
      } else if (r.error) {
        lines.push(`  ${icon} ${r.usId}: ${r.error}`);
      } else {
        lines.push(`  ${icon} ${r.usId} (${r.action})`);
      }
    }
    lines.push("");
  }
  lines.push(`\u{1F4C8} Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`);
  return lines.join("\n");
}
export {
  PerUSGitHubSync,
  formatPerUSSyncResults,
  syncACCheckboxesToGitHub
};

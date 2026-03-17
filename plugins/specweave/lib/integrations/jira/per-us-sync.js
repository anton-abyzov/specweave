import { consoleLogger } from "../../../../../src/utils/logger.js";
class PerUSJiraSync {
  constructor(jiraClient, projectMappings, options = {}) {
    this.jiraClient = jiraClient;
    this.projectMappings = projectMappings;
    this.logger = options.logger ?? consoleLogger;
  }
  /**
   * Sync all user stories to their respective JIRA projects
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
    this.logger.log(`\u{1F4E1} Per-US JIRA Sync: ${userStories.length} USs across ${groups.size} projects`);
    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.jira;
      if (!mapping) {
        this.logger.warn(`   \u26A0\uFE0F  No JIRA mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            jiraProject: "N/A",
            issueKey: "",
            url: "",
            action: "skipped",
            error: `No JIRA mapping for project "${projectId}"`
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
              jira: {
                provider: "jira",
                issueNumber: result.issueKey,
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
            jiraProject: mapping.project,
            issueKey: "",
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
   * Sync a single user story to JIRA
   */
  async syncUserStory(story, mapping, featureId, options) {
    const summary = `[${featureId}][${story.id}] ${story.title}`;
    const description = this.buildIssueDescription(story, featureId);
    if (options.dryRun) {
      this.logger.log(`   \u{1F50D} [DRY-RUN] Would sync ${story.id} to JIRA project ${mapping.project}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        jiraProject: mapping.project,
        issueKey: "",
        url: "",
        action: "skipped"
      };
    }
    const existingIssue = await this.findExistingIssue(mapping.project, story.id);
    if (existingIssue) {
      await this.jiraClient.updateIssue(existingIssue.key, summary, description);
      this.logger.log(`   \u{1F504} Updated ${story.id} \u2192 ${existingIssue.key}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        jiraProject: mapping.project,
        issueKey: existingIssue.key,
        url: this.jiraClient.getIssueUrl(existingIssue.key),
        action: "updated"
      };
    } else {
      const newIssue = await this.jiraClient.createIssue(
        mapping.project,
        "Story",
        summary,
        description
      );
      this.logger.log(`   \u2705 Created ${story.id} \u2192 ${newIssue.key}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        jiraProject: mapping.project,
        issueKey: newIssue.key,
        url: this.jiraClient.getIssueUrl(newIssue.key),
        action: "created"
      };
    }
  }
  /**
   * Find existing issue by US ID in summary
   */
  async findExistingIssue(project, usId) {
    try {
      const jql = `project = "${project}" AND summary ~ "[${usId}]"`;
      const results = await this.jiraClient.searchIssues(jql);
      return results.length > 0 ? { key: results[0].key } : null;
    } catch {
      return null;
    }
  }
  /**
   * Build issue description from user story
   *
   * Includes full User Story format with description and Acceptance Criteria.
   * Uses `acceptanceCriteriaFull` if available (v1.0.59+) for AC descriptions,
   * otherwise falls back to AC IDs only.
   */
  buildIssueDescription(story, featureId) {
    const lines = [];
    lines.push(`h1. ${story.title}`);
    lines.push("");
    if (story.description) {
      const jiraDesc = story.description.replace(/\*\*As a\*\*/g, "*As a*").replace(/\*\*I want\*\*/g, "*I want*").replace(/\*\*So that\*\*/g, "*So that*");
      lines.push(jiraDesc);
      lines.push("");
    }
    if (story.acceptanceCriteriaFull && story.acceptanceCriteriaFull.length > 0) {
      lines.push("h2. Acceptance Criteria");
      lines.push("");
      for (const ac of story.acceptanceCriteriaFull) {
        const checkbox = ac.completed ? "(/)" : "(x)";
        lines.push(`* ${checkbox} *${ac.id}*: ${ac.description}`);
      }
      lines.push("");
    } else if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push("h2. Acceptance Criteria");
      lines.push("");
      for (const ac of story.acceptanceCriteria) {
        lines.push(`* (x) ${ac}`);
      }
      lines.push("");
    }
    lines.push("----");
    lines.push("");
    lines.push(`*Feature*: ${featureId}`);
    lines.push(`*User Story*: ${story.id}`);
    if (story.project) {
      lines.push(`*Project*: ${story.project}`);
    }
    if (story.board) {
      lines.push(`*Board*: ${story.board}`);
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
function formatPerUSSyncResults(result) {
  const lines = [];
  lines.push("");
  lines.push("\u{1F4CA} Per-US JIRA Sync Results");
  lines.push("");
  const byProject = /* @__PURE__ */ new Map();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}** (\u2192 ${results[0]?.jiraProject || "N/A"}):`);
    for (const r of results) {
      const icon = r.action === "created" ? "\u2705" : r.action === "updated" ? "\u{1F504}" : r.error ? "\u274C" : "\u23ED\uFE0F";
      if (r.issueKey) {
        lines.push(`  ${icon} ${r.usId} \u2192 ${r.issueKey}`);
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
  PerUSJiraSync,
  formatPerUSSyncResults
};

import { consoleLogger } from "../../../../../src/utils/logger.js";
const WORK_ITEM_TYPE_BY_TEMPLATE = {
  agile: "User Story",
  scrum: "Product Backlog Item",
  cmmi: "Requirement",
  basic: "Issue"
};
class PerUSAdoSync {
  constructor(adoClient, projectMappings, options = {}) {
    this.adoClient = adoClient;
    this.projectMappings = projectMappings;
    this.logger = options.logger ?? consoleLogger;
    this.workItemType = options.workItemType ?? WORK_ITEM_TYPE_BY_TEMPLATE[options.processTemplate?.toLowerCase() ?? ""] ?? "User Story";
  }
  /**
   * Sync all user stories to their respective ADO projects
   *
   * @param userStories - User stories with explicit project/board fields
   * @param featureId - Feature ID (e.g., "FS-137")
   * @param options - Sync options
   */
  async syncUserStories(userStories, featureId, options = {}) {
    const synced = [];
    const failed = [];
    const externalRefs = {};
    const groups = this.groupByProject(userStories, options.defaultProject);
    this.logger.log(`\u{1F4E1} Per-US ADO Sync: ${userStories.length} USs across ${groups.size} projects`);
    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.ado;
      if (!mapping) {
        this.logger.warn(`   \u26A0\uFE0F  No ADO mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            adoProject: "N/A",
            areaPath: "",
            workItemId: 0,
            url: "",
            action: "skipped",
            error: `No ADO mapping for project "${projectId}"`
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
              ado: {
                provider: "ado",
                issueNumber: result.workItemId,
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
            adoProject: mapping.project,
            areaPath: mapping.areaPath || "",
            workItemId: 0,
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
   * Sync a single user story to ADO
   *
   * For 2-level structures:
   * - **Project**: maps to ADO project
   * - **Board**: maps to area path under the project
   */
  async syncUserStory(story, mapping, featureId, options) {
    const title = `[${featureId}][${story.id}] ${story.title}`;
    const description = this.buildWorkItemDescription(story, featureId);
    let areaPath = mapping.areaPath || mapping.project;
    if (story.board) {
      areaPath = `${mapping.project}\\${story.board}`;
    }
    if (options.dryRun) {
      this.logger.log(`   \u{1F50D} [DRY-RUN] Would sync ${story.id} to ${mapping.project} (area: ${areaPath})`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        adoProject: mapping.project,
        areaPath,
        workItemId: 0,
        url: "",
        action: "skipped"
      };
    }
    const existingItem = await this.findExistingWorkItem(mapping.project, featureId, story.id);
    if (existingItem) {
      await this.adoClient.updateWorkItem(
        mapping.project,
        existingItem.id,
        title,
        description,
        areaPath
      );
      this.logger.log(`   \u{1F504} Updated ${story.id} \u2192 ${mapping.project}/${existingItem.id}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        adoProject: mapping.project,
        areaPath,
        workItemId: existingItem.id,
        url: this.adoClient.getWorkItemUrl(mapping.project, existingItem.id),
        action: "updated"
      };
    } else {
      const newItem = await this.adoClient.createWorkItem(
        mapping.project,
        this.workItemType,
        title,
        description,
        areaPath
      );
      this.logger.log(`   \u2705 Created ${story.id} \u2192 ${mapping.project}/${newItem.id}`);
      return {
        usId: story.id,
        projectId: story.project || "unknown",
        adoProject: mapping.project,
        areaPath,
        workItemId: newItem.id,
        url: newItem.url,
        action: "created"
      };
    }
  }
  /**
   * Find existing work item by Feature ID + US ID in title.
   * Scoped to current feature to prevent cross-increment matches (FS-604).
   */
  async findExistingWorkItem(project, featureId, usId) {
    try {
      const query = `[System.Title] Contains '[${featureId}][${usId}]'`;
      const results = await this.adoClient.searchWorkItems(project, query);
      return results.length > 0 ? { id: results[0].id } : null;
    } catch {
      return null;
    }
  }
  /**
   * Build work item description from user story
   *
   * Includes full User Story format with description and Acceptance Criteria.
   * Uses `acceptanceCriteriaFull` if available (v1.0.59+) for AC descriptions,
   * otherwise falls back to AC IDs only.
   */
  buildWorkItemDescription(story, featureId) {
    const lines = [];
    lines.push(`<h1>${this.escapeHtml(story.title)}</h1>`);
    lines.push("");
    if (story.description) {
      const htmlDesc = story.description.replace(/\*\*As a\*\*/g, "<strong>As a</strong>").replace(/\*\*I want\*\*/g, "<strong>I want</strong>").replace(/\*\*So that\*\*/g, "<strong>So that</strong>").replace(/\n/g, "<br/>");
      lines.push(`<p>${htmlDesc}</p>`);
      lines.push("");
    }
    if (story.acceptanceCriteriaFull && story.acceptanceCriteriaFull.length > 0) {
      lines.push("<h2>Acceptance Criteria</h2>");
      lines.push("<ul>");
      for (const ac of story.acceptanceCriteriaFull) {
        const checkbox = ac.completed ? "\u2611" : "\u2610";
        lines.push(`  <li>${checkbox} <strong>${this.escapeHtml(ac.id)}</strong>: ${this.escapeHtml(ac.description)}</li>`);
      }
      lines.push("</ul>");
      lines.push("");
    } else if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push("<h2>Acceptance Criteria</h2>");
      lines.push("<ul>");
      for (const ac of story.acceptanceCriteria) {
        lines.push(`  <li>\u2610 ${this.escapeHtml(ac)}</li>`);
      }
      lines.push("</ul>");
      lines.push("");
    }
    lines.push("<hr/>");
    lines.push("");
    lines.push(`<p><strong>Feature</strong>: ${this.escapeHtml(featureId)}</p>`);
    lines.push(`<p><strong>User Story</strong>: ${this.escapeHtml(story.id)}</p>`);
    if (story.project) {
      lines.push(`<p><strong>Project</strong>: ${this.escapeHtml(story.project)}</p>`);
    }
    if (story.board) {
      lines.push(`<p><strong>Board</strong>: ${this.escapeHtml(story.board)}</p>`);
    }
    return lines.join("\n");
  }
  /**
   * Escape HTML special characters
   */
  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
  lines.push("\u{1F4CA} Per-US ADO Sync Results");
  lines.push("");
  const byProject = /* @__PURE__ */ new Map();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    const adoProject = results[0]?.adoProject || "N/A";
    const areaPath = results[0]?.areaPath || "";
    lines.push(`**${projectId}** (\u2192 ${adoProject}${areaPath ? ` [${areaPath}]` : ""}):`);
    for (const r of results) {
      const icon = r.action === "created" ? "\u2705" : r.action === "updated" ? "\u{1F504}" : r.error ? "\u274C" : "\u23ED\uFE0F";
      if (r.workItemId > 0) {
        lines.push(`  ${icon} ${r.usId} \u2192 ${r.adoProject}/${r.workItemId}`);
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
  PerUSAdoSync,
  formatPerUSSyncResults
};

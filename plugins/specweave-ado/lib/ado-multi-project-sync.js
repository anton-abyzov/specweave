import axios from "axios";
import {
  getPrimaryProject,
  suggestJiraItemType,
  mapUserStoryToProjects
} from "../../../src/utils/project-mapper.js";
import { parseSpecFile } from "../../../src/utils/spec-splitter.js";
class AdoMultiProjectSync {
  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}`,
      headers: {
        "Content-Type": "application/json-patch+json",
        "Authorization": `Basic ${Buffer.from(":" + config.pat).toString("base64")}`
      }
    });
  }
  /**
   * Sync spec to ADO projects with intelligent mapping
   *
   * @param specPath Path to spec file
   * @returns Array of sync results
   */
  async syncSpec(specPath) {
    const results = [];
    const parsedSpec = await parseSpecFile(specPath);
    const isAreaPathBased = !!this.config.project && !!this.config.areaPaths;
    if (isAreaPathBased) {
      results.push(...await this.syncAreaPathBased(parsedSpec));
    } else if (this.config.projects) {
      results.push(...await this.syncMultipleProjects(parsedSpec));
    } else {
      throw new Error("Invalid config: Must specify projects[] or project+areaPaths[]");
    }
    return results;
  }
  /**
   * Pattern 1: Sync to multiple ADO projects (simple)
   *
   * Each team → separate ADO project
   * - FE user stories → FE-Project
   * - BE user stories → BE-Project
   * - MOBILE user stories → MOBILE-Project
   */
  async syncMultipleProjects(parsedSpec) {
    const results = [];
    const epicsByProject = /* @__PURE__ */ new Map();
    if (this.config.autoCreateEpics !== false) {
      for (const projectName of this.config.projects) {
        const epicResult = await this.createEpicForProject(parsedSpec, projectName);
        epicsByProject.set(projectName, epicResult.workItemId);
        results.push(epicResult);
      }
    }
    const projectStories = /* @__PURE__ */ new Map();
    for (const userStory of parsedSpec.userStories) {
      if (this.config.intelligentMapping !== false) {
        const mappings = mapUserStoryToProjects(userStory);
        if (mappings.length > 0 && mappings[0].confidence >= 0.3) {
          const primary = mappings[0];
          const projectName = this.findProjectForId(primary.projectId);
          if (projectName) {
            const existing = projectStories.get(projectName) || [];
            existing.push({ story: userStory, confidence: primary.confidence });
            projectStories.set(projectName, existing);
          }
        } else {
          console.warn(`\u26A0\uFE0F  Low confidence for ${userStory.id} (${(mappings[0]?.confidence || 0) * 100}%) - assigning to ${this.config.projects[0]}`);
          const fallback = this.config.projects[0];
          const existing = projectStories.get(fallback) || [];
          existing.push({ story: userStory, confidence: mappings[0]?.confidence || 0 });
          projectStories.set(fallback, existing);
        }
      }
    }
    for (const [projectName, stories] of projectStories.entries()) {
      const epicId = epicsByProject.get(projectName);
      for (const { story, confidence } of stories) {
        const result = await this.createWorkItemForUserStory(projectName, story, epicId, confidence);
        results.push(result);
      }
    }
    return results;
  }
  /**
   * Pattern 2: Sync to single project with area paths (advanced)
   *
   * - Single ADO project with area paths for teams
   * - Epic-level: Root area path
   * - Story-level: Team-specific area paths
   *
   * Example:
   * ADO Project: Shared-Project
   *   Epic: User Authentication (Root area path)
   *     User Story: Login UI (Area Path: Shared-Project\FE)
   *     User Story: Auth API (Area Path: Shared-Project\BE)
   *     User Story: Mobile Auth (Area Path: Shared-Project\MOBILE)
   */
  async syncAreaPathBased(parsedSpec) {
    const results = [];
    if (!this.config.project || !this.config.areaPaths) {
      throw new Error("Area path mode requires project and areaPaths");
    }
    const epicResult = await this.createEpicInRootArea(parsedSpec);
    results.push(epicResult);
    const areaPathStories = /* @__PURE__ */ new Map();
    for (const userStory of parsedSpec.userStories) {
      const primaryProject = getPrimaryProject(userStory);
      if (primaryProject) {
        const areaPath = this.findAreaPathForProjectId(primaryProject.projectId);
        if (areaPath) {
          const existing = areaPathStories.get(areaPath) || [];
          existing.push(userStory);
          areaPathStories.set(areaPath, existing);
        }
      }
    }
    for (const [areaPath, stories] of areaPathStories.entries()) {
      for (const story of stories) {
        const result = await this.createWorkItemInAreaPath(areaPath, story, epicResult.workItemId);
        results.push(result);
      }
    }
    return results;
  }
  /**
   * Create epic for project (Pattern 1: Multiple Projects)
   */
  async createEpicForProject(parsedSpec, projectName) {
    const title = `${parsedSpec.metadata.title} - ${projectName}`;
    const description = `<h2>${projectName} Implementation</h2>

<strong>Status</strong>: ${parsedSpec.metadata.status}<br/>
<strong>Priority</strong>: ${parsedSpec.metadata.priority}<br/>
<strong>Estimated Effort</strong>: ${parsedSpec.metadata.estimatedEffort || parsedSpec.metadata.estimated_effort}

<h3>Executive Summary</h3>

${parsedSpec.executiveSummary}

<h3>Scope (${projectName})</h3>

This epic covers all ${projectName}-related user stories for "${parsedSpec.metadata.title}".

User stories will be added as child work items.

---

\u{1F916} Auto-generated by SpecWeave
`;
    const workItem = await this.createWorkItem(projectName, this.config.workItemTypes?.epic || "Epic", {
      "System.Title": title,
      "System.Description": description,
      "System.State": "New"
    });
    return {
      project: projectName,
      workItemId: workItem.id,
      workItemType: "Epic",
      title,
      url: workItem.url,
      action: "created"
    };
  }
  /**
   * Create epic in root area path (Pattern 2: Area Paths)
   */
  async createEpicInRootArea(parsedSpec) {
    const title = parsedSpec.metadata.title;
    const description = `<h2>${parsedSpec.metadata.title}</h2>

<strong>Status</strong>: ${parsedSpec.metadata.status}<br/>
<strong>Priority</strong>: ${parsedSpec.metadata.priority}<br/>
<strong>Estimated Effort</strong>: ${parsedSpec.metadata.estimatedEffort || parsedSpec.metadata.estimated_effort}

<h3>Executive Summary</h3>

${parsedSpec.executiveSummary}

<h3>User Stories (${parsedSpec.userStories.length} total)</h3>

<ul>
${parsedSpec.userStories.map((s, i) => `<li>${i + 1}. ${s.id}: ${s.title}</li>`).join("\n")}
</ul>

---

\u{1F916} Auto-generated by SpecWeave
`;
    const workItem = await this.createWorkItem(this.config.project, this.config.workItemTypes?.epic || "Epic", {
      "System.Title": title,
      "System.Description": description,
      "System.AreaPath": this.config.project,
      // Root area path
      "System.State": "New"
    });
    return {
      project: this.config.project,
      workItemId: workItem.id,
      workItemType: "Epic",
      title,
      url: workItem.url,
      action: "created"
    };
  }
  /**
   * Create work item for user story (Pattern 1: Multiple Projects)
   */
  async createWorkItemForUserStory(projectName, userStory, epicId, confidence) {
    const title = `${userStory.id}: ${userStory.title}`;
    const itemType = this.mapItemTypeToAdo(suggestJiraItemType(userStory));
    const description = `<h3>${userStory.title}</h3>

${userStory.description}

<h4>Acceptance Criteria</h4>

<ul>
${userStory.acceptanceCriteria.map((ac, i) => `<li>${ac}</li>`).join("\n")}
</ul>

${userStory.technicalContext ? `<h4>Technical Context</h4>

${userStory.technicalContext}
` : ""}

${confidence !== void 0 ? `<p><em>Classification confidence: ${(confidence * 100).toFixed(0)}%</em></p>
` : ""}

<p>\u{1F916} Auto-generated by SpecWeave</p>
`;
    const fields = {
      "System.Title": title,
      "System.Description": description,
      "System.State": "New"
    };
    const workItem = await this.createWorkItem(projectName, itemType, fields);
    if (epicId) {
      await this.linkWorkItems(workItem.id, epicId, "System.LinkTypes.Hierarchy-Reverse");
    }
    return {
      project: projectName,
      workItemId: workItem.id,
      workItemType: itemType,
      title,
      url: workItem.url,
      action: "created",
      confidence
    };
  }
  /**
   * Create work item in area path (Pattern 2: Area Paths)
   */
  async createWorkItemInAreaPath(areaPath, userStory, epicId) {
    const title = `${userStory.id}: ${userStory.title}`;
    const itemType = this.mapItemTypeToAdo(suggestJiraItemType(userStory));
    const description = `<h3>${userStory.title}</h3>

${userStory.description}

<h4>Acceptance Criteria</h4>

<ul>
${userStory.acceptanceCriteria.map((ac, i) => `<li>${ac}</li>`).join("\n")}
</ul>

${userStory.technicalContext ? `<h4>Technical Context</h4>

${userStory.technicalContext}
` : ""}

<p>\u{1F916} Auto-generated by SpecWeave</p>
`;
    const fields = {
      "System.Title": title,
      "System.Description": description,
      "System.AreaPath": `${this.config.project}\\${areaPath}`,
      // Team-specific area path
      "System.State": "New"
    };
    const workItem = await this.createWorkItem(this.config.project, itemType, fields);
    if (epicId) {
      await this.linkWorkItems(workItem.id, epicId, "System.LinkTypes.Hierarchy-Reverse");
    }
    return {
      project: this.config.project,
      workItemId: workItem.id,
      workItemType: itemType,
      title,
      url: workItem.url,
      action: "created"
    };
  }
  /**
   * Create work item via ADO REST API
   */
  async createWorkItem(project, workItemType, fields) {
    const patchDocument = Object.entries(fields).map(([key, value]) => ({
      op: "add",
      path: `/fields/${key}`,
      value
    }));
    const response = await this.client.post(
      `/${project}/_apis/wit/workitems/$${workItemType}?api-version=7.0`,
      patchDocument
    );
    return response.data;
  }
  /**
   * Link work items (parent-child relationship)
   */
  async linkWorkItems(sourceId, targetId, linkType) {
    const patchDocument = [
      {
        op: "add",
        path: "/relations/-",
        value: {
          rel: linkType,
          url: `https://dev.azure.com/${this.config.organization}/_apis/wit/workItems/${targetId}`
        }
      }
    ];
    await this.client.patch(
      `/_apis/wit/workitems/${sourceId}?api-version=7.0`,
      patchDocument
    );
  }
  /**
   * Map Jira-style item type to ADO work item type
   */
  mapItemTypeToAdo(itemType) {
    const mapping = this.config.workItemTypes || {};
    switch (itemType) {
      case "Epic":
        return mapping.epic || "Epic";
      case "Story":
        return mapping.story || "User Story";
      case "Task":
        return mapping.task || "Task";
      case "Subtask":
        return mapping.task || "Task";
      // ADO doesn't have subtasks, use Task
      default:
        return "User Story";
    }
  }
  /**
   * Find ADO project name for project ID
   *
   * Maps project IDs to ADO project names:
   * - FE → FE-Project
   * - BE → BE-Project
   * - MOBILE → MOBILE-Project
   */
  findProjectForId(projectId) {
    if (!this.config.projects) return void 0;
    let match = this.config.projects.find((project) => project.toLowerCase().includes(projectId.toLowerCase()));
    if (!match) {
      const fuzzyMap = {
        FE: ["frontend", "web", "ui", "client", "fe"],
        BE: ["backend", "api", "server", "be"],
        MOBILE: ["mobile", "app", "ios", "android"],
        INFRA: ["infra", "infrastructure", "devops", "platform"]
      };
      const keywords = fuzzyMap[projectId] || [];
      match = this.config.projects.find(
        (project) => keywords.some((keyword) => project.toLowerCase().includes(keyword))
      );
    }
    return match;
  }
  /**
   * Find area path for project ID
   *
   * Maps project IDs to area paths:
   * - FE → FE
   * - BE → BE
   * - MOBILE → MOBILE
   */
  findAreaPathForProjectId(projectId) {
    if (!this.config.areaPaths) return void 0;
    let match = this.config.areaPaths.find((areaPath) => areaPath.toLowerCase() === projectId.toLowerCase());
    if (!match) {
      const fuzzyMap = {
        FE: ["frontend", "web", "ui", "client", "fe"],
        BE: ["backend", "api", "server", "be"],
        MOBILE: ["mobile", "app", "ios", "android"],
        INFRA: ["infra", "infrastructure", "devops", "platform"]
      };
      const keywords = fuzzyMap[projectId] || [];
      match = this.config.areaPaths.find(
        (areaPath) => keywords.some((keyword) => areaPath.toLowerCase().includes(keyword))
      );
    }
    return match;
  }
}
function formatAdoSyncResults(results) {
  const lines = [];
  lines.push("\u{1F4CA} Azure DevOps Multi-Project Sync Results:\n");
  const byProject = /* @__PURE__ */ new Map();
  for (const result of results) {
    const existing = byProject.get(result.project) || [];
    existing.push(result);
    byProject.set(result.project, existing);
  }
  for (const [project, projectResults] of byProject.entries()) {
    lines.push(`
**ADO Project ${project}**:`);
    for (const result of projectResults) {
      const icon = result.action === "created" ? "\u2705" : result.action === "updated" ? "\u{1F504}" : "\u23ED\uFE0F";
      const confidence = result.confidence !== void 0 ? ` (${(result.confidence * 100).toFixed(0)}% confidence)` : "";
      lines.push(`  ${icon} #${result.workItemId} [${result.workItemType}]: ${result.title}${confidence}`);
      lines.push(`     ${result.url}`);
    }
  }
  lines.push(`
\u2705 Total: ${results.length} work items synced
`);
  const epicCount = results.filter((r) => r.workItemType === "Epic").length;
  const featureCount = results.filter((r) => r.workItemType === "Feature").length;
  const storyCount = results.filter((r) => r.workItemType === "User Story").length;
  const taskCount = results.filter((r) => r.workItemType === "Task").length;
  lines.push("\u{1F4C8} Work Item Type Distribution:");
  if (epicCount > 0) lines.push(`  - Epics: ${epicCount}`);
  if (featureCount > 0) lines.push(`  - Features: ${featureCount}`);
  if (storyCount > 0) lines.push(`  - User Stories: ${storyCount}`);
  if (taskCount > 0) lines.push(`  - Tasks: ${taskCount}`);
  return lines.join("\n");
}
async function validateAdoProjects(config, projectNames) {
  const missing = [];
  const client = axios.create({
    baseURL: `https://dev.azure.com/${config.organization}`,
    headers: {
      "Authorization": `Basic ${Buffer.from(":" + config.pat).toString("base64")}`
    }
  });
  for (const name of projectNames) {
    try {
      await client.get(`/_apis/projects/${name}?api-version=7.0`);
    } catch (error) {
      missing.push(name);
    }
  }
  return missing;
}
export {
  AdoMultiProjectSync,
  formatAdoSyncResults,
  validateAdoProjects
};

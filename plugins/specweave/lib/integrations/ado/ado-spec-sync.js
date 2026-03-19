import { SpecMetadataManager } from "../../../../../src/core/specs/spec-metadata-manager.js";
import { SpecParser } from "../../../../../src/core/specs/spec-parser.js";
import { SyncCircuitBreaker } from "../../../../../src/core/increment/sync-circuit-breaker.js";
import axios from "axios";
import { promises as fsPromises, existsSync } from "fs";
import path from "path";
import yaml from "yaml";
class AdoSpecSync {
  constructor(config, projectRoot = process.cwd(), projectId, breaker) {
    this.availableTypes = null;
    /**
     * Resolve a work item state name for the given type.
     * Basic process (Issue type) uses: "To Do", "Doing", "Done"
     * Agile/Scrum process uses: "New", "Active", "Closed" / "Resolved" / "Done"
     *
     * Maps canonical states: 'New' → todo, 'Active' → in-progress, 'Closed' → done
     */
    this.stateCache = /* @__PURE__ */ new Map();
    this.projectRoot = projectRoot;
    this.specManager = new SpecMetadataManager(projectRoot, projectId);
    this.config = config;
    this.breaker = breaker ?? new SyncCircuitBreaker();
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}/${config.project}/_apis`,
      auth: {
        username: "",
        // Empty for PAT auth
        password: config.personalAccessToken
      },
      headers: {
        "Accept": "application/json"
      }
    });
  }
  /**
   * Detect available work item types for this ADO project.
   * Basic process has Epic/Issue/Task; Agile/Scrum has Feature/User Story/Bug/Task.
   */
  async detectAvailableTypes() {
    if (this.availableTypes) return this.availableTypes;
    try {
      const resp = await this.client.get("/wit/workitemtypes?api-version=7.1");
      this.availableTypes = new Set(resp.data.value.map((t) => t.name));
    } catch {
      this.availableTypes = /* @__PURE__ */ new Set(["Feature", "User Story", "Bug", "Task", "Epic"]);
    }
    return this.availableTypes;
  }
  /**
   * Resolve a work item type, falling back if not available in the project.
   * Feature → Epic (Basic process), User Story → Issue (Basic process)
   */
  async resolveWorkItemType(desiredType) {
    const types = await this.detectAvailableTypes();
    if (types.has(desiredType)) return desiredType;
    const fallbacks = {
      "Feature": "Epic",
      "User Story": "Issue"
    };
    const fallback = fallbacks[desiredType];
    if (fallback && types.has(fallback)) {
      console.log(`      \u2139\uFE0F  Work item type "${desiredType}" not available, using "${fallback}"`);
      return fallback;
    }
    return desiredType;
  }
  async resolveWorkItemState(workItemType, canonicalState) {
    if (!this.stateCache.has(workItemType)) {
      try {
        const resp = await this.client.get(
          `/wit/workitemtypes/${encodeURIComponent(workItemType)}/states?api-version=7.0`,
          { headers: { "Accept": "application/json" } }
        );
        const states = new Set(resp.data.value.map((s) => s.name));
        this.stateCache.set(workItemType, states);
      } catch {
        this.stateCache.set(workItemType, /* @__PURE__ */ new Set(["New", "Active", "Resolved", "Closed"]));
      }
    }
    const validStates = this.stateCache.get(workItemType);
    const candidates = {
      "New": ["To Do", "New", "Open"],
      "Active": ["Doing", "Active", "In Progress", "In-Progress"],
      "Closed": ["Done", "Closed", "Resolved", "Completed"]
    };
    for (const candidate of candidates[canonicalState]) {
      if (validStates.has(candidate)) return candidate;
    }
    const arr = [...validStates];
    return canonicalState === "Closed" ? arr[arr.length - 1] ?? canonicalState : arr[0] ?? canonicalState;
  }
  /**
   * Sync spec to ADO Feature (CREATE or UPDATE)
   */
  async syncSpecToAdo(specId) {
    console.log(`
\u{1F504} Syncing spec ${specId} to ADO Feature...`);
    if (!this.breaker.canSync()) {
      return {
        success: false,
        specId,
        provider: "ado",
        error: "Circuit breaker open \u2014 sync blocked"
      };
    }
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "ado",
          error: `Spec ${specId} not found`
        };
      }
      const existingLink = spec.metadata.externalLinks?.ado;
      let feature;
      if (existingLink?.featureId) {
        console.log(`   Found existing ADO Feature #${existingLink.featureId}`);
        feature = await this.updateAdoFeature(existingLink.featureId, spec);
      } else {
        console.log("   Creating new ADO Feature...");
        feature = await this.createAdoFeature(spec);
        await this.specManager.linkToExternal(specId, "ado", {
          id: feature.id,
          url: feature.url,
          organization: this.config.organization,
          project: this.config.project
        });
      }
      const changes = await this.syncUserStories(feature.id, spec);
      console.log("\u2705 Sync complete!");
      return {
        success: true,
        specId,
        provider: "ado",
        externalId: feature.id.toString(),
        url: feature.url,
        changes
      };
    } catch (error) {
      console.error("\u274C Error syncing to ADO:", error);
      return {
        success: false,
        specId,
        provider: "ado",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Sync FROM ADO Feature to spec (bidirectional)
   */
  async syncFromAdo(specId) {
    console.log(`
\u{1F504} Syncing FROM ADO to spec ${specId}...`);
    if (!this.breaker.canSync()) {
      return {
        success: false,
        specId,
        provider: "ado",
        error: "Circuit breaker open \u2014 sync blocked"
      };
    }
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "ado",
          error: `Spec ${specId} not found`
        };
      }
      const adoLink = spec.metadata.externalLinks?.ado;
      if (!adoLink?.featureId) {
        return {
          success: false,
          specId,
          provider: "ado",
          error: "Spec not linked to ADO Feature"
        };
      }
      const feature = await this.fetchAdoFeature(adoLink.featureId);
      const conflicts = await this.detectConflicts(spec, feature);
      if (conflicts.length === 0) {
        console.log("\u2705 No conflicts - spec and ADO in sync");
        return {
          success: true,
          specId,
          provider: "ado",
          externalId: feature.id.toString(),
          url: feature.url
        };
      }
      console.log(`\u26A0\uFE0F  Detected ${conflicts.length} conflict(s)`);
      await this.resolveConflicts(spec, conflicts);
      console.log("\u2705 Sync FROM ADO complete!");
      return {
        success: true,
        specId,
        provider: "ado",
        externalId: feature.id.toString(),
        url: feature.url,
        conflicts
      };
    } catch (error) {
      console.error("\u274C Error syncing FROM ADO:", error);
      return {
        success: false,
        specId,
        provider: "ado",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Create new ADO Feature for spec
   */
  async createAdoFeature(spec) {
    const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const featureDescription = this.generateFeatureDescription(spec);
    const tags = [`spec:${spec.metadata.id}`, `priority:${spec.metadata.priority}`].join("; ");
    const mappedType = this.mapTypeToAdo(spec.metadata.type, "Feature");
    const workItemType = await this.resolveWorkItemType(mappedType);
    const payload = [
      {
        op: "add",
        path: "/fields/System.Title",
        value: featureTitle
      },
      {
        op: "add",
        path: "/fields/System.Description",
        value: featureDescription
      },
      {
        op: "add",
        path: "/fields/System.WorkItemType",
        value: workItemType
      },
      {
        op: "add",
        path: "/fields/System.Tags",
        value: tags
      },
      {
        // Set native ADO Priority field (P0→1, P1→2, P2→3, P3→4)
        op: "add",
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: this.mapPriorityToAdo(spec.metadata.priority)
      }
    ];
    const encodedType = encodeURIComponent(workItemType);
    const response = await this.client.post(`/wit/workitems/$${encodedType}?api-version=7.0`, payload, {
      headers: { "Content-Type": "application/json-patch+json" }
    });
    const featureData = response.data;
    console.log(`   \u2705 Created ADO Feature #${featureData.id}: ${featureData._links.html.href}`);
    return {
      id: featureData.id,
      url: featureData._links.html.href,
      fields: featureData.fields
    };
  }
  /**
   * Update existing ADO Feature (conditional — only writes changed fields)
   */
  async updateAdoFeature(featureId, spec) {
    const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const featureDescription = this.generateFeatureDescription(spec);
    const current = await this.fetchAdoFeature(featureId);
    const payload = [];
    if (current.fields["System.Title"] !== featureTitle) {
      payload.push({
        op: "replace",
        path: "/fields/System.Title",
        value: featureTitle
      });
    } else {
      console.log(`   \u2139\uFE0F  Title unchanged, skipping`);
    }
    if (current.fields["System.Description"] !== featureDescription) {
      payload.push({
        op: "replace",
        path: "/fields/System.Description",
        value: featureDescription
      });
    } else {
      console.log(`   \u2139\uFE0F  Description unchanged, skipping`);
    }
    if (payload.length === 0) {
      console.log(`   \u2139\uFE0F  No changes detected for ADO Feature #${featureId}`);
      return current;
    }
    const response = await this.client.patch(
      `/wit/workitems/${featureId}?api-version=7.0`,
      payload,
      { headers: { "Content-Type": "application/json-patch+json" } }
    );
    const featureData = response.data;
    console.log(`   \u2705 Updated ADO Feature #${featureId} (${payload.length} field(s) changed)`);
    return {
      id: featureData.id,
      url: featureData._links.html.href,
      fields: featureData.fields
    };
  }
  /**
   * Sync user stories as ADO User Stories
   */
  async syncUserStories(featureId, spec) {
    const created = [];
    const updated = [];
    const deleted = [];
    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      console.log("   \u2139\uFE0F  No user stories to sync");
      return { created, updated, deleted };
    }
    console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);
    for (const us of spec.metadata.userStories) {
      const specId = spec.metadata.id.toUpperCase();
      const storyTitle = `[${specId}][${us.id}] ${us.title}`;
      const storyDescription = this.generateStoryDescription(us);
      const existingStory = await this.findStoryByTitle(specId, us.id);
      let storyId;
      if (existingStory) {
        const resolvedStoryType = await this.resolveWorkItemType("User Story");
        const canonicalState = us.status === "done" ? "Closed" : us.status === "in-progress" ? "Active" : "New";
        const resolvedState = await this.resolveWorkItemState(resolvedStoryType, canonicalState);
        await this.updateStory(existingStory.id, {
          title: storyTitle,
          description: storyDescription,
          state: resolvedState,
          parentId: featureId
        });
        storyId = existingStory.id;
        updated.push(us.id);
        console.log(`   \u2705 Updated ${us.id}`);
      } else {
        const newStory = await this.createStory({
          title: storyTitle,
          description: storyDescription,
          parentId: featureId,
          tags: [`user-story`, `spec:${spec.metadata.id}`, `priority:${us.priority}`].join("; "),
          priority: us.priority
        });
        storyId = newStory.id;
        created.push(us.id);
        console.log(`   \u2705 Created ${us.id} \u2192 User Story #${newStory.id}`);
      }
      await this.writeAdoIdToUSFile(spec.metadata.id, us.id, storyId);
    }
    const allDone = spec.metadata.userStories.every((us) => us.status === "done");
    if (allDone && spec.metadata.userStories.length > 0 && created.length === 0) {
      try {
        const epicType = await this.resolveWorkItemType("Feature");
        const epicClosedState = await this.resolveWorkItemState(epicType, "Closed");
        await this.client.patch(`/wit/workitems/${featureId}?api-version=7.0`, [
          { op: "replace", path: "/fields/System.State", value: epicClosedState }
        ], { headers: { "Content-Type": "application/json-patch+json" } });
        console.log(`   \u2705 All stories done \u2014 closed parent Epic #${featureId} (state: ${epicClosedState})`);
      } catch {
      }
    }
    return { created, updated, deleted };
  }
  /**
   * Write ADO work item ID back to living doc US file frontmatter.
   */
  async writeAdoIdToUSFile(featureId, usId, workItemId) {
    try {
      const specsRoot = path.join(this.projectRoot, ".specweave/docs/internal/specs");
      if (!existsSync(specsRoot)) return;
      for (const proj of await fsPromises.readdir(specsRoot)) {
        const featureDir = path.join(specsRoot, proj, featureId);
        if (!existsSync(featureDir)) continue;
        for (const file of await fsPromises.readdir(featureDir)) {
          if (!file.startsWith("us-") || !file.endsWith(".md")) continue;
          const filePath = path.join(featureDir, file);
          const content = await fsPromises.readFile(filePath, "utf-8");
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (!fmMatch) continue;
          const frontmatter = yaml.parse(fmMatch[1]);
          if (frontmatter.id !== usId) continue;
          if (frontmatter.external_tools?.ado?.id === workItemId) return;
          if (!frontmatter.external_tools) frontmatter.external_tools = {};
          if (!frontmatter.external_tools.ado) frontmatter.external_tools.ado = {};
          frontmatter.external_tools.ado.id = workItemId;
          const newFm = yaml.stringify(frontmatter).trimEnd();
          const rest = content.slice(fmMatch[0].length);
          await fsPromises.writeFile(filePath, `---
${newFm}
---${rest}`, "utf-8");
          console.log(`      \u{1F4DD} Saved ADO ID #${workItemId} to ${file}`);
          return;
        }
      }
    } catch {
    }
  }
  /**
   * Generate feature description from spec
   */
  generateFeatureDescription(spec) {
    const progress = spec.metadata.progress;
    const progressText = progress ? `**Progress**: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)` : "**Progress**: N/A";
    return `
<h1>${spec.metadata.title}</h1>

<p><strong>Spec ID</strong>: ${spec.metadata.id}</p>
<p><strong>Priority</strong>: ${spec.metadata.priority}</p>
<p><strong>Status</strong>: ${spec.metadata.status}</p>
<p>${progressText}</p>

<hr>

${SpecParser.extractOverview(spec.markdown).replace(/\n/g, "<br>")}

<hr>

<h2>User Stories</h2>

<p>${spec.metadata.userStories?.length || 0} user stories tracked in this feature.</p>

<hr>
`.trim();
  }
  /**
   * Generate story description from user story
   */
  generateStoryDescription(us) {
    const acList = us.acceptanceCriteria.map((ac) => `<li>${ac.status === "done" ? "\u2611" : "\u2610"} ${ac.id}: ${ac.description}</li>`).join("\n");
    return `
<h2>User Story</h2>

<p>${us.title}</p>

<h2>Acceptance Criteria</h2>

<ul>
${acList}
</ul>

<hr>

<p><strong>Priority</strong>: ${us.priority}</p>
<p><strong>Status</strong>: ${us.status}</p>
`.trim();
  }
  /**
   * Detect conflicts between spec and ADO
   */
  async detectConflicts(spec, feature) {
    const conflicts = [];
    const expectedTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    if (feature.fields["System.Title"] !== expectedTitle) {
      conflicts.push({
        type: "metadata",
        field: "title",
        localValue: spec.metadata.title,
        remoteValue: feature.fields["System.Title"],
        resolution: "remote-wins",
        description: "Feature title differs from spec title"
      });
    }
    return conflicts;
  }
  /**
   * Resolve conflicts
   */
  async resolveConflicts(spec, conflicts) {
    for (const conflict of conflicts) {
      if (conflict.resolution === "remote-wins") {
        console.log(`   \u{1F504} Resolving: ${conflict.description} (ADO wins)`);
        if (conflict.field === "title") {
          await this.specManager.saveMetadata(spec.metadata.id, {
            title: conflict.remoteValue
          });
        }
      }
    }
  }
  /**
   * Fetch ADO Feature details
   */
  async fetchAdoFeature(featureId) {
    const response = await this.client.get(`/wit/workitems/${featureId}?api-version=7.0`);
    const featureData = response.data;
    return {
      id: featureData.id,
      url: featureData._links.html.href,
      fields: featureData.fields
    };
  }
  /**
   * Find story by title pattern
   */
  async findStoryByTitle(featureId, usId) {
    const resolvedType = await this.resolveWorkItemType("User Story");
    const wiql = `
      SELECT [System.Id], [System.Title], [System.Description], [System.State]
      FROM WorkItems
      WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.WorkItemType] = '${resolvedType}'
        AND [System.Title] CONTAINS '[${featureId}][${usId}]'
    `;
    const response = await this.client.post("/wit/wiql?api-version=7.0", {
      query: wiql
    }, {
      headers: { "Content-Type": "application/json" }
    });
    const workItems = response.data.workItems;
    if (workItems.length === 0) {
      return null;
    }
    const workItemId = workItems[0].id;
    const detailsResponse = await this.client.get(`/wit/workitems/${workItemId}?api-version=7.0`);
    const storyData = detailsResponse.data;
    return {
      id: storyData.id,
      url: storyData._links.html.href,
      fields: storyData.fields
    };
  }
  /**
   * Create ADO User Story
   */
  async createStory(story) {
    const mappedType = this.mapTypeToAdo(story.type, "User Story");
    const workItemType = await this.resolveWorkItemType(mappedType);
    const payload = [
      {
        op: "add",
        path: "/fields/System.Title",
        value: story.title
      },
      {
        op: "add",
        path: "/fields/System.Description",
        value: story.description
      },
      {
        op: "add",
        path: "/fields/System.WorkItemType",
        value: workItemType
      },
      {
        op: "add",
        path: "/fields/System.Tags",
        value: story.tags
      },
      {
        // Set native ADO Priority field
        op: "add",
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: this.mapPriorityToAdo(story.priority)
      },
      {
        op: "add",
        path: "/relations/-",
        value: {
          rel: "System.LinkTypes.Hierarchy-Reverse",
          url: `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit/workitems/${story.parentId}`,
          attributes: {
            name: "Parent"
          }
        }
      }
    ];
    const encodedType = encodeURIComponent(workItemType);
    const response = await this.client.post(`/wit/workitems/$${encodedType}?api-version=7.0`, payload, {
      headers: { "Content-Type": "application/json-patch+json" }
    });
    const storyData = response.data;
    return {
      id: storyData.id,
      url: storyData._links.html.href,
      fields: storyData.fields
    };
  }
  /**
   * Update ADO User Story
   */
  async updateStory(storyId, updates) {
    const payload = [];
    if (updates.title) {
      payload.push({
        op: "replace",
        path: "/fields/System.Title",
        value: updates.title
      });
    }
    if (updates.description) {
      payload.push({
        op: "replace",
        path: "/fields/System.Description",
        value: updates.description
      });
    }
    if (updates.state) {
      payload.push({
        op: "replace",
        path: "/fields/System.State",
        value: updates.state
      });
    }
    if (payload.length > 0) {
      await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, payload, {
        headers: { "Content-Type": "application/json-patch+json" }
      });
    }
    if (updates.parentId) {
      const detailResp = await this.client.get(`/wit/workitems/${storyId}?$expand=relations&api-version=7.0`);
      const relations = detailResp.data.relations || [];
      let existingParentId = null;
      let existingParentIndex = -1;
      for (let i = 0; i < relations.length; i++) {
        if (relations[i].rel === "System.LinkTypes.Hierarchy-Reverse") {
          const urlParts = relations[i].url.split("/");
          existingParentId = parseInt(urlParts[urlParts.length - 1], 10);
          existingParentIndex = i;
          break;
        }
      }
      if (existingParentId === updates.parentId) {
        // Parent already correct — no-op
      } else if (existingParentId !== null && existingParentId !== updates.parentId) {
        await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, [
          { op: "remove", path: `/relations/${existingParentIndex}` },
          {
            op: "add",
            path: "/relations/-",
            value: {
              rel: "System.LinkTypes.Hierarchy-Reverse",
              url: `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit/workitems/${updates.parentId}`,
              attributes: { name: "Parent" }
            }
          }
        ], {
          headers: { "Content-Type": "application/json-patch+json" }
        });
      } else {
        await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, [
          {
            op: "add",
            path: "/relations/-",
            value: {
              rel: "System.LinkTypes.Hierarchy-Reverse",
              url: `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit/workitems/${updates.parentId}`,
              attributes: { name: "Parent" }
            }
          }
        ], {
          headers: { "Content-Type": "application/json-patch+json" }
        });
      }
    }
  }
  /**
   * Map SpecWeave priority to ADO priority value
   *
   * ADO Priority field uses 1-4 scale:
   * - 1 = Highest (P0)
   * - 2 = High (P1)
   * - 3 = Medium (P2)
   * - 4 = Low (P3)
   */
  mapPriorityToAdo(priority) {
    if (!priority) return 3;
    const map = {
      P0: 1,
      P1: 2,
      P2: 3,
      P3: 4,
      p0: 1,
      p1: 2,
      p2: 3,
      p3: 4
    };
    return map[priority] || 3;
  }
  /**
   * Map SpecWeave type to ADO work item type
   *
   * Supports: Feature, User Story, Bug, Task
   */
  mapTypeToAdo(type, defaultType = "Feature") {
    if (!type) return defaultType;
    const normalizedType = type.toLowerCase();
    const map = {
      bug: "Bug",
      feature: "Feature",
      epic: "Feature",
      story: "User Story",
      task: "Task",
      enhancement: "Feature"
    };
    return map[normalizedType] || defaultType;
  }
  /**
   * Check whether the circuit is closed (sync allowed).
   */
  canSync() {
    return this.breaker.canSync();
  }
}
export {
  AdoSpecSync
};

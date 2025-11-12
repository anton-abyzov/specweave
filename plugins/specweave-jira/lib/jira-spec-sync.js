import { SpecMetadataManager } from "../../../src/core/specs/spec-metadata-manager.js";
import { SpecParser } from "../../../src/core/specs/spec-parser.js";
import axios from "axios";
class JiraSpecSync {
  constructor(config, projectRoot = process.cwd()) {
    this.specManager = new SpecMetadataManager(projectRoot);
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.domain}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Sync spec to Jira Epic (CREATE or UPDATE)
   */
  async syncSpecToJira(specId) {
    console.log(`
\u{1F504} Syncing spec ${specId} to Jira Epic...`);
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "jira",
          error: `Spec ${specId} not found`
        };
      }
      const existingLink = spec.metadata.externalLinks?.jira;
      let epic;
      if (existingLink?.epicKey) {
        console.log(`   Found existing Jira Epic ${existingLink.epicKey}`);
        epic = await this.updateJiraEpic(existingLink.epicKey, spec);
      } else {
        console.log("   Creating new Jira Epic...");
        epic = await this.createJiraEpic(spec);
        await this.specManager.linkToExternal(specId, "jira", {
          id: epic.key,
          url: epic.url,
          projectKey: this.config.projectKey,
          domain: this.config.domain
        });
      }
      const changes = await this.syncUserStories(epic.key, spec);
      console.log("\u2705 Sync complete!");
      return {
        success: true,
        specId,
        provider: "jira",
        externalId: epic.key,
        url: epic.url,
        changes
      };
    } catch (error) {
      console.error("\u274C Error syncing to Jira:", error);
      return {
        success: false,
        specId,
        provider: "jira",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Sync FROM Jira Epic to spec (bidirectional)
   */
  async syncFromJira(specId) {
    console.log(`
\u{1F504} Syncing FROM Jira to spec ${specId}...`);
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "jira",
          error: `Spec ${specId} not found`
        };
      }
      const jiraLink = spec.metadata.externalLinks?.jira;
      if (!jiraLink?.epicKey) {
        return {
          success: false,
          specId,
          provider: "jira",
          error: "Spec not linked to Jira Epic"
        };
      }
      const epic = await this.fetchJiraEpic(jiraLink.epicKey);
      const conflicts = await this.detectConflicts(spec, epic);
      if (conflicts.length === 0) {
        console.log("\u2705 No conflicts - spec and Jira in sync");
        return {
          success: true,
          specId,
          provider: "jira",
          externalId: epic.key,
          url: epic.url
        };
      }
      console.log(`\u26A0\uFE0F  Detected ${conflicts.length} conflict(s)`);
      await this.resolveConflicts(spec, conflicts);
      console.log("\u2705 Sync FROM Jira complete!");
      return {
        success: true,
        specId,
        provider: "jira",
        externalId: epic.key,
        url: epic.url,
        conflicts
      };
    } catch (error) {
      console.error("\u274C Error syncing FROM Jira:", error);
      return {
        success: false,
        specId,
        provider: "jira",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Create new Jira Epic for spec
   */
  async createJiraEpic(spec) {
    const epicSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const epicDescription = this.generateEpicDescription(spec);
    const payload = {
      fields: {
        project: {
          key: this.config.projectKey
        },
        summary: epicSummary,
        description: epicDescription,
        issuetype: {
          name: "Epic"
        },
        labels: [`spec:${spec.metadata.id}`, `priority:${spec.metadata.priority}`]
      }
    };
    const response = await this.client.post("/issue", payload);
    const epicData = response.data;
    const epicKey = epicData.key;
    const epicUrl = `https://${this.config.domain}/browse/${epicKey}`;
    console.log(`   \u2705 Created Jira Epic ${epicKey}: ${epicUrl}`);
    return {
      id: epicData.id,
      key: epicKey,
      summary: epicSummary,
      description: epicDescription,
      status: { name: "To Do" },
      url: epicUrl
    };
  }
  /**
   * Update existing Jira Epic
   */
  async updateJiraEpic(epicKey, spec) {
    const epicSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const epicDescription = this.generateEpicDescription(spec);
    const payload = {
      fields: {
        summary: epicSummary,
        description: epicDescription
      }
    };
    await this.client.put(`/issue/${epicKey}`, payload);
    const response = await this.client.get(`/issue/${epicKey}`);
    const epicData = response.data;
    console.log(`   \u2705 Updated Jira Epic ${epicKey}`);
    return {
      id: epicData.id,
      key: epicKey,
      summary: epicData.fields.summary,
      description: epicData.fields.description,
      status: epicData.fields.status,
      url: `https://${this.config.domain}/browse/${epicKey}`
    };
  }
  /**
   * Sync user stories as Jira Stories
   */
  async syncUserStories(epicKey, spec) {
    const created = [];
    const updated = [];
    const deleted = [];
    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      console.log("   \u2139\uFE0F  No user stories to sync");
      return { created, updated, deleted };
    }
    console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);
    for (const us of spec.metadata.userStories) {
      const storySummary = `[${us.id}] ${us.title}`;
      const storyDescription = this.generateStoryDescription(us);
      const existingStory = await this.findStoryByTitle(us.id);
      if (existingStory) {
        await this.updateStory(existingStory.key, {
          summary: storySummary,
          description: storyDescription,
          status: us.status === "done" ? "Done" : us.status === "in-progress" ? "In Progress" : "To Do"
        });
        updated.push(us.id);
        console.log(`   \u2705 Updated ${us.id}`);
      } else {
        const newStory = await this.createStory({
          summary: storySummary,
          description: storyDescription,
          epicLink: epicKey,
          labels: [`user-story`, `spec:${spec.metadata.id}`, `priority:${us.priority}`]
        });
        created.push(us.id);
        console.log(`   \u2705 Created ${us.id} \u2192 Story ${newStory.key}`);
      }
    }
    return { created, updated, deleted };
  }
  /**
   * Generate epic description from spec
   */
  generateEpicDescription(spec) {
    const progress = spec.metadata.progress;
    const progressText = progress ? `*Progress*: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)` : "*Progress*: N/A";
    return `
h1. ${spec.metadata.title}

*Spec ID*: ${spec.metadata.id}
*Priority*: ${spec.metadata.priority}
*Status*: ${spec.metadata.status}
${progressText}

----

${SpecParser.extractOverview(spec.markdown)}

----

h2. User Stories

${spec.metadata.userStories?.length || 0} user stories tracked in this epic.

----

\u{1F916} *Auto-synced from SpecWeave*
Last updated: ${(/* @__PURE__ */ new Date()).toISOString()}
`.trim();
  }
  /**
   * Generate story description from user story
   */
  generateStoryDescription(us) {
    const acList = us.acceptanceCriteria.map((ac) => `* ${ac.status === "done" ? "(/)" : "(x)"} ${ac.description}`).join("\n");
    return `
h2. User Story

${us.title}

h2. Acceptance Criteria

${acList}

----

*Priority*: ${us.priority}
*Status*: ${us.status}

\u{1F916} *Auto-synced from SpecWeave*
`.trim();
  }
  /**
   * Detect conflicts between spec and Jira
   */
  async detectConflicts(spec, epic) {
    const conflicts = [];
    const expectedSummary = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    if (epic.summary !== expectedSummary) {
      conflicts.push({
        type: "metadata",
        field: "title",
        localValue: spec.metadata.title,
        remoteValue: epic.summary,
        resolution: "remote-wins",
        description: "Epic summary differs from spec title"
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
        console.log(`   \u{1F504} Resolving: ${conflict.description} (Jira wins)`);
        if (conflict.field === "title") {
          await this.specManager.saveMetadata(spec.metadata.id, {
            title: conflict.remoteValue
          });
        }
      }
    }
  }
  /**
   * Fetch Jira Epic details
   */
  async fetchJiraEpic(epicKey) {
    const response = await this.client.get(`/issue/${epicKey}`);
    const epicData = response.data;
    return {
      id: epicData.id,
      key: epicKey,
      summary: epicData.fields.summary,
      description: epicData.fields.description,
      status: epicData.fields.status,
      url: `https://${this.config.domain}/browse/${epicKey}`
    };
  }
  /**
   * Find story by title pattern
   */
  async findStoryByTitle(usId) {
    const jql = `project = ${this.config.projectKey} AND summary ~ "[${usId}]" AND issuetype = Story`;
    const response = await this.client.get("/search", {
      params: {
        jql,
        maxResults: 1,
        fields: "summary,description,status,labels"
      }
    });
    const issues = response.data.issues;
    return issues.length > 0 ? {
      id: issues[0].id,
      key: issues[0].key,
      summary: issues[0].fields.summary,
      description: issues[0].fields.description,
      status: issues[0].fields.status,
      labels: issues[0].fields.labels || []
    } : null;
  }
  /**
   * Create Jira Story
   */
  async createStory(story) {
    const payload = {
      fields: {
        project: {
          key: this.config.projectKey
        },
        summary: story.summary,
        description: story.description,
        issuetype: {
          name: "Story"
        },
        labels: story.labels,
        // Link to epic (field name may vary by Jira configuration)
        customfield_10014: story.epicLink
        // Epic Link field (adjust if needed)
      }
    };
    const response = await this.client.post("/issue", payload);
    const storyData = response.data;
    return {
      id: storyData.id,
      key: storyData.key,
      summary: story.summary,
      description: story.description,
      status: { name: "To Do" },
      labels: story.labels
    };
  }
  /**
   * Update Jira Story
   */
  async updateStory(storyKey, updates) {
    const payload = {
      fields: {}
    };
    if (updates.summary) {
      payload.fields.summary = updates.summary;
    }
    if (updates.description) {
      payload.fields.description = updates.description;
    }
    await this.client.put(`/issue/${storyKey}`, payload);
    if (updates.status) {
      await this.transitionIssue(storyKey, updates.status);
    }
  }
  /**
   * Transition issue to new status
   */
  async transitionIssue(issueKey, targetStatus) {
    const transitionsResponse = await this.client.get(`/issue/${issueKey}/transitions`);
    const transitions = transitionsResponse.data.transitions;
    const transition = transitions.find(
      (t) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );
    if (!transition) {
      console.warn(`   \u26A0\uFE0F  Cannot transition ${issueKey} to ${targetStatus} (no valid transition)`);
      return;
    }
    await this.client.post(`/issue/${issueKey}/transitions`, {
      transition: {
        id: transition.id
      }
    });
  }
}
export {
  JiraSpecSync
};

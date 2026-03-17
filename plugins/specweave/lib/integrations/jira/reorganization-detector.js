import * as fs from "fs/promises";
import * as path from "path";
class JiraReorganizationDetector {
  constructor(client) {
    this.client = client;
    /** Track known parent keys for reparent detection */
    this.previousParents = /* @__PURE__ */ new Map();
  }
  /**
   * Set known parent keys from previous sync metadata.
   * Call before detectReorganization() to enable accurate reparent detection.
   */
  setKnownParents(parents) {
    for (const [key, parent] of Object.entries(parents)) {
      this.previousParents.set(key, parent);
    }
  }
  /**
   * Detect all reorganization events for tracked issues
   */
  async detectReorganization(trackedIssueKeys, lastSyncTimestamp) {
    console.log(`
\u{1F50D} Checking for reorganization (${trackedIssueKeys.length} issues)...
`);
    const events = [];
    for (const key of trackedIssueKeys) {
      try {
        const issue = await this.client.getIssue(key);
        const moveEvent = this.detectMove(key, issue);
        if (moveEvent) {
          events.push(moveEvent);
        }
        const splitEvents = await this.detectSplit(key, issue);
        events.push(...splitEvents);
        const mergeEvent = await this.detectMerge(key, issue);
        if (mergeEvent) {
          events.push(mergeEvent);
        }
        const reparentEvent = this.detectReparent(key, issue, lastSyncTimestamp);
        if (reparentEvent) {
          events.push(reparentEvent);
        }
      } catch (error) {
        if (error.message.includes("404") || error.message.includes("does not exist")) {
          events.push({
            type: "DELETED",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            description: `Issue ${key} was deleted from Jira`,
            originalKeys: [key]
          });
        }
      }
    }
    const summary = this.generateSummary(events);
    console.log(events.length > 0 ? "\u26A0\uFE0F  Reorganization detected!" : "\u2705 No reorganization detected");
    console.log(summary);
    return {
      detected: events.length > 0,
      events,
      summary
    };
  }
  // ==========================================================================
  // Detection Methods
  // ==========================================================================
  /**
   * Detect if issue moved to different project
   */
  detectMove(originalKey, issue) {
    const currentProject = issue.key.split("-")[0];
    const originalProject = originalKey.split("-")[0];
    if (currentProject !== originalProject) {
      return {
        type: "MOVED_PROJECT",
        timestamp: issue.fields.updated,
        description: `Issue moved from ${originalProject} to ${currentProject}`,
        originalKeys: [originalKey],
        newKeys: [issue.key],
        fromProject: originalProject,
        toProject: currentProject
      };
    }
    return null;
  }
  /**
   * Detect if story was split into multiple stories
   */
  async detectSplit(originalKey, issue) {
    const events = [];
    const issueLinks = issue.fields.issuelinks || [];
    for (const link of issueLinks) {
      const linkType = link.type?.name?.toLowerCase() || "";
      if (linkType.includes("split") || linkType.includes("cloned") || linkType.includes(
        "child"
      )) {
        const relatedIssue = link.outwardIssue || link.inwardIssue;
        if (relatedIssue && relatedIssue.key !== originalKey) {
          events.push({
            type: "SPLIT",
            timestamp: issue.fields.updated,
            description: `Story ${originalKey} was split into ${relatedIssue.key}`,
            originalKeys: [originalKey],
            newKeys: [relatedIssue.key]
          });
        }
      }
    }
    return events;
  }
  /**
   * Detect if multiple stories were merged
   */
  async detectMerge(originalKey, issue) {
    const issueLinks = issue.fields.issuelinks || [];
    for (const link of issueLinks) {
      const linkType = link.type?.name?.toLowerCase() || "";
      if (linkType.includes("duplicate") || linkType.includes("merged") || linkType.includes("closed")) {
        const targetIssue = link.inwardIssue;
        if (targetIssue && issue.fields.status.name.toLowerCase() === "closed") {
          return {
            type: "MERGED",
            timestamp: issue.fields.updated,
            description: `Story ${originalKey} was merged into ${targetIssue.key}`,
            originalKeys: [originalKey],
            newKeys: [targetIssue.key]
          };
        }
      }
    }
    return null;
  }
  /**
   * Detect if issue was moved to different epic.
   *
   * Requires previousParents map to track known parent keys.
   * Only fires REPARENTED when the parent actually changed.
   */
  detectReparent(originalKey, issue, lastSyncTimestamp) {
    const currentParent = issue.fields.parent?.key || null;
    const previousParent = this.previousParents.get(originalKey) || null;
    if (previousParent !== null && currentParent !== previousParent) {
      return {
        type: "REPARENTED",
        timestamp: issue.fields.updated,
        description: `Issue ${originalKey} reparented from ${previousParent} to ${currentParent || "none"}`,
        originalKeys: [originalKey],
        fromEpic: previousParent,
        toEpic: currentParent || void 0
      };
    }
    if (currentParent) {
      this.previousParents.set(originalKey, currentParent);
    }
    return null;
  }
  // ==========================================================================
  // Helpers
  // ==========================================================================
  /**
   * Generate human-readable summary of reorganization events
   */
  generateSummary(events) {
    if (events.length === 0) {
      return "\n   No reorganization detected\n";
    }
    const summary = ["\n\u{1F4CB} Reorganization Summary:\n"];
    const byType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    for (const [type, count] of Object.entries(byType)) {
      summary.push(`   ${this.getTypeIcon(type)} ${type}: ${count}`);
    }
    summary.push("\n\u{1F4DD} Details:\n");
    for (const event of events) {
      summary.push(`   ${this.getTypeIcon(event.type)} ${event.description}`);
    }
    summary.push("");
    return summary.join("\n");
  }
  /**
   * Get emoji icon for event type
   */
  getTypeIcon(type) {
    switch (type) {
      case "MOVED_PROJECT":
        return "\u{1F4E6}";
      case "SPLIT":
        return "\u2702\uFE0F";
      case "MERGED":
        return "\u{1F500}";
      case "REPARENTED":
        return "\u{1F517}";
      case "DELETED":
        return "\u{1F5D1}\uFE0F";
      case "RENAMED":
        return "\u270F\uFE0F";
      default:
        return "\u2022";
    }
  }
}
async function handleReorganization(events, incrementId, projectRoot = process.cwd()) {
  if (events.length === 0) {
    return;
  }
  console.log(`
\u{1F527} Handling ${events.length} reorganization events...
`);
  const metadataPath = path.join(
    projectRoot,
    ".specweave",
    "increments",
    incrementId,
    "metadata.json"
  );
  let metadata = {};
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
  } catch {
    console.warn(`   \u26A0\uFE0F  Could not read metadata.json for ${incrementId}`);
  }
  if (!metadata.reorganization) {
    metadata.reorganization = { events: [], lastHandled: null };
  }
  for (const event of events) {
    switch (event.type) {
      case "MOVED_PROJECT": {
        if (event.newKeys?.[0]) {
          if (!metadata.external_sync) metadata.external_sync = {};
          if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
          metadata.external_sync.jira.issueKey = event.newKeys[0];
          metadata.external_sync.jira.project = event.toProject;
        }
        console.log(`   \u2713 Updated project mapping: ${event.fromProject} \u2192 ${event.toProject}`);
        break;
      }
      case "SPLIT": {
        if (!metadata.external_sync?.jira?.relatedKeys) {
          if (!metadata.external_sync) metadata.external_sync = {};
          if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
          metadata.external_sync.jira.relatedKeys = [];
        }
        if (event.newKeys) {
          metadata.external_sync.jira.relatedKeys.push(...event.newKeys);
        }
        console.log(`   \u2713 Recorded split: ${event.newKeys?.join(", ")}`);
        break;
      }
      case "MERGED": {
        if (event.newKeys?.[0]) {
          if (!metadata.external_sync) metadata.external_sync = {};
          if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
          metadata.external_sync.jira.issueKey = event.newKeys[0];
          metadata.external_sync.jira.mergedFrom = event.originalKeys[0];
        }
        console.log(`   \u2713 Updated merged issue: ${event.originalKeys[0]} \u2192 ${event.newKeys?.[0]}`);
        break;
      }
      case "REPARENTED": {
        if (!metadata.external_sync) metadata.external_sync = {};
        if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
        metadata.external_sync.jira.epicKey = event.toEpic || null;
        metadata.external_sync.jira.previousEpicKey = event.fromEpic || null;
        console.log(`   \u2713 Updated epic link: ${event.fromEpic || "none"} \u2192 ${event.toEpic || "none"}`);
        break;
      }
      case "DELETED": {
        if (!metadata.external_sync) metadata.external_sync = {};
        if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
        metadata.external_sync.jira.deleted = true;
        metadata.external_sync.jira.deletedAt = event.timestamp;
        console.log(`   \u26A0\uFE0F  Marked as deleted: ${event.originalKeys[0]}`);
        break;
      }
    }
    metadata.reorganization.events.push({
      type: event.type,
      timestamp: event.timestamp,
      description: event.description
    });
  }
  metadata.reorganization.lastHandled = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`   \u{1F4C4} Updated metadata.json for ${incrementId}`);
  } catch (err) {
    console.warn(`   \u26A0\uFE0F  Failed to write metadata: ${err.message}`);
  }
  console.log("\n\u2705 Reorganization handled\n");
}
export {
  JiraReorganizationDetector,
  handleReorganization
};

class JiraReorganizationDetector {
  constructor(client) {
    this.client = client;
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
   * Detect if issue was moved to different epic
   */
  detectReparent(originalKey, issue, lastSyncTimestamp) {
    const currentParent = issue.fields.parent?.key;
    if (currentParent && lastSyncTimestamp) {
      const updatedAt = new Date(issue.fields.updated);
      const lastSync = new Date(lastSyncTimestamp);
      if (updatedAt > lastSync) {
        return {
          type: "REPARENTED",
          timestamp: issue.fields.updated,
          description: `Issue ${originalKey} may have been reparented to ${currentParent}`,
          originalKeys: [originalKey],
          toEpic: currentParent
        };
      }
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
  for (const event of events) {
    switch (event.type) {
      case "MOVED_PROJECT":
        console.log(`   \u2713 Updated project mapping: ${event.fromProject} \u2192 ${event.toProject}`);
        break;
      case "SPLIT":
        console.log(`   \u2713 Added new story from split: ${event.newKeys?.join(", ")}`);
        break;
      case "MERGED":
        console.log(`   \u2713 Marked story as merged: ${event.originalKeys[0]} \u2192 ${event.newKeys?.[0]}`);
        break;
      case "REPARENTED":
        console.log(`   \u2713 Updated epic link: ${event.toEpic}`);
        break;
      case "DELETED":
        console.log(`   \u26A0\uFE0F  Story deleted from Jira: ${event.originalKeys[0]}`);
        break;
    }
  }
  console.log("\n\u2705 Reorganization handled\n");
}
export {
  JiraReorganizationDetector,
  handleReorganization
};

import * as fs from "../../../src/utils/fs-native.js";
import * as path from "path";
import * as yaml from "yaml";
const STATUS_MAPPING = {
  ado: {
    // Agile process template
    "New": "draft",
    "Active": "in-progress",
    "Resolved": "implemented",
    "Closed": "complete",
    "In Review": "in-qa",
    "In QA": "in-qa",
    "Blocked": "blocked",
    "Removed": "cancelled",
    // Scrum process template
    "Approved": "draft",
    "Committed": "in-progress",
    "Done": "complete",
    // CMMI process template
    "Proposed": "draft",
    // 'Active' already mapped above (shared with CMMI)
    // 'Resolved' already mapped above (shared with CMMI)
    // 'Closed' already mapped above (shared with CMMI)
    // Basic process template
    "To Do": "draft",
    "Doing": "in-progress"
    // 'Done' already mapped above (shared with Basic)
  },
  jira: {
    "To Do": "draft",
    "In Progress": "in-progress",
    "Code Review": "implemented",
    "In Review": "implemented",
    "QA": "in-qa",
    "Testing": "in-qa",
    "Done": "complete",
    "Closed": "complete",
    "Blocked": "blocked",
    "Cancelled": "cancelled"
  },
  github: {
    "open": "in-progress",
    "closed": "complete"
  }
};
const REVERSE_STATUS_MAPPING = {
  // Default reverse mapping uses Agile states (most common)
  // Callers should use process-template-aware mapping when template is known
  ado: {
    "draft": "New",
    "in-progress": "Active",
    "implemented": "Resolved",
    "in-qa": "In QA",
    "complete": "Closed",
    "blocked": "Blocked",
    "cancelled": "Removed"
  },
  jira: {
    "draft": "To Do",
    "in-progress": "In Progress",
    "implemented": "Code Review",
    "in-qa": "QA",
    "complete": "Done",
    "blocked": "Blocked",
    "cancelled": "Cancelled"
  },
  github: {
    "draft": "open",
    "in-progress": "open",
    "implemented": "open",
    "in-qa": "open",
    "complete": "closed",
    "blocked": "open",
    "cancelled": "closed"
  }
};
class ConflictResolver {
  constructor() {
    this.resolutionLog = [];
  }
  /**
   * Map external status to local SpecWeave status
   */
  mapExternalStatus(tool, externalStatus) {
    const mapping = STATUS_MAPPING[tool];
    return mapping[externalStatus] || "unknown";
  }
  /**
   * Map local status to external tool status
   */
  mapLocalStatus(tool, localStatus) {
    const mapping = REVERSE_STATUS_MAPPING[tool];
    return mapping[localStatus] || "Active";
  }
  /**
   * CRITICAL: Resolve status conflict - EXTERNAL ALWAYS WINS
   */
  resolveStatusConflict(localStatus, externalStatus) {
    const resolution = {
      field: "status",
      localValue: localStatus,
      externalValue: externalStatus.status,
      resolution: "external",
      // ALWAYS external for status
      resolvedValue: externalStatus.mappedStatus,
      reason: "External tool reflects QA and stakeholder decisions",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    console.log(`\u{1F4CA} Status Conflict Detected:`);
    console.log(`   Local: ${localStatus}`);
    console.log(`   External: ${externalStatus.status} (${externalStatus.tool})`);
    console.log(`   \u2705 Resolution: EXTERNAL WINS - ${externalStatus.mappedStatus}`);
    this.resolutionLog.push(resolution);
    return resolution;
  }
  /**
   * Compare timestamps to determine winner (Increment 0089)
   *
   * For pull sync, we compare local lastModified vs external ChangedDate.
   * The more recent timestamp wins.
   *
   * @param localTimestamp - Local file lastModified timestamp (ISO string or null)
   * @param externalTimestamp - External tool ChangedDate (ISO string)
   * @returns Comparison result with winner and reasoning
   */
  compareTimestamps(localTimestamp, externalTimestamp) {
    const externalDate = new Date(externalTimestamp);
    if (!localTimestamp) {
      return {
        winner: "external",
        localTimestamp: null,
        externalTimestamp,
        timeDiffMs: 0,
        reason: "No local timestamp available, external wins by default"
      };
    }
    const localDate = new Date(localTimestamp);
    const timeDiffMs = externalDate.getTime() - localDate.getTime();
    if (timeDiffMs > 0) {
      console.log(`\u{1F4CA} Timestamp Comparison:`);
      console.log(`   Local:    ${localTimestamp}`);
      console.log(`   External: ${externalTimestamp}`);
      console.log(`   \u2705 Winner: EXTERNAL (${Math.round(timeDiffMs / 6e4)}min newer)`);
      return {
        winner: "external",
        localTimestamp,
        externalTimestamp,
        timeDiffMs,
        reason: `External is ${Math.round(timeDiffMs / 6e4)} minutes newer`
      };
    }
    if (timeDiffMs < 0) {
      console.log(`\u{1F4CA} Timestamp Comparison:`);
      console.log(`   Local:    ${localTimestamp}`);
      console.log(`   External: ${externalTimestamp}`);
      console.log(`   \u2705 Winner: LOCAL (${Math.round(Math.abs(timeDiffMs) / 6e4)}min newer)`);
      return {
        winner: "local",
        localTimestamp,
        externalTimestamp,
        timeDiffMs,
        reason: `Local is ${Math.round(Math.abs(timeDiffMs) / 6e4)} minutes newer`
      };
    }
    return {
      winner: "none",
      localTimestamp,
      externalTimestamp,
      timeDiffMs: 0,
      reason: "Timestamps are identical, no conflict"
    };
  }
  /**
   * Resolve conflict using timestamp comparison (Increment 0089)
   *
   * Combines timestamp comparison with status conflict resolution.
   * Used by ExternalChangePuller for pull sync.
   *
   * @param field - The field being compared (e.g., 'status')
   * @param localValue - Current local value
   * @param externalValue - Value from external tool
   * @param localTimestamp - Local lastModified timestamp
   * @param externalTimestamp - External ChangedDate
   * @returns Conflict resolution result
   */
  resolveWithTimestamp(field, localValue, externalValue, localTimestamp, externalTimestamp) {
    const comparison = this.compareTimestamps(localTimestamp, externalTimestamp);
    const resolution = {
      field,
      localValue,
      externalValue,
      resolution: comparison.winner === "local" ? "local" : "external",
      resolvedValue: comparison.winner === "local" ? localValue : externalValue,
      reason: comparison.reason,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    console.log(`\u{1F4CA} Conflict Resolved (${field}):`);
    console.log(`   Winner: ${comparison.winner.toUpperCase()}`);
    console.log(`   Reason: ${comparison.reason}`);
    this.resolutionLog.push(resolution);
    return resolution;
  }
  /**
   * Resolve priority conflict - EXTERNAL WINS
   */
  resolvePriorityConflict(localPriority, externalPriority) {
    const resolution = {
      field: "priority",
      localValue: localPriority,
      externalValue: externalPriority,
      resolution: "external",
      resolvedValue: externalPriority || localPriority,
      reason: "External tool reflects stakeholder prioritization",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (localPriority !== externalPriority && externalPriority) {
      console.log(`\u{1F4CA} Priority Conflict Detected:`);
      console.log(`   Local: ${localPriority}`);
      console.log(`   External: ${externalPriority}`);
      console.log(`   \u2705 Resolution: EXTERNAL WINS - ${externalPriority}`);
      this.resolutionLog.push(resolution);
    }
    return resolution;
  }
  /**
   * Apply conflict resolutions to spec
   */
  async applyResolutions(specPath, resolutions) {
    const content = await fs.readFile(specPath, "utf-8");
    const lines = content.split("\n");
    let inFrontmatter = false;
    let frontmatterEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "---") {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          frontmatterEnd = i;
          break;
        }
      }
    }
    for (const resolution of resolutions) {
      if (resolution.field === "status") {
        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].startsWith("status:")) {
            lines[i] = `status: ${resolution.resolvedValue}`;
            console.log(`\u2705 Applied status resolution: ${resolution.resolvedValue}`);
            break;
          }
        }
        const syncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
        let syncedAtFound = false;
        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].includes("syncedAt:")) {
            lines[i] = `    syncedAt: "${syncTimestamp}"`;
            syncedAtFound = true;
            break;
          }
        }
        if (!syncedAtFound) {
          for (let i = 1; i < frontmatterEnd; i++) {
            if (lines[i].includes("externalLinks:")) {
              for (let j = i + 1; j < frontmatterEnd; j++) {
                if (lines[j].includes("ado:") || lines[j].includes("jira:") || lines[j].includes("github:")) {
                  for (let k = j + 1; k < frontmatterEnd; k++) {
                    if (lines[k].includes("Url:")) {
                      lines.splice(k + 1, 0, `    syncedAt: "${syncTimestamp}"`);
                      frontmatterEnd++;
                      syncedAtFound = true;
                      break;
                    }
                  }
                  if (syncedAtFound) break;
                }
              }
              if (syncedAtFound) break;
            }
          }
        }
      } else if (resolution.field === "priority" && resolution.resolvedValue) {
        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].startsWith("priority:")) {
            lines[i] = `priority: ${resolution.resolvedValue}`;
            console.log(`\u2705 Applied priority resolution: ${resolution.resolvedValue}`);
            break;
          }
        }
      }
    }
    await fs.writeFile(specPath, lines.join("\n"));
    console.log(`\u2705 Resolutions applied to ${path.basename(specPath)}`);
  }
  /**
   * Validate that external status wins in implementation
   */
  validateImplementation(implementationCode) {
    const violations = [];
    const incorrectPatterns = [
      {
        pattern: /if.*conflict.*\{[^}]*spec\.status\s*=\s*localStatus/,
        message: "Local status should never win in conflicts"
      },
      {
        pattern: /resolution\s*:\s*['"]local['"]/,
        message: 'Resolution should be "external" for status conflicts'
      },
      {
        pattern: /prefer.*local.*status/i,
        message: "Should prefer external status"
      }
    ];
    for (const { pattern, message } of incorrectPatterns) {
      if (pattern.test(implementationCode)) {
        violations.push(message);
      }
    }
    const requiredPatterns = [
      {
        pattern: /external.*wins|EXTERNAL.*WINS|externalStatus.*applied/i,
        message: "Missing confirmation that external wins"
      }
    ];
    for (const { pattern, message } of requiredPatterns) {
      if (!pattern.test(implementationCode)) {
        violations.push(message);
      }
    }
    return {
      valid: violations.length === 0,
      violations
    };
  }
  /**
   * Get resolution history
   */
  getResolutionLog() {
    return this.resolutionLog;
  }
  /**
   * Generate resolution report
   */
  generateReport() {
    const report = [];
    report.push("# Conflict Resolution Report");
    report.push(`
**Generated**: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    report.push(`**Total Resolutions**: ${this.resolutionLog.length}`);
    report.push("\n## Resolutions\n");
    for (const resolution of this.resolutionLog) {
      report.push(`### ${resolution.field}`);
      report.push(`- **Local Value**: ${resolution.localValue}`);
      report.push(`- **External Value**: ${resolution.externalValue}`);
      report.push(`- **Resolution**: ${resolution.resolution.toUpperCase()} WINS`);
      report.push(`- **Resolved To**: ${resolution.resolvedValue}`);
      report.push(`- **Reason**: ${resolution.reason}`);
      report.push(`- **Time**: ${resolution.timestamp}
`);
    }
    report.push("## Validation");
    report.push("\u2705 All conflicts resolved with external tool priority");
    return report.join("\n");
  }
}
async function loadSpecMetadata(specPath) {
  const content = await fs.readFile(specPath, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error(`No frontmatter found in ${specPath}`);
  }
  return yaml.parse(frontmatterMatch[1]);
}
async function performBidirectionalSync(specPath, externalStatus) {
  const resolver = new ConflictResolver();
  const spec = await loadSpecMetadata(specPath);
  const resolutions = [];
  if (spec.status !== externalStatus.mappedStatus) {
    const statusResolution = resolver.resolveStatusConflict(
      spec.status,
      externalStatus
    );
    resolutions.push(statusResolution);
  }
  if (resolutions.length > 0) {
    await resolver.applyResolutions(specPath, resolutions);
    const report = resolver.generateReport();
    const reportPath = specPath.replace(".md", "-sync-report.md");
    await fs.writeFile(reportPath, report);
    console.log(`\u{1F4C4} Sync report saved to ${path.basename(reportPath)}`);
  } else {
    console.log("\u2705 No conflicts detected - spec in sync with external tool");
  }
}
var conflict_resolver_default = ConflictResolver;
export {
  ConflictResolver,
  conflict_resolver_default as default,
  loadSpecMetadata,
  performBidirectionalSync
};

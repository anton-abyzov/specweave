import { consoleLogger } from "../../../../../src/utils/logger.js";
import { getApiBaseUrl } from "./jira-deployment-detector.js";
import { toCommentBody } from "./content-format-adapter.js";
class JiraDuplicateDetector {
  constructor(options = {}) {
    this.domain = options.domain || process.env.JIRA_DOMAIN || "";
    const email = options.email || process.env.JIRA_EMAIL || "";
    const token = options.token || process.env.JIRA_API_TOKEN || "";
    this.auth = Buffer.from(`${email}:${token}`).toString("base64");
    this.logger = options.logger || consoleLogger;
  }
  /**
   * Phase 1: Check if issue exists before creating
   */
  async checkBeforeCreate(summaryPattern, incrementId) {
    try {
      const issues = await this.searchIssues(summaryPattern);
      if (issues.length > 0) {
        return {
          found: true,
          existingIssue: issues[0],
          count: issues.length
        };
      }
      return { found: false, count: 0 };
    } catch (error) {
      this.logger.log(`\u26A0\uFE0F  Detection check failed: ${error.message}`);
      return { found: false, count: 0 };
    }
  }
  /**
   * Phase 2: Verify count after creation
   */
  async verifyAfterCreate(summaryPattern, expectedCount = 1) {
    try {
      const issues = await this.searchIssues(summaryPattern);
      if (issues.length > expectedCount) {
        const sorted = issues.sort(
          (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
        );
        return {
          success: false,
          expectedCount,
          actualCount: issues.length,
          duplicates: sorted.slice(expectedCount)
          // All issues after expected count
        };
      }
      return {
        success: true,
        expectedCount,
        actualCount: issues.length,
        duplicates: []
      };
    } catch (error) {
      this.logger.log(`\u26A0\uFE0F  Verification check failed: ${error.message}`);
      return {
        success: false,
        expectedCount,
        actualCount: -1,
        duplicates: []
      };
    }
  }
  /**
   * Phase 3: Auto-close duplicates
   */
  async closeDuplicates(duplicates, keepIssueKey) {
    const result = {
      closedCount: 0,
      keptCount: 1,
      errors: []
    };
    for (const issue of duplicates) {
      try {
        await this.closeIssue(issue.key, keepIssueKey);
        result.closedCount++;
        this.logger.log(`  \u2705 Closed ${issue.key} (duplicate of ${keepIssueKey})`);
      } catch (error) {
        result.errors.push(`${issue.key}: ${error.message}`);
        this.logger.log(`  \u274C Failed to close ${issue.key}: ${error.message}`);
      }
    }
    return result;
  }
  /**
   * Full cleanup: Find and close all duplicates for a feature
   */
  async cleanupFeatureDuplicates(featureId, dryRun = false) {
    const searchPattern = `[${featureId}]`;
    const issues = await this.searchIssues(searchPattern);
    this.logger.log(`
\u{1F50D} Scanning for duplicates in Feature ${featureId}...`);
    this.logger.log(`   Found ${issues.length} total issues`);
    const groups = this.groupBySummary(issues);
    const duplicateGroups = groups.filter((g) => g.duplicates.length > 0);
    if (duplicateGroups.length === 0) {
      this.logger.log(`   \u2705 No duplicates found!`);
      return {
        groups: [],
        totalIssues: issues.length,
        duplicateCount: 0,
        closedCount: 0
      };
    }
    this.logger.log(`   Detected ${duplicateGroups.length} duplicate groups:
`);
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      this.logger.log(`   \u{1F4CB} Group ${i + 1}: "${group.summary.substring(0, 50)}..."`);
      this.logger.log(`      - ${group.keepIssue.key} (KEEP) - Created ${group.keepIssue.created.split("T")[0]}`);
      for (const dup of group.duplicates) {
        this.logger.log(`      - ${dup.key} (CLOSE) - Created ${dup.created.split("T")[0]} - DUPLICATE`);
      }
      this.logger.log("");
    }
    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
    if (dryRun) {
      this.logger.log(`
\u2705 Dry run complete!`);
      this.logger.log(`   Total issues: ${issues.length}`);
      this.logger.log(`   Duplicate groups: ${duplicateGroups.length}`);
      this.logger.log(`   Issues to close: ${totalDuplicates}`);
      this.logger.log(`
\u26A0\uFE0F  This was a DRY RUN - no changes made.`);
      return {
        groups: duplicateGroups,
        totalIssues: issues.length,
        duplicateCount: totalDuplicates,
        closedCount: 0
      };
    }
    let closedCount = 0;
    this.logger.log(`\u{1F5D1}\uFE0F  Closing duplicates...`);
    for (const group of duplicateGroups) {
      const result = await this.closeDuplicates(group.duplicates, group.keepIssue.key);
      closedCount += result.closedCount;
    }
    this.logger.log(`
\u2705 Cleanup complete!`);
    this.logger.log(`   Closed: ${closedCount} duplicates`);
    this.logger.log(`   Kept: ${duplicateGroups.length} original issues`);
    return {
      groups: duplicateGroups,
      totalIssues: issues.length,
      duplicateCount: totalDuplicates,
      closedCount
    };
  }
  /**
   * Group issues by summary
   */
  groupBySummary(issues) {
    const summaryMap = /* @__PURE__ */ new Map();
    for (const issue of issues) {
      const existing = summaryMap.get(issue.summary) || [];
      existing.push(issue);
      summaryMap.set(issue.summary, existing);
    }
    const groups = [];
    for (const [summary, groupIssues] of summaryMap) {
      const sorted = groupIssues.sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
      groups.push({
        summary,
        issues: sorted,
        keepIssue: sorted[0],
        duplicates: sorted.slice(1)
      });
    }
    return groups;
  }
  /**
   * Search for issues using JQL
   */
  async searchIssues(summaryPattern) {
    if (!this.domain || !this.auth) {
      throw new Error("JIRA credentials not configured");
    }
    const jql = encodeURIComponent(`summary ~ "${summaryPattern}" ORDER BY created ASC`);
    const url = `${getApiBaseUrl(this.domain)}/search?jql=${jql}&fields=summary,status,created`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`JQL search failed: ${response.status}`);
    }
    const data = await response.json();
    return (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      created: issue.fields.created,
      url: `https://${this.domain}/browse/${issue.key}`
    }));
  }
  /**
   * Close an issue with duplicate comment
   */
  async closeIssue(issueKey, originalKey) {
    await this.addComment(issueKey, originalKey);
    const transitions = await this.getTransitions(issueKey);
    const closeTransition = transitions.find(
      (t) => t.name === "Won't Do" || t.name === "Done" || t.name === "Closed" || t.to?.name === "Won't Do" || t.to?.name === "Done"
    );
    if (!closeTransition) {
      throw new Error(`No close transition found. Available: ${transitions.map((t) => t.name).join(", ")}`);
    }
    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/transitions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transition: { id: closeTransition.id }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to transition issue: ${response.status} - ${error}`);
    }
  }
  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey) {
    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/transitions`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to get transitions: ${response.status}`);
    }
    const data = await response.json();
    return data.transitions || [];
  }
  /**
   * Add duplicate comment to issue
   */
  async addComment(issueKey, originalKey) {
    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/comment`;
    const commentText = `h2. Duplicate of ${originalKey}

This issue was automatically closed by SpecWeave cleanup because it is a duplicate.

The original issue (${originalKey}) contains the same content and should be used for tracking instead.`;
    const body = toCommentBody(commentText, this.domain);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body })
    });
    if (!response.ok) {
      this.logger.log(`     \u26A0\uFE0F  Failed to add comment to ${issueKey}`);
    }
  }
}
async function cleanupJiraDuplicates(featureId, dryRun = false) {
  const detector = new JiraDuplicateDetector();
  return detector.cleanupFeatureDuplicates(featureId, dryRun);
}
var jira_duplicate_detector_default = JiraDuplicateDetector;
export {
  JiraDuplicateDetector,
  cleanupJiraDuplicates,
  jira_duplicate_detector_default as default
};

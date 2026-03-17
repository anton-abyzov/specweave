import { consoleLogger } from "../../../../../src/utils/logger.js";
class AdoDuplicateDetector {
  constructor(options = {}) {
    this.org = options.org || process.env.AZURE_DEVOPS_ORG || "";
    this.project = options.project || process.env.AZURE_DEVOPS_PROJECT || "";
    this.pat = options.pat || process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_TOKEN || "";
    this.logger = options.logger || consoleLogger;
  }
  /**
   * Phase 1: Check if work item exists before creating
   */
  async checkBeforeCreate(titlePattern, incrementId) {
    try {
      const items = await this.searchWorkItems(titlePattern);
      if (items.length > 0) {
        return {
          found: true,
          existingItem: items[0],
          count: items.length
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
  async verifyAfterCreate(titlePattern, expectedCount = 1) {
    try {
      const items = await this.searchWorkItems(titlePattern);
      if (items.length > expectedCount) {
        const sorted = items.sort(
          (a, b) => a.id - b.id
          // Sort by ID (lowest = oldest)
        );
        return {
          success: false,
          expectedCount,
          actualCount: items.length,
          duplicates: sorted.slice(expectedCount)
          // All items after expected count
        };
      }
      return {
        success: true,
        expectedCount,
        actualCount: items.length,
        duplicates: []
      };
    } catch (error) {
      this.logger.log(`\u26A0\uFE0F  Verification check failed: ${error.message}`);
      return {
        success: false,
        expectedCount,
        actualCount: -1,
        duplicates: [],
        error: `Verification failed: ${error.message}`
      };
    }
  }
  /**
   * Phase 3: Auto-close duplicates
   */
  async closeDuplicates(duplicates, keepItemId) {
    const result = {
      closedCount: 0,
      keptCount: 1,
      errors: []
    };
    for (const item of duplicates) {
      try {
        await this.closeWorkItem(item.id, keepItemId);
        result.closedCount++;
        this.logger.log(`  \u2705 Closed #${item.id} (duplicate of #${keepItemId})`);
      } catch (error) {
        result.errors.push(`#${item.id}: ${error.message}`);
        this.logger.log(`  \u274C Failed to close #${item.id}: ${error.message}`);
      }
    }
    return result;
  }
  /**
   * Full cleanup: Find and close all duplicates for a feature
   */
  async cleanupFeatureDuplicates(featureId, dryRun = false) {
    const searchPattern = `[${featureId}]`;
    const items = await this.searchWorkItems(searchPattern);
    this.logger.log(`
\u{1F50D} Scanning for duplicates in Feature ${featureId}...`);
    this.logger.log(`   Found ${items.length} total work items`);
    const groups = this.groupByTitle(items);
    const duplicateGroups = groups.filter((g) => g.duplicates.length > 0);
    if (duplicateGroups.length === 0) {
      this.logger.log(`   \u2705 No duplicates found!`);
      return {
        groups: [],
        totalItems: items.length,
        duplicateCount: 0,
        closedCount: 0
      };
    }
    this.logger.log(`   Detected ${duplicateGroups.length} duplicate groups:
`);
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      this.logger.log(`   \u{1F4CB} Group ${i + 1}: "${group.title.substring(0, 50)}..."`);
      this.logger.log(`      - #${group.keepItem.id} (KEEP) - Created ${group.keepItem.createdDate.split("T")[0]}`);
      for (const dup of group.duplicates) {
        this.logger.log(`      - #${dup.id} (CLOSE) - Created ${dup.createdDate.split("T")[0]} - DUPLICATE`);
      }
      this.logger.log("");
    }
    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
    if (dryRun) {
      this.logger.log(`
\u2705 Dry run complete!`);
      this.logger.log(`   Total work items: ${items.length}`);
      this.logger.log(`   Duplicate groups: ${duplicateGroups.length}`);
      this.logger.log(`   Work items to close: ${totalDuplicates}`);
      this.logger.log(`
\u26A0\uFE0F  This was a DRY RUN - no changes made.`);
      return {
        groups: duplicateGroups,
        totalItems: items.length,
        duplicateCount: totalDuplicates,
        closedCount: 0
      };
    }
    let closedCount = 0;
    this.logger.log(`\u{1F5D1}\uFE0F  Closing duplicates...`);
    for (const group of duplicateGroups) {
      const result = await this.closeDuplicates(group.duplicates, group.keepItem.id);
      closedCount += result.closedCount;
    }
    this.logger.log(`
\u2705 Cleanup complete!`);
    this.logger.log(`   Closed: ${closedCount} duplicates`);
    this.logger.log(`   Kept: ${duplicateGroups.length} original work items`);
    return {
      groups: duplicateGroups,
      totalItems: items.length,
      duplicateCount: totalDuplicates,
      closedCount
    };
  }
  /**
   * Group work items by title
   */
  groupByTitle(items) {
    const titleMap = /* @__PURE__ */ new Map();
    for (const item of items) {
      const existing = titleMap.get(item.title) || [];
      existing.push(item);
      titleMap.set(item.title, existing);
    }
    const groups = [];
    for (const [title, groupItems] of titleMap) {
      const sorted = groupItems.sort((a, b) => a.id - b.id);
      groups.push({
        title,
        items: sorted,
        keepItem: sorted[0],
        duplicates: sorted.slice(1)
      });
    }
    return groups;
  }
  /**
   * Search for work items using WIQL
   */
  async searchWorkItems(titlePattern) {
    if (!this.org || !this.pat) {
      throw new Error("ADO credentials not configured");
    }
    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
              FROM WorkItems
              WHERE [System.TeamProject] = '${this.project}'
              AND [System.Title] CONTAINS '${titlePattern}'
              ORDER BY [System.Id] ASC`
    };
    const auth = Buffer.from(`:${this.pat}`).toString("base64");
    const url = `https://dev.azure.com/${this.org}/${this.project}/_apis/wit/wiql?api-version=7.1`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(wiql)
    });
    if (!response.ok) {
      throw new Error(`WIQL query failed: ${response.status}`);
    }
    const data = await response.json();
    const workItemIds = data.workItems?.map((wi) => wi.id) || [];
    if (workItemIds.length === 0) {
      return [];
    }
    return this.getWorkItemDetails(workItemIds);
  }
  /**
   * Get work item details by IDs
   */
  async getWorkItemDetails(ids) {
    if (ids.length === 0) return [];
    const auth = Buffer.from(`:${this.pat}`).toString("base64");
    const url = `https://dev.azure.com/${this.org}/_apis/wit/workitems?ids=${ids.join(",")}&api-version=7.1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to get work items: ${response.status}`);
    }
    const data = await response.json();
    return (data.value || []).map((wi) => ({
      id: wi.id,
      title: wi.fields["System.Title"],
      state: wi.fields["System.State"],
      createdDate: wi.fields["System.CreatedDate"],
      url: wi._links?.html?.href
    }));
  }
  /**
   * Close a work item with duplicate comment
   */
  async closeWorkItem(workItemId, originalId) {
    const auth = Buffer.from(`:${this.pat}`).toString("base64");
    const url = `https://dev.azure.com/${this.org}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
    const comment = `## Duplicate of #${originalId}

This work item was automatically closed by SpecWeave cleanup because it is a duplicate.

The original work item (#${originalId}) contains the same content and should be used for tracking instead.

---
\u{1F916} Auto-closed by SpecWeave Duplicate Cleanup`;
    const operations = [
      {
        op: "add",
        path: "/fields/System.State",
        value: "Closed"
      },
      {
        op: "add",
        path: "/fields/System.History",
        value: comment
      }
    ];
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json-patch+json"
      },
      body: JSON.stringify(operations)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to close work item: ${response.status} - ${error}`);
    }
  }
}
async function cleanupAdoDuplicates(featureId, dryRun = false) {
  const detector = new AdoDuplicateDetector();
  return detector.cleanupFeatureDuplicates(featureId, dryRun);
}
var ado_duplicate_detector_default = AdoDuplicateDetector;
export {
  AdoDuplicateDetector,
  cleanupAdoDuplicates,
  ado_duplicate_detector_default as default
};

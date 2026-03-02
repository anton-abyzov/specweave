/**
 * Azure DevOps Duplicate Detector (v0.33.0)
 *
 * Implements 3-phase duplicate protection for ADO work items:
 * 1. Detection: Check before create
 * 2. Verification: Count check after create
 * 3. Reflection: Auto-close duplicates
 *
 * Mirrors the GitHub DuplicateDetector pattern for consistency.
 */

import { Logger, consoleLogger } from '../../../src/utils/logger.js';

export interface AdoWorkItem {
  id: number;
  title: string;
  state: string;
  createdDate: string;
  url?: string;
}

export interface DuplicateGroup {
  title: string;
  items: AdoWorkItem[];
  keepItem: AdoWorkItem;
  duplicates: AdoWorkItem[];
}

export interface DetectionResult {
  found: boolean;
  existingItem?: AdoWorkItem;
  count: number;
}

export interface VerificationResult {
  success: boolean;
  expectedCount: number;
  actualCount: number;
  duplicates: AdoWorkItem[];
}

export interface CleanupResult {
  closedCount: number;
  keptCount: number;
  errors: string[];
}

export class AdoDuplicateDetector {
  private org: string;
  private project: string;
  private pat: string;
  private logger: Logger;

  constructor(options: {
    org?: string;
    project?: string;
    pat?: string;
    logger?: Logger;
  } = {}) {
    this.org = options.org || process.env.AZURE_DEVOPS_ORG || '';
    this.project = options.project || process.env.AZURE_DEVOPS_PROJECT || '';
    this.pat = options.pat || process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_TOKEN || '';
    this.logger = options.logger || consoleLogger;
  }

  /**
   * Phase 1: Check if work item exists before creating
   */
  async checkBeforeCreate(
    titlePattern: string,
    incrementId?: string
  ): Promise<DetectionResult> {
    try {
      const items = await this.searchWorkItems(titlePattern);

      if (items.length > 0) {
        return {
          found: true,
          existingItem: items[0],
          count: items.length,
        };
      }

      return { found: false, count: 0 };
    } catch (error: any) {
      this.logger.log(`⚠️  Detection check failed: ${error.message}`);
      // Graceful degradation - continue anyway
      return { found: false, count: 0 };
    }
  }

  /**
   * Phase 2: Verify count after creation
   */
  async verifyAfterCreate(
    titlePattern: string,
    expectedCount: number = 1
  ): Promise<VerificationResult> {
    try {
      const items = await this.searchWorkItems(titlePattern);

      if (items.length > expectedCount) {
        // Duplicates detected!
        const sorted = items.sort(
          (a, b) => a.id - b.id // Sort by ID (lowest = oldest)
        );

        return {
          success: false,
          expectedCount,
          actualCount: items.length,
          duplicates: sorted.slice(expectedCount), // All items after expected count
        };
      }

      return {
        success: true,
        expectedCount,
        actualCount: items.length,
        duplicates: [],
      };
    } catch (error: any) {
      this.logger.log(`⚠️  Verification check failed: ${error.message}`);
      return {
        success: false,
        expectedCount,
        actualCount: -1,
        duplicates: [],
        error: `Verification failed: ${error.message}`,
      } as VerificationResult & { error: string };
    }
  }

  /**
   * Phase 3: Auto-close duplicates
   */
  async closeDuplicates(
    duplicates: AdoWorkItem[],
    keepItemId: number
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      closedCount: 0,
      keptCount: 1,
      errors: [],
    };

    for (const item of duplicates) {
      try {
        await this.closeWorkItem(item.id, keepItemId);
        result.closedCount++;
        this.logger.log(`  ✅ Closed #${item.id} (duplicate of #${keepItemId})`);
      } catch (error: any) {
        result.errors.push(`#${item.id}: ${error.message}`);
        this.logger.log(`  ❌ Failed to close #${item.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Full cleanup: Find and close all duplicates for a feature
   */
  async cleanupFeatureDuplicates(
    featureId: string,
    dryRun: boolean = false
  ): Promise<{
    groups: DuplicateGroup[];
    totalItems: number;
    duplicateCount: number;
    closedCount: number;
  }> {
    // 1. Search for all work items with feature ID
    const searchPattern = `[${featureId}]`;
    const items = await this.searchWorkItems(searchPattern);

    this.logger.log(`\n🔍 Scanning for duplicates in Feature ${featureId}...`);
    this.logger.log(`   Found ${items.length} total work items`);

    // 2. Group by title
    const groups = this.groupByTitle(items);
    const duplicateGroups = groups.filter(g => g.duplicates.length > 0);

    if (duplicateGroups.length === 0) {
      this.logger.log(`   ✅ No duplicates found!`);
      return {
        groups: [],
        totalItems: items.length,
        duplicateCount: 0,
        closedCount: 0,
      };
    }

    this.logger.log(`   Detected ${duplicateGroups.length} duplicate groups:\n`);

    // 3. Display groups
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      this.logger.log(`   📋 Group ${i + 1}: "${group.title.substring(0, 50)}..."`);
      this.logger.log(`      - #${group.keepItem.id} (KEEP) - Created ${group.keepItem.createdDate.split('T')[0]}`);
      for (const dup of group.duplicates) {
        this.logger.log(`      - #${dup.id} (CLOSE) - Created ${dup.createdDate.split('T')[0]} - DUPLICATE`);
      }
      this.logger.log('');
    }

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);

    if (dryRun) {
      this.logger.log(`\n✅ Dry run complete!`);
      this.logger.log(`   Total work items: ${items.length}`);
      this.logger.log(`   Duplicate groups: ${duplicateGroups.length}`);
      this.logger.log(`   Work items to close: ${totalDuplicates}`);
      this.logger.log(`\n⚠️  This was a DRY RUN - no changes made.`);

      return {
        groups: duplicateGroups,
        totalItems: items.length,
        duplicateCount: totalDuplicates,
        closedCount: 0,
      };
    }

    // 4. Close duplicates
    let closedCount = 0;
    this.logger.log(`🗑️  Closing duplicates...`);

    for (const group of duplicateGroups) {
      const result = await this.closeDuplicates(group.duplicates, group.keepItem.id);
      closedCount += result.closedCount;
    }

    this.logger.log(`\n✅ Cleanup complete!`);
    this.logger.log(`   Closed: ${closedCount} duplicates`);
    this.logger.log(`   Kept: ${duplicateGroups.length} original work items`);

    return {
      groups: duplicateGroups,
      totalItems: items.length,
      duplicateCount: totalDuplicates,
      closedCount,
    };
  }

  /**
   * Group work items by title
   */
  private groupByTitle(items: AdoWorkItem[]): DuplicateGroup[] {
    const titleMap = new Map<string, AdoWorkItem[]>();

    for (const item of items) {
      const existing = titleMap.get(item.title) || [];
      existing.push(item);
      titleMap.set(item.title, existing);
    }

    const groups: DuplicateGroup[] = [];

    for (const [title, groupItems] of titleMap) {
      // Sort by ID (lowest = oldest)
      const sorted = groupItems.sort((a, b) => a.id - b.id);

      groups.push({
        title,
        items: sorted,
        keepItem: sorted[0],
        duplicates: sorted.slice(1),
      });
    }

    return groups;
  }

  /**
   * Search for work items using WIQL
   */
  private async searchWorkItems(titlePattern: string): Promise<AdoWorkItem[]> {
    if (!this.org || !this.pat) {
      throw new Error('ADO credentials not configured');
    }

    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
              FROM WorkItems
              WHERE [System.TeamProject] = '${this.project}'
              AND [System.Title] CONTAINS '${titlePattern}'
              ORDER BY [System.Id] ASC`,
    };

    const auth = Buffer.from(`:${this.pat}`).toString('base64');
    const url = `https://dev.azure.com/${this.org}/${this.project}/_apis/wit/wiql?api-version=7.1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wiql),
    });

    if (!response.ok) {
      throw new Error(`WIQL query failed: ${response.status}`);
    }

    const data = await response.json();
    const workItemIds = data.workItems?.map((wi: any) => wi.id) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    // Fetch full work item details
    return this.getWorkItemDetails(workItemIds);
  }

  /**
   * Get work item details by IDs
   */
  private async getWorkItemDetails(ids: number[]): Promise<AdoWorkItem[]> {
    if (ids.length === 0) return [];

    const auth = Buffer.from(`:${this.pat}`).toString('base64');
    const url = `https://dev.azure.com/${this.org}/_apis/wit/workitems?ids=${ids.join(',')}&api-version=7.1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get work items: ${response.status}`);
    }

    const data = await response.json();
    return (data.value || []).map((wi: any) => ({
      id: wi.id,
      title: wi.fields['System.Title'],
      state: wi.fields['System.State'],
      createdDate: wi.fields['System.CreatedDate'],
      url: wi._links?.html?.href,
    }));
  }

  /**
   * Close a work item with duplicate comment
   */
  private async closeWorkItem(workItemId: number, originalId: number): Promise<void> {
    const auth = Buffer.from(`:${this.pat}`).toString('base64');
    const url = `https://dev.azure.com/${this.org}/_apis/wit/workitems/${workItemId}?api-version=7.1`;

    const comment = `## Duplicate of #${originalId}

This work item was automatically closed by SpecWeave cleanup because it is a duplicate.

The original work item (#${originalId}) contains the same content and should be used for tracking instead.

---
🤖 Auto-closed by SpecWeave Duplicate Cleanup`;

    const operations = [
      {
        op: 'add',
        path: '/fields/System.State',
        value: 'Closed',
      },
      {
        op: 'add',
        path: '/fields/System.History',
        value: comment,
      },
    ];

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(operations),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to close work item: ${response.status} - ${error}`);
    }
  }
}

/**
 * Convenience function for quick duplicate cleanup
 */
export async function cleanupAdoDuplicates(
  featureId: string,
  dryRun: boolean = false
): Promise<{
  groups: DuplicateGroup[];
  totalItems: number;
  duplicateCount: number;
  closedCount: number;
}> {
  const detector = new AdoDuplicateDetector();
  return detector.cleanupFeatureDuplicates(featureId, dryRun);
}

export default AdoDuplicateDetector;

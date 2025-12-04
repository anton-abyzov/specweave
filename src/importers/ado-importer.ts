/**
 * Azure DevOps Importer
 *
 * Imports Azure DevOps work items as External Items with WIQL support and pagination.
 * Handles PAT authentication and converts ADO-specific data to platform-agnostic format.
 */

import type { Importer, ExternalItem, ImportConfig } from './external-importer.js';

interface ADOWorkItem {
  id: number;
  rev: number;
  fields: {
    'System.Id': number;
    'System.Title': string;
    'System.Description'?: string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.Reason'?: string;
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.Tags'?: string; // Semicolon-separated
    'System.AreaPath'?: string; // e.g., "MyProject\\Platform-Engineering"
    'Microsoft.VSTS.Common.Priority'?: number;
    'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
    // CRITICAL FIX (2025-12-01): System.Parent is a number, not an object
    // ADO returns the parent work item ID directly as an integer
    'System.Parent'?: number;
  };
  _links: {
    html: {
      href: string;
    };
  };
}

interface ADOQueryResult {
  workItems: Array<{
    id: number;
    url: string;
  }>;
}

/**
 * Azure DevOps Importer Implementation
 */
export class ADOImporter implements Importer {
  readonly platform = 'ado' as const;
  private orgUrl: string;
  private project: string;
  private pat: string;

  constructor(orgUrl: string, project: string, pat?: string) {
    this.orgUrl = orgUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.project = project;
    this.pat = pat || process.env.AZURE_DEVOPS_PAT || '';

    if (!this.pat) {
      throw new Error(
        'Azure DevOps authentication required: Set AZURE_DEVOPS_PAT in .env file'
      );
    }
  }

  /**
   * Import all work items matching config
   */
  async import(config: ImportConfig = {}): Promise<ExternalItem[]> {
    const items: ExternalItem[] = [];

    for await (const page of this.paginate(config)) {
      items.push(...page);
    }

    return items;
  }

  /**
   * Paginate through work items using WIQL with date-based pagination for 100K+ items
   *
   * CRITICAL FIX (2025-12-01): Also fetch missing parent items (Epics/Capabilities)
   * Problem: If a parent Epic wasn't modified recently, it won't be in the WIQL results,
   * causing all its child User Stories to be grouped into one generic folder.
   * Solution: After fetching all items, identify missing parents and fetch them separately.
   *
   * ENHANCEMENT (2025-12-01): Date-based pagination to handle 100K+ items
   * ADO WIQL has a 20K ID limit per query. For larger projects, we need to:
   * 1. Run initial WIQL query (up to 20K IDs)
   * 2. If we hit the limit, run another query with older date range
   * 3. Keep paginating by date until we have all items or hit maxItems
   */
  async *paginate(config: ImportConfig = {}): AsyncGenerator<ExternalItem[], void, unknown> {
    const {
      timeRangeMonths = 3,
      includeClosed = false,
      labels = [],
      maxItems = Infinity,
    } = config;

    // Collect all items to find missing parents after pagination
    const allFetchedItems: ExternalItem[] = [];
    const fetchedIds = new Set<number>();
    const top = 200; // ADO pagination size (max 200)
    let totalFetched = 0;

    // WIQL has a 20K limit per query - use date-based pagination for larger datasets
    const WIQL_LIMIT = 20000;
    let currentEndDate = new Date(); // Start from now
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - timeRangeMonths);

    try {
      // Date-based pagination loop
      let dateRangeIteration = 0;
      let hasMoreItems = true;

      while (hasMoreItems && totalFetched < maxItems && currentEndDate > sinceDate) {
        dateRangeIteration++;

        // Build WIQL query for this date range
        const sinceDateStr = sinceDate.toISOString().split('T')[0];
        const untilDateStr = currentEndDate.toISOString().split('T')[0];

        const wiqlParts: string[] = [
          `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.ChangedDate]`,
          `FROM WorkItems`,
          `WHERE [System.TeamProject] = '${this.project}'`,
          // Use ChangedDate range for pagination
          `AND [System.ChangedDate] >= '${sinceDateStr}'`,
        ];

        // For subsequent iterations, add upper bound to avoid duplicates
        if (dateRangeIteration > 1) {
          wiqlParts.push(`AND [System.ChangedDate] < '${untilDateStr}'`);
        }

        wiqlParts.push(
          // Filter for relevant work item types (includes Capability for enterprise setups)
          `AND [System.WorkItemType] IN ('Capability', 'Epic', 'Feature', 'User Story', 'Product Backlog Item', 'Bug', 'Task')`
        );

        // Status filter
        if (!includeClosed) {
          wiqlParts.push(`AND [System.State] <> 'Closed' AND [System.State] <> 'Removed'`);
        }

        // Tags filter (ADO uses semicolon-separated tags)
        if (labels.length > 0) {
          const tagsCondition = labels.map((tag) => `[System.Tags] CONTAINS '${tag}'`).join(' OR ');
          wiqlParts.push(`AND (${tagsCondition})`);
        }

        wiqlParts.push(`ORDER BY [System.ChangedDate] DESC`);

        const wiql = wiqlParts.join(' ');

        // Execute WIQL query - use high limit to maximize items per query
        const queryResult = await this.makeADORequest<ADOQueryResult>(
          `/_apis/wit/wiql?$top=20000&api-version=7.0`,
          {
            method: 'POST',
            body: JSON.stringify({ query: wiql }),
          }
        );

        const workItemIds = queryResult.workItems.map((wi) => wi.id);

        // Filter out already fetched IDs (avoid duplicates across date ranges)
        const newIds = workItemIds.filter(id => !fetchedIds.has(id));

        console.log(`   📊 WIQL iteration ${dateRangeIteration}: ${workItemIds.length} IDs found (${newIds.length} new)`);

        if (newIds.length === 0) {
          // No new items - we're done or need to go further back in time
          if (workItemIds.length >= WIQL_LIMIT) {
            // Hit the limit but all were duplicates - shouldn't happen, but handle it
            hasMoreItems = false;
          } else {
            hasMoreItems = false;
          }
          continue;
        }

        // Paginate through work item IDs
        let skip = 0;
        let oldestChangedDate: Date | null = null;

        while (skip < newIds.length && totalFetched < maxItems) {
          const ids = newIds.slice(skip, skip + top);

          if (ids.length === 0) {
            break;
          }

          // Fetch full work item details
          const workItems = await this.getWorkItemsBatch(ids);

          // Track fetched IDs and find oldest date for next iteration
          for (const wi of workItems) {
            fetchedIds.add(wi.fields['System.Id']);
            const changedDate = new Date(wi.fields['System.ChangedDate']);
            if (!oldestChangedDate || changedDate < oldestChangedDate) {
              oldestChangedDate = changedDate;
            }
          }

          // Convert to ExternalItems
          const items = workItems.map((wi) => this.convertToExternalItem(wi));
          allFetchedItems.push(...items);

          // Yield page
          if (items.length > 0) {
            const itemsToYield = items.slice(0, maxItems - totalFetched);
            yield itemsToYield;
            totalFetched += itemsToYield.length;
          }

          skip += top;
        }

        // Check if we hit the WIQL limit and need another date range iteration
        if (workItemIds.length >= WIQL_LIMIT && oldestChangedDate && totalFetched < maxItems) {
          // Move date window back to continue fetching older items
          currentEndDate = oldestChangedDate;
          console.log(`   📅 Hit WIQL limit, continuing with items before ${currentEndDate.toISOString().split('T')[0]}...`);
        } else {
          hasMoreItems = false;
        }
      }

      console.log(`   ✅ Total items fetched: ${totalFetched}`);

      // Step 3: CRITICAL - Fetch missing parent items (Epics/Capabilities not in time range)
      // This ensures proper hierarchy grouping even for old parent items
      const missingParentIds = this.findMissingParentIds(allFetchedItems, fetchedIds);

      if (missingParentIds.length > 0) {
        console.log(`   📥 Fetching ${missingParentIds.length} parent items (Epics/Capabilities) for hierarchy...`);

        // Fetch missing parents in batches
        for (let i = 0; i < missingParentIds.length; i += top) {
          const batchIds = missingParentIds.slice(i, i + top);
          const parentWorkItems = await this.getWorkItemsBatch(batchIds);
          const parentItems = parentWorkItems.map((wi) => this.convertToExternalItem(wi));

          // Yield parent items (they need to be processed for grouping)
          if (parentItems.length > 0) {
            yield parentItems;
          }
        }
      }
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error(`Azure DevOps authentication failed: ${error.message}`);
      } else if (error.status === 403) {
        throw new Error(`Azure DevOps access forbidden: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Find parent IDs that are referenced but not in our fetched items
   * These are typically Epics/Capabilities that weren't modified recently
   */
  private findMissingParentIds(items: ExternalItem[], fetchedIds: Set<number>): number[] {
    const missingIds = new Set<number>();

    for (const item of items) {
      if (item.parentId) {
        // Extract numeric ID from "ADO-123" format
        const numericId = parseInt(item.parentId.replace('ADO-', ''), 10);
        if (!isNaN(numericId) && !fetchedIds.has(numericId)) {
          missingIds.add(numericId);
        }
      }
    }

    return Array.from(missingIds);
  }

  /**
   * Fetch work items in batch (up to 200 IDs)
   */
  private async getWorkItemsBatch(ids: number[]): Promise<ADOWorkItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const idsParam = ids.join(',');
    const fields = [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.WorkItemType',
      'System.State',
      'System.CreatedDate',
      'System.ChangedDate',
      'System.Tags',
      'System.AreaPath', // CRITICAL: Required for organizing items by area path
      'Microsoft.VSTS.Common.Priority',
      'Microsoft.VSTS.Common.AcceptanceCriteria',
      'System.Parent',
    ].join(',');

    const response = await this.makeADORequest<{ value: ADOWorkItem[] }>(
      `/_apis/wit/workitems?ids=${idsParam}&fields=${fields}&$expand=Links&api-version=7.0`
    );

    return response.value;
  }

  /**
   * Make authenticated ADO API request
   */
  private async makeADORequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.orgUrl}/${this.project}${endpoint}`;

    // Create Basic Auth header (PAT as username, empty password)
    const auth = Buffer.from(`:${this.pat}`).toString('base64');

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: any = new Error(`ADO API error: ${response.statusText} - ${errorText}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  /**
   * Convert ADO work item to ExternalItem
   */
  private convertToExternalItem(workItem: ADOWorkItem): ExternalItem {
    // Map ADO work item type to ExternalItem type
    // CRITICAL FIX (2025-12-01): Added 'capability' mapping for enterprise ADO setups
    // ADO hierarchy: Capability → Epic → Feature → User Story → Task
    let type: ExternalItem['type'] = 'task';
    const witType = workItem.fields['System.WorkItemType'].toLowerCase();

    if (witType === 'user story' || witType === 'product backlog item') {
      type = 'user-story';
    } else if (witType === 'epic') {
      type = 'epic';
    } else if (witType === 'capability') {
      // Capability is above Epic in some ADO setups - treat as epic for feature organization
      type = 'epic';
    } else if (witType === 'bug') {
      type = 'bug';
    } else if (witType === 'feature') {
      type = 'feature';
    }

    // Map ADO priority to ExternalItem priority
    const priorityValue = workItem.fields['Microsoft.VSTS.Common.Priority'];
    let priority: ExternalItem['priority'] | undefined;
    if (priorityValue !== undefined) {
      if (priorityValue === 1) priority = 'P0';
      else if (priorityValue === 2) priority = 'P1';
      else if (priorityValue === 3) priority = 'P2';
      else if (priorityValue === 4) priority = 'P3';
      else priority = 'P4';
    }

    // Extract acceptance criteria (ADO has dedicated field)
    const acceptanceCriteria = workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria']
      ? this.parseAcceptanceCriteria(workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'])
      : undefined;

    // Map ADO state to ExternalItem status
    let status: ExternalItem['status'] = 'open';
    const state = workItem.fields['System.State'].toLowerCase();

    if (state === 'active' || state === 'in progress' || state === 'committed') {
      status = 'in-progress';
    } else if (state === 'closed' || state === 'done' || state === 'resolved') {
      status = 'completed';
    }

    // Parse tags (semicolon-separated)
    const tags = workItem.fields['System.Tags']
      ? workItem.fields['System.Tags'].split(';').map((t) => t.trim()).filter(Boolean)
      : [];

    return {
      id: `ADO-${workItem.fields['System.Id']}`,
      type,
      title: workItem.fields['System.Title'],
      description: workItem.fields['System.Description'] || '',
      status,
      priority,
      createdAt: new Date(workItem.fields['System.CreatedDate']),
      updatedAt: new Date(workItem.fields['System.ChangedDate']),
      url: workItem._links.html.href,
      labels: tags,
      acceptanceCriteria,
      // CRITICAL FIX (2025-12-01): System.Parent is a number, not object
      parentId: workItem.fields['System.Parent']
        ? `ADO-${workItem.fields['System.Parent']}`
        : undefined,
      platform: 'ado',
      adoProjectName: this.project,
      adoAreaPath: workItem.fields['System.AreaPath'],
      // Store original work item type for hierarchy mapping
      adoWorkItemType: workItem.fields['System.WorkItemType'],
    };
  }

  /**
   * Parse acceptance criteria from ADO HTML format
   * ADO stores ACs as HTML, needs to extract plain text
   */
  private parseAcceptanceCriteria(html: string): string[] | undefined {
    // Strip HTML tags and extract bullet points
    const text = html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // Split by newlines and filter empty lines
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines : undefined;
  }
}

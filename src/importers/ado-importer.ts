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
    'Microsoft.VSTS.Common.Priority'?: number;
    'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
    'System.Parent'?: {
      id: number;
    };
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
    this.pat = pat || process.env.ADO_PAT || process.env.AZURE_DEVOPS_PAT || '';

    if (!this.pat) {
      throw new Error(
        'Azure DevOps authentication required: Set ADO_PAT or AZURE_DEVOPS_PAT environment variable'
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
   * Paginate through work items using WIQL (200 per page)
   */
  async *paginate(config: ImportConfig = {}): AsyncGenerator<ExternalItem[], void, unknown> {
    const {
      timeRangeMonths = 3,
      includeClosed = false,
      labels = [],
      maxItems = Infinity,
    } = config;

    // Build WIQL query
    const since = new Date();
    since.setMonth(since.getMonth() - timeRangeMonths);
    const sinceStr = since.toISOString().split('T')[0];

    const wiqlParts: string[] = [
      `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State]`,
      `FROM WorkItems`,
      `WHERE [System.TeamProject] = '${this.project}'`,
      `AND [System.CreatedDate] >= '${sinceStr}'`,
    ];

    // Status filter
    if (!includeClosed) {
      wiqlParts.push(`AND [System.State] <> 'Closed' AND [System.State] <> 'Removed'`);
    }

    // Tags filter (ADO uses semicolon-separated tags)
    if (labels.length > 0) {
      const tagsCondition = labels.map((tag) => `[System.Tags] CONTAINS '${tag}'`).join(' OR ');
      wiqlParts.push(`AND (${tagsCondition})`);
    }

    wiqlParts.push(`ORDER BY [System.CreatedDate] DESC`);

    const wiql = wiqlParts.join(' ');

    try {
      // Step 1: Execute WIQL query ONCE to get all work item IDs
      const queryResult = await this.makeADORequest<ADOQueryResult>(
        `/_apis/wit/wiql?api-version=7.0`,
        {
          method: 'POST',
          body: JSON.stringify({ query: wiql }),
        }
      );

      const allWorkItemIds = queryResult.workItems.map((wi) => wi.id);

      // Step 2: Paginate through work item IDs
      let skip = 0;
      const top = 200; // ADO pagination size (max 200)
      let totalFetched = 0;

      while (skip < allWorkItemIds.length && totalFetched < maxItems) {
        // Get IDs for this page
        const ids = allWorkItemIds.slice(skip, skip + top);

        if (ids.length === 0) {
          break;
        }

        // Fetch full work item details
        const workItems = await this.getWorkItemsBatch(ids);

        // Convert to ExternalItems
        const items = workItems.map((wi) => this.convertToExternalItem(wi));

        // Yield page
        if (items.length > 0) {
          yield items.slice(0, maxItems - totalFetched);
          totalFetched += items.length;
        }

        skip += top;
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
    let type: ExternalItem['type'] = 'task';
    const witType = workItem.fields['System.WorkItemType'].toLowerCase();

    if (witType === 'user story' || witType === 'product backlog item') {
      type = 'user-story';
    } else if (witType === 'epic') {
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
      parentId: workItem.fields['System.Parent']
        ? `ADO-${workItem.fields['System.Parent'].id}`
        : undefined,
      platform: 'ado',
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

/**
 * Azure DevOps REST API Client (Multi-Project Support)
 *
 * Profile-based ADO client for SpecWeave that supports:
 * - Multiple ADO projects via sync profiles
 * - Time range filtering with WIQL queries
 * - Rate limiting protection
 * - Secure HTTPS requests
 */

import https from 'https';
import {
  SyncProfile,
  AdoConfig,
  TimeRangePreset,
} from '../../../src/core/types/sync-profile';

// ============================================================================
// Types
// ============================================================================

export interface WorkItem {
  id: number;
  rev: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'System.Tags'?: string;
    'System.WorkItemType': string;
    [key: string]: any;
  };
  _links: {
    html: { href: string };
  };
  url: string;
}

export interface WorkItemQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  workItems: Array<{ id: number; url: string }>;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  parentId?: number; // Link to epic/feature
}

export interface UpdateWorkItemRequest {
  state?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

// ============================================================================
// Azure DevOps Client V2
// ============================================================================

export class AdoClientV2 {
  private organization: string;
  private project: string;
  private workItemType: string;
  private areaPath?: string;
  private iterationPath?: string;
  private baseUrl: string;
  private authHeader: string;

  /**
   * Create ADO client from sync profile
   */
  constructor(profile: SyncProfile, personalAccessToken: string) {
    if (profile.provider !== 'ado') {
      throw new Error(`Expected ADO profile, got ${profile.provider}`);
    }

    const config = profile.config as AdoConfig;
    this.organization = config.organization;
    this.project = config.project;
    this.workItemType = config.workItemType || 'Epic';
    this.areaPath = config.areaPath;
    this.iterationPath = config.iterationPath;

    this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}`;

    // Basic Auth: base64(":PAT")
    this.authHeader =
      'Basic ' + Buffer.from(`:${personalAccessToken}`).toString('base64');
  }

  /**
   * Create client from organization/project directly
   */
  static fromProject(
    organization: string,
    project: string,
    personalAccessToken: string,
    workItemType: string = 'Epic'
  ): AdoClientV2 {
    const profile: SyncProfile = {
      provider: 'ado',
      displayName: `${organization}/${project}`,
      config: { organization, project, workItemType },
      timeRange: { default: '1M', max: '6M' },
    };
    return new AdoClientV2(profile, personalAccessToken);
  }

  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================

  /**
   * Test connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('GET', `/_apis/projects/${this.project}?api-version=7.1`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // Work Items
  // ==========================================================================

  /**
   * Create epic work item
   */
  async createEpic(request: CreateWorkItemRequest): Promise<WorkItem> {
    const url = `/_apis/wit/workitems/$${this.workItemType}?api-version=7.1`;

    // Build JSON Patch document
    const operations: any[] = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: request.title,
      },
    ];

    if (request.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: `<pre>${request.description}</pre>`,
      });
    }

    if (request.areaPath || this.areaPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.AreaPath',
        value: request.areaPath || this.areaPath,
      });
    }

    if (request.iterationPath || this.iterationPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.IterationPath',
        value: request.iterationPath || this.iterationPath,
      });
    }

    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: request.tags.join('; '),
      });
    }

    return this.request('POST', url, operations, {
      'Content-Type': 'application/json-patch+json',
    });
  }

  /**
   * Create child work item (feature/story) linked to epic
   */
  async createChildWorkItem(
    request: CreateWorkItemRequest,
    parentId: number,
    childType: string = 'User Story'
  ): Promise<WorkItem> {
    const url = `/_apis/wit/workitems/$${childType}?api-version=7.1`;

    const operations: any[] = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: request.title,
      },
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `${this.baseUrl}/_apis/wit/workItems/${parentId}`,
        },
      },
    ];

    if (request.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: `<pre>${request.description}</pre>`,
      });
    }

    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: request.tags.join('; '),
      });
    }

    return this.request('POST', url, operations, {
      'Content-Type': 'application/json-patch+json',
    });
  }

  /**
   * Get work item by ID
   */
  async getWorkItem(id: number): Promise<WorkItem> {
    return this.request('GET', `/_apis/wit/workitems/${id}?api-version=7.1`);
  }

  /**
   * Update work item
   */
  async updateWorkItem(
    id: number,
    updates: UpdateWorkItemRequest
  ): Promise<WorkItem> {
    const url = `/_apis/wit/workitems/${id}?api-version=7.1`;

    const operations: any[] = [];

    if (updates.state) {
      operations.push({
        op: 'add',
        path: '/fields/System.State',
        value: updates.state,
      });
    }

    if (updates.title) {
      operations.push({
        op: 'add',
        path: '/fields/System.Title',
        value: updates.title,
      });
    }

    if (updates.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: `<pre>${updates.description}</pre>`,
      });
    }

    if (updates.tags) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: updates.tags.join('; '),
      });
    }

    return this.request('PATCH', url, operations, {
      'Content-Type': 'application/json-patch+json',
    });
  }

  /**
   * Add comment to work item
   */
  async addComment(workItemId: number, comment: string): Promise<void> {
    const url = `/_apis/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`;

    await this.request('POST', url, { text: comment });
  }

  // ==========================================================================
  // Query & Time Range Filtering
  // ==========================================================================

  /**
   * Execute WIQL query
   */
  async queryWorkItems(wiql: string): Promise<WorkItem[]> {
    const url = `/_apis/wit/wiql?api-version=7.1`;

    const queryResult: WorkItemQueryResult = await this.request('POST', url, {
      query: wiql,
    });

    if (queryResult.workItems.length === 0) {
      return [];
    }

    // Get full work item details (batch request)
    const ids = queryResult.workItems.map((wi) => wi.id);
    const batchUrl = `/_apis/wit/workitemsbatch?api-version=7.1`;

    const workItems = await this.request('POST', batchUrl, {
      ids,
      fields: [
        'System.Id',
        'System.Title',
        'System.Description',
        'System.State',
        'System.CreatedDate',
        'System.ChangedDate',
        'System.WorkItemType',
        'System.Tags',
      ],
    });

    return workItems.value || [];
  }

  /**
   * List work items within time range
   */
  async listWorkItemsInTimeRange(
    timeRange: TimeRangePreset,
    customStart?: string,
    customEnd?: string
  ): Promise<WorkItem[]> {
    const { since, until } = this.calculateTimeRange(
      timeRange,
      customStart,
      customEnd
    );

    // WIQL query for time range
    const wiql = `
      SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
      FROM WorkItems
      WHERE [System.TeamProject] = '${this.project}'
      AND [System.CreatedDate] >= '${since}'
      AND [System.CreatedDate] <= '${until}'
      ORDER BY [System.CreatedDate] DESC
    `;

    return this.queryWorkItems(wiql);
  }

  /**
   * Calculate date range from preset
   */
  private calculateTimeRange(
    timeRange: TimeRangePreset,
    customStart?: string,
    customEnd?: string
  ): { since: string; until: string } {
    if (timeRange === 'ALL') {
      return {
        since: '1970-01-01T00:00:00Z',
        until: new Date().toISOString(),
      };
    }

    if (customStart) {
      return {
        since: customStart,
        until: customEnd || new Date().toISOString(),
      };
    }

    const now = new Date();
    const since = new Date(now);

    switch (timeRange) {
      case '1W':
        since.setDate(now.getDate() - 7);
        break;
      case '2W':
        since.setDate(now.getDate() - 14);
        break;
      case '1M':
        since.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        since.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        since.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        since.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      since: since.toISOString(),
      until: now.toISOString(),
    };
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Batch create work items with rate limit handling
   */
  async batchCreateWorkItems(
    workItems: CreateWorkItemRequest[],
    parentId?: number,
    childType?: string,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<WorkItem[]> {
    const { batchSize = 10, delayMs = 15000 } = options; // 10 items per minute (ADO: 200/5min limit)
    const created: WorkItem[] = [];

    for (let i = 0; i < workItems.length; i += batchSize) {
      const batch = workItems.slice(i, i + batchSize);

      console.log(
        `Creating work items ${i + 1}-${Math.min(i + batchSize, workItems.length)} of ${workItems.length}...`
      );

      for (const item of batch) {
        try {
          const createdItem =
            parentId && childType
              ? await this.createChildWorkItem(item, parentId, childType)
              : await this.createEpic(item);

          created.push(createdItem);
        } catch (error: any) {
          console.error(
            `Failed to create work item "${item.title}":`,
            error.message
          );
        }
      }

      // Delay between batches
      if (i + batchSize < workItems.length) {
        console.log(`Waiting ${delayMs / 1000}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }

    return created;
  }

  // ==========================================================================
  // HTTP Request Handler
  // ==========================================================================

  /**
   * Make HTTPS request to ADO API
   */
  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const { hostname, pathname, search } = new URL(url);

      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: 'application/json',
        ...customHeaders,
      };

      if (body && !customHeaders?.['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const options = {
        hostname,
        path: pathname + search,
        method,
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          // Parse response
          let parsed: any;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = { raw: data };
          }

          // Check status code
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed as T);
          } else {
            const errorMsg =
              parsed.message ||
              `HTTP ${res.statusCode}: ${data}`;
            reject(new Error(errorMsg));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Send body if present
      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

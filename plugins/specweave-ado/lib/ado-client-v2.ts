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
  SyncContainer,
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
  private project?: string; // Optional for multi-project mode
  private workItemType: string;
  private areaPath?: string;
  private iterationPath?: string;
  private baseUrl: string;
  private authHeader: string;

  // Multi-project support
  private containers?: SyncContainer[];
  private customQuery?: string;
  private isMultiProject: boolean;

  /**
   * Create ADO client from sync profile
   */
  constructor(profile: SyncProfile, personalAccessToken: string) {
    if (profile.provider !== 'ado') {
      throw new Error(`Expected ADO profile, got ${profile.provider}`);
    }

    const config = profile.config as AdoConfig;
    this.organization = config.organization;
    this.workItemType = config.workItemType || 'Epic';

    // Detect mode: single-project vs multi-project
    if (config.containers && config.containers.length > 0) {
      // Multi-project mode
      this.isMultiProject = true;
      this.containers = config.containers;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else if (config.customQuery) {
      // Custom WIQL query mode
      this.isMultiProject = true;
      this.customQuery = config.customQuery;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else {
      // Single-project mode (backward compatible)
      this.isMultiProject = false;
      this.project = config.project;
      this.areaPath = config.areaPath;
      this.iterationPath = config.iterationPath;
      this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}`;
    }

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
      if (this.isMultiProject) {
        // Test org-level access
        await this.request('GET', `https://dev.azure.com/${this.organization}/_apis/projects?api-version=7.1`);
      } else {
        // Test project-level access
        await this.request('GET', `/_apis/projects/${this.project}?api-version=7.1`);
      }
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
    // For multi-project, use org-level API
    const queryUrl = this.isMultiProject
      ? `https://dev.azure.com/${this.organization}/_apis/wit/wiql?api-version=7.1`
      : `/_apis/wit/wiql?api-version=7.1`;

    const queryResult: WorkItemQueryResult = await this.request('POST', queryUrl, {
      query: wiql,
    });

    if (queryResult.workItems.length === 0) {
      return [];
    }

    // Get full work item details (batch request)
    const ids = queryResult.workItems.map((wi) => wi.id);

    // For multi-project, use org-level batch API
    const batchUrl = this.isMultiProject
      ? `https://dev.azure.com/${this.organization}/_apis/wit/workitemsbatch?api-version=7.1`
      : `/_apis/wit/workitemsbatch?api-version=7.1`;

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
        'System.AreaPath',
        'System.IterationPath',
        'System.TeamProject',
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

    // Use custom query if provided
    if (this.customQuery) {
      return this.queryWorkItems(this.customQuery);
    }

    // Multi-project mode with containers
    if (this.isMultiProject && this.containers) {
      return this.queryWorkItemsAcrossContainers(since, until);
    }

    // Single-project mode (backward compatible)
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
   * Query work items across multiple containers (multi-project)
   */
  private async queryWorkItemsAcrossContainers(
    since: string,
    until: string
  ): Promise<WorkItem[]> {
    if (!this.containers || this.containers.length === 0) {
      return [];
    }

    const allWorkItems: WorkItem[] = [];

    for (const container of this.containers) {
      const wiql = this.buildContainerWIQL(container, since, until);

      try {
        const workItems = await this.queryWorkItems(wiql);
        allWorkItems.push(...workItems);
      } catch (error: any) {
        console.error(`Failed to query container ${container.id}:`, error.message);
        // Continue with other containers
      }
    }

    return allWorkItems;
  }

  /**
   * Build WIQL query for a specific container with filters
   */
  private buildContainerWIQL(
    container: SyncContainer,
    since: string,
    until: string
  ): string {
    const conditions: string[] = [];

    // Project filter
    conditions.push(`[System.TeamProject] = '${container.id}'`);

    // Time range
    conditions.push(`[System.CreatedDate] >= '${since}'`);
    conditions.push(`[System.CreatedDate] <= '${until}'`);

    // Area paths filter
    if (container.filters?.areaPaths && container.filters.areaPaths.length > 0) {
      const areaPathConditions = container.filters.areaPaths
        .map(ap => `[System.AreaPath] UNDER '${container.id}\\${ap}'`)
        .join(' OR ');
      conditions.push(`(${areaPathConditions})`);
    }

    // Work item types filter
    if (container.filters?.workItemTypes && container.filters.workItemTypes.length > 0) {
      const typeConditions = container.filters.workItemTypes
        .map(type => `[System.WorkItemType] = '${type}'`)
        .join(' OR ');
      conditions.push(`(${typeConditions})`);
    }

    // Iteration paths filter
    if (container.filters?.iterationPaths && container.filters.iterationPaths.length > 0) {
      const iterationConditions = container.filters.iterationPaths
        .map(ip => `[System.IterationPath] UNDER '${container.id}\\${ip}'`)
        .join(' OR ');
      conditions.push(`(${iterationConditions})`);
    }

    return `
      SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate], [System.WorkItemType]
      FROM WorkItems
      WHERE ${conditions.join('\n      AND ')}
      ORDER BY [System.CreatedDate] DESC
    `;
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

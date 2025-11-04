/**
 * Azure DevOps REST API Client
 * 
 * Provides TypeScript interface to Azure DevOps REST API v7.1
 * for work item management and SpecWeave integration.
 * 
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/
 */

import https from 'https';

// ============================================================================
// Types
// ============================================================================

export interface AdoConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
  workItemType?: 'Epic' | 'Feature' | 'User Story';
  areaPath?: string;
  iterationPath?: string;
}

export interface WorkItem {
  id: number;
  rev: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'System.Tags'?: string;
    [key: string]: any;
  };
  _links: {
    html: { href: string };
  };
  url: string;
}

export interface WorkItemComment {
  id: number;
  text: string;
  createdBy: { displayName: string };
  createdDate: string;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
}

export interface UpdateWorkItemRequest {
  state?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

// ============================================================================
// Azure DevOps Client
// ============================================================================

export class AdoClient {
  private config: AdoConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: AdoConfig) {
    this.config = config;
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}`;
    
    // Basic Auth: base64(":PAT")
    this.authHeader = 'Basic ' + Buffer.from(`:${config.personalAccessToken}`).toString('base64');
  }

  // ==========================================================================
  // Work Item Operations
  // ==========================================================================

  /**
   * Create a new work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create
   */
  async createWorkItem(request: CreateWorkItemRequest): Promise<WorkItem> {
    const workItemType = this.config.workItemType || 'Epic';
    const url = `${this.baseUrl}/_apis/wit/workitems/$${workItemType}?api-version=7.1`;

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

    if (request.areaPath || this.config.areaPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.AreaPath',
        value: request.areaPath || this.config.areaPath,
      });
    }

    if (request.iterationPath || this.config.iterationPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.IterationPath',
        value: request.iterationPath || this.config.iterationPath,
      });
    }

    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: request.tags.join('; '),
      });
    }

    const response = await this.request<WorkItem>('POST', url, operations, {
      'Content-Type': 'application/json-patch+json',
    });

    return response;
  }

  /**
   * Get work item by ID
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item
   */
  async getWorkItem(id: number): Promise<WorkItem> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;
    return this.request<WorkItem>('GET', url);
  }

  /**
   * Update work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update
   */
  async updateWorkItem(id: number, request: UpdateWorkItemRequest): Promise<WorkItem> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;

    const operations: any[] = [];

    if (request.state) {
      operations.push({
        op: 'add',
        path: '/fields/System.State',
        value: request.state,
      });
    }

    if (request.title) {
      operations.push({
        op: 'add',
        path: '/fields/System.Title',
        value: request.title,
      });
    }

    if (request.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: `<pre>${request.description}</pre>`,
      });
    }

    if (request.tags) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: request.tags.join('; '),
      });
    }

    return this.request<WorkItem>('PATCH', url, operations, {
      'Content-Type': 'application/json-patch+json',
    });
  }

  /**
   * Delete work item (move to Recycle Bin)
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/delete
   */
  async deleteWorkItem(id: number): Promise<void> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;
    await this.request('DELETE', url);
  }

  // ==========================================================================
  // Comment Operations
  // ==========================================================================

  /**
   * Add comment to work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/add
   */
  async addComment(workItemId: number, text: string): Promise<WorkItemComment> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1`;

    const response = await this.request<WorkItemComment>('POST', url, { text });

    return response;
  }

  /**
   * Get comments for work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/list
   */
  async getComments(workItemId: number): Promise<WorkItemComment[]> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1`;

    const response = await this.request<{ comments: WorkItemComment[] }>('GET', url);

    return response.comments || [];
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Make HTTP request to ADO API
   */
  private async request<T>(
    method: string,
    url: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
          ...additionalHeaders,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed as T);
            } catch (error) {
              reject(new Error(`Failed to parse JSON response: ${error}`));
            }
          } else {
            let errorMessage = `ADO API error: ${res.statusCode} ${res.statusMessage}`;
            try {
              const errorData = JSON.parse(data);
              if (errorData.message) {
                errorMessage += ` - ${errorData.message}`;
              }
            } catch {
              // Ignore JSON parse errors for error responses
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Test connection to ADO
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple test: list work item types
      const url = `${this.baseUrl}/_apis/wit/workitemtypes?api-version=7.1`;
      await this.request('GET', url);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create ADO client from environment variables and config
 */
export function createAdoClient(config: Partial<AdoConfig> = {}): AdoClient {
  const fullConfig: AdoConfig = {
    organization: config.organization || process.env.AZURE_DEVOPS_ORG || '',
    project: config.project || process.env.AZURE_DEVOPS_PROJECT || '',
    personalAccessToken: config.personalAccessToken || process.env.AZURE_DEVOPS_PAT || '',
    workItemType: config.workItemType,
    areaPath: config.areaPath,
    iterationPath: config.iterationPath,
  };

  if (!fullConfig.organization) {
    throw new Error('ADO organization not configured');
  }

  if (!fullConfig.project) {
    throw new Error('ADO project not configured');
  }

  if (!fullConfig.personalAccessToken) {
    throw new Error('AZURE_DEVOPS_PAT not set');
  }

  return new AdoClient(fullConfig);
}

// ============================================================================
// Exports
// ============================================================================

export default AdoClient;

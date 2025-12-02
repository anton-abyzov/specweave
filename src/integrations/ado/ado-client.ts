/**
 * Azure DevOps API Client
 *
 * Supports:
 * 1. MCP Server (microsoft/azure-devops-mcp) - Primary
 * 2. REST API - Fallback
 *
 * Features:
 * - List work items with filtering (by sprint, status, etc.)
 * - Create work items (Epic, Feature, User Story, Task)
 * - Update work items
 * - Get sprint/iteration information
 */

import { credentialsManager, AdoCredentials } from '../../core/credentials/credentials-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Module logger - can be replaced for testing
 */
let moduleLogger: Logger = consoleLogger;

/**
 * Set the logger for this module
 */
export function setAdoClientLogger(logger: Logger): void {
  moduleLogger = logger;
}

export interface AdoWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.Priority'?: number;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'System.Tags'?: string;
    'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
    [key: string]: any;
  };
  relations?: Array<{
    rel: string;
    url: string;
  }>;
  url: string;
}

export interface AdoIteration {
  id: string;
  name: string;
  path: string;
  attributes: {
    startDate?: string;
    finishDate?: string;
    timeFrame: 'past' | 'current' | 'future';
  };
}

export interface AdoWorkItemFilter {
  workItemType?: string[];  // ['Epic', 'Feature', 'User Story', 'Task']
  state?: string[];         // ['New', 'Active', 'Resolved', 'Closed']
  iteration?: string;       // Iteration path
  areaPath?: string;        // Area path
  tags?: string[];          // Tags to filter by
  assignedTo?: string;      // Assigned user
  top?: number;             // Limit results
  changedSince?: Date;      // Filter by changed date (for pull sync)
  workItemIds?: number[];   // Filter by specific IDs (for linked items)
}

/**
 * External change representation for pull sync
 */
export interface AdoExternalChange {
  platform: 'ado';
  externalId: string;
  workItemId: number;
  changedAt: string;        // ISO timestamp
  changedBy: string;        // Email/username
  changedFields: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  currentState: {
    status: string;
    priority: number | null;
    assignee: string | null;
  };
}

export interface AdoWorkItemCreate {
  workItemType: 'Epic' | 'Feature' | 'User Story' | 'Task';
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: number;
  state?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  parentId?: number;        // For linking child items
  customFields?: Record<string, any>;
}

export interface AdoWorkItemUpdate {
  id: number;
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: number;
  state?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * ADO Process Template detection result
 * Used to determine hierarchy mapping for import
 */
export interface AdoProcessTemplateInfo {
  /** Detected template name */
  template: 'Agile' | 'Scrum' | 'CMMI' | 'Basic' | 'SAFe';
  /** Whether Capability work item type exists (SAFe/Enterprise) */
  hasCapability: boolean;
  /** Work item types available in this project */
  workItemTypes: string[];
  /** Hierarchy mapping for this template */
  hierarchyMapping: {
    /** ADO Capability → SpecWeave Epic (_epics/EP-XXXE/) - only in SAFe */
    capability?: 'epic';
    /** ADO Epic → SpecWeave Epic or Feature depending on template */
    epic: 'epic' | 'feature';
    /** ADO Feature → SpecWeave Feature (FS-XXXE/) */
    feature: 'feature';
    /** ADO User Story/PBI/Requirement → SpecWeave User Story (us-xxxe.md) */
    userStory: 'user-story';
    /** ADO Task → SpecWeave Task (tasks.md) */
    task: 'task';
  };
}

/**
 * Configuration for profile-aware ADO client
 * Use this when creating client for specific increment's profile
 */
export interface AdoClientConfig {
  pat: string;
  organization: string;
  project: string;
}

export class AdoClient {
  private credentials: AdoCredentials;
  private baseUrl: string;
  private apiVersion = '7.0';
  private useMcp = false; // Will be set based on MCP availability

  /**
   * Create ADO client
   *
   * @param config - Optional profile-specific config. If not provided,
   *                 falls back to credentials from .env (single-profile mode)
   *
   * For multi-project support, use createAdoClientForIncrement() factory
   * which resolves the increment's profile automatically.
   */
  constructor(config?: AdoClientConfig) {
    if (config) {
      // Profile-aware mode: use provided config
      this.credentials = {
        pat: config.pat,
        organization: config.organization,
        project: config.project,
      };
    } else {
      // Legacy mode: use global credentials from .env
      this.credentials = credentialsManager.getAdoCredentials();
    }
    this.baseUrl = `https://dev.azure.com/${this.credentials.organization}/${this.credentials.project}`;

    // TODO: Detect MCP server availability
    // For now, default to REST API
    this.useMcp = false;
  }

  /**
   * Get authorization header for REST API
   */
  private getAuthHeader(): string {
    const auth = Buffer.from(`:${this.credentials.pat}`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * List work items with filtering
   */
  public async listWorkItems(filter: AdoWorkItemFilter = {}): Promise<AdoWorkItem[]> {
    const wiql = this.buildWiqlQuery(filter);

    moduleLogger.info('🔍 Querying Azure DevOps with WIQL:', wiql);

    // Execute WIQL query
    const queryUrl = `${this.baseUrl}/_apis/wit/wiql?api-version=${this.apiVersion}`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: wiql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const queryResult = await response.json() as any;
    const workItemIds = queryResult.workItems?.map((wi: any) => wi.id) || [];

    if (workItemIds.length === 0) {
      moduleLogger.info('✅ No work items found matching the filter');
      return [];
    }

    // Fetch full work item details
    return this.getWorkItemsByIds(workItemIds);
  }

  /**
   * Build WIQL (Work Item Query Language) query from filter
   */
  private buildWiqlQuery(filter: AdoWorkItemFilter): string {
    const conditions: string[] = [
      `[System.TeamProject] = '${this.credentials.project}'`
    ];

    if (filter.workItemType && filter.workItemType.length > 0) {
      const types = filter.workItemType.map(t => `'${t}'`).join(', ');
      conditions.push(`[System.WorkItemType] IN (${types})`);
    }

    if (filter.state && filter.state.length > 0) {
      const states = filter.state.map(s => `'${s}'`).join(', ');
      conditions.push(`[System.State] IN (${states})`);
    }

    if (filter.iteration) {
      conditions.push(`[System.IterationPath] = '${filter.iteration}'`);
    }

    if (filter.areaPath) {
      conditions.push(`[System.AreaPath] = '${filter.areaPath}'`);
    }

    if (filter.assignedTo) {
      conditions.push(`[System.AssignedTo] = '${filter.assignedTo}'`);
    }

    if (filter.tags && filter.tags.length > 0) {
      filter.tags.forEach(tag => {
        conditions.push(`[System.Tags] CONTAINS '${tag}'`);
      });
    }

    // Pull sync filter: changed since timestamp
    if (filter.changedSince) {
      const isoDate = filter.changedSince.toISOString();
      conditions.push(`[System.ChangedDate] >= '${isoDate}'`);
    }

    // Pull sync filter: specific work item IDs
    if (filter.workItemIds && filter.workItemIds.length > 0) {
      const ids = filter.workItemIds.join(', ');
      conditions.push(`[System.Id] IN (${ids})`);
    }

    const whereClause = conditions.join(' AND ');
    const orderBy = 'ORDER BY [System.ChangedDate] DESC';
    const top = filter.top ? `TOP ${filter.top}` : '';

    return `SELECT ${top} [System.Id] FROM WorkItems WHERE ${whereClause} ${orderBy}`;
  }

  /**
   * Get work items by IDs
   */
  private async getWorkItemsByIds(ids: number[]): Promise<AdoWorkItem[]> {
    // ADO API supports batch retrieval of up to 200 work items
    const batchSize = 200;
    const batches: number[][] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize));
    }

    const allWorkItems: AdoWorkItem[] = [];

    for (const batch of batches) {
      const idsParam = batch.join(',');
      const url = `${this.baseUrl}/_apis/wit/workitems?ids=${idsParam}&$expand=relations&api-version=${this.apiVersion}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ADO API Error (${response.status}): ${error}`);
      }

      const data = await response.json() as any;
      allWorkItems.push(...(data.value || []));
    }

    moduleLogger.info(`✅ Retrieved ${allWorkItems.length} work items from Azure DevOps`);
    return allWorkItems;
  }

  /**
   * Create a new work item
   */
  public async createWorkItem(item: AdoWorkItemCreate): Promise<AdoWorkItem> {
    moduleLogger.info(`🔨 Creating ${item.workItemType}: ${item.title}`);

    const url = `${this.baseUrl}/_apis/wit/workitems/$${item.workItemType}?api-version=${this.apiVersion}`;

    // Build JSON Patch operations
    const operations: any[] = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: item.title
      }
    ];

    if (item.description) {
      operations.push({
        op: 'add',
        path: '/fields/System.Description',
        value: item.description
      });
    }

    if (item.acceptanceCriteria) {
      operations.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
        value: item.acceptanceCriteria
      });
    }

    if (item.priority !== undefined) {
      operations.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: item.priority
      });
    }

    if (item.state) {
      operations.push({
        op: 'add',
        path: '/fields/System.State',
        value: item.state
      });
    }

    if (item.areaPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.AreaPath',
        value: item.areaPath
      });
    }

    if (item.iterationPath) {
      operations.push({
        op: 'add',
        path: '/fields/System.IterationPath',
        value: item.iterationPath
      });
    }

    if (item.tags && item.tags.length > 0) {
      operations.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: item.tags.join('; ')
      });
    }

    // Add custom fields
    if (item.customFields) {
      Object.entries(item.customFields).forEach(([key, value]) => {
        operations.push({
          op: 'add',
          path: `/fields/${key}`,
          value
        });
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify(operations)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const workItem = await response.json() as AdoWorkItem;

    moduleLogger.info(`✅ Created ${item.workItemType} #${workItem.id}: ${item.title}`);

    // Link to parent if specified
    if (item.parentId) {
      await this.linkWorkItems(workItem.id, item.parentId, 'System.LinkTypes.Hierarchy-Reverse');
    }

    return workItem;
  }

  /**
   * Update an existing work item
   */
  public async updateWorkItem(update: AdoWorkItemUpdate): Promise<AdoWorkItem> {
    moduleLogger.info(`🔧 Updating work item #${update.id}`);

    const url = `${this.baseUrl}/_apis/wit/workitems/${update.id}?api-version=${this.apiVersion}`;

    // Build JSON Patch operations
    const operations: any[] = [];

    if (update.title) {
      operations.push({
        op: 'replace',
        path: '/fields/System.Title',
        value: update.title
      });
    }

    if (update.description !== undefined) {
      operations.push({
        op: 'replace',
        path: '/fields/System.Description',
        value: update.description
      });
    }

    if (update.acceptanceCriteria !== undefined) {
      operations.push({
        op: 'replace',
        path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
        value: update.acceptanceCriteria
      });
    }

    if (update.priority !== undefined) {
      operations.push({
        op: 'replace',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: update.priority
      });
    }

    if (update.state) {
      operations.push({
        op: 'replace',
        path: '/fields/System.State',
        value: update.state
      });
    }

    if (update.tags) {
      operations.push({
        op: 'replace',
        path: '/fields/System.Tags',
        value: update.tags.join('; ')
      });
    }

    // Add custom fields
    if (update.customFields) {
      Object.entries(update.customFields).forEach(([key, value]) => {
        operations.push({
          op: 'replace',
          path: `/fields/${key}`,
          value
        });
      });
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify(operations)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const workItem = await response.json() as AdoWorkItem;
    moduleLogger.info(`✅ Updated work item #${update.id}`);

    return workItem;
  }

  /**
   * Link two work items (parent-child relationship)
   */
  private async linkWorkItems(childId: number, parentId: number, linkType: string): Promise<void> {
    moduleLogger.info(`🔗 Linking work item #${childId} to parent #${parentId}`);

    const url = `${this.baseUrl}/_apis/wit/workitems/${childId}?api-version=${this.apiVersion}`;

    const operations = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: linkType,
          url: `${this.baseUrl}/_apis/wit/workitems/${parentId}`,
          attributes: {
            comment: 'Linked by SpecWeave sync'
          }
        }
      }
    ];

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify(operations)
    });

    if (!response.ok) {
      const error = await response.text();
      moduleLogger.warn(`⚠️  Failed to link work items: ${error}`);
    } else {
      moduleLogger.info(`✅ Linked work item #${childId} to parent #${parentId}`);
    }
  }

  /**
   * Get current iteration (sprint)
   */
  public async getCurrentIteration(): Promise<AdoIteration | null> {
    const url = `https://dev.azure.com/${this.credentials.organization}/${this.credentials.project}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    const iterations = data.value || [];

    if (iterations.length === 0) {
      moduleLogger.warn('⚠️  No current iteration found');
      return null;
    }

    return iterations[0];
  }

  /**
   * Get all iterations
   */
  public async getIterations(): Promise<AdoIteration[]> {
    const url = `https://dev.azure.com/${this.credentials.organization}/${this.credentials.project}/_apis/work/teamsettings/iterations?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.value || [];
  }

  /**
   * Get all projects accessible to the user
   */
  public async getProjects(): Promise<any[]> {
    const url = `https://dev.azure.com/${this.credentials.organization}/_apis/projects?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.value || [];
  }

  /**
   * Search projects with pagination (for three-tier loading)
   *
   * @param options Search options
   * @returns Paginated project results
   */
  public async searchProjects(options: {
    top?: number;
    skip?: number;
  } = {}): Promise<any> {
    const { top = 50, skip = 0 } = options;
    const url = `https://dev.azure.com/${this.credentials.organization}/_apis/projects?$top=${top}&$skip=${skip}&api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return {
      value: data.value || [],
      count: data.count || 0,
    };
  }

  /**
   * Get area paths for a project (classification nodes)
   *
   * @param project Project name or ID
   * @param depth Depth of area path tree (default: 10)
   * @returns Area path tree
   */
  public async getAreaPaths(project: string, depth: number = 10): Promise<any> {
    const url = `https://dev.azure.com/${this.credentials.organization}/${project}/_apis/wit/classificationnodes/areas?$depth=${depth}&api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get teams for a project
   *
   * @param project Project name or ID
   * @returns Teams array
   */
  public async getTeams(project: string): Promise<any[]> {
    const url = `https://dev.azure.com/${this.credentials.organization}/_apis/projects/${project}/teams?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.value || [];
  }

  /**
   * Fetch recently changed work items for pull sync (Increment 0089)
   *
   * Queries ADO for work items that have changed since a given timestamp.
   * Used by ExternalChangePuller to detect external updates.
   *
   * @param since - Timestamp to query changes from
   * @param linkedItemIds - Optional list of work item IDs to filter (linked items only)
   * @returns Array of external changes with changedAt, changedBy, and current values
   */
  public async fetchRecentChanges(
    since: Date,
    linkedItemIds?: number[]
  ): Promise<AdoExternalChange[]> {
    // Build filter for recently changed items
    const filter: AdoWorkItemFilter = {
      changedSince: since,
      top: 100, // Limit to prevent overwhelming results
    };

    // If specific IDs provided, only query those
    if (linkedItemIds && linkedItemIds.length > 0) {
      filter.workItemIds = linkedItemIds;
    }

    // Query work items
    const workItems = await this.listWorkItems(filter);

    // Map to ExternalChange format
    const changes: AdoExternalChange[] = workItems.map(wi => ({
      platform: 'ado' as const,
      externalId: `ADO-${wi.id}`,
      workItemId: wi.id,
      changedAt: wi.fields['System.ChangedDate'] || new Date().toISOString(),
      changedBy: wi.fields['System.ChangedBy']?.displayName ||
                 wi.fields['System.ChangedBy']?.uniqueName ||
                 wi.fields['System.ChangedBy'] ||
                 'unknown',
      changedFields: [] as Array<{ field: string; oldValue: unknown; newValue: unknown }>, // ADO doesn't provide field-level changelog in list API
      currentState: {
        status: wi.fields['System.State'] || 'Unknown',
        priority: wi.fields['Microsoft.VSTS.Common.Priority'] ?? null,
        assignee: wi.fields['System.AssignedTo']?.displayName ||
                  wi.fields['System.AssignedTo']?.uniqueName ||
                  wi.fields['System.AssignedTo'] ||
                  null,
      },
    }));

    return changes;
  }

  /**
   * Get work item updates (revision history) for detailed change tracking
   *
   * Use this for detailed changelog when needed.
   * GET /{organization}/{project}/_apis/wit/workitems/{id}/updates
   *
   * @param workItemId - Work item ID
   * @param top - Limit number of updates
   * @returns Array of updates with field changes
   */
  public async getWorkItemUpdates(workItemId: number, top = 10): Promise<any[]> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/updates?$top=${top}&api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADO API Error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.value || [];
  }

/**
   * ADO Process Template types
   */
  public static readonly PROCESS_TEMPLATES = {
    AGILE: 'Agile',
    SCRUM: 'Scrum',
    CMMI: 'CMMI',
    BASIC: 'Basic',
    SAFE: 'SAFe',  // Enterprise with Capability work item type
  } as const;

  /**
   * Detect ADO Process Template for the project
   *
   * Uses project properties API to get the process template name,
   * then checks for Capability work item type to detect SAFe/Enterprise.
   *
   * @param project - Optional project name (uses default if not specified)
   * @returns Process template info with hierarchy mapping
   */
  public async detectProcessTemplate(project?: string): Promise<AdoProcessTemplateInfo> {
    const projectName = project || this.credentials.project;

    // Step 1: Get project properties (includes process template)
    const projectUrl = `https://dev.azure.com/${this.credentials.organization}/_apis/projects/${projectName}?includeCapabilities=true&api-version=${this.apiVersion}`;

    const projectResponse = await fetch(projectUrl, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!projectResponse.ok) {
      const error = await projectResponse.text();
      throw new Error(`ADO API Error (${projectResponse.status}): ${error}`);
    }

    const projectData = await projectResponse.json() as any;
    const templateName = projectData.capabilities?.processTemplate?.templateName || 'Agile';

    // Step 2: Get work item types to check for Capability
    const witUrl = `https://dev.azure.com/${this.credentials.organization}/${projectName}/_apis/wit/workitemtypes?api-version=${this.apiVersion}`;

    const witResponse = await fetch(witUrl, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    let workItemTypes: string[] = [];
    let hasCapability = false;

    if (witResponse.ok) {
      const witData = await witResponse.json() as any;
      workItemTypes = (witData.value || []).map((wit: any) => wit.name);
      hasCapability = workItemTypes.some(wit =>
        wit.toLowerCase() === 'capability'
      );
    }

    // Step 3: Determine effective template and hierarchy mapping
    let effectiveTemplate: 'Agile' | 'Scrum' | 'CMMI' | 'Basic' | 'SAFe' = templateName as any;

    // If Capability exists, it's SAFe/Enterprise regardless of base template
    if (hasCapability) {
      effectiveTemplate = 'SAFe';
    }

    // Build hierarchy mapping based on template
    const hierarchyMapping = this.buildHierarchyMapping(effectiveTemplate, hasCapability);

    moduleLogger.info(`🔍 Detected ADO Process Template: ${effectiveTemplate}${hasCapability ? ' (with Capability)' : ''}`);

    return {
      template: effectiveTemplate,
      hasCapability,
      workItemTypes,
      hierarchyMapping,
    };
  }

  /**
   * Build hierarchy mapping based on process template
   */
  private buildHierarchyMapping(template: 'Agile' | 'Scrum' | 'CMMI' | 'Basic' | 'SAFe', hasCapability: boolean): {
    capability?: 'epic';
    epic: 'epic' | 'feature';
    feature: 'feature';
    userStory: 'user-story';
    task: 'task';
  } {
    // SAFe/Enterprise: Capability → Epic → Feature → US → Task
    // Capability maps to SpecWeave Epic (_epics/EP-XXXE/)
    // Epic maps to SpecWeave Feature (FS-XXXE/)
    if (hasCapability || template === 'SAFe') {
      return {
        capability: 'epic',      // ADO Capability → SpecWeave Epic (_epics/EP-XXXE/)
        epic: 'feature',         // ADO Epic → SpecWeave Feature (FS-XXXE/)
        feature: 'feature',      // ADO Feature → SpecWeave Feature (under Epic's FS-XXXE/)
        userStory: 'user-story',
        task: 'task',
      };
    }

    // Standard templates: Epic → Feature → US → Task
    // Epic maps to SpecWeave Epic (_epics/EP-XXXE/)
    // Feature maps to SpecWeave Feature (FS-XXXE/)
    return {
      epic: 'epic',            // ADO Epic → SpecWeave Epic (_epics/EP-XXXE/)
      feature: 'feature',      // ADO Feature → SpecWeave Feature (FS-XXXE/)
      userStory: 'user-story',
      task: 'task',
    };
  }

  /**
   * Test connection to Azure DevOps
   */
  public async testConnection(): Promise<boolean> {
    try {
      const url = `https://dev.azure.com/${this.credentials.organization}/_apis/projects/${this.credentials.project}?api-version=${this.apiVersion}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        moduleLogger.info('✅ Azure DevOps connection successful');
        return true;
      } else {
        const error = await response.text();
        moduleLogger.error(`❌ Azure DevOps connection failed (${response.status}): ${error}`);
        return false;
      }
    } catch (error) {
      moduleLogger.error('❌ Azure DevOps connection failed:', error);
      return false;
    }
  }

  /**
   * Add comment to Azure DevOps work item (T-034C)
   *
   * POST /{organization}/{project}/_apis/wit/workitems/{id}/comments?api-version=7.0
   */
  public async addComment(workItemId: number, comment: string): Promise<void> {
    const url = `https://dev.azure.com/${this.credentials.organization}/${this.credentials.project}/_apis/wit/workitems/${workItemId}/comments?api-version=${this.apiVersion}`;

    const body = {
      text: comment
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add comment to ADO work item ${workItemId}: ${response.status} ${error}`);
    }
  }
}

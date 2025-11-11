/**
 * Azure DevOps REST API Client (Multi-Project Support)
 *
 * Profile-based ADO client for SpecWeave that supports:
 * - Multiple ADO projects via sync profiles
 * - Time range filtering with WIQL queries
 * - Rate limiting protection
 * - Secure HTTPS requests
 */
import { SyncProfile, TimeRangePreset } from '../../../src/core/types/sync-profile';
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
        html: {
            href: string;
        };
    };
    url: string;
}
export interface WorkItemQueryResult {
    queryType: string;
    queryResultType: string;
    asOf: string;
    workItems: Array<{
        id: number;
        url: string;
    }>;
}
export interface CreateWorkItemRequest {
    title: string;
    description?: string;
    areaPath?: string;
    iterationPath?: string;
    tags?: string[];
    parentId?: number;
}
export interface UpdateWorkItemRequest {
    state?: string;
    title?: string;
    description?: string;
    tags?: string[];
}
export declare class AdoClientV2 {
    private organization;
    private project?;
    private projects?;
    private workItemTypes?;
    private areaPaths?;
    private baseUrl;
    private authHeader;
    private customQuery?;
    private isMultiProject;
    /**
     * Create ADO client from sync profile
     */
    constructor(profile: SyncProfile, personalAccessToken: string);
    /**
     * Create client from organization/project directly
     */
    static fromProject(organization: string, project: string, personalAccessToken: string): AdoClientV2;
    /**
     * Test connection and authentication
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Create epic work item
     */
    createEpic(request: CreateWorkItemRequest): Promise<WorkItem>;
    /**
     * Create child work item (feature/story) linked to epic
     */
    createChildWorkItem(request: CreateWorkItemRequest, parentId: number, childType?: string): Promise<WorkItem>;
    /**
     * Get work item by ID
     */
    getWorkItem(id: number): Promise<WorkItem>;
    /**
     * Update work item
     */
    updateWorkItem(id: number, updates: UpdateWorkItemRequest): Promise<WorkItem>;
    /**
     * Add comment to work item
     */
    addComment(workItemId: number, comment: string): Promise<void>;
    /**
     * Execute WIQL query
     */
    queryWorkItems(wiql: string): Promise<WorkItem[]>;
    /**
     * List work items within time range
     */
    listWorkItemsInTimeRange(timeRange: TimeRangePreset, customStart?: string, customEnd?: string): Promise<WorkItem[]>;
    /**
     * Query work items across multiple projects (multi-project mode)
     */
    private queryWorkItemsAcrossProjects;
    /**
     * Build WIQL query for a specific project
     */
    private buildProjectWIQL;
    /**
     * Calculate date range from preset
     */
    private calculateTimeRange;
    /**
     * Batch create work items with rate limit handling
     */
    batchCreateWorkItems(workItems: CreateWorkItemRequest[], parentId?: number, childType?: string, options?: {
        batchSize?: number;
        delayMs?: number;
    }): Promise<WorkItem[]>;
    /**
     * Make HTTPS request to ADO API
     */
    private request;
    private sleep;
}
//# sourceMappingURL=ado-client-v2.d.ts.map
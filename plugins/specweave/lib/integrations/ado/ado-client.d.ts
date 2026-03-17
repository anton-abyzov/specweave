/**
 * Azure DevOps REST API Client
 *
 * Provides TypeScript interface to Azure DevOps REST API v7.1
 * for work item management and SpecWeave integration.
 *
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/
 */
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
        html: {
            href: string;
        };
    };
    url: string;
}
export interface WorkItemComment {
    id: number;
    text: string;
    createdBy: {
        displayName: string;
    };
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
export declare class AdoClient {
    private config;
    private baseUrl;
    private authHeader;
    constructor(config: AdoConfig);
    /**
     * Create a new work item
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create
     */
    createWorkItem(request: CreateWorkItemRequest): Promise<WorkItem>;
    /**
     * Get work item by ID
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item
     */
    getWorkItem(id: number): Promise<WorkItem>;
    /**
     * Update work item
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update
     */
    updateWorkItem(id: number, request: UpdateWorkItemRequest): Promise<WorkItem>;
    /**
     * Delete work item (move to Recycle Bin)
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/delete
     */
    deleteWorkItem(id: number): Promise<void>;
    /**
     * Add comment to work item
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/add
     */
    addComment(workItemId: number, text: string): Promise<WorkItemComment>;
    /**
     * Get comments for work item
     *
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/list
     */
    getComments(workItemId: number): Promise<WorkItemComment[]>;
    /**
     * Make HTTP request to ADO API
     */
    private request;
    /**
     * Test connection to ADO
     */
    testConnection(): Promise<boolean>;
}
/**
 * Create ADO client from environment variables and config
 */
export declare function createAdoClient(config?: Partial<AdoConfig>): AdoClient;
export default AdoClient;
//# sourceMappingURL=ado-client.d.ts.map
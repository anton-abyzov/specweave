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
import { credentialsManager } from '../../core/credentials-manager.js';
export class AdoClient {
    constructor() {
        this.apiVersion = '7.0';
        this.useMcp = false; // Will be set based on MCP availability
        this.credentials = credentialsManager.getAdoCredentials();
        this.baseUrl = `https://dev.azure.com/${this.credentials.organization}/${this.credentials.project}`;
        // TODO: Detect MCP server availability
        // For now, default to REST API
        this.useMcp = false;
    }
    /**
     * Get authorization header for REST API
     */
    getAuthHeader() {
        const auth = Buffer.from(`:${this.credentials.pat}`).toString('base64');
        return `Basic ${auth}`;
    }
    /**
     * List work items with filtering
     */
    async listWorkItems(filter = {}) {
        const wiql = this.buildWiqlQuery(filter);
        console.log('🔍 Querying Azure DevOps with WIQL:', wiql);
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
        const queryResult = await response.json();
        const workItemIds = queryResult.workItems?.map((wi) => wi.id) || [];
        if (workItemIds.length === 0) {
            console.log('✅ No work items found matching the filter');
            return [];
        }
        // Fetch full work item details
        return this.getWorkItemsByIds(workItemIds);
    }
    /**
     * Build WIQL (Work Item Query Language) query from filter
     */
    buildWiqlQuery(filter) {
        const conditions = [
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
        const whereClause = conditions.join(' AND ');
        const orderBy = 'ORDER BY [System.ChangedDate] DESC';
        const top = filter.top ? `TOP ${filter.top}` : '';
        return `SELECT ${top} [System.Id] FROM WorkItems WHERE ${whereClause} ${orderBy}`;
    }
    /**
     * Get work items by IDs
     */
    async getWorkItemsByIds(ids) {
        // ADO API supports batch retrieval of up to 200 work items
        const batchSize = 200;
        const batches = [];
        for (let i = 0; i < ids.length; i += batchSize) {
            batches.push(ids.slice(i, i + batchSize));
        }
        const allWorkItems = [];
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
            const data = await response.json();
            allWorkItems.push(...(data.value || []));
        }
        console.log(`✅ Retrieved ${allWorkItems.length} work items from Azure DevOps`);
        return allWorkItems;
    }
    /**
     * Create a new work item
     */
    async createWorkItem(item) {
        console.log(`🔨 Creating ${item.workItemType}: ${item.title}`);
        const url = `${this.baseUrl}/_apis/wit/workitems/$${item.workItemType}?api-version=${this.apiVersion}`;
        // Build JSON Patch operations
        const operations = [
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
        const workItem = await response.json();
        console.log(`✅ Created ${item.workItemType} #${workItem.id}: ${item.title}`);
        // Link to parent if specified
        if (item.parentId) {
            await this.linkWorkItems(workItem.id, item.parentId, 'System.LinkTypes.Hierarchy-Reverse');
        }
        return workItem;
    }
    /**
     * Update an existing work item
     */
    async updateWorkItem(update) {
        console.log(`🔧 Updating work item #${update.id}`);
        const url = `${this.baseUrl}/_apis/wit/workitems/${update.id}?api-version=${this.apiVersion}`;
        // Build JSON Patch operations
        const operations = [];
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
        const workItem = await response.json();
        console.log(`✅ Updated work item #${update.id}`);
        return workItem;
    }
    /**
     * Link two work items (parent-child relationship)
     */
    async linkWorkItems(childId, parentId, linkType) {
        console.log(`🔗 Linking work item #${childId} to parent #${parentId}`);
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
            console.warn(`⚠️  Failed to link work items: ${error}`);
        }
        else {
            console.log(`✅ Linked work item #${childId} to parent #${parentId}`);
        }
    }
    /**
     * Get current iteration (sprint)
     */
    async getCurrentIteration() {
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
        const data = await response.json();
        const iterations = data.value || [];
        if (iterations.length === 0) {
            console.log('⚠️  No current iteration found');
            return null;
        }
        return iterations[0];
    }
    /**
     * Get all iterations
     */
    async getIterations() {
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
        const data = await response.json();
        return data.value || [];
    }
    /**
     * Get all projects accessible to the user
     */
    async getProjects() {
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
        const data = await response.json();
        return data.value || [];
    }
    /**
     * Test connection to Azure DevOps
     */
    async testConnection() {
        try {
            const url = `https://dev.azure.com/${this.credentials.organization}/_apis/projects/${this.credentials.project}?api-version=${this.apiVersion}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                console.log('✅ Azure DevOps connection successful');
                return true;
            }
            else {
                const error = await response.text();
                console.error(`❌ Azure DevOps connection failed (${response.status}): ${error}`);
                return false;
            }
        }
        catch (error) {
            console.error('❌ Azure DevOps connection failed:', error);
            return false;
        }
    }
}
//# sourceMappingURL=ado-client.js.map
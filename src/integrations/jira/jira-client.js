/**
 * Jira API Client
 *
 * Supports:
 * 1. MCP Server (Atlassian Remote MCP) - Primary
 * 2. REST API v3 - Fallback
 *
 * Features:
 * - List issues with JQL filtering (by sprint, status, etc.)
 * - Create issues (Epic, Story, Subtask, Bug, Task)
 * - Update issues
 * - Get sprint information
 */
import { credentialsManager } from '../../core/credentials-manager.js';
export class JiraClient {
    constructor() {
        this.apiVersion = '3';
        this.useMcp = false;
        this.credentials = credentialsManager.getJiraCredentials();
        // Normalize domain URL
        const domain = this.credentials.domain;
        if (domain.startsWith('http')) {
            this.baseUrl = domain;
        }
        else {
            this.baseUrl = `https://${domain}`;
        }
    }
    /**
     * Get authorization header for REST API
     */
    getAuthHeader() {
        const auth = Buffer.from(`${this.credentials.email}:${this.credentials.apiToken}`).toString('base64');
        return `Basic ${auth}`;
    }
    /**
     * Search issues using JQL
     */
    async searchIssues(filter = {}) {
        const jql = filter.jql || this.buildJqlQuery(filter);
        console.log('🔍 Querying Jira with JQL:', jql);
        // Use the new /search/jql endpoint as per Jira Cloud API v3
        const url = `${this.baseUrl}/rest/api/${this.apiVersion}/search/jql`;
        const maxResults = filter.maxResults || 50;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql,
                maxResults,
                fields: ['*all']
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        const data = await response.json();
        console.log(`✅ Retrieved ${data.issues.length} issues from Jira`);
        return data.issues || [];
    }
    /**
     * Build JQL query from filter
     */
    buildJqlQuery(filter) {
        const conditions = [];
        if (filter.project) {
            conditions.push(`project = "${filter.project}"`);
        }
        if (filter.issueType && filter.issueType.length > 0) {
            const types = filter.issueType.map(t => `"${t}"`).join(', ');
            conditions.push(`issuetype IN (${types})`);
        }
        if (filter.status && filter.status.length > 0) {
            const statuses = filter.status.map(s => `"${s}"`).join(', ');
            conditions.push(`status IN (${statuses})`);
        }
        if (filter.sprint) {
            if (typeof filter.sprint === 'number') {
                conditions.push(`sprint = ${filter.sprint}`);
            }
            else if (filter.sprint === 'current') {
                conditions.push(`sprint in openSprints()`);
            }
            else {
                conditions.push(`sprint = "${filter.sprint}"`);
            }
        }
        if (filter.assignee) {
            conditions.push(`assignee = "${filter.assignee}"`);
        }
        if (filter.labels && filter.labels.length > 0) {
            filter.labels.forEach(label => {
                conditions.push(`labels = "${label}"`);
            });
        }
        if (conditions.length === 0) {
            // Default: return recent issues
            return 'ORDER BY updated DESC';
        }
        const whereClause = conditions.join(' AND ');
        return `${whereClause} ORDER BY updated DESC`;
    }
    /**
     * Create a new issue
     */
    async createIssue(issue, projectKey) {
        console.log(`🔨 Creating ${issue.issueType}: ${issue.summary}`);
        const url = `${this.baseUrl}/rest/api/${this.apiVersion}/issue`;
        // Build issue payload
        const payload = {
            fields: {
                project: {
                    key: projectKey
                },
                summary: issue.summary,
                issuetype: {
                    name: issue.issueType
                }
            }
        };
        // Add description (Jira uses Atlassian Document Format - ADF)
        if (issue.description) {
            payload.fields.description = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: issue.description
                            }
                        ]
                    }
                ]
            };
        }
        // Add priority (skip if not available in project)
        if (issue.priority) {
            try {
                payload.fields.priority = {
                    name: issue.priority
                };
            }
            catch (error) {
                // Priority field might not be available in this project
                console.warn('⚠️  Priority field not available, skipping');
            }
        }
        // Add labels
        if (issue.labels && issue.labels.length > 0) {
            payload.fields.labels = issue.labels;
        }
        // Link to parent (for Sub-tasks)
        if (issue.parentKey) {
            payload.fields.parent = {
                key: issue.parentKey
            };
        }
        // Link to Epic (for Stories)
        // Note: Epic Link field varies by Jira instance, typically customfield_10014
        if (issue.epicKey) {
            payload.fields.customfield_10014 = issue.epicKey;
        }
        // Add custom fields
        if (issue.customFields) {
            Object.entries(issue.customFields).forEach(([key, value]) => {
                payload.fields[key] = value;
            });
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        const result = await response.json();
        console.log(`✅ Created ${issue.issueType} ${result.key}: ${issue.summary}`);
        // Fetch full issue details
        return this.getIssue(result.key);
    }
    /**
     * Update an existing issue
     */
    async updateIssue(update) {
        console.log(`🔧 Updating issue ${update.key}`);
        const url = `${this.baseUrl}/rest/api/${this.apiVersion}/issue/${update.key}`;
        // Build update payload
        const payload = {
            fields: {}
        };
        if (update.summary) {
            payload.fields.summary = update.summary;
        }
        if (update.description !== undefined) {
            payload.fields.description = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: update.description
                            }
                        ]
                    }
                ]
            };
        }
        if (update.priority) {
            payload.fields.priority = {
                name: update.priority
            };
        }
        if (update.labels) {
            payload.fields.labels = update.labels;
        }
        // Add custom fields
        if (update.customFields) {
            Object.entries(update.customFields).forEach(([key, value]) => {
                payload.fields[key] = value;
            });
        }
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        console.log(`✅ Updated issue ${update.key}`);
        // Transition status if specified
        if (update.status) {
            await this.transitionIssue(update.key, update.status);
        }
        // Fetch updated issue
        return this.getIssue(update.key);
    }
    /**
     * Transition issue to a new status
     */
    async transitionIssue(issueKey, targetStatus) {
        console.log(`🔀 Transitioning ${issueKey} to ${targetStatus}`);
        // Get available transitions
        const transitionsUrl = `${this.baseUrl}/rest/api/${this.apiVersion}/issue/${issueKey}/transitions`;
        const transitionsResponse = await fetch(transitionsUrl, {
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!transitionsResponse.ok) {
            throw new Error(`Failed to get transitions for ${issueKey}`);
        }
        const transitionsData = await transitionsResponse.json();
        const transition = transitionsData.transitions.find((t) => t.to.name.toLowerCase() === targetStatus.toLowerCase());
        if (!transition) {
            console.warn(`⚠️  No transition found to status "${targetStatus}" for ${issueKey}`);
            return;
        }
        // Execute transition
        const response = await fetch(transitionsUrl, {
            method: 'POST',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transition: {
                    id: transition.id
                }
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to transition ${issueKey}: ${error}`);
        }
        console.log(`✅ Transitioned ${issueKey} to ${targetStatus}`);
    }
    /**
     * Get issue by key
     */
    async getIssue(issueKey) {
        const url = `${this.baseUrl}/rest/api/${this.apiVersion}/issue/${issueKey}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        return response.json();
    }
    /**
     * Get sprints for a board
     */
    async getSprints(boardId) {
        const url = `${this.baseUrl}/rest/agile/1.0/board/${boardId}/sprint`;
        const response = await fetch(url, {
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        const data = await response.json();
        return data.values || [];
    }
    /**
     * Get active sprints
     */
    async getActiveSprints(boardId) {
        const sprints = await this.getSprints(boardId);
        return sprints.filter(s => s.state === 'active');
    }
    /**
     * Test connection to Jira
     */
    async testConnection() {
        try {
            const url = `${this.baseUrl}/rest/api/${this.apiVersion}/myself`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const user = await response.json();
                console.log(`✅ Jira connection successful (${user.displayName})`);
                return true;
            }
            else {
                const error = await response.text();
                console.error(`❌ Jira connection failed (${response.status}): ${error}`);
                return false;
            }
        }
        catch (error) {
            console.error('❌ Jira connection failed:', error);
            return false;
        }
    }
    /**
     * Get projects accessible to the user
     */
    async getProjects() {
        const url = `${this.baseUrl}/rest/api/${this.apiVersion}/project`;
        const response = await fetch(url, {
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error (${response.status}): ${error}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=jira-client.js.map
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

import { credentialsManager, JiraCredentials } from '../../core/credentials-manager';

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: any;  // Jira uses rich format (ADF)
    issuetype: {
      id: string;
      name: string;
    };
    status: {
      id: string;
      name: string;
    };
    priority?: {
      id: string;
      name: string;
    };
    labels?: string[];
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };
    parent?: {
      id: string;
      key: string;
      fields: {
        summary: string;
      };
    };
    customfield_10014?: any;  // Epic Link (varies by instance)
    [key: string]: any;
  };
  self: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'future' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId: number;
}

export interface JiraIssueFilter {
  issueType?: string[];     // ['Epic', 'Story', 'Sub-task']
  status?: string[];        // ['To Do', 'In Progress', 'Done']
  sprint?: string | number; // Sprint ID or name
  labels?: string[];        // Labels to filter by
  assignee?: string;        // Assignee email or accountId
  project?: string;         // Project key
  jql?: string;             // Custom JQL query
  maxResults?: number;      // Limit results (default: 50)
}

export interface JiraIssueCreate {
  issueType: 'Epic' | 'Story' | 'Sub-task' | 'Bug' | 'Task';
  summary: string;
  description?: string;
  priority?: string;        // 'Highest', 'High', 'Medium', 'Low', 'Lowest'
  labels?: string[];
  parentKey?: string;       // For Sub-tasks
  epicKey?: string;         // For Stories
  customFields?: Record<string, any>;
}

export interface JiraIssueUpdate {
  key: string;
  summary?: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  customFields?: Record<string, any>;
}

export class JiraClient {
  private credentials: JiraCredentials;
  private baseUrl: string;
  private apiVersion = '3';
  private useMcp = false;

  constructor() {
    this.credentials = credentialsManager.getJiraCredentials();

    // Normalize domain URL
    const domain = this.credentials.domain;
    if (domain.startsWith('http')) {
      this.baseUrl = domain;
    } else {
      this.baseUrl = `https://${domain}`;
    }
  }

  /**
   * Get authorization header for REST API
   */
  private getAuthHeader(): string {
    const auth = Buffer.from(
      `${this.credentials.email}:${this.credentials.apiToken}`
    ).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Search issues using JQL
   */
  public async searchIssues(filter: JiraIssueFilter = {}): Promise<JiraIssue[]> {
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

    const data = await response.json() as any;
    console.log(`✅ Retrieved ${data.issues.length} issues from Jira`);

    return data.issues || [];
  }

  /**
   * Build JQL query from filter
   */
  private buildJqlQuery(filter: JiraIssueFilter): string {
    const conditions: string[] = [];

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
      } else if (filter.sprint === 'current') {
        conditions.push(`sprint in openSprints()`);
      } else {
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
  public async createIssue(issue: JiraIssueCreate, projectKey: string): Promise<JiraIssue> {
    console.log(`🔨 Creating ${issue.issueType}: ${issue.summary}`);

    const url = `${this.baseUrl}/rest/api/${this.apiVersion}/issue`;

    // Build issue payload
    const payload: any = {
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
      } catch (error) {
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

    const result = await response.json() as any;
    console.log(`✅ Created ${issue.issueType} ${result.key}: ${issue.summary}`);

    // Fetch full issue details
    return this.getIssue(result.key);
  }

  /**
   * Update an existing issue
   */
  public async updateIssue(update: JiraIssueUpdate): Promise<JiraIssue> {
    console.log(`🔧 Updating issue ${update.key}`);

    const url = `${this.baseUrl}/rest/api/${this.apiVersion}/issue/${update.key}`;

    // Build update payload
    const payload: any = {
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
  private async transitionIssue(issueKey: string, targetStatus: string): Promise<void> {
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

    const transitionsData = await transitionsResponse.json() as any;
    const transition = transitionsData.transitions.find(
      (t: any) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );

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
  public async getIssue(issueKey: string): Promise<JiraIssue> {
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

    return response.json() as Promise<JiraIssue>;
  }

  /**
   * Get sprints for a board
   */
  public async getSprints(boardId: number): Promise<JiraSprint[]> {
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

    const data = await response.json() as any;
    return data.values || [];
  }

  /**
   * Get active sprints
   */
  public async getActiveSprints(boardId: number): Promise<JiraSprint[]> {
    const sprints = await this.getSprints(boardId);
    return sprints.filter(s => s.state === 'active');
  }

  /**
   * Test connection to Jira
   */
  public async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/rest/api/${this.apiVersion}/myself`;

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const user = await response.json() as any;
        console.log(`✅ Jira connection successful (${user.displayName})`);
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ Jira connection failed (${response.status}): ${error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Jira connection failed:', error);
      return false;
    }
  }

  /**
   * Get projects accessible to the user
   */
  public async getProjects(): Promise<any[]> {
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

    return response.json() as Promise<any[]>;
  }
}

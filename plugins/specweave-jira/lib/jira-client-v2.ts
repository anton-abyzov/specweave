/**
 * JIRA REST API Client (Multi-Project Support)
 *
 * Profile-based JIRA client for SpecWeave that supports:
 * - Multiple JIRA projects via sync profiles
 * - Time range filtering with JQL queries
 * - Rate limiting protection
 * - Secure HTTPS requests (no shell injection)
 */

import https from 'https';
import {
  SyncProfile,
  JiraConfig,
  TimeRangePreset,
} from '../../../src/core/types/sync-profile';

// ============================================================================
// Types
// ============================================================================

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: { key: string };
    };
    issuetype: {
      name: string;
      hierarchyLevel?: number;
    };
    created: string;
    updated: string;
    assignee?: { displayName: string };
    reporter?: { displayName: string };
    labels?: string[];
    [key: string]: any;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface CreateIssueRequest {
  summary: string;
  description?: string;
  issueType?: string;
  labels?: string[];
  epicLink?: string; // Link to epic (for stories/tasks)
}

export interface UpdateIssueRequest {
  summary?: string;
  description?: string;
  status?: string;
  labels?: string[];
}

// ============================================================================
// JIRA Client V2
// ============================================================================

export class JiraClientV2 {
  private domain: string;
  private projectKey: string;
  private issueType: string;
  private baseUrl: string;
  private authHeader: string;

  /**
   * Create JIRA client from sync profile
   */
  constructor(profile: SyncProfile, apiToken: string, email: string) {
    if (profile.provider !== 'jira') {
      throw new Error(`Expected JIRA profile, got ${profile.provider}`);
    }

    const config = profile.config as JiraConfig;
    this.domain = config.domain;
    this.projectKey = config.projectKey;
    this.issueType = config.issueType || 'Epic';

    this.baseUrl = `https://${this.domain}/rest/api/3`;

    // Basic Auth: base64(email:api_token)
    const credentials = `${email}:${apiToken}`;
    this.authHeader =
      'Basic ' + Buffer.from(credentials).toString('base64');
  }

  /**
   * Create client from domain/project directly
   */
  static fromProject(
    domain: string,
    projectKey: string,
    apiToken: string,
    email: string,
    issueType: string = 'Epic'
  ): JiraClientV2 {
    const profile: SyncProfile = {
      provider: 'jira',
      displayName: `${domain}/${projectKey}`,
      config: { domain, projectKey, issueType },
      timeRange: { default: '1M', max: '6M' },
    };
    return new JiraClientV2(profile, apiToken, email);
  }

  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================

  /**
   * Test connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('GET', '/myself');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // Issues
  // ==========================================================================

  /**
   * Create epic issue
   */
  async createEpic(request: CreateIssueRequest): Promise<JiraIssue> {
    const payload = {
      fields: {
        project: { key: this.projectKey },
        summary: request.summary,
        description: this.formatDescription(request.description),
        issuetype: { name: this.issueType },
        labels: request.labels || [],
      },
    };

    const response = await this.request('POST', '/issue', payload);
    return await this.getIssue(response.key);
  }

  /**
   * Create story/task linked to epic
   */
  async createStory(
    request: CreateIssueRequest,
    epicKey: string
  ): Promise<JiraIssue> {
    const payload = {
      fields: {
        project: { key: this.projectKey },
        summary: request.summary,
        description: this.formatDescription(request.description),
        issuetype: { name: request.issueType || 'Story' },
        labels: request.labels || [],
        // Epic link (JIRA Cloud uses 'parent' field for epics)
        parent: { key: epicKey },
      },
    };

    const response = await this.request('POST', '/issue', payload);
    return await this.getIssue(response.key);
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return await this.request('GET', `/issue/${issueKey}`);
  }

  /**
   * Update issue
   */
  async updateIssue(
    issueKey: string,
    updates: UpdateIssueRequest
  ): Promise<void> {
    const payload: any = { fields: {} };

    if (updates.summary) {
      payload.fields.summary = updates.summary;
    }

    if (updates.description !== undefined) {
      payload.fields.description = this.formatDescription(updates.description);
    }

    if (updates.labels) {
      payload.fields.labels = updates.labels;
    }

    await this.request('PUT', `/issue/${issueKey}`, payload);

    // Status transition (if specified)
    if (updates.status) {
      await this.transitionIssue(issueKey, updates.status);
    }
  }

  /**
   * Transition issue to a different status
   */
  async transitionIssue(issueKey: string, statusName: string): Promise<void> {
    // Get available transitions
    const transitions = await this.request(
      'GET',
      `/issue/${issueKey}/transitions`
    );

    // Find transition matching status name
    const transition = transitions.transitions.find(
      (t: any) => t.to.name.toLowerCase() === statusName.toLowerCase()
    );

    if (!transition) {
      throw new Error(
        `Status '${statusName}' not found for issue ${issueKey}. Available: ${transitions.transitions.map((t: any) => t.to.name).join(', ')}`
      );
    }

    // Execute transition
    await this.request('POST', `/issue/${issueKey}/transitions`, {
      transition: { id: transition.id },
    });
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, comment: string): Promise<void> {
    await this.request('POST', `/issue/${issueKey}/comment`, {
      body: this.formatDescription(comment),
    });
  }

  /**
   * Add labels to issue
   */
  async addLabels(issueKey: string, labels: string[]): Promise<void> {
    if (labels.length === 0) return;

    const issue = await this.getIssue(issueKey);
    const existingLabels = issue.fields.labels || [];
    const newLabels = [...new Set([...existingLabels, ...labels])];

    await this.updateIssue(issueKey, { labels: newLabels });
  }

  // ==========================================================================
  // Search & Time Range Filtering
  // ==========================================================================

  /**
   * Search issues using JQL
   */
  async searchIssues(
    jql: string,
    options: {
      startAt?: number;
      maxResults?: number;
      fields?: string[];
    } = {}
  ): Promise<JiraSearchResult> {
    const params = new URLSearchParams({
      jql,
      startAt: String(options.startAt || 0),
      maxResults: String(options.maxResults || 50),
    });

    if (options.fields) {
      params.append('fields', options.fields.join(','));
    }

    return await this.request('GET', `/search?${params.toString()}`);
  }

  /**
   * List issues within time range
   */
  async listIssuesInTimeRange(
    timeRange: TimeRangePreset,
    customStart?: string,
    customEnd?: string
  ): Promise<JiraIssue[]> {
    const { since, until } = this.calculateTimeRange(
      timeRange,
      customStart,
      customEnd
    );

    // JQL query for time range
    const jql = `project = ${this.projectKey} AND created >= "${since}" AND created <= "${until}" ORDER BY created DESC`;

    const allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 100;

    // Paginate through all results
    while (true) {
      const result = await this.searchIssues(jql, { startAt, maxResults });
      allIssues.push(...result.issues);

      if (allIssues.length >= result.total) {
        break;
      }

      startAt += maxResults;
    }

    return allIssues;
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
        since: '1970-01-01',
        until: new Date().toISOString().split('T')[0],
      };
    }

    if (customStart) {
      return {
        since: customStart,
        until: customEnd || new Date().toISOString().split('T')[0],
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
      since: since.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0],
    };
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Batch create issues with rate limit handling
   */
  async batchCreateIssues(
    issues: CreateIssueRequest[],
    epicKey?: string,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<JiraIssue[]> {
    const { batchSize = 5, delayMs = 12000 } = options; // 5 issues per minute (JIRA: 100/min limit)
    const createdIssues: JiraIssue[] = [];

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);

      console.log(
        `Creating issues ${i + 1}-${Math.min(i + batchSize, issues.length)} of ${issues.length}...`
      );

      for (const issue of batch) {
        try {
          const created = epicKey
            ? await this.createStory(issue, epicKey)
            : await this.createEpic(issue);

          createdIssues.push(created);
        } catch (error: any) {
          console.error(
            `Failed to create issue "${issue.summary}":`,
            error.message
          );
        }
      }

      // Delay between batches
      if (i + batchSize < issues.length) {
        console.log(`Waiting ${delayMs / 1000}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }

    return createdIssues;
  }

  // ==========================================================================
  // HTTP Request Handler
  // ==========================================================================

  /**
   * Make HTTPS request to JIRA API
   */
  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const { hostname, pathname, search } = new URL(url);

      const options = {
        hostname,
        path: pathname + search,
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
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
            resolve(parsed);
          } else {
            const errorMsg =
              parsed.errorMessages?.join(', ') ||
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

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Format description for JIRA (Atlassian Document Format)
   */
  private formatDescription(text?: string): any {
    if (!text) {
      return undefined;
    }

    // Convert Markdown to Atlassian Document Format (ADF)
    // For now, simple text paragraphs
    return {
      type: 'doc',
      version: 1,
      content: text.split('\n\n').map((paragraph) => ({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: paragraph,
          },
        ],
      })),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

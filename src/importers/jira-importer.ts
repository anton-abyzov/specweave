/**
 * JIRA Importer
 *
 * Imports JIRA issues/epics as External Items with JQL support and pagination.
 * Handles authentication and converts JIRA-specific data to platform-agnostic format.
 */

import type { Importer, ExternalItem, ImportConfig } from './external-importer.js';

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string | null;
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    created: string;
    updated: string;
    labels: string[];
    customfield_10016?: number; // Story points
    subtasks?: Array<{
      id: string;
      key: string;
    }>;
    parent?: {
      id: string;
      key: string;
    };
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  startAt: number;
  maxResults: number;
  total: number;
}

/**
 * JIRA Importer Implementation
 */
export class JiraImporter implements Importer {
  readonly platform = 'jira' as const;
  private host: string;
  private email: string;
  private apiToken: string;

  constructor(host: string, email?: string, apiToken?: string) {
    this.host = host.replace(/\/+$/, ''); // Remove trailing slashes
    this.email = email || process.env.JIRA_EMAIL || '';
    this.apiToken = apiToken || process.env.JIRA_API_TOKEN || '';

    if (!this.email || !this.apiToken) {
      throw new Error(
        'JIRA authentication required: Set JIRA_EMAIL and JIRA_API_TOKEN environment variables'
      );
    }
  }

  /**
   * Import all issues matching config
   */
  async import(config: ImportConfig = {}): Promise<ExternalItem[]> {
    const items: ExternalItem[] = [];

    for await (const page of this.paginate(config)) {
      items.push(...page);
    }

    return items;
  }

  /**
   * Paginate through issues using JQL (50 per page)
   */
  async *paginate(config: ImportConfig = {}): AsyncGenerator<ExternalItem[], void, unknown> {
    const {
      timeRangeMonths = 3,
      includeClosed = false,
      labels = [],
      milestone, // JIRA uses "fixVersion" or "epic"
      maxItems = Infinity,
    } = config;

    // Build JQL query
    const jqlParts: string[] = [];

    // Time range
    const since = new Date();
    since.setMonth(since.getMonth() - timeRangeMonths);
    jqlParts.push(`created >= "${since.toISOString().split('T')[0]}"`);

    // Status filter
    if (!includeClosed) {
      jqlParts.push('statusCategory != Done');
    }

    // Labels filter
    if (labels.length > 0) {
      const labelsCondition = labels.map((l) => `labels = "${l}"`).join(' OR ');
      jqlParts.push(`(${labelsCondition})`);
    }

    // Epic/Milestone filter (assuming epic link custom field)
    if (milestone) {
      jqlParts.push(`"Epic Link" = "${milestone}"`);
    }

    const jql = jqlParts.join(' AND ');

    let startAt = 0;
    const maxResults = 50; // JIRA pagination size
    let totalFetched = 0;

    while (totalFetched < maxItems) {
      try {
        // Fetch page from JIRA API
        const response = await this.makeJiraRequest<JiraSearchResponse>(
          '/rest/api/3/search',
          {
            jql,
            startAt,
            maxResults,
            fields: [
              'summary',
              'description',
              'status',
              'priority',
              'issuetype',
              'created',
              'updated',
              'labels',
              'customfield_10016', // Story points
              'subtasks',
              'parent',
            ],
          }
        );

        // Convert JIRA issues to ExternalItems
        const items = response.issues.map((issue) => this.convertToExternalItem(issue));

        // Yield page
        if (items.length > 0) {
          yield items.slice(0, maxItems - totalFetched);
          totalFetched += items.length;
        }

        // Check if we've reached the end
        if (startAt + maxResults >= response.total) {
          break;
        }

        startAt += maxResults;
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error(`JIRA authentication failed: ${error.message}`);
        } else if (error.status === 403) {
          throw new Error(`JIRA access forbidden: ${error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * Make authenticated JIRA API request
   */
  private async makeJiraRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(endpoint, this.host);

    // Add query params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });

    // Create Basic Auth header
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: any = new Error(`JIRA API error: ${response.statusText} - ${errorText}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  /**
   * Convert JIRA issue to ExternalItem
   */
  private convertToExternalItem(issue: JiraIssue): ExternalItem {
    // Map JIRA issue type to ExternalItem type
    let type: ExternalItem['type'] = 'task';
    const issueTypeName = issue.fields.issuetype.name.toLowerCase();

    if (issueTypeName.includes('story') || issueTypeName === 'user story') {
      type = 'user-story';
    } else if (issueTypeName === 'epic') {
      type = 'epic';
    } else if (issueTypeName === 'bug') {
      type = 'bug';
    } else if (issueTypeName === 'feature') {
      type = 'feature';
    }

    // Map JIRA priority to ExternalItem priority
    const priorityMap: Record<string, ExternalItem['priority']> = {
      'highest': 'P0',
      'high': 'P1',
      'medium': 'P2',
      'low': 'P3',
      'lowest': 'P4',
    };
    const priority = issue.fields.priority
      ? priorityMap[issue.fields.priority.name.toLowerCase()]
      : undefined;

    // Extract acceptance criteria from description
    const acceptanceCriteria = this.extractAcceptanceCriteria(issue.fields.description || '');

    // Map JIRA status category to ExternalItem status
    let status: ExternalItem['status'] = 'open';
    const statusCategory = issue.fields.status.statusCategory.key;

    if (statusCategory === 'indeterminate') {
      status = 'in-progress';
    } else if (statusCategory === 'done') {
      status = 'completed';
    }

    return {
      id: `JIRA-${issue.key}`,
      type,
      title: issue.fields.summary,
      description: issue.fields.description || '',
      status,
      priority,
      createdAt: new Date(issue.fields.created),
      updatedAt: new Date(issue.fields.updated),
      url: `${this.host}/browse/${issue.key}`,
      labels: issue.fields.labels,
      acceptanceCriteria,
      parentId: issue.fields.parent ? `JIRA-${issue.fields.parent.key}` : undefined,
      platform: 'jira',
    };
  }

  /**
   * Extract acceptance criteria from description
   * Looks for patterns like:
   * - AC1: ...
   * - Acceptance Criteria:
   * - Given/When/Then
   */
  private extractAcceptanceCriteria(description: string): string[] {
    const criteria: string[] = [];

    // Pattern 1: AC1:, AC2:, etc.
    const acPattern = /AC\d+:\s*(.+)/gi;
    let match;
    while ((match = acPattern.exec(description)) !== null) {
      criteria.push(match[1].trim());
    }

    // Pattern 2: Bullet points under "Acceptance Criteria:" heading
    const acSectionMatch = description.match(/Acceptance Criteria:?\s*\n([\s\S]*?)(?:\n\n|\n#|$)/i);
    if (acSectionMatch) {
      const bullets = acSectionMatch[1].match(/^[\s*-]\s*(.+)/gm);
      if (bullets) {
        criteria.push(...bullets.map((b) => b.replace(/^[\s*-]\s*/, '').trim()));
      }
    }

    // Pattern 3: Given/When/Then format
    const gwtPattern = /Given\s+(.+?)\s+When\s+(.+?)\s+Then\s+(.+)/gi;
    while ((match = gwtPattern.exec(description)) !== null) {
      criteria.push(`Given ${match[1]} When ${match[2]} Then ${match[3]}`);
    }

    return criteria.length > 0 ? criteria : undefined as any;
  }
}

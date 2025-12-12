/**
 * JIRA Importer
 *
 * Imports JIRA issues/epics as External Items with JQL support and pagination.
 * Handles authentication and converts JIRA-specific data to platform-agnostic format.
 */

import type { Importer, ExternalItem, ImportConfig } from './external-importer.js';
import { sanitizeHtmlForMdx } from '../utils/html-to-mdx.js';

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
    // Project information for 1-level structure mapping
    project?: {
      id: string;
      key: string;
      name: string;
    };
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  startAt?: number;
  maxResults: number;
  total: number;
  // New pagination fields for /rest/api/3/search/jql
  nextPageToken?: string;
  isLast?: boolean;
}

/**
 * JIRA Importer Implementation
 *
 * Supports multi-project mode via optional projectKey parameter.
 * When projectKey is set, JQL queries are filtered to that project only.
 */
export class JiraImporter implements Importer {
  readonly platform = 'jira' as const;
  private host: string;
  private email: string;
  private apiToken: string;
  private projectKey?: string;  // Optional: filter to specific project

  /**
   * Create a JIRA importer for 1-level structure (Project → SpecWeave Project)
   *
   * @param host - JIRA host URL (e.g., "your-domain.atlassian.net")
   * @param email - JIRA user email
   * @param apiToken - JIRA API token
   * @param projectKey - Optional project key for multi-project mode (e.g., "PROJ")
   */
  constructor(host: string, email?: string, apiToken?: string, projectKey?: string) {
    // Remove trailing slashes and ensure https:// prefix
    // Ensure host has protocol prefix for URL construction
    let normalizedHost = host.replace(/\/+$/, '');
    if (!normalizedHost.startsWith('https://') && !normalizedHost.startsWith('http://')) {
      normalizedHost = `https://${normalizedHost}`;
    }
    this.host = normalizedHost;

    this.email = email || process.env.JIRA_EMAIL || '';
    this.apiToken = apiToken || process.env.JIRA_API_TOKEN || '';
    this.projectKey = projectKey;  // Store project key for JQL filtering

    if (!this.email || !this.apiToken) {
      throw new Error(
        'JIRA authentication required: Set JIRA_EMAIL and JIRA_API_TOKEN environment variables'
      );
    }
  }

  /**
   * Import all issues matching config
   *
   * Implements 3-phase import like ADO:
   * 1. Paginated JQL fetch (time-range based)
   * 2. Detect missing parent Epics
   * 3. Fetch missing parents to maintain hierarchy
   */
  async import(config: ImportConfig = {}): Promise<ExternalItem[]> {
    const items: ExternalItem[] = [];
    const fetchedIds = new Set<string>();

    // Phase 1: Paginated JQL fetch
    for await (const page of this.paginate(config)) {
      items.push(...page);
      for (const item of page) {
        fetchedIds.add(item.id);
      }
    }

    // Phase 2: Detect missing parent Epics (not in time range)
    const missingParentKeys = this.findMissingParentKeys(items, fetchedIds);

    // Phase 3: Fetch missing parents to maintain hierarchy
    if (missingParentKeys.length > 0) {
      console.log(`📥 Fetching ${missingParentKeys.length} missing parent Epic(s)...`);
      const parentItems = await this.fetchIssuesByKeys(missingParentKeys);
      items.push(...parentItems);
      console.log(`   ✅ Recovered ${parentItems.length} parent Epic(s)`);
    }

    return items;
  }

  /**
   * Find parent keys that are referenced but not in fetched set
   * (Typically Epics that weren't modified in the time range)
   */
  private findMissingParentKeys(items: ExternalItem[], fetchedIds: Set<string>): string[] {
    const missingKeys = new Set<string>();

    for (const item of items) {
      if (item.parentId) {
        // parentId format is "JIRA-PROJ-123", extract "PROJ-123"
        const parentKey = item.parentId.replace('JIRA-', '');
        if (!fetchedIds.has(item.parentId)) {
          missingKeys.add(parentKey);
        }
      }
    }

    return Array.from(missingKeys);
  }

  /**
   * Fetch specific issues by their keys (for parent recovery)
   */
  private async fetchIssuesByKeys(keys: string[]): Promise<ExternalItem[]> {
    if (keys.length === 0) return [];

    // Batch in groups of 50 (JIRA limit)
    const batchSize = 50;
    const allItems: ExternalItem[] = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize);
      const jql = `key in (${batchKeys.join(',')})`;

      try {
        const response = await this.makeJiraRequest<JiraSearchResponse>(
          '/rest/api/3/search/jql',
          {
            jql,
            maxResults: batchSize,
            fields: [
              'summary',
              'description',
              'status',
              'priority',
              'issuetype',
              'created',
              'updated',
              'labels',
              'customfield_10016',
              'subtasks',
              'parent',
              'project',
            ].join(','),
          }
        );

        const items = response.issues.map((issue) => this.convertToExternalItem(issue));
        allItems.push(...items);
      } catch (error: any) {
        console.log(`   ⚠️  Failed to fetch parent batch: ${error.message}`);
      }
    }

    return allItems;
  }

  /**
   * Paginate through JIRA issues using JQL search (50 per page)
   *
   * Uses 3-phase import to maintain hierarchy:
   * - Phase 1: Fetch all items matching JQL query with pagination
   * - Phase 2: Detect missing parent items (outside time range)
   * - Phase 3: Fetch missing parents to maintain hierarchy
   */
  async *paginate(config: ImportConfig = {}): AsyncGenerator<ExternalItem[], void, unknown> {
    const {
      timeRangeMonths = 3,
      includeClosed = false,
      labels = [],
      milestone, // JIRA uses "fixVersion" or "epic"
      maxItems = Infinity,
    } = config;

    // Build JQL query for project-based search
    const jqlParts: string[] = [];

    // Filter by project key (multi-project mode)
    if (this.projectKey) {
      jqlParts.push(`project = "${this.projectKey}"`);
    }

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

    const maxResults = 50; // JIRA pagination size
    let totalFetched = 0;
    let nextPageToken: string | undefined = undefined;

    // Collect all items for Phase 3 parent recovery
    const allFetchedItems: ExternalItem[] = [];
    const fetchedIds = new Set<string>();

    // Phase 1: Paginated JQL fetch
    while (totalFetched < maxItems) {
      try {
        // Use /rest/api/3/search/jql endpoint with nextPageToken pagination
        // Note: fields must be comma-separated string (not JSON array)
        const params: Record<string, any> = {
          jql,
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
            'project',
          ].join(','),  // Comma-separated string required by API
        };

        // Add nextPageToken for subsequent pages
        if (nextPageToken) {
          params.nextPageToken = nextPageToken;
        }

        const response = await this.makeJiraRequest<JiraSearchResponse>(
          '/rest/api/3/search/jql',
          params
        );

        // Convert JIRA issues to ExternalItems
        const items = response.issues.map((issue) => this.convertToExternalItem(issue));

        // Store items for Phase 3 parent recovery
        allFetchedItems.push(...items);
        for (const item of items) {
          fetchedIds.add(item.id);
        }

        // Yield page
        if (items.length > 0) {
          yield items.slice(0, maxItems - totalFetched);
          totalFetched += items.length;
        }

        // Check if we've reached the end (new API uses isLast or no nextPageToken)
        if (response.isLast || !response.nextPageToken || items.length === 0) {
          break;
        }

        // Get token for next page
        nextPageToken = response.nextPageToken;
      } catch (error: any) {
        if (error.status === 401) {
          throw new Error(`JIRA authentication failed: ${error.message}`);
        } else if (error.status === 403) {
          throw new Error(`JIRA access forbidden: ${error.message}`);
        }
        throw error;
      }
    }

    // Phase 2: Detect missing parent Epics (not in time range)
    const missingParentKeys = this.findMissingParentKeys(allFetchedItems, fetchedIds);

    // Phase 3: Fetch missing parents to maintain hierarchy
    // Items were marked as orphans because their parents weren't fetched.
    // Now we fetch missing parents and yield them as a final page.
    if (missingParentKeys.length > 0) {
      console.log(`📥 Fetching ${missingParentKeys.length} missing parent Epic(s)...`);
      const parentItems = await this.fetchIssuesByKeys(missingParentKeys);

      if (parentItems.length > 0) {
        console.log(`   ✅ Recovered ${parentItems.length} parent Epic(s)`);
        // Yield parents as final page so coordinator includes them
        yield parentItems;
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

    // Flexible type matching to support custom JIRA types (e.g., "L3 Feature", "L2 Epic")
    if (issueTypeName.includes('story') || issueTypeName === 'user story') {
      type = 'user-story';
    } else if (issueTypeName.includes('epic') || issueTypeName.includes('l2')) {
      type = 'epic';
    } else if (issueTypeName.includes('feature') || issueTypeName.includes('l3')) {
      type = 'feature';
    } else if (issueTypeName.includes('bug')) {
      type = 'bug';
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

    // Extract text from description (handles ADF format)
    const descriptionText = this.extractTextFromDescription(issue.fields.description);

    // Extract acceptance criteria from description text
    const acceptanceCriteria = this.extractAcceptanceCriteria(descriptionText);

    // Map JIRA status category to ExternalItem status
    let status: ExternalItem['status'] = 'open';
    const statusCategory = issue.fields.status.statusCategory.key;

    if (statusCategory === 'indeterminate') {
      status = 'in-progress';
    } else if (statusCategory === 'done') {
      status = 'completed';
    }

    // Extract JIRA project information for 1-level folder structure
    const jiraProject = issue.fields.project;

    return {
      id: `JIRA-${issue.key}`,
      type,
      title: issue.fields.summary,
      // Use pre-extracted text (ADF → plain text) and sanitize for MDX
      description: sanitizeHtmlForMdx(descriptionText),
      status,
      priority,
      createdAt: new Date(issue.fields.created),
      updatedAt: new Date(issue.fields.updated),
      url: `${this.host}/browse/${issue.key}`,
      labels: issue.fields.labels,
      acceptanceCriteria,
      parentId: issue.fields.parent ? `JIRA-${issue.fields.parent.key}` : undefined,
      platform: 'jira',
      // JIRA project info for 1-level structure (Project → SpecWeave Project)
      jiraProjectKey: jiraProject?.key,
      jiraProjectName: jiraProject?.name,
    };
  }

  /**
   * Extract plain text from JIRA description (handles ADF format)
   *
   * JIRA Cloud uses Atlassian Document Format (ADF) which is a JSON object.
   * This method converts ADF to plain text for processing.
   *
   * @param description - Either a string or ADF object
   * @returns Plain text string
   */
  private extractTextFromDescription(description: any): string {
    if (!description) return '';

    // Handle Atlassian Document Format (ADF) - JSON object with type: 'doc'
    if (typeof description === 'object' && description.type === 'doc') {
      const texts: string[] = [];
      const extractText = (node: any): void => {
        if (node.type === 'text') {
          texts.push(node.text);
        } else if (node.type === 'hardBreak') {
          texts.push('\n');
        } else if (node.content) {
          node.content.forEach(extractText);
          // Add paragraph breaks
          if (node.type === 'paragraph' || node.type === 'bulletList' || node.type === 'orderedList') {
            texts.push('\n');
          }
        }
      };
      description.content?.forEach(extractText);
      return texts.join('').trim();
    }

    // Already a string
    if (typeof description === 'string') {
      return description;
    }

    // Unknown format - try to stringify
    return String(description);
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

/**
 * JIRA Provider Adapter
 *
 * Implements ProviderAdapter for JIRA Cloud REST API v3.
 */

import {
  type ProviderAdapter,
  type ExternalRef,
  type UserStoryData,
  type FeatureData,
  type FieldChanges,
  type ExternalChange,
  type ItemState,
  type ExpectedState,
  type ReconcileResult,
  type DetectedHierarchy,
  type HierarchyLevel,
  type Label,
  type LabelConfig,
  generateLabels,
} from '../engine.js';
import { formatIssueTitle } from '../types.js';

// ---------------------------------------------------------------------------
// JIRA-specific types
// ---------------------------------------------------------------------------

export interface JiraAdapterConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    description?: unknown;
    status: { name: string; id: string };
    issuetype: { name: string; id: string };
    priority?: { name: string };
    labels?: string[];
    parent?: { key: string };
  };
}

interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

const JIRA_CLOSED_STATUSES = ['Done', 'Closed', 'Resolved', "Won't Do"];
const JIRA_OPEN_STATUSES = ['To Do', 'In Progress', 'In Review', 'Open', 'Reopened', 'Backlog'];

// ---------------------------------------------------------------------------
// JiraAdapter
// ---------------------------------------------------------------------------

export class JiraAdapter implements ProviderAdapter {
  readonly platform = 'jira' as const;
  readonly suffix = 'J' as const;

  private domain: string;
  private email: string;
  private apiToken: string;
  private projectKey: string;
  private baseUrl: string;

  constructor(config: JiraAdapterConfig) {
    this.domain = config.domain;
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.projectKey = config.projectKey;
    this.baseUrl = `https://${this.domain}/rest/api/3`;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Use /myself to validate auth, fallback to /serverInfo for older instances
      const response = await this.apiRequest('GET', '/myself');
      if (response.ok) return { ok: true };
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: `Authentication failed (HTTP ${response.status}). Check email and API token.` };
      }
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text.substring(0, 200)}` };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  async createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef> {
    const summary = formatIssueTitle(story.id, story.title);
    const description = this.buildDescription(story, feature);

    const body = {
      fields: {
        project: { key: this.projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
        },
        issuetype: { name: 'Story' },
        labels: [`specweave`, `priority:${story.priority || 'P2'}`],
      },
    };

    if (story.priority) {
      const priorityMap: Record<string, string> = { P0: 'Highest', P1: 'High', P2: 'Medium', P3: 'Low' };
      (body.fields as Record<string, unknown>).priority = { name: priorityMap[story.priority] || 'Medium' };
    }

    const response = await this.apiRequest('POST', '/issue', body);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create JIRA issue: ${response.status} ${text.substring(0, 200)}`);
    }
    const issue = await response.json() as JiraIssue;

    return {
      platform: 'jira',
      id: issue.key,
      url: `https://${this.domain}/browse/${issue.key}`,
      userStory: story.id,
    };
  }

  async updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void> {
    const fields: Record<string, unknown> = {};

    if (changes.title) fields.summary = changes.title;
    if (changes.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: changes.description }] }],
      };
    }

    if (Object.keys(fields).length > 0) {
      await this.apiRequest('PUT', `/issue/${ref.id}`, { fields });
    }

    if (changes.status) {
      await this.transitionIssue(ref.id, changes.status);
    }
  }

  async closeIssue(ref: ExternalRef, comment?: string): Promise<void> {
    if (comment) {
      await this.addComment(ref.id, comment);
    }
    await this.transitionIssue(ref.id, 'Done');
  }

  async reopenIssue(ref: ExternalRef): Promise<void> {
    await this.transitionIssue(ref.id, 'To Do');
  }

  async pullChanges(since?: Date): Promise<ExternalChange[]> {
    const safeKey = this.projectKey.replace(/[^A-Za-z0-9_]/g, '');
    let jql = `project = "${safeKey}" AND labels = specweave ORDER BY updated DESC`;
    if (since) {
      const dateStr = since.toISOString().split('T')[0];
      jql = `project = "${safeKey}" AND labels = specweave AND updated >= "${dateStr}" ORDER BY updated DESC`;
    }

    const changes: ExternalChange[] = [];
    let startAt = 0;
    const maxResults = 50;
    const maxTotal = 250; // Cap at 250 issues
    let hasMore = true;

    while (hasMore && startAt < maxTotal) {
      // Use /search/jql (JIRA deprecated /search in 2025, see CHANGE-2046)
      const response = await this.apiRequest('POST', `/search/jql`, {
        jql,
        maxResults,
        startAt,
        fields: ['summary', 'status', 'issuetype', 'priority', 'labels', 'parent'],
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to pull JIRA changes: ${response.status} ${text.substring(0, 200)}`);
      }
      const data = await response.json() as { issues: JiraIssue[]; total: number; startAt: number; maxResults: number };

      for (const issue of data.issues || []) {
        const isClosed = JIRA_CLOSED_STATUSES.includes(issue.fields.status.name);
        changes.push({
          type: isClosed ? 'closed' : 'status_change',
          ref: {
            platform: 'jira',
            id: issue.key,
            url: `https://${this.domain}/browse/${issue.key}`,
            userStory: this.extractUsId(issue.fields.summary) || '',
          },
          data: {
            status: issue.fields.status.name,
            title: issue.fields.summary,
            labels: issue.fields.labels || [],
          },
        });
      }

      startAt += maxResults;
      hasMore = (data.issues?.length || 0) >= maxResults && startAt < (data.total || 0);
    }

    return changes;
  }

  async getIssueState(ref: ExternalRef): Promise<ItemState> {
    const response = await this.apiRequest('GET', `/issue/${ref.id}`);
    if (!response.ok) {
      throw new Error(`Failed to get JIRA issue ${ref.id} state: ${response.status}`);
    }
    const issue = await response.json() as JiraIssue;

    return {
      status: issue.fields.status.name,
      labels: issue.fields.labels || [],
      title: issue.fields.summary,
    };
  }

  async applyLabels(ref: ExternalRef, labels: Label[]): Promise<void> {
    const labelNames = labels.map(l => l.name);
    await this.apiRequest('PUT', `/issue/${ref.id}`, {
      fields: { labels: labelNames },
    });
  }

  async detectHierarchy(): Promise<DetectedHierarchy> {
    try {
      const response = await this.apiRequest('GET', `/project/${this.projectKey}`);
      if (!response.ok) {
        throw new Error(`Failed to get JIRA project ${this.projectKey}: ${response.status}`);
      }
      const project = await response.json() as { issueTypes?: Array<{ name: string }> };
      const types = (project.issueTypes || []).map(t => t.name.toLowerCase());

      const hasEpic = types.includes('epic');
      const hasStory = types.includes('story');
      const hasSubtask = types.includes('sub-task') || types.includes('subtask');
      const hasTask = types.includes('task');

      if (hasEpic && hasStory && hasSubtask) {
        return {
          pattern: 'standard',
          levels: [
            { externalType: 'Epic', specweaveMapping: 'feature' },
            { externalType: 'Story', specweaveMapping: 'user-story' },
            { externalType: 'Sub-task', specweaveMapping: 'task' },
          ],
        };
      }

      if (hasEpic && hasTask && !hasStory) {
        return {
          pattern: 'standard',
          levels: [
            { externalType: 'Epic', specweaveMapping: 'feature' },
            { externalType: 'Task', specweaveMapping: 'user-story' },
          ],
        };
      }

      if (hasTask && !hasEpic && !hasStory) {
        return {
          pattern: 'flat',
          levels: [
            { externalType: 'Task', specweaveMapping: 'user-story' },
          ],
        };
      }

      // Default: standard mapping
      return {
        pattern: 'standard',
        levels: [
          { externalType: 'Epic', specweaveMapping: 'feature' },
          { externalType: 'Story', specweaveMapping: 'user-story' },
          { externalType: 'Task', specweaveMapping: 'task' },
        ],
      };
    } catch {
      return {
        pattern: 'flat',
        levels: [{ externalType: 'Task', specweaveMapping: 'user-story' }],
      };
    }
  }

  async reconcile(items: ExpectedState[]): Promise<ReconcileResult> {
    const result: ReconcileResult = { created: 0, updated: 0, closed: 0, errors: [] };

    for (const item of items) {
      try {
        const state = await this.getIssueState(item.ref);
        const shouldBeClosed = item.expected.status === 'completed' || item.expected.status === 'abandoned';
        const isClosed = JIRA_CLOSED_STATUSES.includes(state.status);

        if (shouldBeClosed && !isClosed) {
          await this.closeIssue(item.ref, 'Auto-closed by SpecWeave reconciliation');
          result.closed++;
        } else if (!shouldBeClosed && isClosed) {
          await this.reopenIssue(item.ref);
          result.updated++;
        }
      } catch (error) {
        result.errors.push(`Failed to reconcile ${item.ref.id}: ${String(error)}`);
      }
    }

    return result;
  }

  generateLabels(config: LabelConfig): Label[] {
    return generateLabels(config);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildDescription(story: UserStoryData, feature: FeatureData): string {
    const lines: string[] = [];
    lines.push(`Feature: ${feature.id} — ${feature.title}`);
    if (story.description) lines.push('', story.description);
    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('', 'Acceptance Criteria:');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`- ${ac}`);
      }
    }
    lines.push('', '---', 'Auto-synced from SpecWeave');
    return lines.join('\n');
  }

  private async transitionIssue(issueKey: string, targetStatusName: string): Promise<void> {
    const response = await this.apiRequest('GET', `/issue/${issueKey}/transitions`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get transitions for JIRA issue ${issueKey}: ${response.status} ${text.substring(0, 200)}`);
    }
    const data = await response.json() as { transitions: JiraTransition[] };

    const transition = data.transitions.find(
      t => t.to.name.toLowerCase() === targetStatusName.toLowerCase() || t.name.toLowerCase() === targetStatusName.toLowerCase()
    );

    if (transition) {
      await this.apiRequest('POST', `/issue/${issueKey}/transitions`, {
        transition: { id: transition.id },
      });
    }
  }

  private async addComment(issueKey: string, text: string): Promise<void> {
    await this.apiRequest('POST', `/issue/${issueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      },
    });
  }

  private extractUsId(summary: string): string | null {
    const match = summary.match(/^(US-\d+[GJAE]?):/);
    return match ? match[1] : null;
  }

  private async apiRequest(method: string, path: string, body?: unknown): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'User-Agent': 'SpecWeave-Sync',
    };

    const options: RequestInit = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }
}

/**
 * Azure DevOps Provider Adapter
 *
 * Implements ProviderAdapter for ADO REST API v7.1.
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
  type Label,
  type LabelConfig,
  generateLabels,
} from '../engine.js';
import { formatIssueTitle } from '../types.js';

// ---------------------------------------------------------------------------
// ADO-specific types
// ---------------------------------------------------------------------------

export interface AdoAdapterConfig {
  organization: string;
  project: string;
  pat: string;
  workItemType?: string;  // Default: 'User Story'
  closedState?: string;   // Default: 'Closed'
  activeState?: string;   // Default: 'Active'
}

interface AdoWorkItem {
  id: number;
  rev: number;
  url: string;
  fields: Record<string, unknown>;
  _links?: { html?: { href: string } };
}

const ADO_CLOSED_STATES = ['Closed', 'Done', 'Resolved', 'Removed'];
const ADO_OPEN_STATES = ['Active', 'New', 'In Progress', 'Committed'];

// ---------------------------------------------------------------------------
// AdoAdapter
// ---------------------------------------------------------------------------

export class AdoAdapter implements ProviderAdapter {
  readonly platform = 'ado' as const;
  readonly suffix = 'A' as const;

  private organization: string;
  private project: string;
  private pat: string;
  private baseUrl: string;
  private config: AdoAdapterConfig;

  constructor(config: AdoAdapterConfig) {
    this.organization = config.organization;
    this.project = config.project;
    this.pat = config.pat;
    this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}/_apis`;
    this.config = config;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.apiRequest(
        'GET',
        `https://dev.azure.com/${this.organization}/_apis/projects/${this.project}?api-version=7.1`
      );
      if (response.ok) return { ok: true };
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  async createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef> {
    const title = formatIssueTitle(story.id, story.title);
    const description = this.buildDescription(story, feature);

    const operations = [
      { op: 'add', path: '/fields/System.Title', value: title },
      { op: 'add', path: '/fields/System.Description', value: description },
      { op: 'add', path: '/fields/System.Tags', value: `specweave;priority:${story.priority || 'P2'}` },
    ];

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      const acHtml = story.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('');
      operations.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria', value: `<ul>${acHtml}</ul>` });
    }

    // Work item type varies by process template — configurable via config.workItemType
    const workItemType = encodeURIComponent(this.config.workItemType || 'User Story');
    const response = await this.apiRequest(
      'POST',
      `/wit/workitems/$${workItemType}?api-version=7.1`,
      operations,
      'application/json-patch+json'
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create work item: ${response.status} ${text.substring(0, 200)}`);
    }

    const workItem = await response.json() as AdoWorkItem;

    if (!workItem.id) {
      throw new Error(`Work item created but no ID returned. Response: ${JSON.stringify(workItem).substring(0, 200)}`);
    }

    const htmlUrl = workItem._links?.html?.href ||
      `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${workItem.id}`;

    return {
      platform: 'ado',
      id: String(workItem.id),
      url: htmlUrl,
      userStory: story.id,
    };
  }

  async updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void> {
    const operations: Array<{ op: string; path: string; value: unknown }> = [];

    if (changes.title) {
      operations.push({ op: 'add', path: '/fields/System.Title', value: changes.title });
    }
    if (changes.description) {
      operations.push({ op: 'add', path: '/fields/System.Description', value: changes.description });
    }
    if (changes.status) {
      operations.push({ op: 'add', path: '/fields/System.State', value: this.mapStatusToAdo(changes.status) });
    }

    if (operations.length > 0) {
      await this.apiRequest(
        'PATCH',
        `/wit/workitems/${ref.id}?api-version=7.1`,
        operations,
        'application/json-patch+json'
      );
    }
  }

  async closeIssue(ref: ExternalRef, comment?: string): Promise<void> {
    const closedState = this.config.closedState || 'Closed';
    const operations: Array<{ op: string; path: string; value: unknown }> = [
      { op: 'add', path: '/fields/System.State', value: closedState },
    ];

    if (comment) {
      operations.push({ op: 'add', path: '/fields/System.History', value: comment });
    }

    const closeResponse = await this.apiRequest(
      'PATCH',
      `/wit/workitems/${ref.id}?api-version=7.1`,
      operations,
      'application/json-patch+json'
    );
    if (!closeResponse.ok) {
      const text = await closeResponse.text();
      throw new Error(`Failed to close ADO work item ${ref.id}: ${closeResponse.status} ${text.substring(0, 200)}`);
    }
  }

  async reopenIssue(ref: ExternalRef): Promise<void> {
    const activeState = this.config.activeState || 'Active';
    const reopenResponse = await this.apiRequest(
      'PATCH',
      `/wit/workitems/${ref.id}?api-version=7.1`,
      [{ op: 'add', path: '/fields/System.State', value: activeState }],
      'application/json-patch+json'
    );
    if (!reopenResponse.ok) {
      const text = await reopenResponse.text();
      throw new Error(`Failed to reopen ADO work item ${ref.id}: ${reopenResponse.status} ${text.substring(0, 200)}`);
    }
  }

  async pullChanges(since?: Date): Promise<ExternalChange[]> {
    const escapedProject = this.project.replace(/'/g, "''");
    let whereClause = `[System.TeamProject] = '${escapedProject}' AND [System.Tags] CONTAINS 'specweave'`;

    if (since) {
      const dateStr = since.toISOString().split('T')[0];
      whereClause += ` AND [System.ChangedDate] >= '${dateStr}'`;
    }

    const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${whereClause} ORDER BY [System.ChangedDate] DESC`;

    const response = await this.apiRequest('POST', `/wit/wiql?api-version=7.1`, { query: wiql });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to query ADO work items: ${response.status} ${text.substring(0, 200)}`);
    }
    const data = await response.json() as { workItems: Array<{ id: number }> };

    if (!data.workItems || data.workItems.length === 0) return [];

    // Batch work item fetches in groups of 200 (ADO API limit)
    const allIds = data.workItems.map(w => w.id);
    const batchSize = 200;
    const allItems: AdoWorkItem[] = [];

    for (let i = 0; i < allIds.length; i += batchSize) {
      const batchIds = allIds.slice(i, i + batchSize);
      const itemsResponse = await this.apiRequest(
        'GET',
        `/wit/workitems?ids=${batchIds.join(',')}&$expand=all&api-version=7.1`
      );
      if (!itemsResponse.ok) {
        const text = await itemsResponse.text();
        throw new Error(`Failed to fetch ADO work items batch: ${itemsResponse.status} ${text.substring(0, 200)}`);
      }
      const items = await itemsResponse.json() as { value: AdoWorkItem[] };
      allItems.push(...(items.value || []));
    }

    const changes: ExternalChange[] = [];
    for (const item of allItems) {
      const title = String(item.fields['System.Title'] || '');
      const state = String(item.fields['System.State'] || '');
      const isClosed = ADO_CLOSED_STATES.includes(state);
      const htmlUrl = item._links?.html?.href ||
        `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${item.id}`;

      changes.push({
        type: isClosed ? 'closed' : 'status_change',
        ref: {
          platform: 'ado',
          id: String(item.id),
          url: htmlUrl,
          userStory: this.extractUsId(title) || '',
        },
        data: {
          status: state,
          title,
          tags: String(item.fields['System.Tags'] || '').split(';').map(t => t.trim()).filter(Boolean),
        },
      });
    }

    return changes;
  }

  async getIssueState(ref: ExternalRef): Promise<ItemState> {
    const response = await this.apiRequest('GET', `/wit/workitems/${ref.id}?api-version=7.1`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get work item ${ref.id}: ${response.status} ${text.substring(0, 200)}`);
    }
    const item = await response.json() as AdoWorkItem;

    const tags = String(item.fields['System.Tags'] || '').split(';').map(t => t.trim()).filter(Boolean);

    return {
      status: String(item.fields['System.State'] || ''),
      labels: tags,
      title: String(item.fields['System.Title'] || ''),
    };
  }

  async applyLabels(ref: ExternalRef, labels: Label[]): Promise<void> {
    const tags = labels.map(l => l.name).join('; ');
    await this.apiRequest(
      'PATCH',
      `/wit/workitems/${ref.id}?api-version=7.1`,
      [{ op: 'add', path: '/fields/System.Tags', value: tags }],
      'application/json-patch+json'
    );
  }

  async detectHierarchy(): Promise<DetectedHierarchy> {
    try {
      const response = await this.apiRequest(
        'GET',
        `/wit/workitemtypes?api-version=7.1`
      );
      const data = await response.json() as { value: Array<{ name: string }> };
      const types = (data.value || []).map(t => t.name.toLowerCase());

      const hasEpic = types.includes('epic');
      const hasFeature = types.includes('feature');
      const hasUserStory = types.includes('user story');
      const hasTask = types.includes('task');

      if (hasEpic && hasFeature && hasUserStory) {
        return {
          pattern: 'standard',
          levels: [
            { externalType: 'Epic', specweaveMapping: 'skip' },
            { externalType: 'Feature', specweaveMapping: 'feature' },
            { externalType: 'User Story', specweaveMapping: 'user-story' },
            { externalType: 'Task', specweaveMapping: 'task' },
          ],
        };
      }

      if (hasTask && !hasUserStory && !hasFeature) {
        return {
          pattern: 'flat',
          levels: [{ externalType: 'Task', specweaveMapping: 'user-story' }],
        };
      }

      return {
        pattern: 'standard',
        levels: [
          { externalType: 'Feature', specweaveMapping: 'feature' },
          { externalType: 'User Story', specweaveMapping: 'user-story' },
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
        const isClosed = ADO_CLOSED_STATES.includes(state.status);

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
    lines.push(`<b>Feature</b>: ${feature.id} — ${feature.title}<br/>`);
    if (story.description) lines.push(`<p>${story.description}</p>`);
    lines.push('<hr/><em>Auto-synced from SpecWeave</em>');
    return lines.join('\n');
  }

  private mapStatusToAdo(status: string): string {
    const map: Record<string, string> = {
      completed: 'Closed',
      abandoned: 'Removed',
      active: 'Active',
      planning: 'New',
      backlog: 'New',
      done: 'Closed',
    };
    return map[status.toLowerCase()] || 'Active';
  }

  private extractUsId(title: string): string | null {
    const match = title.match(/^(US-\d+[GJAE]?):/);
    return match ? match[1] : null;
  }

  private async apiRequest(method: string, path: string, body?: unknown, contentType?: string): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const auth = Buffer.from(`:${this.pat}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'User-Agent': 'SpecWeave-Sync',
    };

    const options: RequestInit = { method, headers };
    if (body) {
      headers['Content-Type'] = contentType || 'application/json';
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }
}

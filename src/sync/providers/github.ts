/**
 * GitHub Provider Adapter
 *
 * Implements ProviderAdapter for GitHub Issues + REST API.
 * Wraps the existing GitHubClientV2 from specweave-github plugin.
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
import { formatIssueTitle, formatMilestoneTitle } from '../types.js';

// ---------------------------------------------------------------------------
// GitHub-specific types
// ---------------------------------------------------------------------------

export interface GitHubAdapterConfig {
  owner: string;
  repo: string;
  token?: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  milestone?: { title: string; number: number };
  html_url: string;
}

// ---------------------------------------------------------------------------
// GitHubAdapter
// ---------------------------------------------------------------------------

export class GitHubAdapter implements ProviderAdapter {
  readonly platform = 'github' as const;
  readonly suffix = 'G' as const;

  private owner: string;
  private repo: string;
  private token: string;
  private baseUrl: string;

  constructor(config: GitHubAdapterConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.apiRequest('GET', '');
      if (response.ok) return { ok: true };
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  async createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef> {
    const title = formatIssueTitle(story.id, story.title);
    const body = this.buildIssueBody(story, feature);
    const labels = this.generateLabels({
      priority: story.priority || 'P2',
      type: 'user-story',
      projectName: this.repo,
    }).map(l => l.name);

    const data = await this.apiRequest('POST', '/issues', {
      title,
      body,
      labels,
    });

    if (!data.ok) {
      const text = await data.text();
      throw new Error(`Failed to create GitHub issue: ${data.status} ${text.substring(0, 200)}`);
    }

    const issue = await data.json() as GitHubIssue;

    return {
      platform: 'github',
      id: String(issue.number),
      url: issue.html_url,
      userStory: story.id,
    };
  }

  async updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (changes.title) patch.title = changes.title;
    if (changes.description) patch.body = changes.description;
    if (changes.status) {
      patch.state = this.mapStatusToGitHub(changes.status);
    }

    await this.apiRequest('PATCH', `/issues/${ref.id}`, patch);

    if (changes.labels) {
      await this.applyLabels(ref, changes.labels);
    }
  }

  async closeIssue(ref: ExternalRef, comment?: string): Promise<void> {
    if (comment) {
      await this.apiRequest('POST', `/issues/${ref.id}/comments`, { body: comment });
    }
    await this.apiRequest('PATCH', `/issues/${ref.id}`, { state: 'closed' });
  }

  async reopenIssue(ref: ExternalRef): Promise<void> {
    await this.apiRequest('PATCH', `/issues/${ref.id}`, { state: 'open' });
  }

  async pullChanges(since?: Date): Promise<ExternalChange[]> {
    const changes: ExternalChange[] = [];
    const maxPages = 5;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const params = new URLSearchParams({ state: 'all', sort: 'updated', direction: 'desc', per_page: '50', page: String(page) });
      if (since) params.set('since', since.toISOString());

      const response = await this.apiRequest('GET', `/issues?${params}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to pull GitHub changes: ${response.status} ${text.substring(0, 200)}`);
      }
      const issues = await response.json() as GitHubIssue[];

      for (const issue of issues) {
        if (issue.title.match(/^US-\d+[GJAE]?:/)) {
          changes.push({
            type: issue.state === 'closed' ? 'closed' : 'status_change',
            ref: {
              platform: 'github',
              id: String(issue.number),
              url: issue.html_url,
              userStory: this.extractUsId(issue.title) || '',
            },
            data: {
              status: issue.state,
              title: issue.title,
              labels: issue.labels.map(l => l.name),
            },
          });
        }
      }

      // Check for more pages
      const linkHeader = response.headers.get('link') || '';
      hasMore = linkHeader.includes('rel="next"');
      page++;
    }

    return changes;
  }

  async getIssueState(ref: ExternalRef): Promise<ItemState> {
    const response = await this.apiRequest('GET', `/issues/${ref.id}`);
    if (!response.ok) {
      throw new Error(`Failed to get issue #${ref.id} state: ${response.status}`);
    }
    const issue = await response.json() as GitHubIssue;

    return {
      status: issue.state,
      labels: issue.labels.map(l => l.name),
      title: issue.title,
    };
  }

  async applyLabels(ref: ExternalRef, labels: Label[]): Promise<void> {
    const labelNames = labels.map(l => l.name);

    // Ensure labels exist in repo
    for (const label of labels) {
      await this.ensureLabelExists(label);
    }

    const response = await this.apiRequest('PUT', `/issues/${ref.id}/labels`, { labels: labelNames });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to apply labels to issue #${ref.id}: ${response.status} ${text.substring(0, 200)}`);
    }
  }

  async detectHierarchy(): Promise<DetectedHierarchy> {
    // GitHub Issues are flat — no hierarchy to detect
    return {
      pattern: 'flat',
      levels: [
        { externalType: 'issue', specweaveMapping: 'user-story' },
      ],
    };
  }

  async reconcile(items: ExpectedState[]): Promise<ReconcileResult> {
    const result: ReconcileResult = { created: 0, updated: 0, closed: 0, errors: [] };

    for (const item of items) {
      try {
        const state = await this.getIssueState(item.ref);
        const shouldBeClosed = item.expected.status === 'completed' || item.expected.status === 'abandoned';
        const isClosed = state.status === 'closed';

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

  private buildIssueBody(story: UserStoryData, feature: FeatureData): string {
    const lines: string[] = [];
    lines.push(`> **Feature**: ${feature.id} — ${feature.title}`);
    lines.push('');

    if (story.description) {
      lines.push(story.description);
      lines.push('');
    }

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('## Acceptance Criteria');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('_Auto-synced from SpecWeave_');

    return lines.join('\n');
  }

  private mapStatusToGitHub(status: string): 'open' | 'closed' {
    const closedStatuses = ['completed', 'abandoned', 'done', 'closed'];
    return closedStatuses.includes(status.toLowerCase()) ? 'closed' : 'open';
  }

  private extractUsId(title: string): string | null {
    const match = title.match(/^(US-\d+[GJAE]?):/);
    return match ? match[1] : null;
  }

  private async ensureLabelExists(label: Label): Promise<void> {
    const response = await this.apiRequest('POST', '/labels', {
      name: label.name,
      color: label.color,
      description: label.description || '',
    });
    if (!response.ok && response.status !== 422) {
      // 422 = label already exists (expected), other errors should propagate
      const text = await response.text();
      throw new Error(`Failed to create label "${label.name}": ${response.status} ${text.substring(0, 200)}`);
    }
  }

  private async apiRequest(method: string, path: string, body?: unknown): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SpecWeave-Sync',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const options: RequestInit = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }
}

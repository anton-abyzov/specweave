/**
 * GitHub Importer
 *
 * Imports GitHub issues as External Items with pagination support.
 * Handles rate limiting and converts GitHub-specific data to platform-agnostic format.
 */

import { Octokit } from '@octokit/rest';
import type { Importer, ExternalItem, ImportConfig } from './external-importer.js';

interface GitHubIssue {
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: Array<{ name: string }>;
  milestone?: { title: string } | null;
  user?: { login: string } | null;
}

/**
 * GitHub Importer Implementation
 */
export class GitHubImporter implements Importer {
  readonly platform = 'github' as const;
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(owner: string, repo: string, token?: string) {
    this.owner = owner;
    this.repo = repo;
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
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
   * Paginate through issues (100 per page)
   */
  async *paginate(config: ImportConfig = {}): AsyncGenerator<ExternalItem[], void, unknown> {
    const {
      timeRangeMonths = 3,
      includeClosed = false,
      labels = [],
      milestone,
      maxItems = Infinity,
    } = config;

    // Calculate since date
    const since = new Date();
    since.setMonth(since.getMonth() - timeRangeMonths);

    let page = 1;
    let totalFetched = 0;

    while (totalFetched < maxItems) {
      try {
        // Fetch page from GitHub API
        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: includeClosed ? 'all' : 'open',
          since: since.toISOString(),
          labels: labels.join(','),
          milestone: milestone,
          per_page: 100,
          page,
        });

        // Check rate limiting
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0', 10);
        if (remaining < 10) {
          const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0', 10);
          const resetDate = new Date(resetTime * 1000);
          throw new Error(
            `GitHub rate limit approaching (${remaining} requests remaining). Resets at ${resetDate.toLocaleString()}`
          );
        }

        // Convert GitHub issues to ExternalItems
        const items = response.data
          .filter((issue: any) => !issue.pull_request) // Exclude pull requests
          .map((issue: any) => this.convertToExternalItem(issue as GitHubIssue));

        // Yield page
        if (items.length > 0) {
          yield items.slice(0, maxItems - totalFetched);
          totalFetched += items.length;
        }

        // Check if we've reached the end
        if (response.data.length < 100) {
          break;
        }

        page++;
      } catch (error: any) {
        if (error.status === 403 && error.message.includes('rate limit')) {
          throw new Error(`GitHub rate limit exceeded: ${error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * Convert GitHub issue to ExternalItem
   */
  private convertToExternalItem(issue: GitHubIssue): ExternalItem {
    // Extract type from labels
    let type: ExternalItem['type'] = 'task';
    const labelNames = issue.labels.map((l) => l.name.toLowerCase());

    if (labelNames.includes('user-story') || labelNames.includes('story')) {
      type = 'user-story';
    } else if (labelNames.includes('epic')) {
      type = 'epic';
    } else if (labelNames.includes('bug')) {
      type = 'bug';
    } else if (labelNames.includes('feature')) {
      type = 'feature';
    }

    // Extract priority from labels (P0, P1, P2, P3, P4)
    const priorityLabel = labelNames.find((l) => /^p[0-4]$/i.test(l));
    const priority = priorityLabel ? (priorityLabel.toUpperCase() as ExternalItem['priority']) : undefined;

    // Extract acceptance criteria from body
    const acceptanceCriteria = this.extractAcceptanceCriteria(issue.body || '');

    // Map GitHub state to ExternalItem status
    let status: ExternalItem['status'] = 'open';
    if (issue.state === 'closed') {
      status = 'completed';
    } else if (labelNames.includes('in-progress') || labelNames.includes('in progress')) {
      status = 'in-progress';
    }

    return {
      id: `github#${issue.number}`,
      type,
      title: issue.title,
      description: issue.body || '',
      status,
      priority,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      url: issue.html_url,
      labels: issue.labels.map((l) => l.name),
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
      platform: 'github',
    };
  }

  /**
   * Extract acceptance criteria from issue body
   * Looks for patterns like:
   * - [ ] AC-001: ...
   * - Acceptance Criteria: ...
   */
  private extractAcceptanceCriteria(body: string): string[] {
    const criteria: string[] = [];

    // Pattern 1: Checkbox list items starting with "AC"
    const acPattern = /^[\s-]*\[[ x]\]\s+(AC[-:]?\s*\d+:?\s*.+)$/gim;
    const acMatches = body.matchAll(acPattern);
    for (const match of acMatches) {
      criteria.push(match[1].trim());
    }

    // Pattern 2: "Acceptance Criteria" section
    const sectionPattern = /(?:^|\n)##?\s*Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|\z)/i;
    const sectionMatch = body.match(sectionPattern);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const itemPattern = /^[\s-]*[•*-]\s*(.+)$/gm;
      const itemMatches = section.matchAll(itemPattern);
      for (const match of itemMatches) {
        const item = match[1].trim();
        if (!criteria.some((c) => c.includes(item))) {
          criteria.push(item);
        }
      }
    }

    return criteria;
  }
}

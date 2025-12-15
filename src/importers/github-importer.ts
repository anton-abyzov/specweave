/**
 * GitHub Importer
 *
 * Imports GitHub issues as External Items with pagination support.
 * Handles rate limiting and converts GitHub-specific data to platform-agnostic format.
 */

import { Octokit } from '@octokit/rest';
import type { Importer, ExternalItem, ImportConfig } from './external-importer.js';
import { sanitizeHtmlForMdx } from '../utils/html-to-mdx.js';

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

    // DIAGNOSTIC (v1.0.7): Log token presence for debugging import issues
    const effectiveToken = token || process.env.GITHUB_TOKEN;
    const tokenSource = token ? 'parameter' : (process.env.GITHUB_TOKEN ? 'GITHUB_TOKEN env' : 'none');
    const tokenPrefix = effectiveToken ? effectiveToken.slice(0, 8) + '...' : 'none';
    console.log(`   🔑 GitHubImporter: ${owner}/${repo} (token: ${tokenPrefix} from ${tokenSource})`);

    this.octokit = new Octokit({
      auth: effectiveToken,
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

    // DIAGNOSTIC: Log import parameters (helps debug "only 1 issue" reports)
    console.log(`   📋 GitHub Import: ${this.owner}/${this.repo}`);
    console.log(`      → State: ${includeClosed ? 'all (open + closed)' : 'open only'}`);
    console.log(`      → Since: ${since.toISOString().split('T')[0]} (${timeRangeMonths} months ago)`);
    if (labels.length > 0) console.log(`      → Labels: ${labels.join(', ')}`);

    let page = 1;
    let totalFetched = 0;
    let totalFromApi = 0;
    let totalPRsFiltered = 0;

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

        // DIAGNOSTIC: Count API response
        totalFromApi += response.data.length;
        const prCount = response.data.filter((i: any) => i.pull_request).length;
        totalPRsFiltered += prCount;

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
        // DIAGNOSTIC (v1.0.7): Log all API errors for debugging
        console.log(`      ❌ API Error: ${error.status || 'unknown'} - ${error.message || error}`);

        if (error.status === 403 && error.message.includes('rate limit')) {
          throw new Error(`GitHub rate limit exceeded: ${error.message}`);
        }
        if (error.status === 404) {
          throw new Error(`Repository not found or no access: ${this.owner}/${this.repo}. Check token permissions for private repos.`);
        }
        if (error.status === 401) {
          throw new Error(`Authentication failed for ${this.owner}/${this.repo}. Token may be invalid or expired.`);
        }
        throw error;
      }
    }

    // DIAGNOSTIC: Summary after pagination completes
    console.log(`      → API returned: ${totalFromApi} items (${totalPRsFiltered} PRs filtered, ${totalFetched} issues imported)`);
    if (totalFetched === 0) {
      console.log(`      ⚠️  No issues found! Check:`);
      console.log(`         - Are there open issues? (use --include-closed for closed)`);
      console.log(`         - Were issues updated after ${since.toISOString().split('T')[0]}?`);
      console.log(`         - GitHub API: https://github.com/${this.owner}/${this.repo}/issues`);
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

    // CRITICAL FIX (2025-11-26): Include repo in external ID to prevent cross-repo collisions
    // Bug: Multiple repos with same issue number (e.g., #1) were being deduplicated incorrectly
    // because external ID was only `github#1` for all repos
    return {
      id: `github#${this.owner}/${this.repo}#${issue.number}`,
      type,
      title: issue.title,
      description: sanitizeHtmlForMdx(issue.body),
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
    const sectionPattern = /(?:^|\n)##?\s*Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|$)/i;
    const sectionMatch = body.match(sectionPattern);
    if (sectionMatch) {
      const section = sectionMatch[1];
      // Match bullet points, optionally with checkboxes
      const itemPattern = /^[\s-]*[•*-]\s*(?:\[[ x]\]\s*)?(.+)$/gim;
      const itemMatches = section.matchAll(itemPattern);
      for (const match of itemMatches) {
        const item = match[1].trim();
        // Skip if already captured by Pattern 1 (AC checkbox list)
        if (!criteria.some((c) => c.includes(item) || item.includes(c))) {
          criteria.push(item);
        }
      }
    }

    return criteria;
  }
}

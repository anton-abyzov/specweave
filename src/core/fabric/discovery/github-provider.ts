/**
 * GitHub Discovery Provider
 *
 * Broad GitHub search for skill repositories:
 * - Repos containing SKILL.md files
 * - Repos with .claude/commands paths
 * - Repos with skill-related topics/descriptions
 */

import type { GitHubRepoInfo } from '../submission-queue-types.js';
import type { DiscoveryProvider } from './source-registry.js';

export interface GitHubProviderOptions {
  token?: string;
  maxResultsPerQuery?: number;
}

const SEARCH_QUERIES = [
  'filename:SKILL.md',
  'path:.claude/commands extension:md',
  'topic:claude-code-skill',
  'topic:claude-skill',
  '"claude code" skill SKILL.md in:readme',
];

const GITHUB_API = 'https://api.github.com/search/repositories';

interface GitHubSearchItem {
  full_name: string;
  html_url: string;
  description: string | null;
  owner: { login: string };
  stargazers_count: number;
  updated_at: string;
}

export class GitHubProvider implements DiscoveryProvider {
  readonly name = 'github';
  private token?: string;
  private maxPerQuery: number;

  constructor(options?: GitHubProviderOptions) {
    this.token = options?.token;
    this.maxPerQuery = options?.maxResultsPerQuery ?? 100;
  }

  async *discover(): AsyncGenerator<GitHubRepoInfo> {
    const seen = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      try {
        const url = `${GITHUB_API}?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${Math.min(this.maxPerQuery, 100)}`;
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'specweave-scanner',
        };
        if (this.token) {
          headers.Authorization = `token ${this.token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          continue;
        }

        const data = await response.json() as { items: GitHubSearchItem[] };

        for (const item of data.items || []) {
          if (!seen.has(item.full_name)) {
            seen.add(item.full_name);
            yield {
              fullName: item.full_name,
              htmlUrl: item.html_url,
              description: item.description,
              owner: item.owner.login,
              stars: item.stargazers_count,
              lastUpdated: item.updated_at,
              skillPath: 'SKILL.md',
            };
          }
        }
      } catch {
        // Query failed — continue with next
      }
    }
  }
}

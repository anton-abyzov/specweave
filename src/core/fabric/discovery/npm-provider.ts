/**
 * npm Registry Discovery Provider
 *
 * Searches npm for packages with agent-skill keywords
 * and extracts their GitHub repository URLs.
 */

import type { GitHubRepoInfo } from '../submission-queue-types.js';
import type { DiscoveryProvider } from './source-registry.js';

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const SEARCH_KEYWORDS = [
  'claude-code-skill',
  'agent-skill',
  'claude-skill',
  'specweave-plugin',
];
const GITHUB_REPO_REGEX = /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)/;

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      description: string;
      version: string;
      links: {
        repository?: string | null;
      };
    };
  }>;
  total: number;
}

export class NpmProvider implements DiscoveryProvider {
  readonly name = 'npm';

  async *discover(): AsyncGenerator<GitHubRepoInfo> {
    const seen = new Set<string>();

    for (const keyword of SEARCH_KEYWORDS) {
      try {
        const url = `${NPM_SEARCH_URL}?text=keywords:${encodeURIComponent(keyword)}&size=250`;
        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json() as NpmSearchResult;

        for (const obj of data.objects || []) {
          const repoUrl = obj.package.links?.repository;
          if (!repoUrl) continue;

          const match = repoUrl.match(GITHUB_REPO_REGEX);
          if (!match) continue;

          const fullName = match[1].replace(/\.git$/, '');
          if (seen.has(fullName)) continue;
          seen.add(fullName);

          const [owner] = fullName.split('/');

          yield {
            fullName,
            htmlUrl: `https://github.com/${fullName}`,
            description: obj.package.description || null,
            owner,
            stars: 0,
            lastUpdated: new Date().toISOString(),
            skillPath: 'SKILL.md',
          };
        }
      } catch {
        // Keyword search failed — continue with next
      }
    }
  }
}

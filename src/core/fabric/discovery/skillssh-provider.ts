/**
 * skills.sh Discovery Provider
 *
 * Scrapes the skills.sh directory page for GitHub repo links
 * and normalizes them into GitHubRepoInfo.
 */

import type { GitHubRepoInfo } from '../submission-queue-types.js';
import type { DiscoveryProvider } from './source-registry.js';

const SKILLS_SH_URL = 'https://skills.sh';
const GITHUB_REPO_PATTERN = /https:\/\/github\.com\/([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)/g;

export class SkillsShProvider implements DiscoveryProvider {
  readonly name = 'skillssh';

  async *discover(): AsyncGenerator<GitHubRepoInfo> {
    let html: string;

    try {
      const response = await fetch(SKILLS_SH_URL);
      if (!response.ok) return;
      html = await response.text();
    } catch {
      return;
    }

    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = GITHUB_REPO_PATTERN.exec(html)) !== null) {
      const fullName = match[1]
        // Strip trailing .git or slashes
        .replace(/\.git$/, '')
        .replace(/\/$/, '');

      if (seen.has(fullName)) continue;
      seen.add(fullName);

      const [owner] = fullName.split('/');

      yield {
        fullName,
        htmlUrl: `https://github.com/${fullName}`,
        description: null,
        owner,
        stars: 0,
        lastUpdated: new Date().toISOString(),
        skillPath: 'SKILL.md',
      };
    }
  }
}

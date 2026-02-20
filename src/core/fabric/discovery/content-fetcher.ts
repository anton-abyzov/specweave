/**
 * Content Fetcher
 *
 * Fetches raw SKILL.md content from GitHub repos
 * via raw.githubusercontent.com. Tries main, then master branch.
 */

export interface ContentFetcherOptions {
  token?: string;
}

const BRANCHES = ['main', 'master'];

export class ContentFetcher {
  private token?: string;

  constructor(options?: ContentFetcherOptions) {
    this.token = options?.token;
  }

  async fetchSkillContent(repoFullName: string, skillPath: string): Promise<string | null> {
    for (const branch of BRANCHES) {
      try {
        const url = `https://raw.githubusercontent.com/${repoFullName}/${branch}/${skillPath}`;
        const headers: Record<string, string> = {};
        if (this.token) {
          headers.Authorization = `token ${this.token}`;
        }

        const response = await fetch(url, { headers });
        if (response.ok) {
          return await response.text();
        }
      } catch {
        // Branch fetch failed — try next
      }
    }

    return null;
  }
}

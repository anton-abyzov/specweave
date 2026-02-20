/**
 * SkillsShProvider Unit Tests
 *
 * Tests the skills.sh provider that scrapes the skills.sh directory
 * and extracts GitHub repo URLs from listed skills.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillsShProvider } from '../../../../../src/core/fabric/discovery/skillssh-provider.js';
import type { GitHubRepoInfo } from '../../../../../src/core/fabric/submission-queue-types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Helpers ---

function makeSkillsShHtml(repos: string[]): string {
  const links = repos.map(r => `<a href="https://github.com/${r}" class="skill-card">${r}</a>`).join('\n');
  return `<html><body><div class="skills-list">${links}</div></body></html>`;
}

// --- Tests ---

describe('SkillsShProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has the correct provider name', () => {
    const provider = new SkillsShProvider();
    expect(provider.name).toBe('skillssh');
  });

  it('extracts GitHub repo URLs from skills.sh page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => makeSkillsShHtml(['user/awesome-skill', 'org/cool-plugin']),
    });

    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(2);
    expect(results[0].fullName).toBe('user/awesome-skill');
    expect(results[1].fullName).toBe('org/cool-plugin');
  });

  it('normalizes results to GitHubRepoInfo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => makeSkillsShHtml(['alice/my-skill']),
    });

    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results[0]).toMatchObject({
      fullName: 'alice/my-skill',
      htmlUrl: 'https://github.com/alice/my-skill',
      owner: 'alice',
      skillPath: 'SKILL.md',
    });
  });

  it('deduplicates repo URLs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => makeSkillsShHtml(['user/dupe', 'user/dupe', 'user/other']),
    });

    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(2);
  });

  it('handles skills.sh being unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(0);
  });

  it('handles empty skills.sh page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<html><body>No skills yet</body></html>',
    });

    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(0);
  });
});

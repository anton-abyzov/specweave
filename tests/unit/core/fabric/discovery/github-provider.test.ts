/**
 * GitHubProvider Unit Tests
 *
 * Tests the broad GitHub search provider that discovers skills by
 * searching for SKILL.md files, .claude/commands paths, and skill-related descriptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubProvider } from '../../../../../src/core/fabric/discovery/github-provider.js';
import type { GitHubRepoInfo } from '../../../../../src/core/fabric/submission-queue-types.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Helpers ---

function makeGitHubSearchResponse(repos: Array<{
  full_name: string;
  html_url: string;
  description: string | null;
  owner: { login: string };
  stargazers_count: number;
  updated_at: string;
}>, totalCount?: number) {
  return {
    ok: true,
    status: 200,
    headers: new Map([
      ['x-ratelimit-remaining', '50'],
      ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000) + 3600)],
    ]),
    json: async () => ({
      total_count: totalCount ?? repos.length,
      items: repos,
    }),
  };
}

function makeRepoItem(fullName: string, stars = 10) {
  const [owner, name] = fullName.split('/');
  return {
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    description: `${name} skill`,
    owner: { login: owner },
    stargazers_count: stars,
    updated_at: '2026-01-15T00:00:00Z',
  };
}

// --- Tests ---

describe('GitHubProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has the correct provider name', () => {
    const provider = new GitHubProvider();
    expect(provider.name).toBe('github');
  });

  it('searches GitHub with broad queries', async () => {
    mockFetch.mockResolvedValueOnce(
      makeGitHubSearchResponse([makeRepoItem('user/my-skill', 100)])
    );
    // Additional queries return empty
    mockFetch.mockResolvedValue(makeGitHubSearchResponse([]));

    const provider = new GitHubProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].fullName).toBe('user/my-skill');
    expect(results[0].stars).toBe(100);

    // Verify at least one fetch was to GitHub search API
    const calls = mockFetch.mock.calls;
    expect(calls.some((c: string[]) => c[0].includes('api.github.com/search/repositories'))).toBe(true);
  });

  it('normalizes results to GitHubRepoInfo', async () => {
    mockFetch.mockResolvedValueOnce(
      makeGitHubSearchResponse([makeRepoItem('org/claude-skills', 500)])
    );
    mockFetch.mockResolvedValue(makeGitHubSearchResponse([]));

    const provider = new GitHubProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    const r = results.find(r => r.fullName === 'org/claude-skills');
    expect(r).toBeDefined();
    expect(r!.htmlUrl).toBe('https://github.com/org/claude-skills');
    expect(r!.owner).toBe('org');
    expect(r!.skillPath).toBe('SKILL.md');
  });

  it('deduplicates across multiple queries', async () => {
    const repo = makeRepoItem('user/same-skill', 50);
    // Both queries return the same repo
    mockFetch.mockResolvedValueOnce(makeGitHubSearchResponse([repo]));
    mockFetch.mockResolvedValueOnce(makeGitHubSearchResponse([repo]));
    mockFetch.mockResolvedValue(makeGitHubSearchResponse([]));

    const provider = new GitHubProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    const matches = results.filter(r => r.fullName === 'user/same-skill');
    expect(matches).toHaveLength(1);
  });

  it('accepts optional GitHub token', async () => {
    mockFetch.mockResolvedValue(makeGitHubSearchResponse([]));

    const fakeToken = ['test', 'token', 'fake'].join('_');
    const provider = new GitHubProvider({ token: fakeToken });
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    const calls = mockFetch.mock.calls;
    if (calls.length > 0) {
      const headers = calls[0][1]?.headers;
      expect(headers?.Authorization || headers?.authorization).toContain(fakeToken);
    }
  });

  it('handles rate limit errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Map([
        ['x-ratelimit-remaining', '0'],
        ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000) + 10)],
      ]),
      json: async () => ({ message: 'rate limit exceeded' }),
    });

    const provider = new GitHubProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    // Should return empty instead of throwing
    expect(results).toHaveLength(0);
  });
});

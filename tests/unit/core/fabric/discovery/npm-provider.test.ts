/**
 * NpmProvider Unit Tests
 *
 * Tests the npm registry provider that searches for packages
 * with claude-code-skill or agent-skill keywords.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NpmProvider } from '../../../../../src/core/fabric/discovery/npm-provider.js';
import type { GitHubRepoInfo } from '../../../../../src/core/fabric/submission-queue-types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Helpers ---

function makeNpmSearchResponse(packages: Array<{
  name: string;
  description?: string;
  repoUrl?: string;
  version?: string;
}>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      objects: packages.map(pkg => ({
        package: {
          name: pkg.name,
          description: pkg.description || '',
          version: pkg.version || '1.0.0',
          links: {
            repository: pkg.repoUrl || null,
          },
        },
      })),
      total: packages.length,
    }),
  };
}

// --- Tests ---

describe('NpmProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has the correct provider name', () => {
    const provider = new NpmProvider();
    expect(provider.name).toBe('npm');
  });

  it('searches npm registry for skill packages', async () => {
    mockFetch.mockResolvedValueOnce(
      makeNpmSearchResponse([
        { name: 'claude-skill-aws', repoUrl: 'https://github.com/user/claude-skill-aws' },
      ])
    );
    // Subsequent keyword searches return empty
    mockFetch.mockResolvedValue(makeNpmSearchResponse([]));

    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].fullName).toBe('user/claude-skill-aws');
  });

  it('extracts owner/repo from GitHub URLs', async () => {
    mockFetch.mockResolvedValueOnce(
      makeNpmSearchResponse([
        { name: 'test-skill', repoUrl: 'https://github.com/org/test-skill' },
      ])
    );
    mockFetch.mockResolvedValue(makeNpmSearchResponse([]));

    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results[0]).toMatchObject({
      fullName: 'org/test-skill',
      htmlUrl: 'https://github.com/org/test-skill',
      owner: 'org',
      skillPath: 'SKILL.md',
    });
  });

  it('skips packages without GitHub repo URL', async () => {
    mockFetch.mockResolvedValueOnce(
      makeNpmSearchResponse([
        { name: 'no-repo-skill' }, // no repoUrl
        { name: 'gitlab-skill', repoUrl: 'https://gitlab.com/user/skill' }, // not GitHub
        { name: 'good-skill', repoUrl: 'https://github.com/user/good-skill' },
      ])
    );
    mockFetch.mockResolvedValue(makeNpmSearchResponse([]));

    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe('user/good-skill');
  });

  it('handles npm registry errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('npm registry unreachable'));

    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    expect(results).toHaveLength(0);
  });

  it('deduplicates across keyword searches', async () => {
    const samePackage = { name: 'dupe-skill', repoUrl: 'https://github.com/user/dupe-skill' };
    // Both keyword searches return the same package
    mockFetch.mockResolvedValueOnce(makeNpmSearchResponse([samePackage]));
    mockFetch.mockResolvedValueOnce(makeNpmSearchResponse([samePackage]));
    mockFetch.mockResolvedValue(makeNpmSearchResponse([]));

    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    const matches = results.filter(r => r.fullName === 'user/dupe-skill');
    expect(matches).toHaveLength(1);
  });
});

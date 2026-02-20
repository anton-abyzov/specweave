/**
 * SourceRegistry & DiscoveryProvider Unit Tests
 *
 * Tests the pluggable provider framework for multi-source skill discovery.
 * Covers provider registration, discovery orchestration, dedup, and config filtering.
 */

import { describe, it, expect, vi } from 'vitest';
import type { GitHubRepoInfo } from '../../../../../src/core/fabric/submission-queue-types.js';
import {
  SourceRegistry,
  type DiscoveryProvider,
} from '../../../../../src/core/fabric/discovery/source-registry.js';

// --- Helpers ---

function makeRepo(overrides: Partial<GitHubRepoInfo> = {}): GitHubRepoInfo {
  return {
    fullName: 'user/skill-repo',
    htmlUrl: 'https://github.com/user/skill-repo',
    description: 'A test skill',
    owner: 'user',
    stars: 42,
    lastUpdated: '2026-01-15T00:00:00Z',
    skillPath: 'SKILL.md',
    ...overrides,
  };
}

function makeMockProvider(name: string, repos: GitHubRepoInfo[]): DiscoveryProvider {
  return {
    name,
    async *discover() {
      for (const repo of repos) {
        yield repo;
      }
    },
  };
}

// --- Tests ---

describe('SourceRegistry', () => {
  it('registers and lists providers', () => {
    const registry = new SourceRegistry();
    const provider = makeMockProvider('github', []);
    registry.register(provider);

    expect(registry.providers).toHaveLength(1);
    expect(registry.providers[0].name).toBe('github');
  });

  it('discovers from a single provider', async () => {
    const registry = new SourceRegistry();
    const repos = [makeRepo({ fullName: 'a/one' }), makeRepo({ fullName: 'a/two' })];
    registry.register(makeMockProvider('github', repos));

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }

    expect(results).toHaveLength(2);
    expect(results[0].fullName).toBe('a/one');
    expect(results[1].fullName).toBe('a/two');
  });

  it('discovers from multiple providers', async () => {
    const registry = new SourceRegistry();
    registry.register(makeMockProvider('github', [makeRepo({ fullName: 'gh/skill' })]));
    registry.register(makeMockProvider('npm', [makeRepo({ fullName: 'npm/skill' })]));

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }

    expect(results).toHaveLength(2);
    const names = results.map(r => r.fullName);
    expect(names).toContain('gh/skill');
    expect(names).toContain('npm/skill');
  });

  it('deduplicates repos by fullName across providers', async () => {
    const registry = new SourceRegistry();
    const sameRepo = makeRepo({ fullName: 'user/dupe' });
    registry.register(makeMockProvider('github', [sameRepo]));
    registry.register(makeMockProvider('npm', [sameRepo]));

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }

    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe('user/dupe');
  });

  it('filters providers by enabled list', async () => {
    const registry = new SourceRegistry();
    registry.register(makeMockProvider('github', [makeRepo({ fullName: 'gh/one' })]));
    registry.register(makeMockProvider('npm', [makeRepo({ fullName: 'npm/one' })]));
    registry.register(makeMockProvider('skillssh', [makeRepo({ fullName: 'ss/one' })]));

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll({ enabledSources: ['github', 'npm'] })) {
      results.push(repo);
    }

    expect(results).toHaveLength(2);
    const names = results.map(r => r.fullName);
    expect(names).toContain('gh/one');
    expect(names).toContain('npm/one');
    expect(names).not.toContain('ss/one');
  });

  it('handles provider errors gracefully', async () => {
    const registry = new SourceRegistry();
    const failingProvider: DiscoveryProvider = {
      name: 'broken',
      async *discover() {
        throw new Error('API down');
      },
    };
    registry.register(failingProvider);
    registry.register(makeMockProvider('working', [makeRepo({ fullName: 'ok/skill' })]));

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }

    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe('ok/skill');
  });

  it('yields nothing when no providers are registered', async () => {
    const registry = new SourceRegistry();
    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }
    expect(results).toHaveLength(0);
  });
});

/**
 * Unit tests for buildUmbrellaConfig helper
 *
 * Tests prefix generation, deduplication, and config structure.
 */

import { describe, it, expect } from 'vitest';
import { buildUmbrellaConfig } from '../../../../../src/cli/helpers/init/path-utils.js';
import type { UmbrellaDiscoveryResult } from '../../../../../src/cli/helpers/init/types.js';

function makeDiscovery(repos: Array<{ org: string; name: string; path: string }>): UmbrellaDiscoveryResult {
  return {
    isUmbrella: true,
    repositoriesDir: '/tmp/test/repositories',
    orgs: [...new Set(repos.map(r => r.org))],
    repos: repos.map(r => ({ ...r, hasGit: true })),
    totalRepoCount: repos.length,
  };
}

describe('buildUmbrellaConfig', () => {
  it('TC-001: returns config with single childRepo and 3-char prefix', () => {
    const discovery = makeDiscovery([
      { org: 'acme', name: 'my-app', path: 'repositories/acme/my-app' },
    ]);

    const result = buildUmbrellaConfig(discovery, 'test-project');

    expect(result.umbrella.enabled).toBe(true);
    expect(result.umbrella.projectName).toBe('test-project');
    expect(result.umbrella.childRepos).toHaveLength(1);
    expect(result.umbrella.childRepos[0]).toEqual({
      id: 'my-app',
      path: 'repositories/acme/my-app',
      name: 'my-app',
      prefix: 'MY-',
    });
    expect(result.repository.umbrellaRepo).toBe(true);
  });

  it('TC-002: deduplicates prefixes when two repos share same 3-char prefix', () => {
    const discovery = makeDiscovery([
      { org: 'acme', name: 'my-app', path: 'repositories/acme/my-app' },
      { org: 'acme', name: 'my-service', path: 'repositories/acme/my-service' },
    ]);

    const result = buildUmbrellaConfig(discovery, 'test-project');

    expect(result.umbrella.childRepos).toHaveLength(2);
    // First repo gets normal 3-char prefix
    expect(result.umbrella.childRepos[0].prefix).toBe('MY-');
    // Second repo gets deduplicated prefix (2 chars + numeric suffix)
    expect(result.umbrella.childRepos[1].prefix).toBe('MY2');
  });

  it('TC-003: handles 3 repos from 2 orgs with correct org, name, path, and unique prefixes', () => {
    const discovery = makeDiscovery([
      { org: 'org-a', name: 'frontend', path: 'repositories/org-a/frontend' },
      { org: 'org-a', name: 'backend', path: 'repositories/org-a/backend' },
      { org: 'org-b', name: 'shared-lib', path: 'repositories/org-b/shared-lib' },
    ]);

    const result = buildUmbrellaConfig(discovery, 'workspace');

    expect(result.umbrella.enabled).toBe(true);
    expect(result.umbrella.projectName).toBe('workspace');
    expect(result.umbrella.childRepos).toHaveLength(3);

    // All repos included with correct data
    const frontendRepo = result.umbrella.childRepos.find(r => r.name === 'frontend');
    const backendRepo = result.umbrella.childRepos.find(r => r.name === 'backend');
    const sharedRepo = result.umbrella.childRepos.find(r => r.name === 'shared-lib');

    expect(frontendRepo).toBeDefined();
    expect(frontendRepo!.id).toBe('frontend');
    expect(frontendRepo!.path).toBe('repositories/org-a/frontend');

    expect(backendRepo).toBeDefined();
    expect(backendRepo!.id).toBe('backend');
    expect(backendRepo!.path).toBe('repositories/org-a/backend');

    expect(sharedRepo).toBeDefined();
    expect(sharedRepo!.id).toBe('shared-lib');
    expect(sharedRepo!.path).toBe('repositories/org-b/shared-lib');

    // All prefixes unique
    const prefixes = result.umbrella.childRepos.map(r => r.prefix);
    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(3);

    expect(result.repository.umbrellaRepo).toBe(true);
  });

  it('handles three-way prefix collision with incrementing suffix', () => {
    const discovery = makeDiscovery([
      { org: 'acme', name: 'my-app', path: 'repositories/acme/my-app' },
      { org: 'acme', name: 'my-service', path: 'repositories/acme/my-service' },
      { org: 'acme', name: 'my-lib', path: 'repositories/acme/my-lib' },
    ]);

    const result = buildUmbrellaConfig(discovery, 'test');

    const prefixes = result.umbrella.childRepos.map(r => r.prefix);
    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(3);
    // First gets MY-, second gets MY2, third gets MY3
    expect(prefixes[0]).toBe('MY-');
    expect(prefixes[1]).toBe('MY2');
    expect(prefixes[2]).toBe('MY3');
  });
});

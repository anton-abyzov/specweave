/**
 * Unit tests for scanWorkspaceRepos (T-021) and buildWorkspaceConfig (T-022)
 *
 * Verifies the renamed functions return WorkspaceRepo[] and { workspace: WorkspaceConfig }
 * instead of the legacy ChildRepoConfig[] and { umbrella: UmbrellaConfig }.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  scanWorkspaceRepos,
  buildWorkspaceConfig,
} from '../../../../../src/cli/helpers/init/path-utils.js';
import type { WorkspaceRepo, WorkspaceConfig } from '../../../../../src/core/config/types.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-ws-test-${name}-${suffix}`);
}

describe('scanWorkspaceRepos (T-021)', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpPath('workspace');
    mkdirSync(dir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  });

  it('should return null when no repositories/ directory exists', () => {
    expect(scanWorkspaceRepos(dir)).toBeNull();
  });

  it('should return null when repositories/ is empty', () => {
    mkdirSync(path.join(dir, 'repositories'));
    expect(scanWorkspaceRepos(dir)).toBeNull();
  });

  it('should discover repos and return UmbrellaDiscoveryResult with DiscoveredRepo[]', () => {
    const repoPath = path.join(dir, 'repositories', 'acme', 'my-app');
    mkdirSync(path.join(repoPath, '.git'), { recursive: true });

    const result = scanWorkspaceRepos(dir);
    expect(result).not.toBeNull();
    expect(result!.isUmbrella).toBe(true);
    expect(result!.totalRepoCount).toBe(1);
    expect(result!.repos[0].name).toBe('my-app');
    expect(result!.repos[0].org).toBe('acme');
    expect(result!.repos[0].hasGit).toBe(true);
  });

  it('should discover multiple repos across multiple orgs', () => {
    mkdirSync(path.join(dir, 'repositories', 'org-a', 'repo1', '.git'), { recursive: true });
    mkdirSync(path.join(dir, 'repositories', 'org-a', 'repo2', '.git'), { recursive: true });
    mkdirSync(path.join(dir, 'repositories', 'org-b', 'repo3', '.git'), { recursive: true });

    const result = scanWorkspaceRepos(dir);
    expect(result).not.toBeNull();
    expect(result!.totalRepoCount).toBe(3);
    expect(result!.orgs).toContain('org-a');
    expect(result!.orgs).toContain('org-b');
  });

  // Backwards compat: old name still works
  it('scanUmbrellaRepos still exported as alias', async () => {
    const mod = await import('../../../../../src/cli/helpers/init/path-utils.js');
    expect(typeof mod.scanUmbrellaRepos).toBe('function');
  });
});

describe('buildWorkspaceConfig (T-022)', () => {
  it('should return { workspace: WorkspaceConfig } with repos containing sync: {}', () => {
    const discovery = {
      isUmbrella: true,
      repositoriesDir: '/tmp/test/repositories',
      orgs: ['acme'],
      repos: [
        { org: 'acme', name: 'frontend', path: 'repositories/acme/frontend', hasGit: true },
        { org: 'acme', name: 'backend', path: 'repositories/acme/backend', hasGit: true },
      ],
      totalRepoCount: 2,
    };

    const result = buildWorkspaceConfig(discovery, 'my-workspace');

    // Must have workspace key, not umbrella
    expect(result).toHaveProperty('workspace');
    expect(result).not.toHaveProperty('umbrella');

    const ws = result.workspace;
    expect(ws.name).toBe('my-workspace');
    expect(ws.repos).toHaveLength(2);

    // Each repo should be a WorkspaceRepo with sync: {}
    for (const repo of ws.repos) {
      expect(repo).toHaveProperty('id');
      expect(repo).toHaveProperty('path');
      expect(repo).toHaveProperty('prefix');
      expect(repo).toHaveProperty('sync');
      expect(repo.sync).toEqual({});
    }
  });

  it('should generate unique prefixes with deduplication', () => {
    const discovery = {
      isUmbrella: true,
      repositoriesDir: '/tmp/test/repositories',
      orgs: ['acme'],
      repos: [
        { org: 'acme', name: 'app-one', path: 'repositories/acme/app-one', hasGit: true },
        { org: 'acme', name: 'app-two', path: 'repositories/acme/app-two', hasGit: true },
      ],
      totalRepoCount: 2,
    };

    const result = buildWorkspaceConfig(discovery, 'test');
    const prefixes = result.workspace.repos.map(r => r.prefix);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });

  // Backwards compat: old name still works
  it('buildUmbrellaConfig still exported as alias', async () => {
    const mod = await import('../../../../../src/cli/helpers/init/path-utils.js');
    expect(typeof mod.buildUmbrellaConfig).toBe('function');
  });
});

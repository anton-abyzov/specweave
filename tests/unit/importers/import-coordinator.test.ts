/**
 * Unit tests for ImportCoordinator multi-repo handling
 *
 * Tests multi-repository GitHub import coordination (T-017)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportCoordinator, type CoordinatorConfig, type ProgressInfo } from '../../../src/importers/import-coordinator.js';
import type { ExternalItem, ImportResult } from '../../../src/importers/external-importer.js';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';

// Mock the importers to avoid real API calls
vi.mock('../../../src/importers/github-importer.js', () => ({
  GitHubImporter: vi.fn().mockImplementation((owner, repo, token) => ({
    platform: 'github',
    owner,
    repo,
    async *paginate(config: any) {
      // Return mock items tagged with source repo
      const items: ExternalItem[] = [
        {
          id: `GITHUB-${owner}-${repo}-1`,
          type: 'user-story',
          title: `Issue from ${owner}/${repo}`,
          description: 'Test issue',
          status: 'open',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          url: `https://github.com/${owner}/${repo}/issues/1`,
          labels: ['feature'],
          platform: 'github',
        },
        {
          id: `GITHUB-${owner}-${repo}-2`,
          type: 'user-story',
          title: `Second issue from ${owner}/${repo}`,
          description: 'Another test issue',
          status: 'in-progress',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-20'),
          url: `https://github.com/${owner}/${repo}/issues/2`,
          labels: [],
          platform: 'github',
        },
      ];
      yield items;
    },
  })),
}));

vi.mock('../../../src/importers/jira-importer.js', () => ({
  JiraImporter: vi.fn().mockImplementation(() => ({
    platform: 'jira',
    async *paginate() {
      yield [];
    },
  })),
}));

vi.mock('../../../src/importers/ado-importer.js', () => ({
  ADOImporter: vi.fn().mockImplementation(() => ({
    platform: 'ado',
    async *paginate() {
      yield [];
    },
  })),
}));

vi.mock('../../../src/sync/sync-metadata.js', () => ({
  updateSyncMetadata: vi.fn(),
}));

describe('ImportCoordinator Multi-Repo Support', () => {
  let testDir: string;

  beforeEach(() => {
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `import-coordinator-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    try {
      fs.removeSync(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('AC-US1-01: Multi-repo configuration', () => {
    it('should initialize multiple GitHub importers from githubRepositories config', () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'frontend' },
          { owner: 'org', repo: 'backend' },
          { owner: 'org', repo: 'shared' },
        ],
        githubToken: 'test-token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const repos = coordinator.getConfiguredGitHubRepos();

      expect(repos).toHaveLength(3);
      expect(repos).toContain('org/frontend');
      expect(repos).toContain('org/backend');
      expect(repos).toContain('org/shared');
    });

    it('should prefer multi-repo config over single repo config', () => {
      const config: CoordinatorConfig = {
        github: { owner: 'single', repo: 'repo', token: 'token1' },
        githubRepositories: [
          { owner: 'multi', repo: 'repo1' },
          { owner: 'multi', repo: 'repo2' },
        ],
        githubToken: 'token2',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const repos = coordinator.getConfiguredGitHubRepos();

      // Should use multi-repo config, not single repo
      expect(repos).toHaveLength(2);
      expect(repos).toContain('multi/repo1');
      expect(repos).toContain('multi/repo2');
      expect(repos).not.toContain('single/repo');
    });

    it('should fall back to single repo if no multi-repo configured', () => {
      const config: CoordinatorConfig = {
        github: { owner: 'single', repo: 'repo', token: 'token' },
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);

      expect(coordinator.isPlatformConfigured('github')).toBe(true);
      expect(coordinator.getConfiguredGitHubRepos()).toHaveLength(0); // No multi-repo
    });

    it('should throw error when no importers configured', () => {
      const config: CoordinatorConfig = {
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      expect(() => new ImportCoordinator(config)).toThrow('No importers configured');
    });
  });

  describe('AC-US1-02: Items tagged with source repository', () => {
    it('should tag items with their source repository in multi-repo import', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'myorg', repo: 'frontend' },
          { owner: 'myorg', repo: 'backend' },
        ],
        githubToken: 'test-token',
        projectRoot: testDir,
        enableSyncMetadata: false,
        parallel: false, // Sequential for predictable ordering
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      // Should have items from both repos
      expect(result.totalCount).toBe(4); // 2 items per repo

      // Check that items are tagged with sourceRepo
      const frontendItems = result.allItems.filter(item => item.sourceRepo === 'myorg/frontend');
      const backendItems = result.allItems.filter(item => item.sourceRepo === 'myorg/backend');

      expect(frontendItems).toHaveLength(2);
      expect(backendItems).toHaveLength(2);

      // Verify specific item tagging
      expect(frontendItems[0].id).toContain('myorg-frontend');
      expect(backendItems[0].id).toContain('myorg-backend');
    });

    it('should preserve sourceRepo in ImportResult', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [{ owner: 'test', repo: 'repo' }],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      // Each result should have sourceRepo
      expect(result.results).toHaveLength(1);
      expect(result.results[0].sourceRepo).toBe('test/repo');
    });
  });

  describe('AC-US1-04: Cross-repo duplicate detection', () => {
    it('should import items from all repos without coordinator-level deduplication', async () => {
      // Note: Actual duplicate detection is handled by DuplicateDetector in ItemConverter
      // This test verifies the coordinator imports all items without filtering
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'repo1' },
          { owner: 'org', repo: 'repo2' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      // All items should be imported (duplicate detection happens later)
      expect(result.totalCount).toBe(4);
      expect(result.platforms).toContain('github');
    });
  });

  describe('Progress Tracking (AC-US3-04)', () => {
    it('should report per-repo progress in multi-repo imports', async () => {
      const progressCalls: ProgressInfo[] = [];

      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'frontend' },
          { owner: 'org', repo: 'backend' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
        parallel: false,
        onProgressEnhanced: (info) => {
          progressCalls.push({ ...info });
        },
      };

      const coordinator = new ImportCoordinator(config);
      await coordinator.importAll();

      // Should have progress calls for each repo
      expect(progressCalls.length).toBeGreaterThan(0);

      const frontendProgress = progressCalls.filter(p => p.sourceRepo === 'org/frontend');
      const backendProgress = progressCalls.filter(p => p.sourceRepo === 'org/backend');

      expect(frontendProgress.length).toBeGreaterThan(0);
      expect(backendProgress.length).toBeGreaterThan(0);

      // Each progress should include sourceRepo
      expect(frontendProgress[0].platform).toBe('github');
      expect(frontendProgress[0].sourceRepo).toBe('org/frontend');
    });

    it('should call legacy onProgress with repo identifier', async () => {
      const legacyProgressCalls: Array<{ platform: string; count: number }> = [];

      const config: CoordinatorConfig = {
        githubRepositories: [{ owner: 'org', repo: 'myrepo' }],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
        onProgress: (platform, count) => {
          legacyProgressCalls.push({ platform, count });
        },
      };

      const coordinator = new ImportCoordinator(config);
      await coordinator.importAll();

      // Legacy progress should include repo in platform string
      expect(legacyProgressCalls.length).toBeGreaterThan(0);
      expect(legacyProgressCalls[0].platform).toBe('github (org/myrepo)');
    });
  });

  describe('Parallel vs Sequential Import', () => {
    it('should support parallel import (default)', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'repo1' },
          { owner: 'org', repo: 'repo2' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
        // parallel: true is default
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      expect(result.totalCount).toBe(4);
    });

    it('should support sequential import when parallel=false', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'repo1' },
          { owner: 'org', repo: 'repo2' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
        parallel: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      expect(result.totalCount).toBe(4);
    });
  });

  describe('Platform Configuration', () => {
    it('should correctly report configured platforms', () => {
      const config: CoordinatorConfig = {
        githubRepositories: [{ owner: 'org', repo: 'repo' }],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);

      expect(coordinator.isPlatformConfigured('github')).toBe(true);
      expect(coordinator.isPlatformConfigured('jira')).toBe(false);
      expect(coordinator.isPlatformConfigured('ado')).toBe(false);

      const platforms = coordinator.getConfiguredPlatforms();
      expect(platforms).toContain('github');
    });

    it('should report github as configured for multi-repo setup', () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org1', repo: 'repo1' },
          { owner: 'org2', repo: 'repo2' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);

      // Even with multi-repo, github platform should be reported
      expect(coordinator.isPlatformConfigured('github')).toBe(true);
      expect(coordinator.getConfiguredPlatforms()).toContain('github');
    });
  });

  describe('Error Handling', () => {
    it('should aggregate errors from multiple repos', async () => {
      // The mock doesn't throw errors, but we can verify error structure
      const config: CoordinatorConfig = {
        githubRepositories: [{ owner: 'org', repo: 'repo' }],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importAll();

      // Errors should be keyed by platform
      expect(result.errors).toBeDefined();
      expect(typeof result.errors).toBe('object');
    });
  });

  describe('importFrom() Multi-Repo Support', () => {
    it('should aggregate results from all repos when using importFrom(github) with multi-repo config', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'frontend' },
          { owner: 'org', repo: 'backend' },
          { owner: 'org', repo: 'shared' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importFrom('github');

      // Should have items from all 3 repos (2 items per repo)
      expect(result.count).toBe(6);
      expect(result.items).toHaveLength(6);
      expect(result.platform).toBe('github');

      // Verify items are tagged with correct sourceRepo
      const frontendItems = result.items.filter(item => item.sourceRepo === 'org/frontend');
      const backendItems = result.items.filter(item => item.sourceRepo === 'org/backend');
      const sharedItems = result.items.filter(item => item.sourceRepo === 'org/shared');

      expect(frontendItems).toHaveLength(2);
      expect(backendItems).toHaveLength(2);
      expect(sharedItems).toHaveLength(2);
    });

    it('should aggregate errors from all repos in importFrom()', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [
          { owner: 'org', repo: 'repo1' },
          { owner: 'org', repo: 'repo2' },
        ],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importFrom('github');

      // Errors array should exist and be aggregated
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should fall back to single-repo importer when no multi-repo configured', async () => {
      const config: CoordinatorConfig = {
        github: { owner: 'single', repo: 'repo', token: 'token' },
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);
      const result = await coordinator.importFrom('github');

      // Should use single-repo importer
      expect(result.count).toBe(2); // 2 items from single repo
      expect(result.platform).toBe('github');
    });

    it('should throw error when platform not configured', async () => {
      const config: CoordinatorConfig = {
        githubRepositories: [{ owner: 'org', repo: 'repo' }],
        githubToken: 'token',
        projectRoot: testDir,
        enableSyncMetadata: false,
      };

      const coordinator = new ImportCoordinator(config);

      // JIRA is not configured
      await expect(coordinator.importFrom('jira')).rejects.toThrow('jira importer not configured');
    });
  });
});

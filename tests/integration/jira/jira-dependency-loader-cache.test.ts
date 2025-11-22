import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  JiraDependencyLoader,
  ProjectMetadata,
  ProjectDependencies,
} from '../../../src/integrations/jira/jira-dependency-loader.js';
import { CacheManager } from '../../../src/core/cache/cache-manager.js';
import { RateLimitChecker } from '../../../src/core/cache/rate-limit-checker.js';
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('JiraDependencyLoader - Cache Integration', () => {
  let testDir: string;
  let cacheManager: CacheManager;
  let rateLimitChecker: RateLimitChecker;
  let mockJiraClient: JiraClient;
  let loader: JiraDependencyLoader;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `jira-loader-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Initialize cache manager
    cacheManager = new CacheManager(testDir, { logger: silentLogger });
    rateLimitChecker = new RateLimitChecker({ logger: silentLogger });

    // Mock JiraClient
    mockJiraClient = {
      searchProjects: vi.fn(),
      getBoards: vi.fn(),
      getComponents: vi.fn(),
      getVersions: vi.fn(),
    } as any;

    // Create loader
    loader = new JiraDependencyLoader({
      jiraClient: mockJiraClient,
      cacheManager,
      rateLimitChecker,
      logger: silentLogger,
    });
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadProjectMetadata()', () => {
    it('TC-009: should return cached data on cache hit (no API call)', async () => {
      // Given: Cached project list exists (valid TTL)
      const cachedProjects: ProjectMetadata[] = [
        { key: 'BACKEND', name: 'Backend Services', type: 'software' },
        { key: 'FRONTEND', name: 'Frontend App', type: 'software' },
      ];

      await cacheManager.set('jira-projects', { projects: cachedProjects });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Return cached data without API call
      expect(result).toEqual(cachedProjects);
      expect(mockJiraClient.searchProjects).not.toHaveBeenCalled();
    });

    it('TC-010: should fetch from API on cache miss and cache result', async () => {
      // Given: No cached project list exists
      const apiProjects = [
        {
          key: 'BACKEND',
          name: 'Backend Services',
          projectTypeKey: 'software',
          lead: { displayName: 'John Doe' },
        },
      ];

      vi.mocked(mockJiraClient.searchProjects).mockResolvedValue({
        values: apiProjects,
        headers: {},
      });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Fetch from API
      expect(mockJiraClient.searchProjects).toHaveBeenCalledWith({
        maxResults: 50,
        orderBy: 'name',
      });

      // And: Return parsed projects
      expect(result).toEqual([
        {
          key: 'BACKEND',
          name: 'Backend Services',
          type: 'software',
          lead: { displayName: 'John Doe' },
        },
      ]);

      // And: Cache result
      const cached = await cacheManager.get<{ projects: ProjectMetadata[] }>('jira-projects');
      expect(cached).toBeTruthy();
      expect(cached?.projects).toEqual(result);
    });

    it('TC-011: should refresh expired cache with fresh API data', async () => {
      // Given: Cached data is 25 hours old (expired)
      const oldProjects: ProjectMetadata[] = [
        { key: 'OLD', name: 'Old Project', type: 'software' },
      ];

      // Set cache with expired TTL (1 hour instead of 24 hours)
      await cacheManager.set('jira-projects', { projects: oldProjects }, 1000 * 60 * 60); // 1 hour TTL

      // Wait for cache to expire (simulate)
      const cacheDir = path.join(testDir, '.specweave', 'cache');
      const cacheFile = path.join(cacheDir, 'jira-projects.json');
      const cacheContent = await fs.readFile(cacheFile, 'utf-8');
      const cacheData = JSON.parse(cacheContent);
      cacheData.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));

      // Mock API response with fresh data
      const freshProjects = [
        {
          key: 'FRESH',
          name: 'Fresh Project',
          projectTypeKey: 'software',
        },
      ];

      vi.mocked(mockJiraClient.searchProjects).mockResolvedValue({
        values: freshProjects,
        headers: {},
      });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Fetch fresh data from API
      expect(mockJiraClient.searchProjects).toHaveBeenCalled();
      expect(result).toEqual([
        {
          key: 'FRESH',
          name: 'Fresh Project',
          type: 'software',
          lead: undefined,
        },
      ]);

      // And: Update cache with new timestamp
      const updatedCache = await cacheManager.get<{ projects: ProjectMetadata[] }>(
        'jira-projects'
      );
      expect(updatedCache?.projects[0].key).toBe('FRESH');
    });

    it('should use stale cache on rate limit error (429)', async () => {
      // Given: Stale cache exists
      const staleProjects: ProjectMetadata[] = [
        { key: 'STALE', name: 'Stale Project', type: 'software' },
      ];

      await cacheManager.set('jira-projects', { projects: staleProjects }, 1000 * 60 * 60); // 1 hour TTL

      // Expire cache
      const cacheDir = path.join(testDir, '.specweave', 'cache');
      const cacheFile = path.join(cacheDir, 'jira-projects.json');
      const cacheContent = await fs.readFile(cacheFile, 'utf-8');
      const cacheData = JSON.parse(cacheContent);
      cacheData.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago (expired)
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));

      // Mock API to throw rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = { status: 429 };
      vi.mocked(mockJiraClient.searchProjects).mockRejectedValue(rateLimitError);

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Use stale cache instead of throwing error
      expect(result).toEqual(staleProjects);
    });
  });

  describe('loadProjectDependencies()', () => {
    it('should return cached dependencies on cache hit', async () => {
      // Given: Cached dependencies exist
      const cachedDeps: ProjectDependencies = {
        projectKey: 'BACKEND',
        boards: [{ id: 1, name: 'BACKEND Board' }],
        components: [{ id: '10001', name: 'API' }],
        versions: [{ id: '10100', name: 'v1.0.0' }],
        lastUpdated: new Date().toISOString(),
      };

      await cacheManager.set('jira-BACKEND-deps', cachedDeps);

      // When: loadProjectDependencies is called
      const result = await loader.loadProjectDependencies('BACKEND');

      // Then: Return cached data without API calls
      expect(result).toEqual(cachedDeps);
      expect(mockJiraClient.getBoards).not.toHaveBeenCalled();
      expect(mockJiraClient.getComponents).not.toHaveBeenCalled();
      expect(mockJiraClient.getVersions).not.toHaveBeenCalled();
    });

    it('should fetch from API on cache miss and cache per-project dependencies', async () => {
      // Given: No cache exists
      vi.mocked(mockJiraClient.getBoards).mockResolvedValue({
        values: [{ id: 1, name: 'BACKEND Board', type: 'scrum' }],
      });
      vi.mocked(mockJiraClient.getComponents).mockResolvedValue([
        { id: '10001', name: 'API' },
      ]);
      vi.mocked(mockJiraClient.getVersions).mockResolvedValue([
        { id: '10100', name: 'v1.0.0', released: false },
      ]);

      // When: loadProjectDependencies is called
      const result = await loader.loadProjectDependencies('BACKEND');

      // Then: Fetch all dependencies from API
      expect(mockJiraClient.getBoards).toHaveBeenCalledWith('BACKEND');
      expect(mockJiraClient.getComponents).toHaveBeenCalledWith('BACKEND');
      expect(mockJiraClient.getVersions).toHaveBeenCalledWith('BACKEND');

      // And: Return combined dependencies
      expect(result.projectKey).toBe('BACKEND');
      expect(result.boards).toHaveLength(1);
      expect(result.components).toHaveLength(1);
      expect(result.versions).toHaveLength(1);

      // And: Cache result
      const cached = await cacheManager.get<ProjectDependencies>('jira-BACKEND-deps');
      expect(cached).toBeTruthy();
      expect(cached?.projectKey).toBe('BACKEND');
    });

    it('should invalidate cache on 404 error (project not found)', async () => {
      // Given: No cache exists (force API call)
      // Mock API to return 404
      const notFoundError = new Error('Project not found');
      (notFoundError as any).response = { status: 404 };
      vi.mocked(mockJiraClient.getBoards).mockRejectedValue(notFoundError);
      vi.mocked(mockJiraClient.getComponents).mockRejectedValue(notFoundError);
      vi.mocked(mockJiraClient.getVersions).mockRejectedValue(notFoundError);

      // When: loadProjectDependencies is called
      await expect(loader.loadProjectDependencies('DELETED')).rejects.toThrow(
        'Project DELETED not found'
      );

      // Then: Cache should NOT be created
      const cached = await cacheManager.get<ProjectDependencies>('jira-DELETED-deps');
      expect(cached).toBeNull();
    });
  });
});

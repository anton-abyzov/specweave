import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  AdoDependencyLoader,
  AdoProjectMetadata,
  AdoProjectDependencies,
} from '../../../src/integrations/ado/ado-dependency-loader.js';
import { CacheManager } from '../../../src/core/cache/cache-manager.js';
import { RateLimitChecker } from '../../../src/core/cache/rate-limit-checker.js';
import { AdoClient } from '../../../src/integrations/ado/ado-client.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('AdoDependencyLoader - Cache Integration', () => {
  let testDir: string;
  let cacheManager: CacheManager;
  let rateLimitChecker: RateLimitChecker;
  let mockAdoClient: AdoClient;
  let loader: AdoDependencyLoader;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `ado-loader-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Initialize cache manager
    cacheManager = new CacheManager(testDir, { logger: silentLogger });
    rateLimitChecker = new RateLimitChecker({ logger: silentLogger, threshold: 20 });

    // Mock AdoClient
    mockAdoClient = {
      searchProjects: vi.fn(),
      getAreaPaths: vi.fn(),
      getTeams: vi.fn(),
    } as any;

    // Create loader
    loader = new AdoDependencyLoader({
      adoClient: mockAdoClient,
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
    it('TC-012: should return cached data on cache hit (no API call)', async () => {
      // Given: Cached ADO project list exists (valid TTL)
      const cachedProjects: AdoProjectMetadata[] = [
        { id: 'proj-1', name: 'Platform', visibility: 'private', state: 'wellFormed' },
        { id: 'proj-2', name: 'Backend', visibility: 'private', state: 'wellFormed' },
      ];

      await cacheManager.set('ado-projects', { projects: cachedProjects });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Return cached data without API call
      expect(result).toEqual(cachedProjects);
      expect(mockAdoClient.searchProjects).not.toHaveBeenCalled();
    });

    it('should fetch from API on cache miss and cache result', async () => {
      // Given: No cached project list exists
      const apiProjects = [
        {
          id: 'proj-1',
          name: 'Platform',
          description: 'Platform Team',
          visibility: 'private',
          state: 'wellFormed',
        },
      ];

      vi.mocked(mockAdoClient.searchProjects).mockResolvedValue({
        value: apiProjects,
        count: 1,
        headers: {},
      });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Fetch from API
      expect(mockAdoClient.searchProjects).toHaveBeenCalledWith({
        top: 50,
      });

      // And: Return parsed projects
      expect(result).toEqual([
        {
          id: 'proj-1',
          name: 'Platform',
          description: 'Platform Team',
          visibility: 'private',
          state: 'wellFormed',
        },
      ]);

      // And: Cache result
      const cached = await cacheManager.get<{ projects: AdoProjectMetadata[] }>('ado-projects');
      expect(cached).toBeTruthy();
      expect(cached?.projects).toEqual(result);
    });

    it('should refresh expired cache with fresh API data', async () => {
      // Given: Cached data is 25 hours old (expired)
      const oldProjects: AdoProjectMetadata[] = [
        { id: 'old-1', name: 'Old Project', visibility: 'private', state: 'wellFormed' },
      ];

      // Set cache with expired TTL
      await cacheManager.set('ado-projects', { projects: oldProjects }, 1000 * 60 * 60);

      // Expire cache manually
      const cacheDir = path.join(testDir, '.specweave', 'cache');
      const cacheFile = path.join(cacheDir, 'ado-projects.json');
      const cacheContent = await fs.readFile(cacheFile, 'utf-8');
      const cacheData = JSON.parse(cacheContent);
      cacheData.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));

      // Mock API response with fresh data
      const freshProjects = [
        {
          id: 'fresh-1',
          name: 'Fresh Project',
          visibility: 'private',
          state: 'wellFormed',
        },
      ];

      vi.mocked(mockAdoClient.searchProjects).mockResolvedValue({
        value: freshProjects,
        count: 1,
        headers: {},
      });

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Fetch fresh data from API
      expect(mockAdoClient.searchProjects).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'fresh-1',
          name: 'Fresh Project',
          description: undefined,
          visibility: 'private',
          state: 'wellFormed',
        },
      ]);
    });

    it('should use stale cache on rate limit error (429)', async () => {
      // Given: Stale cache exists
      const staleProjects: AdoProjectMetadata[] = [
        { id: 'stale-1', name: 'Stale Project', visibility: 'private', state: 'wellFormed' },
      ];

      await cacheManager.set('ado-projects', { projects: staleProjects }, 1000 * 60 * 60);

      // Expire cache
      const cacheDir = path.join(testDir, '.specweave', 'cache');
      const cacheFile = path.join(cacheDir, 'ado-projects.json');
      const cacheContent = await fs.readFile(cacheFile, 'utf-8');
      const cacheData = JSON.parse(cacheContent);
      cacheData.timestamp = Date.now() - 25 * 60 * 60 * 1000;
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));

      // Mock API to throw rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = { status: 429 };
      vi.mocked(mockAdoClient.searchProjects).mockRejectedValue(rateLimitError);

      // When: loadProjectMetadata is called
      const result = await loader.loadProjectMetadata();

      // Then: Use stale cache instead of throwing error
      expect(result).toEqual(staleProjects);
    });
  });

  describe('loadProjectDependencies()', () => {
    it('TC-013: should return cached dependencies on cache hit', async () => {
      // Given: Cached dependencies exist
      const cachedDeps: AdoProjectDependencies = {
        projectId: 'PLATFORM',
        projectName: 'PLATFORM',
        areaPaths: [
          { id: 1, name: 'Area 1', path: 'PLATFORM\\Area 1', hasChildren: false },
        ],
        teams: [{ id: 'team-1', name: 'Team Alpha' }],
        lastUpdated: new Date().toISOString(),
      };

      await cacheManager.set('ado-PLATFORM-deps', cachedDeps);

      // When: loadProjectDependencies is called
      const result = await loader.loadProjectDependencies('PLATFORM');

      // Then: Return cached data without API calls
      expect(result).toEqual(cachedDeps);
      expect(mockAdoClient.getAreaPaths).not.toHaveBeenCalled();
      expect(mockAdoClient.getTeams).not.toHaveBeenCalled();
    });

    it('should fetch from API on cache miss and cache per-project dependencies', async () => {
      // Given: No cache exists
      vi.mocked(mockAdoClient.getAreaPaths).mockResolvedValue({
        id: 1,
        name: 'PLATFORM',
        path: 'PLATFORM',
        hasChildren: true,
        children: [
          { id: 2, name: 'Frontend', path: 'PLATFORM\\Frontend', hasChildren: false },
          { id: 3, name: 'Backend', path: 'PLATFORM\\Backend', hasChildren: false },
        ],
      });

      vi.mocked(mockAdoClient.getTeams).mockResolvedValue([
        { id: 'team-1', name: 'Team Alpha', description: 'Alpha Team' },
      ]);

      // When: loadProjectDependencies is called
      const result = await loader.loadProjectDependencies('PLATFORM');

      // Then: Fetch all dependencies from API
      expect(mockAdoClient.getAreaPaths).toHaveBeenCalledWith('PLATFORM', 10);
      expect(mockAdoClient.getTeams).toHaveBeenCalledWith('PLATFORM');

      // And: Return combined dependencies
      expect(result.projectName).toBe('PLATFORM');
      expect(result.areaPaths.length).toBeGreaterThan(0);
      expect(result.teams).toHaveLength(1);

      // And: Cache result
      const cached = await cacheManager.get<AdoProjectDependencies>('ado-PLATFORM-deps');
      expect(cached).toBeTruthy();
      expect(cached?.projectName).toBe('PLATFORM');
    });

    it('should invalidate cache on 404 error (project not found)', async () => {
      // Given: No cache exists (force API call)
      const notFoundError = new Error('Project not found');
      (notFoundError as any).response = { status: 404 };
      vi.mocked(mockAdoClient.getAreaPaths).mockRejectedValue(notFoundError);
      vi.mocked(mockAdoClient.getTeams).mockRejectedValue(notFoundError);

      // When: loadProjectDependencies is called
      await expect(loader.loadProjectDependencies('DELETED')).rejects.toThrow(
        'Project DELETED not found'
      );

      // Then: Cache should NOT be created
      const cached = await cacheManager.get<AdoProjectDependencies>('ado-DELETED-deps');
      expect(cached).toBeNull();
    });
  });
});

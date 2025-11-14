/**
 * Unit Tests: ProjectManager Caching Mechanism
 *
 * Tests project caching behavior and performance.
 * Coverage Target: 95%
 */

import { ProjectManager } from '../../../src/core/project-manager';
import { ConfigManager } from '../../../src/core/config-manager';
import { benchmark } from '../../utils/benchmark';

// Mock ConfigManager
jest.mock('../../../src/core/config-manager');
jest.mock('fs-extra');

// Mock auto-detect function
jest.mock('../../../src/utils/project-detection', () => ({
  autoDetectProjectIdSync: jest.fn(() => 'default'),
  formatProjectName: jest.fn((id: string) => {
    return id.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  })
}));

describe('ProjectManager - Caching Mechanism', () => {
  let projectManager: ProjectManager;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  const testRoot = '/test/project/root';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create ProjectManager instance
    projectManager = new ProjectManager(testRoot);

    // Get mocked ConfigManager instance
    mockConfigManager = (projectManager as any).configManager as jest.Mocked<ConfigManager>;

    // Default mock: multi-project mode
    mockConfigManager.load.mockReturnValue({
      multiProject: {
        enabled: true,
        activeProject: 'web-app',
        projects: {
          'web-app': { id: 'web-app', name: 'Web App', description: '', techStack: [], team: '' },
          'mobile-app': { id: 'mobile-app', name: 'Mobile App', description: '', techStack: [], team: '' }
        }
      }
    } as any);
  });

  describe('getActiveProject() caching', () => {
    it('should load project from config on first call', () => {
      // First call should load from config
      const project = projectManager.getActiveProject();

      expect(mockConfigManager.load).toHaveBeenCalledTimes(1);
      expect(project.projectId).toBe('web-app');
    });

    it('should return cached project on subsequent calls', () => {
      // First call
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(1);

      // Second call should use cache
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(1); // Still 1!

      // Third call should also use cache
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('should cache the same project instance across calls', () => {
      const project1 = projectManager.getActiveProject();
      const project2 = projectManager.getActiveProject();
      const project3 = projectManager.getActiveProject();

      // All should return the same cached instance
      expect(project1).toBe(project2);
      expect(project2).toBe(project3);
      expect(project1.projectId).toBe('web-app');
    });
  });

  describe('clearCache()', () => {
    it('should force reload on next getActiveProject() call', () => {
      // Initial call - loads from config
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(1);

      // Clear cache
      projectManager.clearCache();

      // Next call should reload from config
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(2);
    });

    it('should allow cache to rebuild after clearing', () => {
      // Load initial project
      projectManager.getActiveProject();

      // Clear cache
      projectManager.clearCache();

      // Load again (rebuilds cache)
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(2);

      // Subsequent calls should use new cache
      projectManager.getActiveProject();
      expect(mockConfigManager.load).toHaveBeenCalledTimes(2); // Still 2!
    });
  });

  describe('Cache invalidation on project switch', () => {
    it('should clear cache when switching projects', async () => {
      // Load initial project
      const project1 = projectManager.getActiveProject();
      expect(project1.projectId).toBe('web-app');

      // Switch to different project (should clear cache)
      await projectManager.switchProject('mobile-app');

      // Next call should load new project
      const project2 = projectManager.getActiveProject();
      expect(project2.projectId).toBe('mobile-app');
      expect(project2).not.toBe(project1); // Different instance
    });
  });

  describe('Caching Performance', () => {
    it('should make cached reads very fast (<0.01ms)', async () => {
      // Prime the cache
      projectManager.getActiveProject();

      // Benchmark 1000 cached reads
      const result = await benchmark(() => {
        projectManager.getActiveProject();
      }, 1000);

      console.log(`Cached read benchmark: ${result.avg.toFixed(6)}ms avg (1000 reads)`);

      // Cached reads should be very fast (<0.01ms = 10 microseconds)
      expect(result.avg).toBeLessThan(0.01);
    });

    it('should show performance benefit from caching', async () => {
      // Benchmark cold reads (with cache clearing)
      const coldResult = await benchmark(() => {
        projectManager.clearCache();
        projectManager.getActiveProject();
      }, 100);

      // Benchmark cached reads (no cache clearing)
      projectManager.getActiveProject(); // Prime cache
      const cachedResult = await benchmark(() => {
        projectManager.getActiveProject();
      }, 100);

      console.log(`Cold read:   ${coldResult.avg.toFixed(3)}ms avg`);
      console.log(`Cached read: ${cachedResult.avg.toFixed(6)}ms avg`);
      console.log(`Speedup:     ${(coldResult.avg / cachedResult.avg).toFixed(1)}x`);

      // Cached should be faster (note: ConfigManager also caches, so speedup is modest)
      expect(cachedResult.avg).toBeLessThan(coldResult.avg);
    });
  });
});

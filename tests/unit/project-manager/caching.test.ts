import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: ProjectManager Caching Mechanism
 *
 * Tests project caching behavior and performance.
 * Coverage Target: 95%
 */

import { ProjectManager } from '../../../src/core/project/project-manager.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import { benchmark } from '../../utils/benchmark.js';

// Mock ConfigManager
vi.mock('../../../src/core/config-manager');
vi.mock('fs-extra');

// Mock auto-detect function
vi.mock('../../../src/utils/project-detection', () => ({
  autoDetectProjectIdSync: vi.fn(() => 'default'),
  formatProjectName: vi.fn((id: string) => {
    return id.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  })
}));

describe('ProjectManager - Caching Mechanism', () => {
  let projectManager: ProjectManager;
  let mockConfigManager: any;
  const testRoot = '/test/project/root';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create ProjectManager instance
    projectManager = new ProjectManager(testRoot);

    // Get mocked ConfigManager instance
    mockConfigManager = (projectManager as any).configManager;

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

  // NOTE: 'Cache invalidation on project switch' tests removed
  // The switchProject() functionality was deprecated and removed in increment 0125
  // Per-US project targeting replaces the activeProject concept
  // See: AC-US5-01 through AC-US5-05

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

    it('should avoid ConfigManager.load() calls when cached', async () => {
      // This test validates caching behavior by counting mock calls
      // rather than timing (which is flaky with mocked dependencies)

      // Cold read - should call load()
      projectManager.clearCache();
      projectManager.getActiveProject();
      const callsAfterColdRead = mockConfigManager.load.mock.calls.length;

      // 100 cached reads - should NOT call load() again
      for (let i = 0; i < 100; i++) {
        projectManager.getActiveProject();
      }
      const callsAfterCachedReads = mockConfigManager.load.mock.calls.length;

      console.log(`Cold read calls: ${callsAfterColdRead}`);
      console.log(`After 100 cached reads: ${callsAfterCachedReads}`);
      console.log(`Avoided ${100 - (callsAfterCachedReads - callsAfterColdRead)} load() calls`);

      // Cached reads should NOT increase the call count
      expect(callsAfterCachedReads).toBe(callsAfterColdRead);
    });
  });
});

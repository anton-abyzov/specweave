import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: ProjectManager Path Resolution
 *
 * Tests path resolution methods for project-specific paths.
 * Coverage Target: 95%
 */

import { ProjectManager } from '../../../src/core/project-manager.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import { benchmark } from '../../utils/benchmark.js';
import * as path from 'path';

// Mock ConfigManager
vi.mock('../../../src/core/config-manager');
vi.mock('fs-extra');

// Mock auto-detect function
vi.mock('../../../src/utils/project-detection', () => ({
  autoDetectProjectIdSync: jest.fn(() => 'default'),
  formatProjectName: jest.fn((id: string) => {
    return id.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  })
}));

describe('ProjectManager - Path Resolution', () => {
  let projectManager: ProjectManager;
  let mockConfigManager: anyed<ConfigManager>;
  const testRoot = '/test/project/root';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create ProjectManager instance
    projectManager = new ProjectManager(testRoot);

    // Get mocked ConfigManager instance
    mockConfigManager = (projectManager as any).configManager as anyed<ConfigManager>;

    // Default mock: single project mode
    mockConfigManager.load.mockReturnValue({
      multiProject: {
        enabled: false,
        activeProject: 'default',
        projects: []
      }
    } as any);
  });


  describe('getSpecsPath()', () => {
    it('should return correct specs path for active project', () => {
      const specsPath = projectManager.getSpecsPath();

      expect(specsPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/specs/default')
      );
    });

  });

  // NOTE: Following methods are deprecated as of v0.X.X (increment 0026)
  // Tests kept for backward compatibility only

  describe('getModulesPath() [DEPRECATED]', () => {
    it.skip('should return correct modules path for active project', () => {
      const modulesPath = projectManager.getModulesPath();

      expect(modulesPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/modules/default')
      );
    });
  });

  describe('getTeamPath() [DEPRECATED]', () => {
    it.skip('should return correct team path for active project', () => {
      const teamPath = projectManager.getTeamPath();

      expect(teamPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/team/default')
      );
    });
  });

  describe('getProjectArchitecturePath() [DEPRECATED]', () => {
    it.skip('should return correct project architecture path for active project', () => {
      const archPath = projectManager.getProjectArchitecturePath();

      expect(archPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/project-arch/default')
      );
    });
  });

  describe('getLegacyPath() [DEPRECATED]', () => {
    it.skip('should return base legacy path without source', () => {
      const legacyPath = projectManager.getLegacyPath();

      expect(legacyPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/legacy/default')
      );
    });

    it.skip('should return legacy path with source type', () => {
      const legacyPath = projectManager.getLegacyPath('notion');

      expect(legacyPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/legacy/default/notion')
      );
    });

    it.skip('should support different source types', () => {
      const notionPath = projectManager.getLegacyPath('notion');
      const confluencePath = projectManager.getLegacyPath('confluence');
      const wikiPath = projectManager.getLegacyPath('wiki');

      expect(notionPath).toContain('/legacy/default/notion');
      expect(confluencePath).toContain('/legacy/default/confluence');
      expect(wikiPath).toContain('/legacy/default/wiki');
    });
  });

  describe('Path Resolution Performance', () => {
    it('should resolve paths in less than 1ms per call (avg)', async () => {
      const result = await benchmark(() => {
        // Test only non-deprecated method (getSpecsPath)
        projectManager.getSpecsPath();
      }, 1000);

      console.log(`Path resolution benchmark: ${result.avg.toFixed(3)}ms avg`);

      // Single call should complete in <0.1ms on average
      expect(result.avg).toBeLessThan(0.1);
    });

    it('should handle 1000 consecutive calls efficiently', async () => {
      const result = await benchmark(() => {
        for (let i = 0; i < 1000; i++) {
          projectManager.getSpecsPath();
        }
      }, 10);

      console.log(`1000 calls benchmark: ${result.avg.toFixed(3)}ms avg`);

      // 1000 calls should complete in <10ms
      expect(result.avg).toBeLessThan(10);
    });
  });
});

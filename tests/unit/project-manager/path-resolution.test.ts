/**
 * Unit Tests: ProjectManager Path Resolution
 *
 * Tests path resolution methods for project-specific paths.
 * Coverage Target: 95%
 */

import { ProjectManager } from '../../../src/core/project-manager';
import { ConfigManager } from '../../../src/core/config-manager';
import { benchmark } from '../../utils/benchmark';
import * as path from 'path';

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

describe('ProjectManager - Path Resolution', () => {
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

  describe('getModulesPath()', () => {
    it('should return correct modules path for active project', () => {
      const modulesPath = projectManager.getModulesPath();

      expect(modulesPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/modules/default')
      );
    });
  });

  describe('getTeamPath()', () => {
    it('should return correct team path for active project', () => {
      const teamPath = projectManager.getTeamPath();

      expect(teamPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/team/default')
      );
    });
  });

  describe('getProjectArchitecturePath()', () => {
    it('should return correct project architecture path for active project', () => {
      const archPath = projectManager.getProjectArchitecturePath();

      expect(archPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/project-arch/default')
      );
    });
  });

  describe('getLegacyPath()', () => {
    it('should return base legacy path without source', () => {
      const legacyPath = projectManager.getLegacyPath();

      expect(legacyPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/legacy/default')
      );
    });

    it('should return legacy path with source type', () => {
      const legacyPath = projectManager.getLegacyPath('notion');

      expect(legacyPath).toBe(
        path.join(testRoot, '.specweave/docs/internal/legacy/default/notion')
      );
    });

    it('should support different source types', () => {
      const notionPath = projectManager.getLegacyPath('notion');
      const confluencePath = projectManager.getLegacyPath('confluence');
      const wikiPath = projectManager.getLegacyPath('wiki');

      expect(notionPath).toContain('/legacy/notion');
      expect(confluencePath).toContain('/legacy/confluence');
      expect(wikiPath).toContain('/legacy/wiki');
    });
  });

  describe('Path Resolution Performance', () => {
    it('should resolve paths in less than 1ms per call (avg)', async () => {
      const result = await benchmark(() => {
        projectManager.getSpecsPath();
        projectManager.getModulesPath();
        projectManager.getTeamPath();
        projectManager.getProjectArchitecturePath();
        projectManager.getLegacyPath();
      }, 1000);

      console.log(`Path resolution benchmark: ${result.avg.toFixed(3)}ms avg`);

      // All 5 calls should complete in <1ms on average
      expect(result.avg).toBeLessThan(1);
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

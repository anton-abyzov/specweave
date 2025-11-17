import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: ProjectManager Project Switching
 *
 * Tests project switching functionality and validation.
 * Coverage Target: 95%
 */

import { ProjectManager } from '../../../src/core/project-manager.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import { benchmark } from '../../utils/benchmark.js';

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

describe('ProjectManager - Project Switching', () => {
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

    // Default mock: multi-project mode with multiple projects
    mockConfigManager.load.mockReturnValue({
      multiProject: {
        enabled: true,
        activeProject: 'web-app',
        projects: {
          'web-app': { id: 'web-app', name: 'Web App', description: '', techStack: [], team: '' },
          'mobile-app': { id: 'mobile-app', name: 'Mobile App', description: '', techStack: [], team: '' },
          'backend-api': { id: 'backend-api', name: 'Backend API', description: '', techStack: [], team: '' }
        }
      }
    } as any);
  });

  describe('switchProject()', () => {
    it('should switch to an existing project successfully', async () => {
      // Initial active project is 'web-app'
      expect(projectManager.getActiveProject().projectId).toBe('web-app');

      // Switch to 'mobile-app'
      await projectManager.switchProject('mobile-app');

      // Verify the switch
      expect(projectManager.getActiveProject().projectId).toBe('mobile-app');
    });

    it('should throw error when switching to non-existent project', async () => {
      await expect(async () => {
        await projectManager.switchProject('non-existent-project');
      }).rejects.toThrow("Project 'non-existent-project' not found");
    });

    it('should save config when switching projects', async () => {
      // Mock save method
      mockConfigManager.save = vi.fn().mockResolvedValue(undefined);

      // Switch to 'backend-api'
      await projectManager.switchProject('backend-api');

      // Verify config.save was called with correct active project
      expect(mockConfigManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          multiProject: expect.objectContaining({
            activeProject: 'backend-api'
          })
        })
      );
    });

    it('should invalidate cache when switching projects', async () => {
      // Get active project to populate cache
      const project1 = projectManager.getActiveProject();
      expect(project1.projectId).toBe('web-app');

      // Switch to different project
      await projectManager.switchProject('mobile-app');

      // Clear cache should have been called internally
      // Verify by checking that getActiveProject returns new project
      const project2 = projectManager.getActiveProject();
      expect(project2.projectId).toBe('mobile-app');
      expect(project2.projectId).not.toBe(project1.projectId);
    });

    it('should handle switching to same project (no-op)', async () => {
      // Mock save method
      mockConfigManager.save = vi.fn().mockResolvedValue(undefined);

      // Switch to already active project
      await projectManager.switchProject('web-app');

      // Should still work without errors
      expect(projectManager.getActiveProject().projectId).toBe('web-app');

      // Config save should still be called (idempotent)
      expect(mockConfigManager.save).toHaveBeenCalled();
    });

    it('should throw error in single-project mode', async () => {
      // Mock single-project mode
      mockConfigManager.load.mockReturnValue({
        multiProject: {
          enabled: false,
          activeProject: 'default',
          projects: {
            'default': { id: 'default', name: 'Default', description: '', techStack: [], team: '' }
          }
        }
      } as any);

      // Create new instance with single-project config
      const singleProjectManager = new ProjectManager(testRoot);

      await expect(async () => {
        await singleProjectManager.switchProject('another-project');
      }).rejects.toThrow();
    });
  });

  describe('Project Switching Performance', () => {
    it('should switch projects in less than 10ms', async () => {
      const result = await benchmark(async () => {
        await projectManager.switchProject('mobile-app');
        await projectManager.switchProject('backend-api');
        await projectManager.switchProject('web-app');
      }, 100);

      console.log(`Project switching benchmark: ${result.avg.toFixed(3)}ms avg for 3 switches`);

      // 3 switches should complete in <10ms on average
      expect(result.avg).toBeLessThan(10);
    });
  });
});

/**
 * Unit Tests: ProjectManager Validation Logic
 *
 * Tests input validation and safety checks for project operations.
 * Coverage Target: 95%
 */

import { ProjectManager, ProjectContext } from '../../../src/core/project-manager';
import { ConfigManager } from '../../../src/core/config-manager';

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

describe('ProjectManager - Validation Logic', () => {
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

    // Mock save method
    mockConfigManager.save = jest.fn().mockResolvedValue(undefined);
  });

  describe('addProject() validation', () => {
    it('should successfully add a valid new project', async () => {
      const newProject: ProjectContext = {
        projectId: 'backend-api',
        projectName: 'Backend API',
        projectPath: '/test/project/root/.specweave/docs/internal/specs/backend-api',
        keywords: [],
        techStack: ['Node.js', 'Express']
      };

      await projectManager.addProject(newProject);

      // Verify save was called with updated projects list
      expect(mockConfigManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          multiProject: expect.objectContaining({
            projects: expect.objectContaining({
              'backend-api': expect.objectContaining({ id: 'backend-api' })
            })
          })
        })
      );
    });

    it('should reject duplicate project IDs', async () => {
      const duplicateProject: ProjectContext = {
        projectId: 'web-app', // Already exists!
        projectName: 'Another Web App',
        projectPath: '/test/project/root/.specweave/docs/internal/specs/web-app',
        keywords: [],
        techStack: []
      };

      await expect(async () => {
        await projectManager.addProject(duplicateProject);
      }).rejects.toThrow("Project with ID 'web-app' already exists");
    });

    it('should initialize multiProject structure if not present', async () => {
      // Track config state across calls
      let savedConfig: any = null;

      // Mock load to return either empty config or saved config
      mockConfigManager.load.mockImplementation(() => {
        if (savedConfig) {
          return savedConfig;
        }
        // First call: no multiProject
        return {} as any;
      });

      // Mock save to capture the saved config and enable multi-project
      mockConfigManager.save = jest.fn().mockImplementation(async (config: any) => {
        // Enable multi-project mode when saving (simulating user initialization)
        if (config.multiProject) {
          config.multiProject.enabled = true;
        }
        savedConfig = config;
      });

      const newProject: ProjectContext = {
        projectId: 'first-project',
        projectName: 'First Project',
        projectPath: '/test/project/root/.specweave/docs/internal/specs/first-project',
        keywords: [],
        techStack: []
      };

      await projectManager.addProject(newProject);

      // Verify multiProject was initialized and project was added
      expect(mockConfigManager.save).toHaveBeenCalled();
      const savedCall = mockConfigManager.save.mock.calls[0][0];
      expect(savedCall.multiProject).toBeDefined();
      expect(savedCall.multiProject.activeProject).toBe('default');
      expect(savedCall.multiProject.projects).toEqual(
        expect.objectContaining({
          'first-project': expect.objectContaining({ id: 'first-project' })
        })
      );
    });
  });

  describe('removeProject() validation', () => {
    it('should successfully remove a valid project', async () => {
      await projectManager.removeProject('mobile-app');

      // Verify save was called without the removed project
      expect(mockConfigManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          multiProject: expect.objectContaining({
            projects: expect.not.objectContaining({
              'mobile-app': expect.anything()
            })
          })
        })
      );
    });

    it('should reject removing non-existent project', async () => {
      await expect(async () => {
        await projectManager.removeProject('non-existent');
      }).rejects.toThrow("Project 'non-existent' not found");
    });

    it('should reject removing default project', async () => {
      await expect(async () => {
        await projectManager.removeProject('default');
      }).rejects.toThrow('Cannot remove default project');
    });

    it('should reject removing active project', async () => {
      // Current active project is 'web-app'
      await expect(async () => {
        await projectManager.removeProject('web-app');
      }).rejects.toThrow('Cannot remove active project');
    });

    it('should reject removal in single-project mode', async () => {
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

      await expect(async () => {
        await projectManager.removeProject('any-project');
      }).rejects.toThrow('Multi-project mode not enabled');
    });
  });

  describe('switchProject() validation', () => {
    it('should reject switching to non-existent project', async () => {
      await expect(async () => {
        await projectManager.switchProject('non-existent-project');
      }).rejects.toThrow("Project 'non-existent-project' not found");
    });

    it('should provide list of available projects in error', async () => {
      try {
        await projectManager.switchProject('invalid');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('web-app');
        expect(error.message).toContain('mobile-app');
        expect(error.message).toContain('Available projects');
      }
    });

    it('should reject switching when multi-project mode disabled', async () => {
      // Clear cache to force reload with new config
      projectManager.clearCache();

      // Mock single-project mode
      mockConfigManager.load.mockReturnValue({
        multiProject: {
          enabled: false,
          activeProject: 'default',
          projects: []
        }
      } as any);

      await expect(async () => {
        await projectManager.switchProject('any-project');
      }).rejects.toThrow('Multi-project mode not enabled');
    });
  });
});

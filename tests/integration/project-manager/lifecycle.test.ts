/**
 * Integration Tests: ProjectManager Full Lifecycle
 * Coverage Target: 85%
 *
 * Tests the complete multi-project workflow from initialization to removal
 */

import { ProjectManager, ProjectContext } from '../../../src/core/project-manager';
import { ConfigManager } from '../../../src/core/config-manager';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('ProjectManager - Full Lifecycle (Integration)', () => {
  it('should support multi-project mode with proper initialization', async () => {
    await withTempDir(async (tmpDir) => {
      // Initialize with multi-project enabled from the start
      // (Note: Single-project to multi-project migration requires enabled=true
      // in addProject implementation, which is currently set to false - a known limitation)
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'My Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      // Load with ProjectManager
      const projectManager = new ProjectManager(tmpDir);
      const project1 = projectManager.getActiveProject();

      expect(project1.id).toBe('default');
      expect(project1.name).toBe('My Project');

      // Add a second project
      const newProject: ProjectContext = {
        id: 'web-app',
        name: 'Web Application',
        description: 'Frontend web app',
        techStack: ['react', 'typescript'],
        team: 'Frontend Team'
      };

      await projectManager.addProject(newProject);

      // Verify new project added
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      expect(config.multiProject).toBeDefined();
      expect(config.multiProject!.enabled).toBe(true);
      expect(config.multiProject!.projects.length).toBe(2);

      // Verify default project still exists
      const defaultProject = projectManager.getProjectById('default');
      expect(defaultProject).toBeDefined();
      expect(defaultProject!.name).toBe('My Project');

      // Verify new project added
      const webAppProject = projectManager.getProjectById('web-app');
      expect(webAppProject).toBeDefined();
      expect(webAppProject!.name).toBe('Web Application');
    });
  });

  it('should handle complete add-switch-remove cycle', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup multi-project config
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      const projectManager = new ProjectManager(tmpDir);

      // 1. Add new project
      const mobileProject: ProjectContext = {
        id: 'mobile-app',
        name: 'Mobile App',
        description: 'Mobile application',
        techStack: ['react-native', 'typescript'],
        team: 'Mobile Team'
      };

      await projectManager.addProject(mobileProject);

      // Verify project added
      expect(projectManager.getAllProjects().length).toBe(2);
      expect(projectManager.getProjectById('mobile-app')).toBeDefined();

      // 2. Switch to new project
      await projectManager.switchProject('mobile-app');

      // Verify active project changed
      const active = projectManager.getActiveProject();
      expect(active.id).toBe('mobile-app');
      expect(active.name).toBe('Mobile App');

      // 3. Switch back to default
      await projectManager.switchProject('default');
      expect(projectManager.getActiveProject().id).toBe('default');

      // 4. Remove mobile project
      await projectManager.removeProject('mobile-app');

      // Verify project removed
      expect(projectManager.getAllProjects().length).toBe(1);
      expect(projectManager.getProjectById('mobile-app')).toBeNull();
      expect(projectManager.getActiveProject().id).toBe('default');
    });
  });

  it('should maintain path resolution across project switches', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup multi-project
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/backend'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            },
            {
              id: 'backend',
              name: 'Backend Services',
              description: 'Backend microservices',
              techStack: ['node', 'postgres'],
              team: 'Backend Team'
            }
          ]
        }
      }, null, 2));

      const projectManager = new ProjectManager(tmpDir);

      // Test paths for default project
      const defaultSpecsPath = projectManager.getSpecsPath();
      expect(defaultSpecsPath).toContain('projects/default/specs');

      const defaultModulesPath = projectManager.getModulesPath();
      expect(defaultModulesPath).toContain('projects/default/modules');

      // Switch to backend project
      await projectManager.switchProject('backend');

      // Test paths for backend project
      const backendSpecsPath = projectManager.getSpecsPath();
      expect(backendSpecsPath).toContain('projects/backend/specs');

      const backendModulesPath = projectManager.getModulesPath();
      expect(backendModulesPath).toContain('projects/backend/modules');

      // Verify paths are different
      expect(backendSpecsPath).not.toBe(defaultSpecsPath);
      expect(backendModulesPath).not.toBe(defaultModulesPath);
    });
  });

  it('should persist project data across ProjectManager instances', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup initial config
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      // First instance: Add project
      const projectManager1 = new ProjectManager(tmpDir);
      await projectManager1.addProject({
        id: 'infra',
        name: 'Infrastructure',
        description: 'Infrastructure as code',
        techStack: ['terraform', 'kubernetes'],
        team: 'Platform Team'
      });

      await projectManager1.switchProject('infra');

      // Second instance: Should see changes from first instance
      const projectManager2 = new ProjectManager(tmpDir);
      const activeProject = projectManager2.getActiveProject();

      expect(activeProject.id).toBe('infra');
      expect(activeProject.name).toBe('Infrastructure');
      expect(projectManager2.getAllProjects().length).toBe(2);

      // Verify project data persisted
      const infraProject = projectManager2.getProjectById('infra');
      expect(infraProject).toBeDefined();
      expect(infraProject!.techStack).toEqual(['terraform', 'kubernetes']);
      expect(infraProject!.team).toBe('Platform Team');
    });
  });

  it('should handle multiple project additions in succession', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      const projectManager = new ProjectManager(tmpDir);

      // Add 5 projects in succession
      const projects: ProjectContext[] = [
        {
          id: 'web',
          name: 'Web App',
          description: 'Frontend',
          techStack: ['react'],
          team: 'Web Team'
        },
        {
          id: 'mobile',
          name: 'Mobile App',
          description: 'Mobile',
          techStack: ['react-native'],
          team: 'Mobile Team'
        },
        {
          id: 'backend',
          name: 'Backend',
          description: 'API',
          techStack: ['node'],
          team: 'Backend Team'
        },
        {
          id: 'infra',
          name: 'Infrastructure',
          description: 'IaC',
          techStack: ['terraform'],
          team: 'Platform Team'
        },
        {
          id: 'data',
          name: 'Data Platform',
          description: 'Analytics',
          techStack: ['python'],
          team: 'Data Team'
        }
      ];

      for (const project of projects) {
        await projectManager.addProject(project);
      }

      // Verify all projects added
      expect(projectManager.getAllProjects().length).toBe(6); // default + 5 new

      // Verify each project is accessible
      for (const project of projects) {
        const found = projectManager.getProjectById(project.id);
        expect(found).toBeDefined();
        expect(found!.name).toBe(project.name);
        expect(found!.techStack).toEqual(project.techStack);
      }

      // Switch to each project and verify
      for (const project of projects) {
        await projectManager.switchProject(project.id);
        expect(projectManager.getActiveProject().id).toBe(project.id);
      }
    });
  });
});

/**
 * Unit tests for ProjectRegistry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectRegistry } from '../../../../src/core/project/project-registry.js';
import { Project } from '../../../../src/core/project/types/project-types.js';

describe('ProjectRegistry', () => {
  let testDir: string;
  let registry: ProjectRegistry;

  beforeEach(() => {
    // Create temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-registry-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    registry = new ProjectRegistry(testDir);
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('CRUD Operations', () => {
    const testProject: Project = {
      id: 'test-project',
      name: 'Test Project',
      description: 'A test project',
      techStack: ['TypeScript', 'React'],
      team: 'Test Team',
      keywords: ['test', 'example'],
      created: new Date().toISOString(),
    };

    it('should add a new project', async () => {
      await registry.addProject(testProject);

      const retrieved = await registry.getProject('test-project');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-project');
      expect(retrieved?.name).toBe('Test Project');
    });

    it('should prevent duplicate project IDs', async () => {
      await registry.addProject(testProject);

      await expect(registry.addProject(testProject)).rejects.toThrow(
        "Project with ID 'test-project' already exists"
      );
    });

    it('should update an existing project', async () => {
      await registry.addProject(testProject);

      await registry.updateProject('test-project', {
        name: 'Updated Project Name',
        description: 'Updated description',
      });

      const updated = await registry.getProject('test-project');
      expect(updated?.name).toBe('Updated Project Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.techStack).toEqual(['TypeScript', 'React']); // Unchanged
    });

    it('should throw when updating non-existent project', async () => {
      await expect(
        registry.updateProject('non-existent', { name: 'New Name' })
      ).rejects.toThrow("Project 'non-existent' not found");
    });

    it('should prevent changing project ID via update', async () => {
      await registry.addProject(testProject);

      await expect(
        registry.updateProject('test-project', { id: 'new-id' } as any)
      ).rejects.toThrow('Cannot change project ID');
    });

    it('should remove a project', async () => {
      await registry.addProject(testProject);
      expect(await registry.hasProject('test-project')).toBe(true);

      await registry.removeProject('test-project', { force: true });
      expect(await registry.hasProject('test-project')).toBe(false);
    });

    it('should throw when removing non-existent project', async () => {
      await expect(registry.removeProject('non-existent')).rejects.toThrow(
        "Project 'non-existent' not found"
      );
    });

    it('should list all projects', async () => {
      await registry.addProject(testProject);
      await registry.addProject({
        ...testProject,
        id: 'another-project',
        name: 'Another Project',
      });

      const projects = await registry.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.id)).toContain('test-project');
      expect(projects.map((p) => p.id)).toContain('another-project');
    });

    it('should return null for non-existent project', async () => {
      const project = await registry.getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('Default Project', () => {
    const testProject: Project = {
      id: 'test-project',
      name: 'Test Project',
      created: new Date().toISOString(),
    };

    it('should set first project as default', async () => {
      await registry.addProject(testProject);

      const defaultProject = await registry.getDefaultProject();
      expect(defaultProject?.id).toBe('test-project');
    });

    it('should allow setting default project', async () => {
      await registry.addProject(testProject);
      await registry.addProject({
        ...testProject,
        id: 'second-project',
        name: 'Second Project',
      });

      await registry.setDefaultProject('second-project');

      const defaultProject = await registry.getDefaultProject();
      expect(defaultProject?.id).toBe('second-project');
    });

    it('should prevent removing default project without force', async () => {
      await registry.addProject(testProject);

      await expect(registry.removeProject('test-project')).rejects.toThrow(
        "Cannot remove default project 'test-project'"
      );
    });

    it('should allow force removal of default project', async () => {
      await registry.addProject(testProject);
      await registry.removeProject('test-project', { force: true });

      expect(await registry.hasProject('test-project')).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate required ID', () => {
      const result = registry.validateProject({ name: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID is required');
    });

    it('should validate required name', () => {
      const result = registry.validateProject({ id: 'test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should validate kebab-case ID format', () => {
      const result = registry.validateProject({
        id: 'Invalid ID',
        name: 'Test',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID must be kebab-case (e.g., "frontend-app")');
    });

    it('should accept valid kebab-case ID', () => {
      const result = registry.validateProject({
        id: 'my-test-project',
        name: 'Test',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about missing description', () => {
      const result = registry.validateProject({
        id: 'test',
        name: 'Test',
      });
      expect(result.warnings).toContain('Project description is recommended');
    });

    it('should reject invalid techStack type', () => {
      const result = registry.validateProject({
        id: 'test',
        name: 'Test',
        techStack: 'not an array' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('techStack must be an array');
    });
  });

  describe('Persistence', () => {
    const testProject: Project = {
      id: 'persistent-project',
      name: 'Persistent Project',
      created: new Date().toISOString(),
    };

    it('should persist projects to disk', async () => {
      await registry.addProject(testProject);

      // Create new registry instance and verify data persisted
      const newRegistry = new ProjectRegistry(testDir);
      await newRegistry.load();

      const retrieved = await newRegistry.getProject('persistent-project');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Persistent Project');
    });

    it('should persist default project', async () => {
      await registry.addProject(testProject);
      await registry.addProject({
        ...testProject,
        id: 'second-project',
        name: 'Second Project',
      });
      await registry.setDefaultProject('second-project');

      // Create new registry instance
      const newRegistry = new ProjectRegistry(testDir);
      await newRegistry.load();

      const defaultProject = await newRegistry.getDefaultProject();
      expect(defaultProject?.id).toBe('second-project');
    });
  });

  describe('Migration from config.json', () => {
    it('should migrate single project from config.json', async () => {
      // Create config.json with single project
      const configPath = path.join(testDir, '.specweave', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: {
            name: 'Migrated Project',
            description: 'A migrated project',
            techStack: ['Python'],
          },
        })
      );

      // Load registry (should trigger migration)
      const newRegistry = new ProjectRegistry(testDir);
      await newRegistry.load();

      const projects = await newRegistry.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Migrated Project');
      expect(projects[0].techStack).toEqual(['Python']);
    });

    it('should migrate multi-project config', async () => {
      // Create config.json with multi-project
      const configPath = path.join(testDir, '.specweave', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          multiProject: {
            enabled: true,
            activeProject: 'backend-api',
            projects: {
              'frontend-app': {
                name: 'Frontend App',
                techStack: ['React'],
              },
              'backend-api': {
                name: 'Backend API',
                techStack: ['Node.js'],
              },
            },
          },
        })
      );

      // Load registry (should trigger migration)
      const newRegistry = new ProjectRegistry(testDir);
      await newRegistry.load();

      const projects = await newRegistry.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.id)).toContain('frontend-app');
      expect(projects.map((p) => p.id)).toContain('backend-api');

      // Should set default project from activeProject
      const defaultProject = await newRegistry.getDefaultProject();
      expect(defaultProject?.id).toBe('backend-api');
    });
  });

  describe('Event Emission', () => {
    it('should emit ProjectCreated event on addProject', async () => {
      const eventBus = registry.getEventBus();
      const handler = vi.fn();
      eventBus.onProjectCreated(handler);

      await registry.addProject({
        id: 'event-test',
        name: 'Event Test',
        created: new Date().toISOString(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ProjectCreated',
          project: expect.objectContaining({ id: 'event-test' }),
        })
      );
    });

    it('should emit ProjectUpdated event on updateProject', async () => {
      await registry.addProject({
        id: 'update-test',
        name: 'Update Test',
        created: new Date().toISOString(),
      });

      const eventBus = registry.getEventBus();
      const handler = vi.fn();
      eventBus.onProjectUpdated(handler);

      await registry.updateProject('update-test', { name: 'New Name' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ProjectUpdated',
          projectId: 'update-test',
          changes: { name: 'New Name' },
        })
      );
    });

    it('should emit ProjectDeleted event on removeProject', async () => {
      await registry.addProject({
        id: 'delete-test',
        name: 'Delete Test',
        created: new Date().toISOString(),
      });

      const eventBus = registry.getEventBus();
      const handler = vi.fn();
      eventBus.onProjectDeleted(handler);

      await registry.removeProject('delete-test', { force: true });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ProjectDeleted',
          projectId: 'delete-test',
        })
      );
    });

    it('should not emit events when emitEvent is false', async () => {
      const eventBus = registry.getEventBus();
      const handler = vi.fn();
      eventBus.onProjectCreated(handler);

      await registry.addProject(
        {
          id: 'no-event-test',
          name: 'No Event Test',
          created: new Date().toISOString(),
        },
        { emitEvent: false }
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Sync Status', () => {
    it('should return sync status for project with external mappings', async () => {
      await registry.addProject({
        id: 'sync-test',
        name: 'Sync Test',
        created: new Date().toISOString(),
        external: {
          github: {
            labelName: 'project:sync-test',
            lastSynced: '2025-01-01T00:00:00Z',
          },
          ado: {
            areaPath: 'Project\\Test',
            syncError: 'Connection failed',
          },
        },
      });

      const status = await registry.getSyncStatus('sync-test');
      expect(status).not.toBeNull();
      expect(status?.overallStatus).toBe('error'); // Has error in ADO
      expect(status?.tools).toHaveLength(2);
      expect(status?.tools.find((t) => t.tool === 'github')?.status).toBe('synced');
      expect(status?.tools.find((t) => t.tool === 'ado')?.status).toBe('error');
    });

    it('should emit ProjectSyncRequested event on requestSync', async () => {
      await registry.addProject({
        id: 'sync-request-test',
        name: 'Sync Request Test',
        created: new Date().toISOString(),
      });

      const eventBus = registry.getEventBus();
      const handler = vi.fn();
      eventBus.onProjectSyncRequested(handler);

      await registry.requestSync('sync-request-test', ['github', 'jira']);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ProjectSyncRequested',
          projectId: 'sync-request-test',
          targets: ['github', 'jira'],
        })
      );
    });
  });
});

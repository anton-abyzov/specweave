/**
 * Integration Tests for Project Registry
 *
 * Tests full sync flow, migration, multi-project scenarios,
 * and error handling across components.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectRegistry } from '../../src/core/project/project-registry.js';
import { ProjectEventBus } from '../../src/core/project/project-event-bus.js';
import { GitHubProjectAdapter } from '../../src/core/project/adapters/github-project-adapter.js';
import { ProjectResolutionService } from '../../src/core/project/project-resolution.js';

describe('Project Registry Integration Tests', () => {
  let testDir: string;
  let mockLogger: any;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-integration-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'increments'), { recursive: true });

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Full Sync Flow', () => {
    it('should emit events when CRUD operations occur', async () => {
      const eventBus = new ProjectEventBus({ logger: mockLogger });
      const registry = new ProjectRegistry(testDir, { logger: mockLogger, eventBus });

      const events: any[] = [];
      eventBus.onProjectCreated((event) => events.push(event));
      eventBus.onProjectUpdated((event) => events.push(event));
      eventBus.onProjectDeleted((event) => events.push(event));

      // Create
      await registry.addProject({
        id: 'test-project',
        name: 'Test Project',
        created: new Date().toISOString(),
      });

      // Update
      await registry.updateProject('test-project', { name: 'Updated Project' });

      // Delete
      await registry.removeProject('test-project', { force: true });

      // Verify all events were emitted
      expect(events.length).toBe(3);
      expect(events[0].type).toBe('ProjectCreated');
      expect(events[1].type).toBe('ProjectUpdated');
      expect(events[2].type).toBe('ProjectDeleted');
    });

    it('should handle adapter subscription and event processing', async () => {
      const eventBus = new ProjectEventBus({ logger: mockLogger });
      const registry = new ProjectRegistry(testDir, { logger: mockLogger, eventBus });

      // Track sync requests
      let syncRequestReceived = false;
      eventBus.onProjectSyncRequested((event) => {
        syncRequestReceived = true;
        expect(event.projectId).toBe('sync-test');
        expect(event.targets).toContain('github');
      });

      // Add project
      await registry.addProject({
        id: 'sync-test',
        name: 'Sync Test',
        created: new Date().toISOString(),
      });

      // Request sync
      await registry.requestSync('sync-test', ['github']);

      expect(syncRequestReceived).toBe(true);
    });
  });

  describe('Migration from config.json', () => {
    it('should migrate single-project config to registry', async () => {
      // Create legacy config.json
      const configPath = path.join(testDir, '.specweave', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: {
            name: 'Legacy Project',
            description: 'A legacy project',
            techStack: ['TypeScript', 'Node.js'],
          },
        })
      );

      // Create registry (should trigger migration)
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });
      await registry.load();

      // Verify migration
      const projects = await registry.listProjects();
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Legacy Project');
      expect(projects[0].techStack).toContain('TypeScript');
    });

    it('should migrate multi-project config to registry', async () => {
      // Create legacy multi-project config
      const configPath = path.join(testDir, '.specweave', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          multiProject: {
            enabled: true,
            activeProject: 'frontend',
            projects: {
              frontend: { name: 'Frontend App', techStack: ['React'] },
              backend: { name: 'Backend API', techStack: ['Node.js'] },
            },
          },
        })
      );

      // Create registry (should trigger migration)
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });
      await registry.load();

      // Verify migration
      const projects = await registry.listProjects();
      expect(projects.length).toBe(2);

      const defaultProject = await registry.getDefaultProject();
      expect(defaultProject?.id).toBe('frontend');
    });
  });

  describe('Multi-project Scenarios', () => {
    it('should manage multiple projects with different external mappings', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      // Add multiple projects with different external tools
      await registry.addProject({
        id: 'github-project',
        name: 'GitHub Project',
        created: new Date().toISOString(),
        external: {
          github: { labelName: 'project:github-project' },
        },
      });

      await registry.addProject({
        id: 'jira-project',
        name: 'JIRA Project',
        created: new Date().toISOString(),
        external: {
          jira: { projectKey: 'JP' },
        },
      });

      await registry.addProject({
        id: 'ado-project',
        name: 'ADO Project',
        created: new Date().toISOString(),
        external: {
          ado: { areaPath: 'MyOrg\\ADOProject' },
        },
      });

      // Verify each project has correct mapping
      const ghProject = await registry.getProject('github-project');
      expect(ghProject?.external?.github?.labelName).toBe('project:github-project');

      const jiraProject = await registry.getProject('jira-project');
      expect(jiraProject?.external?.jira?.projectKey).toBe('JP');

      const adoProject = await registry.getProject('ado-project');
      expect(adoProject?.external?.ado?.areaPath).toBe('MyOrg\\ADOProject');
    });

    it('should handle sync status for multiple tools', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      await registry.addProject({
        id: 'multi-tool',
        name: 'Multi Tool Project',
        created: new Date().toISOString(),
        external: {
          github: { labelName: 'project:multi-tool', lastSynced: new Date().toISOString() },
          jira: { projectKey: 'MT', syncError: 'JIRA API error' },
          ado: { areaPath: 'Org\\MultiTool' },
        },
      });

      const status = await registry.getSyncStatus('multi-tool');
      expect(status).not.toBeNull();
      expect(status?.tools.length).toBe(3);
      expect(status?.overallStatus).toBe('error'); // Because JIRA has error

      // Find specific tool statuses
      const githubStatus = status?.tools.find((t) => t.tool === 'github');
      expect(githubStatus?.status).toBe('synced');

      const jiraStatus = status?.tools.find((t) => t.tool === 'jira');
      expect(jiraStatus?.status).toBe('error');
      expect(jiraStatus?.error).toBe('JIRA API error');

      const adoStatus = status?.tools.find((t) => t.tool === 'ado');
      expect(adoStatus?.status).toBe('never');
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors without breaking event bus', async () => {
      const eventBus = new ProjectEventBus({ logger: mockLogger });
      const registry = new ProjectRegistry(testDir, { logger: mockLogger, eventBus });

      let handlerCallCount = 0;

      // First handler throws error
      eventBus.onProjectCreated(() => {
        handlerCallCount++;
        throw new Error('Handler error');
      });

      // Second handler should still run
      eventBus.onProjectCreated(() => {
        handlerCallCount++;
      });

      await registry.addProject({
        id: 'error-test',
        name: 'Error Test',
        created: new Date().toISOString(),
      });

      // Both handlers should have been called despite the error
      expect(handlerCallCount).toBe(2);
    });

    it('should validate project ID format', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      // Invalid ID (uppercase)
      await expect(
        registry.addProject({
          id: 'InvalidProject',
          name: 'Invalid',
          created: new Date().toISOString(),
        })
      ).rejects.toThrow('kebab-case');

      // Invalid ID (spaces)
      await expect(
        registry.addProject({
          id: 'invalid project',
          name: 'Invalid',
          created: new Date().toISOString(),
        })
      ).rejects.toThrow('kebab-case');
    });

    it('should prevent duplicate project IDs', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      await registry.addProject({
        id: 'unique-project',
        name: 'Unique',
        created: new Date().toISOString(),
      });

      await expect(
        registry.addProject({
          id: 'unique-project',
          name: 'Duplicate',
          created: new Date().toISOString(),
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('ProjectResolutionService Integration', () => {
    it('should validate projects against registry', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      // Add a project
      await registry.addProject({
        id: 'registered-project',
        name: 'Registered Project',
        techStack: ['TypeScript'],
        team: 'Platform Team',
        created: new Date().toISOString(),
      });

      // Create resolution service with registry
      const resolution = new ProjectResolutionService(testDir, {
        logger: mockLogger,
        registry,
      });

      // Validate registered project
      const validResult = await resolution.validateAgainstRegistry('registered-project');
      expect(validResult.valid).toBe(true);
      expect(validResult.inRegistry).toBe(true);
      expect(validResult.techStack).toContain('TypeScript');
      expect(validResult.team).toBe('Platform Team');

      // Validate unregistered project
      const invalidResult = await resolution.validateAgainstRegistry('unknown-project');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.inRegistry).toBe(false);
    });

    it('should suggest similar projects when not found', async () => {
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });

      await registry.addProject({
        id: 'frontend-app',
        name: 'Frontend App',
        created: new Date().toISOString(),
      });

      await registry.addProject({
        id: 'frontend-mobile',
        name: 'Frontend Mobile',
        created: new Date().toISOString(),
      });

      const resolution = new ProjectResolutionService(testDir, {
        logger: mockLogger,
        registry,
      });

      // Search for partial match
      const result = await resolution.validateAgainstRegistry('frontend');
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
      // Should suggest both frontend projects
      expect(result.suggestions?.some((s) => s.includes('frontend'))).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should persist and reload projects correctly', async () => {
      // Create first registry and add projects
      const registry1 = new ProjectRegistry(testDir, { logger: mockLogger });
      await registry1.addProject({
        id: 'persisted-project',
        name: 'Persisted Project',
        techStack: ['Go', 'PostgreSQL'],
        created: new Date().toISOString(),
      });
      await registry1.setDefaultProject('persisted-project');

      // Create second registry (simulates restart)
      const registry2 = new ProjectRegistry(testDir, { logger: mockLogger });

      // Load and verify
      const projects = await registry2.listProjects();
      expect(projects.length).toBe(1);
      expect(projects[0].id).toBe('persisted-project');
      expect(projects[0].techStack).toContain('Go');

      const defaultProject = await registry2.getDefaultProject();
      expect(defaultProject?.id).toBe('persisted-project');
    });

    it('should handle corrupt registry file gracefully', async () => {
      // Write corrupt JSON
      const registryPath = path.join(testDir, '.specweave', 'state', 'projects.json');
      fs.writeFileSync(registryPath, '{ invalid json }');

      // Registry should throw meaningful error
      const registry = new ProjectRegistry(testDir, { logger: mockLogger });
      await expect(registry.load()).rejects.toThrow();
    });
  });
});

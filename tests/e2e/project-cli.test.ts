/**
 * E2E Tests for Project CLI Commands
 *
 * Tests the full workflow: add → list → sync → show → remove
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  projectListCommand,
  projectAddCommand,
  projectRemoveCommand,
  projectSyncCommand,
  projectShowCommand,
} from '../../src/cli/commands/project.js';
import { ProjectRegistry } from '../../src/core/project/project-registry.js';

describe('Project CLI E2E Tests', () => {
  let testDir: string;
  let mockLogger: any;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleOutput: string[];

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-project-cli-test-'));

    // Create .specweave directory structure
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    };

    // Capture console.log output
    consoleOutput = [];
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    // Cleanup
    consoleLogSpy.mockRestore();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Full Workflow: add → list → show → sync → remove', () => {
    it('should complete full project lifecycle', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      // Step 1: List projects (should be empty)
      await projectListCommand(options);
      expect(consoleOutput.some(line => line.includes('No projects in registry'))).toBe(true);

      consoleOutput.length = 0;

      // Step 2: Add a project
      await projectAddCommand(
        'frontend-app',
        {
          name: 'Frontend App',
          techStack: 'TypeScript,React',
          default: true,
        },
        options
      );
      expect(consoleOutput.some(line => line.includes('Added project: frontend-app'))).toBe(true);

      consoleOutput.length = 0;

      // Step 3: List projects (should show the new project)
      await projectListCommand(options);
      expect(consoleOutput.some(line => line.includes('frontend-app'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Frontend App'))).toBe(true);

      consoleOutput.length = 0;

      // Step 4: Show project details
      await projectShowCommand('frontend-app', options);
      expect(consoleOutput.some(line => line.includes('Frontend App'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('TypeScript'))).toBe(true);

      consoleOutput.length = 0;

      // Step 5: Sync project (just verifies it runs without error)
      await projectSyncCommand('frontend-app', {}, options);
      expect(consoleOutput.some(line => line.includes('Syncing project'))).toBe(true);

      consoleOutput.length = 0;

      // Step 6: Remove project (without --yes, should show warning)
      await projectRemoveCommand('frontend-app', {}, options);
      expect(consoleOutput.some(line => line.includes('About to remove project'))).toBe(true);

      consoleOutput.length = 0;

      // Step 7: Remove project with --yes
      await projectRemoveCommand('frontend-app', { yes: true, force: true }, options);
      expect(consoleOutput.some(line => line.includes('Removed project'))).toBe(true);

      consoleOutput.length = 0;

      // Step 8: List projects (should be empty again)
      await projectListCommand(options);
      expect(consoleOutput.some(line => line.includes('No projects in registry'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle adding duplicate project', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      // Add first project
      await projectAddCommand('my-project', { name: 'My Project' }, options);
      consoleOutput.length = 0;

      // Try to add duplicate
      await projectAddCommand('my-project', { name: 'My Project' }, options);
      expect(consoleOutput.some(line => line.includes("already exists"))).toBe(true);
    });

    it('should handle showing non-existent project', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      await projectShowCommand('non-existent', options);
      expect(consoleOutput.some(line => line.includes('not found'))).toBe(true);
    });

    it('should handle removing non-existent project', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      await projectRemoveCommand('non-existent', { yes: true }, options);
      expect(consoleOutput.some(line => line.includes('not found'))).toBe(true);
    });
  });

  describe('Multi-project Scenarios', () => {
    it('should manage multiple projects', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      // Add multiple projects
      await projectAddCommand('frontend-app', { name: 'Frontend', default: true }, options);
      await projectAddCommand('backend-api', { name: 'Backend API' }, options);
      await projectAddCommand('mobile-app', { name: 'Mobile App' }, options);

      consoleOutput.length = 0;

      // List should show all projects
      await projectListCommand(options);
      expect(consoleOutput.some(line => line.includes('frontend-app'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('backend-api'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('mobile-app'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Total: 3 project(s)'))).toBe(true);

      // Verify default project is marked
      expect(consoleOutput.some(line => line.includes('Default: frontend-app'))).toBe(true);
    });

    it('should sync all projects when no ID specified', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      await projectAddCommand('project-a', { name: 'Project A' }, options);
      await projectAddCommand('project-b', { name: 'Project B' }, options);

      consoleOutput.length = 0;

      // Sync all projects
      await projectSyncCommand(undefined, {}, options);
      expect(consoleOutput.some(line => line.includes('Syncing all projects'))).toBe(true);
    });
  });

  describe('Tech Stack and Team', () => {
    it('should store and display tech stack', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      await projectAddCommand(
        'tech-project',
        {
          name: 'Tech Project',
          techStack: 'Node.js,Express,PostgreSQL',
          team: 'Platform Team',
        },
        options
      );

      consoleOutput.length = 0;

      await projectShowCommand('tech-project', options);
      expect(consoleOutput.some(line => line.includes('Node.js'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Platform Team'))).toBe(true);
    });
  });

  describe('Sync with External Tools', () => {
    it('should sync to specific tools when specified', async () => {
      const options = { logger: mockLogger, projectRoot: testDir };

      await projectAddCommand('sync-project', { name: 'Sync Project' }, options);

      consoleOutput.length = 0;

      // Sync only to GitHub
      await projectSyncCommand('sync-project', { github: true }, options);
      expect(consoleOutput.some(line => line.includes('github'))).toBe(true);

      consoleOutput.length = 0;

      // Sync only to ADO and JIRA
      await projectSyncCommand('sync-project', { ado: true, jira: true }, options);
      expect(consoleOutput.some(line => line.includes('ado'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('jira'))).toBe(true);
    });
  });
});

describe('ProjectRegistry Integration', () => {
  let testDir: string;
  let mockLogger: any;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-registry-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });

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

  it('should persist projects across registry instances', async () => {
    // Create first registry instance and add project
    const registry1 = new ProjectRegistry(testDir, { logger: mockLogger });
    await registry1.addProject({
      id: 'persistent-project',
      name: 'Persistent Project',
      created: new Date().toISOString(),
    });

    // Create second registry instance (simulates restart)
    const registry2 = new ProjectRegistry(testDir, { logger: mockLogger });
    const project = await registry2.getProject('persistent-project');

    expect(project).not.toBeNull();
    expect(project?.name).toBe('Persistent Project');
  });

  it('should emit events on CRUD operations', async () => {
    const registry = new ProjectRegistry(testDir, { logger: mockLogger });
    const eventBus = registry.getEventBus();

    const createdEvents: any[] = [];
    const updatedEvents: any[] = [];
    const deletedEvents: any[] = [];

    eventBus.onProjectCreated((event) => createdEvents.push(event));
    eventBus.onProjectUpdated((event) => updatedEvents.push(event));
    eventBus.onProjectDeleted((event) => deletedEvents.push(event));

    // Add project
    await registry.addProject({
      id: 'event-test',
      name: 'Event Test',
      created: new Date().toISOString(),
    });
    expect(createdEvents.length).toBe(1);
    expect(createdEvents[0].project.id).toBe('event-test');

    // Update project
    await registry.updateProject('event-test', { name: 'Updated Name' });
    expect(updatedEvents.length).toBe(1);
    expect(updatedEvents[0].changes.name).toBe('Updated Name');

    // Remove project
    await registry.removeProject('event-test', { force: true });
    expect(deletedEvents.length).toBe(1);
    expect(deletedEvents[0].projectId).toBe('event-test');
  });
});

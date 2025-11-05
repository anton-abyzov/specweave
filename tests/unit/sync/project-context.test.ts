/**
 * Unit Tests: ProjectContextManager
 *
 * Tests for multi-project context management and smart detection.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ProjectContextManager } from '../../../src/core/sync/project-context';
import type { ProjectContext } from '../../../src/core/types/sync-profile';

describe('ProjectContextManager', () => {
  let tempDir: string;
  let contextManager: ProjectContextManager;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(path.join(tempDir, '.specweave'));

    contextManager = new ProjectContextManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('load and save', () => {
    it('should load empty config if file does not exist', async () => {
      const config = await contextManager.load();

      expect(config.profiles).toEqual({});
      expect(config.projects).toEqual({});
      expect(config.settings?.autoDetectProject).toBe(true);
      expect(config.settings?.defaultTimeRange).toBe('1M');
      expect(config.settings?.rateLimitProtection).toBe(true);
    });

    it('should save and load config correctly', async () => {
      const config = await contextManager.load();
      config.settings!.defaultTimeRange = '2W';

      await contextManager.save();

      // Reload to verify persistence
      const contextManager2 = new ProjectContextManager(tempDir);
      const reloaded = await contextManager2.load();

      expect(reloaded.settings?.defaultTimeRange).toBe('2W');
    });
  });

  describe('createProject', () => {
    it('should create a valid project', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test project description',
        keywords: ['test', 'project'],
        defaultSyncProfile: 'test-profile',
        specsFolder: '.specweave/docs/internal/specs/test-project',
      };

      await contextManager.createProject('test-project', project);

      const retrieved = await contextManager.getProject('test-project');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Project');
      expect(retrieved?.keywords).toEqual(['test', 'project']);
    });

    it('should create specs folder and README', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test project description',
        keywords: ['test'],
        specsFolder: '.specweave/docs/internal/specs/test-project',
      };

      await contextManager.createProject('test-project', project);

      const specsPath = path.join(tempDir, '.specweave/docs/internal/specs/test-project');
      const readmePath = path.join(specsPath, 'README.md');

      expect(await fs.pathExists(specsPath)).toBe(true);
      expect(await fs.pathExists(readmePath)).toBe(true);

      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      expect(readmeContent).toContain('Test Project');
      expect(readmeContent).toContain('Test project description');
      expect(readmeContent).toContain('test');
    });

    it('should use default specs folder if not provided', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test description',
        keywords: ['test'],
      };

      await contextManager.createProject('my-project', project);

      const retrieved = await contextManager.getProject('my-project');
      expect(retrieved?.specsFolder).toBe('.specweave/docs/internal/specs/my-project');
    });

    it('should reject project with invalid ID format', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      };

      await expect(
        contextManager.createProject('Invalid_ID', project)
      ).rejects.toThrow('only lowercase letters');
    });

    it('should reject duplicate project IDs', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      };

      await contextManager.createProject('duplicate', project);

      await expect(
        contextManager.createProject('duplicate', project)
      ).rejects.toThrow('already exists');
    });
  });

  describe('getAllProjects', () => {
    it('should return empty object when no projects exist', async () => {
      const projects = await contextManager.getAllProjects();
      expect(projects).toEqual({});
    });

    it('should return all created projects', async () => {
      const project1: Omit<ProjectContext, 'id'> = {
        name: 'Project 1',
        description: 'First project',
        keywords: ['p1'],
      };

      const project2: Omit<ProjectContext, 'id'> = {
        name: 'Project 2',
        description: 'Second project',
        keywords: ['p2'],
      };

      await contextManager.createProject('project1', project1);
      await contextManager.createProject('project2', project2);

      const all = await contextManager.getAllProjects();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all['project1']).toBeDefined();
      expect(all['project2']).toBeDefined();
    });
  });

  describe('updateProject', () => {
    it('should update existing project', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Original Name',
        description: 'Original description',
        keywords: ['test'],
      };

      await contextManager.createProject('test', project);

      await contextManager.updateProject('test', {
        name: 'Updated Name',
        description: 'Updated description',
      });

      const updated = await contextManager.getProject('test');
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.keywords).toEqual(['test']); // Unchanged
    });

    it('should reject update to non-existent project', async () => {
      await expect(
        contextManager.updateProject('nonexistent', { name: 'Test' })
      ).rejects.toThrow('does not exist');
    });
  });

  describe('deleteProject', () => {
    it('should delete existing project without specs', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      };

      await contextManager.createProject('test', project);
      await contextManager.deleteProject('test', false); // Don't delete specs

      const retrieved = await contextManager.getProject('test');
      expect(retrieved).toBeNull();

      // Specs folder should still exist
      const specsPath = path.join(tempDir, '.specweave/docs/internal/specs/test');
      expect(await fs.pathExists(specsPath)).toBe(true);
    });

    it('should delete existing project with specs', async () => {
      const project: Omit<ProjectContext, 'id'> = {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      };

      await contextManager.createProject('test', project);
      await contextManager.deleteProject('test', true); // Delete specs

      const retrieved = await contextManager.getProject('test');
      expect(retrieved).toBeNull();

      // Specs folder should be deleted
      const specsPath = path.join(tempDir, '.specweave/docs/internal/specs/test');
      expect(await fs.pathExists(specsPath)).toBe(false);
    });

    it('should reject delete of non-existent project', async () => {
      await expect(
        contextManager.deleteProject('nonexistent')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('detectProject', () => {
    beforeEach(async () => {
      // Create test projects
      await contextManager.createProject('specweave', {
        name: 'SpecWeave',
        description: 'Spec-driven development framework',
        keywords: ['framework', 'spec', 'tdd'],
        team: 'Core Team',
      });

      await contextManager.createProject('mobile-app', {
        name: 'Mobile App',
        description: 'E-commerce mobile application',
        keywords: ['mobile', 'react-native', 'ecommerce'],
        team: 'Mobile Team',
      });
    });

    it('should detect project by name', async () => {
      const result = await contextManager.detectProject('Add SpecWeave plugin support');

      expect(result.project?.id).toBe('specweave');
      expect(result.confidence).toBeGreaterThan(0.7); // High confidence
      expect(result.matchedKeywords).toContain('SpecWeave');
    });

    it('should detect project by keywords', async () => {
      const result = await contextManager.detectProject(
        'Implement TDD workflow for spec generation'
      );

      expect(result.project?.id).toBe('specweave');
      expect(result.matchedKeywords).toContain('spec');
      expect(result.matchedKeywords).toContain('tdd');
    });

    it('should detect project by team', async () => {
      const result = await contextManager.detectProject('Mobile Team: Add dark mode');

      expect(result.project?.id).toBe('mobile-app');
      expect(result.matchedKeywords).toContain('Mobile Team');
    });

    it('should return best match with multiple keyword matches', async () => {
      const result = await contextManager.detectProject(
        'Add React Native framework for mobile ecommerce'
      );

      expect(result.project?.id).toBe('mobile-app');
      expect(result.matchedKeywords).toContain('mobile');
      expect(result.matchedKeywords).toContain('react-native');
      expect(result.matchedKeywords).toContain('ecommerce');
    });

    it('should return low confidence for no matches', async () => {
      const result = await contextManager.detectProject('Implement blockchain support');

      expect(result.project).toBeUndefined();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('should return empty result when no projects exist', async () => {
      // Delete all projects
      await contextManager.deleteProject('specweave');
      await contextManager.deleteProject('mobile-app');

      const result = await contextManager.detectProject('Test description');

      expect(result.project).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it('should suggest default sync profile if project has one', async () => {
      await contextManager.createProject('with-profile', {
        name: 'Project with Profile',
        description: 'Test',
        keywords: ['profile-test'],
        defaultSyncProfile: 'test-sync-profile',
      });

      const result = await contextManager.detectProject('profile-test implementation');

      expect(result.project?.id).toBe('with-profile');
      expect(result.suggestedProfile).toBe('test-sync-profile');
    });
  });

  describe('linkIncrementToProject', () => {
    beforeEach(async () => {
      await contextManager.createProject('test-project', {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      });
    });

    it('should link increment to project', async () => {
      await contextManager.linkIncrementToProject('test-project', '0001-feature');

      const project = await contextManager.getProject('test-project');
      expect(project?.increments).toContain('0001-feature');
    });

    it('should not duplicate increment links', async () => {
      await contextManager.linkIncrementToProject('test-project', '0001-feature');
      await contextManager.linkIncrementToProject('test-project', '0001-feature'); // Duplicate

      const project = await contextManager.getProject('test-project');
      expect(project?.increments?.filter((id) => id === '0001-feature')).toHaveLength(1);
    });

    it('should reject link to non-existent project', async () => {
      await expect(
        contextManager.linkIncrementToProject('nonexistent', '0001-feature')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('unlinkIncrementFromProject', () => {
    beforeEach(async () => {
      await contextManager.createProject('test-project', {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      });

      await contextManager.linkIncrementToProject('test-project', '0001-feature');
      await contextManager.linkIncrementToProject('test-project', '0002-bugfix');
    });

    it('should unlink increment from project', async () => {
      await contextManager.unlinkIncrementFromProject('test-project', '0001-feature');

      const project = await contextManager.getProject('test-project');
      expect(project?.increments).not.toContain('0001-feature');
      expect(project?.increments).toContain('0002-bugfix'); // Still linked
    });

    it('should handle unlinking non-existent increment gracefully', async () => {
      await contextManager.unlinkIncrementFromProject('test-project', '0999-nonexistent');

      const project = await contextManager.getProject('test-project');
      expect(project?.increments).toContain('0001-feature'); // Unchanged
    });

    it('should reject unlink from non-existent project', async () => {
      await expect(
        contextManager.unlinkIncrementFromProject('nonexistent', '0001-feature')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('getSpecsFolder', () => {
    it('should return correct specs folder path', () => {
      const folder = contextManager.getSpecsFolder('my-project');
      expect(folder).toBe('.specweave/docs/internal/specs/my-project');
    });
  });

  describe('ensureSpecsFolder', () => {
    beforeEach(async () => {
      await contextManager.createProject('test-project', {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      });
    });

    it('should ensure specs folder exists', async () => {
      const folder = await contextManager.ensureSpecsFolder('test-project');

      expect(folder).toBe('.specweave/docs/internal/specs/test-project');

      const fullPath = path.join(tempDir, folder);
      expect(await fs.pathExists(fullPath)).toBe(true);
    });

    it('should reject ensure for non-existent project', async () => {
      await expect(
        contextManager.ensureSpecsFolder('nonexistent')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('getProjectSpecs', () => {
    beforeEach(async () => {
      await contextManager.createProject('test-project', {
        name: 'Test Project',
        description: 'Test',
        keywords: [],
      });
    });

    it('should return empty array when no specs exist', async () => {
      const specs = await contextManager.getProjectSpecs('test-project');
      expect(specs).toEqual([]);
    });

    it('should return all spec files', async () => {
      const specsPath = path.join(
        tempDir,
        '.specweave/docs/internal/specs/test-project'
      );

      // Create test spec files
      await fs.writeFile(path.join(specsPath, 'spec-001-feature.md'), 'Content', 'utf-8');
      await fs.writeFile(path.join(specsPath, 'spec-002-bugfix.md'), 'Content', 'utf-8');
      await fs.writeFile(path.join(specsPath, 'other-file.md'), 'Content', 'utf-8'); // Should be ignored

      const specs = await contextManager.getProjectSpecs('test-project');

      expect(specs).toHaveLength(2);
      expect(specs.some((s) => s.includes('spec-001-feature.md'))).toBe(true);
      expect(specs.some((s) => s.includes('spec-002-bugfix.md'))).toBe(true);
      expect(specs.some((s) => s.includes('other-file.md'))).toBe(false);
    });

    it('should reject get specs for non-existent project', async () => {
      await expect(
        contextManager.getProjectSpecs('nonexistent')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics for empty state', async () => {
      const stats = await contextManager.getStats();

      expect(stats.totalProjects).toBe(0);
      expect(stats.totalIncrements).toBe(0);
      expect(stats.projectsByTeam).toEqual({});
    });

    it('should return correct statistics', async () => {
      // Create projects with different teams
      await contextManager.createProject('project1', {
        name: 'Project 1',
        description: 'Test',
        keywords: [],
        team: 'Team A',
      });

      await contextManager.createProject('project2', {
        name: 'Project 2',
        description: 'Test',
        keywords: [],
        team: 'Team A',
      });

      await contextManager.createProject('project3', {
        name: 'Project 3',
        description: 'Test',
        keywords: [],
        team: 'Team B',
      });

      // Link increments
      await contextManager.linkIncrementToProject('project1', '0001');
      await contextManager.linkIncrementToProject('project1', '0002');
      await contextManager.linkIncrementToProject('project2', '0003');

      const stats = await contextManager.getStats();

      expect(stats.totalProjects).toBe(3);
      expect(stats.totalIncrements).toBe(3);
      expect(stats.projectsByTeam['Team A']).toBe(2);
      expect(stats.projectsByTeam['Team B']).toBe(1);
    });
  });
});

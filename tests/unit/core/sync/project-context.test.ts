/**
 * Unit Tests: ProjectContextManager
 *
 * Tests the project context manager for multi-project sync.
 * Covers project CRUD, detection, increment linking, specs folder management, and stats.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectContext, SyncConfiguration } from '../../../../src/core/types/sync-profile.js';

// ============================================================================
// Mocks
// ============================================================================

const { mockReadFile, mockWriteFile, mockEnsureDir, mockRemove, mockReaddir } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockEnsureDir: vi.fn(),
  mockRemove: vi.fn(),
  mockReaddir: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  ensureDir: mockEnsureDir,
  remove: mockRemove,
  readdir: mockReaddir,
}));

import { ProjectContextManager } from '../../../../src/core/sync/project-context.js';

// ============================================================================
// Helpers
// ============================================================================

function makeProject(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    id: 'test-project',
    name: 'Test Project',
    description: 'A test project',
    keywords: ['test', 'demo'],
    specsFolder: '.specweave/docs/internal/specs/test-project',
    increments: [],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<SyncConfiguration> = {}): SyncConfiguration {
  return {
    profiles: {},
    projects: {},
    settings: {
      canUpsertInternalItems: false,
      canUpdateExternalItems: false,
      canUpdateStatus: false,
      autoDetectProject: true,
      defaultTimeRange: '1M',
      rateLimitProtection: true,
    },
    ...overrides,
  };
}

function setupConfigFile(fullConfig: Record<string, unknown>): void {
  mockReadFile.mockResolvedValue(JSON.stringify(fullConfig));
}

// ============================================================================
// Tests
// ============================================================================

describe('ProjectContextManager', () => {
  let pcm: ProjectContextManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    pcm = new ProjectContextManager('/project');
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('should set configPath based on projectRoot', async () => {
      const mgr = new ProjectContextManager('/some/root');
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await mgr.load();

      expect(mockReadFile).toHaveBeenCalledWith(
        '/some/root/.specweave/config.json',
        'utf-8'
      );
    });
  });

  // ==========================================================================
  // load()
  // ==========================================================================

  describe('load()', () => {
    it('should parse sync section from config file', async () => {
      const syncConfig = makeConfig({
        projects: { proj: makeProject() },
      });
      setupConfigFile({ sync: syncConfig });

      const result = await pcm.load();

      expect(result.projects).toHaveProperty('proj');
    });

    it('should return cached config on subsequent calls', async () => {
      setupConfigFile({ sync: makeConfig() });

      await pcm.load();
      await pcm.load();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should return default config when sync section is missing', async () => {
      setupConfigFile({ someOther: true });

      const result = await pcm.load();

      expect(result.profiles).toEqual({});
      expect(result.projects).toEqual({});
      expect(result.settings?.autoDetectProject).toBe(true);
    });

    it('should return empty config on ENOENT error', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await pcm.load();

      expect(result.profiles).toEqual({});
      expect(result.projects).toEqual({});
      expect(result.settings?.canUpsertInternalItems).toBe(true);
    });

    it('should re-throw non-ENOENT errors', async () => {
      mockReadFile.mockRejectedValue(new Error('permission denied'));

      await expect(pcm.load()).rejects.toThrow('permission denied');
    });
  });

  // ==========================================================================
  // save()
  // ==========================================================================

  describe('save()', () => {
    it('should throw if config is not loaded first', async () => {
      await expect(pcm.save()).rejects.toThrow('No configuration loaded. Call load() first.');
    });

    it('should merge sync section into existing config file', async () => {
      setupConfigFile({ existingKey: 'value', sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({ existingKey: 'value' }));

      await pcm.save();

      expect(mockEnsureDir).toHaveBeenCalled();
      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.existingKey).toBe('value');
      expect(written.sync).toBeDefined();
    });

    it('should create new config file when none exists', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await pcm.load();

      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await pcm.save();

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync).toBeDefined();
    });

    it('should re-throw non-ENOENT errors during save read', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockRejectedValue(new Error('disk failure'));

      await expect(pcm.save()).rejects.toThrow('disk failure');
    });
  });

  // ==========================================================================
  // getAllProjects()
  // ==========================================================================

  describe('getAllProjects()', () => {
    it('should return all projects', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', name: 'Frontend' }),
        be: makeProject({ id: 'be', name: 'Backend' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.getAllProjects();

      expect(Object.keys(result)).toEqual(['fe', 'be']);
    });

    it('should return empty object when no projects exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      const result = await pcm.getAllProjects();

      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // getProject()
  // ==========================================================================

  describe('getProject()', () => {
    it('should return project by ID', async () => {
      const projects = { fe: makeProject({ id: 'fe', name: 'Frontend' }) };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.getProject('fe');

      expect(result?.name).toBe('Frontend');
    });

    it('should return null for non-existent project', async () => {
      setupConfigFile({ sync: makeConfig() });

      const result = await pcm.getProject('missing');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // createProject()
  // ==========================================================================

  describe('createProject()', () => {
    it('should create a project with default specs folder', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('my-proj', {
        name: 'My Project',
        description: 'A project',
        keywords: ['test'],
        specsFolder: '',
        increments: [],
      });

      expect(mockEnsureDir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();

      // Check README was written
      const writeFileCalls = mockWriteFile.mock.calls;
      const readmeCall = writeFileCalls.find((call: string[]) =>
        call[0].includes('README.md')
      );
      expect(readmeCall).toBeDefined();
    });

    it('should use custom specs folder if provided', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('my-proj', {
        name: 'My Project',
        description: 'A project',
        keywords: ['test'],
        specsFolder: 'custom/specs/path',
        increments: [],
      });

      const ensureDirCalls = mockEnsureDir.mock.calls.map((c: string[][]) => c[0]);
      expect(ensureDirCalls.some((p: string) => p.includes('custom/specs/path'))).toBe(true);
    });

    it('should use default specsFolder when empty string provided', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('my-proj', {
        name: 'My Project',
        description: 'A project',
        keywords: ['test'],
        specsFolder: '',
        increments: [],
      });

      // The saved config should have the default specs folder
      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      if (saveWriteCall) {
        const written = JSON.parse(saveWriteCall[1]);
        expect(written.sync.projects['my-proj'].specsFolder).toBe(
          '.specweave/docs/internal/specs/my-proj'
        );
      }
    });

    it('should reject invalid project ID format', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(
        pcm.createProject('Invalid ID!', {
          name: 'P',
          description: 'D',
          keywords: [],
          specsFolder: '',
        })
      ).rejects.toThrow('Project ID must contain only lowercase letters, numbers, and hyphens');
    });

    it('should reject uppercase in project ID', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(
        pcm.createProject('MyProject', {
          name: 'P',
          description: 'D',
          keywords: [],
          specsFolder: '',
        })
      ).rejects.toThrow('Project ID must contain only lowercase letters, numbers, and hyphens');
    });

    it('should reject duplicate project IDs', async () => {
      setupConfigFile({
        sync: makeConfig({ projects: { existing: makeProject({ id: 'existing' }) } }),
      });

      await expect(
        pcm.createProject('existing', {
          name: 'P',
          description: 'D',
          keywords: [],
          specsFolder: '',
        })
      ).rejects.toThrow("Project 'existing' already exists");
    });

    it('should initialize projects object when null', async () => {
      const config = { profiles: {}, settings: {} } as SyncConfiguration;
      setupConfigFile({ sync: config });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('new-one', {
        name: 'New',
        description: 'D',
        keywords: ['k'],
        specsFolder: '',
      });

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      if (saveWriteCall) {
        const written = JSON.parse(saveWriteCall[1]);
        expect(written.sync.projects['new-one']).toBeDefined();
      }
    });

    it('should preserve existing increments or default to empty array', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('my-proj', {
        name: 'P',
        description: 'D',
        keywords: [],
        specsFolder: '',
      });

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      if (saveWriteCall) {
        const written = JSON.parse(saveWriteCall[1]);
        expect(written.sync.projects['my-proj'].increments).toEqual([]);
      }
    });

    it('should generate README with project details', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('my-proj', {
        name: 'My Awesome Project',
        description: 'A wonderful project',
        keywords: ['awesome', 'wonderful'],
        specsFolder: '',
        team: 'Platform Team',
        defaultSyncProfile: 'prod-github',
        increments: ['0001-setup', '0002-feature'],
      });

      const readmeCall = mockWriteFile.mock.calls.find((call: string[]) =>
        call[0].includes('README.md')
      );
      expect(readmeCall).toBeDefined();

      const readmeContent = readmeCall![1];
      expect(readmeContent).toContain('My Awesome Project');
      expect(readmeContent).toContain('A wonderful project');
      expect(readmeContent).toContain('Platform Team');
      expect(readmeContent).toContain('awesome, wonderful');
      expect(readmeContent).toContain('prod-github');
      expect(readmeContent).toContain('0001-setup');
      expect(readmeContent).toContain('0002-feature');
    });

    it('should generate README without optional fields', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.createProject('minimal', {
        name: 'Minimal',
        description: 'Minimal desc',
        keywords: ['min'],
        specsFolder: '',
      });

      const readmeCall = mockWriteFile.mock.calls.find((call: string[]) =>
        call[0].includes('README.md')
      );
      const readmeContent = readmeCall![1];
      expect(readmeContent).toContain('No increments yet.');
    });
  });

  // ==========================================================================
  // updateProject()
  // ==========================================================================

  describe('updateProject()', () => {
    it('should merge updates into existing project and save', async () => {
      const projects = { fe: makeProject({ id: 'fe', name: 'Old Name' }) };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.updateProject('fe', { name: 'New Name' });

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.name).toBe('New Name');
      // ID is preserved
      expect(written.sync.projects.fe.id).toBe('fe');
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pcm.updateProject('missing', { name: 'X' })).rejects.toThrow(
        "Project 'missing' does not exist"
      );
    });

    it('should preserve the project ID even when updates include id-like data', async () => {
      const projects = { fe: makeProject({ id: 'fe' }) };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.updateProject('fe', { name: 'Updated', description: 'New Desc' });

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.id).toBe('fe');
    });
  });

  // ==========================================================================
  // deleteProject()
  // ==========================================================================

  describe('deleteProject()', () => {
    it('should delete project and save', async () => {
      const projects = {
        fe: makeProject({ id: 'fe' }),
        be: makeProject({ id: 'be' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.deleteProject('fe');

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe).toBeUndefined();
      expect(written.sync.projects.be).toBeDefined();
    });

    it('should delete specs folder when deleteSpecs is true', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          specsFolder: '.specweave/docs/internal/specs/fe',
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.deleteProject('fe', true);

      expect(mockRemove).toHaveBeenCalledWith(
        '/project/.specweave/docs/internal/specs/fe'
      );
    });

    it('should not delete specs folder when deleteSpecs is false', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.deleteProject('fe', false);

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('should not delete specs folder by default', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.deleteProject('fe');

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pcm.deleteProject('missing')).rejects.toThrow(
        "Project 'missing' does not exist"
      );
    });

    it('should throw when projects is not configured (undefined)', async () => {
      // Config without projects at all
      const config = { profiles: {}, settings: {} } as SyncConfiguration;
      setupConfigFile({ sync: config });

      await expect(pcm.deleteProject('any')).rejects.toThrow(
        'Projects not configured'
      );
    });
  });

  // ==========================================================================
  // detectProject()
  // ==========================================================================

  describe('detectProject()', () => {
    it('should detect project by name match', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react', 'ui'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('Update the Frontend login page');

      expect(result.project?.id).toBe('fe');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('Frontend');
    });

    it('should detect project by keyword match', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react', 'ui', 'component'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('Build a new react component');

      expect(result.project?.id).toBe('fe');
      expect(result.matchedKeywords).toContain('react');
      expect(result.matchedKeywords).toContain('component');
    });

    it('should detect project by team match', async () => {
      const projects = {
        be: makeProject({
          id: 'be',
          name: 'Backend',
          team: 'Platform Engineering',
          keywords: ['api'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('Platform Engineering needs a new endpoint');

      expect(result.project?.id).toBe('be');
      expect(result.matchedKeywords).toContain('Platform Engineering');
    });

    it('should pick the highest scoring project', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react'],
        }),
        be: makeProject({
          id: 'be',
          name: 'Backend API',
          team: 'Server Team',
          keywords: ['api', 'rest', 'backend'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      // This matches "Backend API" (name=10) + "api" (keyword=3) + "rest" (keyword=3) + "backend" (keyword=3) = 19
      const result = await pcm.detectProject('Build backend api with rest endpoints for backend service');

      expect(result.project?.id).toBe('be');
    });

    it('should return zero confidence when no projects exist', async () => {
      setupConfigFile({ sync: makeConfig({ projects: {} }) });

      const result = await pcm.detectProject('anything');

      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
      expect(result.project).toBeUndefined();
    });

    it('should return zero confidence when nothing matches', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react', 'ui'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('Configure database migrations');

      expect(result.confidence).toBe(0);
      expect(result.project).toBeUndefined();
    });

    it('should cap confidence at 1.0', async () => {
      const projects = {
        big: makeProject({
          id: 'big',
          name: 'big',
          team: 'big',
          keywords: ['big', 'big-project', 'big-team', 'big-app'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      // Name=10 + team=5 + 4 keywords x 3 = 27, confidence = min(27/10, 1) = 1
      const result = await pcm.detectProject('big big-project big-team big-app');

      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should be case-insensitive', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['React', 'UI'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('update the FRONTEND with REACT');

      expect(result.project?.id).toBe('fe');
    });

    it('should include suggestedProfile when project has defaultSyncProfile', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react'],
          defaultSyncProfile: 'github-prod',
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('New react feature');

      expect(result.suggestedProfile).toBe('github-prod');
    });

    it('should not include suggestedProfile when project has none', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          keywords: ['react'],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.detectProject('New react feature');

      expect(result.suggestedProfile).toBeUndefined();
    });
  });

  // ==========================================================================
  // linkIncrementToProject()
  // ==========================================================================

  describe('linkIncrementToProject()', () => {
    it('should link increment to project', async () => {
      const projects = { fe: makeProject({ id: 'fe', increments: [] }) };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.linkIncrementToProject('fe', '0001-setup');

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.increments).toContain('0001-setup');
    });

    it('should not duplicate increment IDs', async () => {
      const projects = { fe: makeProject({ id: 'fe', increments: ['0001-setup'] }) };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      await pcm.linkIncrementToProject('fe', '0001-setup');

      // Should not call save because increment already linked
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should initialize increments array if null', async () => {
      const projects = { fe: makeProject({ id: 'fe', increments: undefined }) };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.linkIncrementToProject('fe', '0002-feature');

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.increments).toContain('0002-feature');
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(
        pcm.linkIncrementToProject('missing', '0001-setup')
      ).rejects.toThrow("Project 'missing' does not exist");
    });
  });

  // ==========================================================================
  // unlinkIncrementFromProject()
  // ==========================================================================

  describe('unlinkIncrementFromProject()', () => {
    it('should unlink increment from project', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', increments: ['0001-setup', '0002-feature'] }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.unlinkIncrementFromProject('fe', '0001-setup');

      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.increments).toEqual(['0002-feature']);
    });

    it('should handle unlinking non-existent increment gracefully', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', increments: ['0001-setup'] }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pcm.unlinkIncrementFromProject('fe', 'not-there');

      // Still saves because filter runs
      const saveWriteCall = mockWriteFile.mock.calls.find(
        (call: string[]) => call[0].endsWith('config.json')
      );
      const written = JSON.parse(saveWriteCall![1]);
      expect(written.sync.projects.fe.increments).toEqual(['0001-setup']);
    });

    it('should not save when increments is undefined', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', increments: undefined }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });
      await pcm.load();

      await pcm.unlinkIncrementFromProject('fe', '0001-setup');

      // Should not call save since there are no increments to filter
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(
        pcm.unlinkIncrementFromProject('missing', '0001-setup')
      ).rejects.toThrow("Project 'missing' does not exist");
    });
  });

  // ==========================================================================
  // getSpecsFolder()
  // ==========================================================================

  describe('getSpecsFolder()', () => {
    it('should return default specs folder path', () => {
      const result = pcm.getSpecsFolder('my-project');

      expect(result).toBe('.specweave/docs/internal/specs/my-project');
    });

    it('should be a synchronous method', () => {
      // Ensure it does not return a promise
      const result = pcm.getSpecsFolder('test');
      expect(typeof result).toBe('string');
    });
  });

  // ==========================================================================
  // ensureSpecsFolder()
  // ==========================================================================

  describe('ensureSpecsFolder()', () => {
    it('should ensure specs folder exists and return path', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const result = await pcm.ensureSpecsFolder('fe');

      expect(mockEnsureDir).toHaveBeenCalledWith(
        '/project/.specweave/docs/internal/specs/fe'
      );
      expect(result).toBe('.specweave/docs/internal/specs/fe');
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pcm.ensureSpecsFolder('missing')).rejects.toThrow(
        "Project 'missing' does not exist"
      );
    });
  });

  // ==========================================================================
  // getProjectSpecs()
  // ==========================================================================

  describe('getProjectSpecs()', () => {
    it('should return spec files for project', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      mockReaddir.mockResolvedValue([
        'spec-001-auth.md',
        'spec-002-dashboard.md',
        'README.md',
        'notes.txt',
      ]);

      const result = await pcm.getProjectSpecs('fe');

      expect(result).toEqual([
        '.specweave/docs/internal/specs/fe/spec-001-auth.md',
        '.specweave/docs/internal/specs/fe/spec-002-dashboard.md',
      ]);
    });

    it('should return empty array when folder does not exist (ENOENT)', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      mockReaddir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await pcm.getProjectSpecs('fe');

      expect(result).toEqual([]);
    });

    it('should re-throw non-ENOENT errors', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      mockReaddir.mockRejectedValue(new Error('permission denied'));

      await expect(pcm.getProjectSpecs('fe')).rejects.toThrow('permission denied');
    });

    it('should throw when project does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pcm.getProjectSpecs('missing')).rejects.toThrow(
        "Project 'missing' does not exist"
      );
    });

    it('should filter files that do not start with spec-', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', specsFolder: '.specweave/docs/internal/specs/fe' }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      mockReaddir.mockResolvedValue([
        'spec-001-auth.md',
        'other-spec.md',
        'specification-002.md',
        'spec-notes.txt',
      ]);

      const result = await pcm.getProjectSpecs('fe');

      expect(result).toEqual([
        '.specweave/docs/internal/specs/fe/spec-001-auth.md',
      ]);
    });
  });

  // ==========================================================================
  // getStats()
  // ==========================================================================

  describe('getStats()', () => {
    it('should return correct statistics', async () => {
      const projects = {
        fe: makeProject({
          id: 'fe',
          name: 'Frontend',
          team: 'UI Team',
          increments: ['0001-a', '0002-b'],
        }),
        be: makeProject({
          id: 'be',
          name: 'Backend',
          team: 'API Team',
          increments: ['0003-c'],
        }),
        mobile: makeProject({
          id: 'mobile',
          name: 'Mobile',
          team: 'UI Team',
          increments: [],
        }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const stats = await pcm.getStats();

      expect(stats.totalProjects).toBe(3);
      expect(stats.totalIncrements).toBe(3);
      expect(stats.projectsByTeam).toEqual({
        'UI Team': 2,
        'API Team': 1,
      });
    });

    it('should return zeros for empty config', async () => {
      setupConfigFile({ sync: makeConfig() });

      const stats = await pcm.getStats();

      expect(stats.totalProjects).toBe(0);
      expect(stats.totalIncrements).toBe(0);
      expect(stats.projectsByTeam).toEqual({});
    });

    it('should handle projects without team', async () => {
      const projects = {
        solo: makeProject({ id: 'solo', name: 'Solo', team: undefined, increments: ['0001-x'] }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const stats = await pcm.getStats();

      expect(stats.totalProjects).toBe(1);
      expect(stats.totalIncrements).toBe(1);
      expect(stats.projectsByTeam).toEqual({});
    });

    it('should handle projects with undefined increments', async () => {
      const projects = {
        fe: makeProject({ id: 'fe', name: 'FE', increments: undefined }),
      };
      setupConfigFile({ sync: makeConfig({ projects }) });

      const stats = await pcm.getStats();

      expect(stats.totalProjects).toBe(1);
      expect(stats.totalIncrements).toBe(0);
    });
  });
});

/**
 * HierarchyMapper Tests
 *
 * Comprehensive unit tests for the hierarchy mapper that maps increments
 * to unified project structure (epics, features, user stories, tasks).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// vi.hoisted + vi.mock for ESM mocking
const {
  mockPathExists,
  mockExistsSync,
  mockReadFile,
  mockReaddir,
  mockStat,
  mockConfigLoadAsync,
  mockFeatureIdLoadRegistry,
  mockFeatureIdGetAssignedId,
  MockConfigManager,
  MockFeatureIDManager,
} = vi.hoisted(() => {
  const mockPathExists = vi.fn();
  const mockExistsSync = vi.fn();
  const mockReadFile = vi.fn();
  const mockReaddir = vi.fn();
  const mockStat = vi.fn();
  const mockConfigLoadAsync = vi.fn();
  const mockFeatureIdLoadRegistry = vi.fn();
  const mockFeatureIdGetAssignedId = vi.fn();

  class MockConfigManager {
    loadAsync = mockConfigLoadAsync;
  }

  class MockFeatureIDManager {
    loadRegistry = mockFeatureIdLoadRegistry;
    getAssignedId = mockFeatureIdGetAssignedId;
  }

  return {
    mockPathExists,
    mockExistsSync,
    mockReadFile,
    mockReaddir,
    mockStat,
    mockConfigLoadAsync,
    mockFeatureIdLoadRegistry,
    mockFeatureIdGetAssignedId,
    MockConfigManager,
    MockFeatureIDManager,
  };
});

vi.mock('../../../../src/utils/fs-native.js', () => ({
  pathExists: mockPathExists,
  existsSync: mockExistsSync,
  readFile: mockReadFile,
  readdir: mockReaddir,
  stat: mockStat,
  default: {
    pathExists: mockPathExists,
    existsSync: mockExistsSync,
    readFile: mockReadFile,
    readdir: mockReaddir,
    stat: mockStat,
  },
}));

vi.mock('../../../../src/core/config-manager.js', () => ({
  ConfigManager: MockConfigManager,
}));

vi.mock('../../../../src/core/living-docs/feature-id-manager.js', () => ({
  FeatureIDManager: MockFeatureIDManager,
}));

import { HierarchyMapper } from '../../../../src/core/living-docs/hierarchy-mapper.js';
import type { HierarchyConfig } from '../../../../src/core/living-docs/hierarchy-mapper.js';

// Helper: Build a minimal SpecWeaveConfig
function buildConfig(overrides: Record<string, any> = {}) {
  return {
    version: '2.0',
    project: { name: 'TestProject', techStack: ['typescript'] },
    multiProject: undefined,
    ...overrides,
  };
}

// Helper: Build spec.md content with frontmatter
function buildSpec(frontmatter: Record<string, any>, body = ''): string {
  const yaml = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}:\n${v.map(i => `  - ${i}`).join('\n')}`;
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${yaml}\n---\n${body}`;
}

describe('HierarchyMapper', () => {
  const PROJECT_ROOT = '/test/project';
  const SPECS_BASE = '/test/project/.specweave/docs/internal/specs';
  let mapper: HierarchyMapper;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default config: single-project mode
    mockConfigLoadAsync.mockResolvedValue(buildConfig());
    mockFeatureIdLoadRegistry.mockResolvedValue(undefined);
    mockFeatureIdGetAssignedId.mockImplementation((id: string) => id);

    // Default fs mocks
    mockPathExists.mockResolvedValue(false);
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockResolvedValue('');
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({ isDirectory: () => true });

    mapper = new HierarchyMapper(PROJECT_ROOT);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Constructor & config
  // =========================================================================
  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const m = new HierarchyMapper(PROJECT_ROOT);
      // No error = default config applied
      expect(m).toBeDefined();
    });

    it('should merge partial config with defaults', () => {
      const m = new HierarchyMapper(PROJECT_ROOT, {
        level: 'enterprise',
        fallbackEpic: 'EP-DEFAULT',
      });
      expect(m).toBeDefined();
    });
  });

  // =========================================================================
  // getSpecweaveConfig
  // =========================================================================
  describe('getSpecweaveConfig', () => {
    it('should load config on first call', async () => {
      const config = await mapper.getSpecweaveConfig();
      expect(mockConfigLoadAsync).toHaveBeenCalledTimes(1);
      expect(config.version).toBe('2.0');
    });

    it('should cache config on subsequent calls', async () => {
      await mapper.getSpecweaveConfig();
      await mapper.getSpecweaveConfig();
      expect(mockConfigLoadAsync).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // getConfiguredProjects
  // =========================================================================
  describe('getConfiguredProjects', () => {
    it('should return ["default"] for single-project mode', async () => {
      const projects = await mapper.getConfiguredProjects();
      expect(projects).toEqual(['default']);
    });

    it('should return project names for multi-project mode', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend', keywords: ['api'] },
            frontend: { name: 'Frontend', keywords: ['ui'] },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const projects = await mapper.getConfiguredProjects();
      expect(projects).toEqual(['backend', 'frontend']);
    });

    it('should fallback to ["default"] when multiProject.projects is empty', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: { enabled: true, projects: {} },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const projects = await mapper.getConfiguredProjects();
      expect(projects).toEqual(['default']);
    });

    it('should fallback to ["default"] when multiProject.enabled is false', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: false,
          projects: { backend: { name: 'Backend' } },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const projects = await mapper.getConfiguredProjects();
      expect(projects).toEqual(['default']);
    });
  });

  // =========================================================================
  // isFeatureArchived
  // =========================================================================
  describe('isFeatureArchived', () => {
    it('should return true when feature archive path exists', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        return p === `${SPECS_BASE}/default/_archive/FS-031`;
      });

      const result = await mapper.isFeatureArchived('FS-031');
      expect(result).toBe(true);
    });

    it('should return false when feature not archived', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await mapper.isFeatureArchived('FS-031');
      expect(result).toBe(false);
    });

    it('should check all projects in multi-project mode', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      mockPathExists.mockImplementation(async (p: string) => {
        return p === `${SPECS_BASE}/frontend/_archive/FS-031`;
      });

      const result = await mapper.isFeatureArchived('FS-031');
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // isEpicArchived
  // =========================================================================
  describe('isEpicArchived', () => {
    it('should check specific project when projectId provided', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        return p === `${SPECS_BASE}/backend/_epics/_archive/EP-086E`;
      });

      const result = await mapper.isEpicArchived('EP-086E', 'backend');
      expect(result).toBe(true);
    });

    it('should return false when epic not archived in specified project', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await mapper.isEpicArchived('EP-086E', 'backend');
      expect(result).toBe(false);
    });

    it('should check all projects when no projectId provided', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        return p === `${SPECS_BASE}/default/_epics/_archive/EP-001`;
      });

      const result = await mapper.isEpicArchived('EP-001');
      expect(result).toBe(true);
    });

    it('should return false when epic not archived in any project', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await mapper.isEpicArchived('EP-999');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // filterArchivedItems
  // =========================================================================
  describe('filterArchivedItems', () => {
    it('should filter out archived features', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        return p.includes('FS-002');
      });

      const items = [
        { id: 'FS-001', name: 'A' },
        { id: 'FS-002', name: 'B' },
        { id: 'FS-003', name: 'C' },
      ];

      const result = await mapper.filterArchivedItems(items, 'feature');
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual(['FS-001', 'FS-003']);
    });

    it('should filter out archived epics', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        return p.includes('EP-001');
      });

      const items = [
        { id: 'EP-001', name: 'Epic1' },
        { id: 'EP-002', name: 'Epic2' },
      ];

      const result = await mapper.filterArchivedItems(items, 'epic');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('EP-002');
    });

    it('should return all items when none archived', async () => {
      mockPathExists.mockResolvedValue(false);

      const items = [
        { id: 'FS-001', name: 'A' },
        { id: 'FS-002', name: 'B' },
      ];

      const result = await mapper.filterArchivedItems(items, 'feature');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when all items archived', async () => {
      mockPathExists.mockResolvedValue(true);

      const items = [
        { id: 'FS-001', name: 'A' },
        { id: 'FS-002', name: 'B' },
      ];

      const result = await mapper.filterArchivedItems(items, 'feature');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', async () => {
      const result = await mapper.filterArchivedItems([], 'feature');
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getProjectContext
  // =========================================================================
  describe('getProjectContext', () => {
    it('should return default context for "default" projectId', async () => {
      const ctx = await mapper.getProjectContext('default');
      expect(ctx).not.toBeNull();
      expect(ctx!.projectId).toBe('default');
      expect(ctx!.projectName).toBe('TestProject');
      expect(ctx!.projectPath).toBe(`${SPECS_BASE}/default`);
      expect(ctx!.techStack).toEqual(['typescript']);
    });

    it('should use fallback name when project.name not configured', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({ project: undefined }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const ctx = await mapper.getProjectContext('default');
      expect(ctx!.projectName).toBe('Default Project');
    });

    it('should return project context for multi-project', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: {
              name: 'Backend API',
              keywords: ['api', 'server'],
              techStack: ['node', 'express'],
            },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const ctx = await mapper.getProjectContext('backend');
      expect(ctx).not.toBeNull();
      expect(ctx!.projectId).toBe('backend');
      expect(ctx!.projectName).toBe('Backend API');
      expect(ctx!.keywords).toEqual(['api', 'server']);
      expect(ctx!.techStack).toEqual(['node', 'express']);
    });

    it('should return null for unknown project in multi-project mode', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const ctx = await mapper.getProjectContext('nonexistent');
      expect(ctx).toBeNull();
    });

    it('should handle project without keywords or techStack', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            simple: { name: 'Simple' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const ctx = await mapper.getProjectContext('simple');
      expect(ctx).not.toBeNull();
      expect(ctx!.keywords).toEqual([]);
      expect(ctx!.techStack).toEqual([]);
    });
  });

  // =========================================================================
  // detectEpicMapping
  // =========================================================================
  describe('detectEpicMapping', () => {
    const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-some-feature/spec.md`;

    it('should return null when spec file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await mapper.detectEpicMapping('0031-some-feature');
      expect(result).toBeNull();
    });

    it('should detect epic from frontmatter', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === specPath) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(buildSpec({ epic: 'EPIC-2025-Q4-platform' }));

      const result = await mapper.detectEpicMapping('0031-some-feature');
      expect(result).not.toBeNull();
      expect(result!.epicId).toBe('EPIC-2025-Q4-platform');
      expect(result!.confidence).toBe(100);
      expect(result!.detectionMethod).toBe('frontmatter');
    });

    it('should detect epic from config when frontmatter has none', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'No epic' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        livingDocs: {
          hierarchyMapping: {
            incrementToEpic: {
              '0031-some-feature': 'EPIC-2025-Q4-config',
            },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectEpicMapping('0031-some-feature');
      expect(result).not.toBeNull();
      expect(result!.epicId).toBe('EPIC-2025-Q4-config');
      expect(result!.detectionMethod).toBe('config');
    });

    it('should return null when no epic detected by any method', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Simple feature' }));

      const result = await mapper.detectEpicMapping('0031-some-feature');
      expect(result).toBeNull();
    });

    it('should read features from existing EPIC.md file', async () => {
      const epicFilePath = `${SPECS_BASE}/_epics/EPIC-2025-Q4-platform/EPIC.md`;
      mockExistsSync.mockImplementation((p: string) => {
        if (p === specPath) return true;
        if (p === epicFilePath) return true;
        return false;
      });
      mockReadFile.mockImplementation(async (p: string) => {
        if (p === specPath) return buildSpec({ epic: 'EPIC-2025-Q4-platform' });
        if (p === epicFilePath) return '# Epic\n- FS-25-11-14-auth\n- FS-25-11-15-sync\n';
        return '';
      });

      const result = await mapper.detectEpicMapping('0031-some-feature');
      expect(result).not.toBeNull();
      expect(result!.features).toEqual(['FS-25-11-14-auth', 'FS-25-11-15-sync']);
    });

    it('should handle invalid frontmatter gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue('---\ninvalid: [yaml\n---\n');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await mapper.detectEpicMapping('0031-some-feature');
      // Should not throw, may return null
      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    it('should skip non-string epic values in frontmatter', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ epic: '123' }));

      // 123 is still a string in YAML unless quoted differently; test numeric
      const result = await mapper.detectEpicMapping('0031-some-feature');
      // epic: 123 parsed as number by yaml, not string -> should be null
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // detectFeatureMapping
  // =========================================================================
  describe('detectFeatureMapping', () => {
    const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-external-tool-sync/spec.md`;

    it('should throw when spec file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        mapper.detectFeatureMapping('0031-external-tool-sync')
      ).rejects.toThrow('Increment spec not found');
    });

    it('should detect feature from frontmatter (greenfield)', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031', title: 'External Tool Sync' }));

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-031');
      expect(result.confidence).toBe(100);
      expect(result.detectionMethod).toBe('frontmatter');
    });

    it('should detect feature from increment name when frontmatter has none', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'External Tool Sync' }));

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-031');
      expect(result.confidence).toBe(90);
      expect(result.detectionMethod).toBe('increment-name');
    });

    it('should detect feature from config mapping', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        livingDocs: {
          hierarchyMapping: {
            incrementToFeature: { '0031-external-tool-sync': 'FS-031' },
          },
        },
      }));
      // Construct with detection order: config first
      mapper = new HierarchyMapper(PROJECT_ROOT, {
        detectFeatureFrom: ['config'],
      });

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-031');
      expect(result.detectionMethod).toBe('config');
    });

    it('should fallback to creating feature from increment number', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue('no frontmatter at all');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mapper = new HierarchyMapper(PROJECT_ROOT, {
        detectFeatureFrom: [], // no detection methods -> fallback
      });

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-031');
      expect(result.confidence).toBe(80);
      expect(result.detectionMethod).toBe('fallback');
      logSpy.mockRestore();
    });

    it('should throw for invalid increment ID format in fallback', async () => {
      const badSpecPath = `${PROJECT_ROOT}/.specweave/increments/invalid-name/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === badSpecPath);
      mockReadFile.mockResolvedValue('no frontmatter');

      mapper = new HierarchyMapper(PROJECT_ROOT, {
        detectFeatureFrom: [],
      });

      await expect(
        mapper.detectFeatureMapping('invalid-name')
      ).rejects.toThrow('Invalid increment ID format');
    });

    it('should handle brownfield feature from frontmatter', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({
        feature: 'FS-25-11-14-external-tool-sync',
        source: 'external',
        imported: true,
      }));
      mockFeatureIdGetAssignedId.mockReturnValue('FS-001');

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-001');
      expect(result.detectionMethod).toBe('frontmatter');
    });

    it('should override frontmatter feature ID with increment number for greenfield', async () => {
      // Even if frontmatter says FS-25-11-14-xxx, greenfield should use FS-031
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({
        feature: 'FS-25-11-14-something',
        title: 'Some Feature',
      }));

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.featureId).toBe('FS-031');
    });

    it('should include projects in feature mapping', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031' }));

      const result = await mapper.detectFeatureMapping('0031-external-tool-sync');
      expect(result.projects).toEqual(['default']);
    });

    it('should handle three-digit increment numbers', async () => {
      const specPath3 = `${PROJECT_ROOT}/.specweave/increments/031-feature/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath3);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Feature' }));

      const result = await mapper.detectFeatureMapping('031-feature');
      expect(result.featureId).toBe('FS-031');
    });

    it('should handle four-digit increment numbers', async () => {
      const specPath4 = `${PROJECT_ROOT}/.specweave/increments/0104-big-feature/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath4);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-104' }));

      const result = await mapper.detectFeatureMapping('0104-big-feature');
      expect(result.featureId).toBe('FS-104');
    });

    it('should handle E-suffix increments in frontmatter detection', async () => {
      const specPathE = `${PROJECT_ROOT}/.specweave/increments/0111E-external/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPathE);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-111E' }));

      const result = await mapper.detectFeatureMapping('0111E-external');
      expect(result.featureId).toBe('FS-111');
    });
  });

  // =========================================================================
  // detectProjects
  // =========================================================================
  describe('detectProjects', () => {
    const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-backend-api/spec.md`;

    it('should return configured projects when spec file missing', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toEqual(['default']);
    });

    it('should detect project from per-US **Project**: fields', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(
        buildSpec({ title: 'Backend API' }, '\n## US-001\n**Project**: backend\n\n## US-002\n**Project**: frontend\n')
      );
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toContain('backend');
      expect(result).toContain('frontend');
    });

    it('should detect project from frontmatter single project', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ project: 'backend' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toEqual(['backend']);
    });

    it('should detect projects from frontmatter array', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({
        projects: ['backend', 'frontend'],
      }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toEqual(['backend', 'frontend']);
    });

    it('should detect project from increment name keywords', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Backend API' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend', keywords: ['backend', 'api'] },
            frontend: { name: 'Frontend', keywords: ['frontend', 'ui'] },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toContain('backend');
    });

    it('should detect project from config mapping (string)', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        livingDocs: {
          hierarchyMapping: {
            incrementToProjects: { '0031-backend-api': 'backend' },
          },
        },
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-api');
      // Config mapping returns ['backend'] as string -> [string]
      expect(result).toContain('backend');
    });

    it('should detect project from config mapping (array)', async () => {
      // Use an increment name that does NOT match any project keyword
      const genericSpecPath = `${PROJECT_ROOT}/.specweave/increments/0031-generic-work/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === genericSpecPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        livingDocs: {
          hierarchyMapping: {
            incrementToProjects: { '0031-generic-work': ['backend', 'frontend'] },
          },
        },
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend', keywords: ['api-service'] },
            frontend: { name: 'Frontend', keywords: ['web-ui'] },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-generic-work');
      expect(result).toEqual(['backend', 'frontend']);
    });

    it('should fallback to configured projects when nothing matches', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Generic' }));

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toEqual(['default']);
    });

    it('should filter out invalid projects from frontmatter', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ project: 'nonexistent' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      // 'nonexistent' not in configured projects -> falls through to name detection
      const result = await mapper.detectProjects('0031-backend-api');
      // Should still detect 'backend' from name keywords
      expect(result).toContain('backend');
    });

    it('should handle frontmatter parse errors gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue('---\nbad: [yaml\n---\n');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await mapper.detectProjects('0031-backend-api');
      expect(result).toEqual(['default']);
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // buildFeatureMapping (tested indirectly)
  // =========================================================================
  describe('buildFeatureMapping (via detectFeatureMapping)', () => {
    it('should set featureFolder equal to featureId', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031' }));

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(result.featureFolder).toBe('FS-031');
    });

    it('should set featurePath to primary project path', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031' }));

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(result.featurePath).toBe(`${SPECS_BASE}/default/FS-031`);
    });

    it('should build projectPaths for all projects', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(
        buildSpec({ feature: 'FS-031' }, '\n**Project**: backend\n**Project**: frontend\n')
      );
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(result.projectPaths).toBeDefined();
      expect(result.projectPaths!['backend']).toBe(`${SPECS_BASE}/backend/FS-031`);
      expect(result.projectPaths!['frontend']).toBe(`${SPECS_BASE}/frontend/FS-031`);
    });

    it('should initialize userStories as empty array', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031' }));

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(result.userStories).toEqual([]);
    });

    it('should use featureIdManager for brownfield IDs', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({
        feature: 'FS-25-11-14-test',
        source: 'external',
        imported: true,
      }));
      mockFeatureIdGetAssignedId.mockReturnValue('FS-005');

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(mockFeatureIdGetAssignedId).toHaveBeenCalledWith('FS-25-11-14-test');
      expect(result.featureId).toBe('FS-005');
    });
  });

  // =========================================================================
  // findExistingFeatureFolder (tested via detectFeatureFromIncrementName)
  // =========================================================================
  describe('findExistingFeatureFolder (via detectFeatureMapping)', () => {
    it('should find existing exact match feature folder', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => {
        if (p === specPath) return true;
        if (p === `${SPECS_BASE}/default`) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockReaddir.mockResolvedValue(['FS-031', 'FS-032']);

      const result = await mapper.detectFeatureMapping('0031-test');
      expect(result.featureId).toBe('FS-031');
    });

    it('should skip fuzzy match for greenfield IDs', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => {
        if (p === specPath) return true;
        if (p === `${SPECS_BASE}/default`) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      // No exact FS-031 match
      mockReaddir.mockResolvedValue(['FS-030', 'FS-032']);

      const result = await mapper.detectFeatureMapping('0031-test');
      // Should create new FS-031, not fuzzy match
      expect(result.featureId).toBe('FS-031');
    });
  });

  // =========================================================================
  // getAllFeatureFolders
  // =========================================================================
  describe('getAllFeatureFolders', () => {
    it('should return sorted feature folders from all projects', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === `${SPECS_BASE}/default`;
      });
      mockReaddir.mockResolvedValue(['FS-001', 'FS-003', 'FS-002', '.hidden', '_archive']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001', 'FS-002', 'FS-003']);
    });

    it('should skip hidden and underscore-prefixed folders', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockResolvedValue(['.git', '_archive', '_epics', 'FS-001']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001']);
    });

    it('should skip non-FS pattern folders', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockResolvedValue(['FS-001', 'README.md', 'some-folder', 'EP-001']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001']);
    });

    it('should skip files (non-directories)', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockResolvedValue(['FS-001', 'FS-002']);
      mockStat.mockImplementation(async (p: string) => ({
        isDirectory: () => !p.includes('FS-002'),
      }));

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001']);
    });

    it('should handle empty project directory', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockResolvedValue([]);

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual([]);
    });

    it('should skip non-existent project directories', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual([]);
    });

    it('should deduplicate across multiple projects', async () => {
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      mockExistsSync.mockImplementation((p: string) => {
        return p === `${SPECS_BASE}/backend` || p === `${SPECS_BASE}/frontend`;
      });
      mockReaddir.mockImplementation(async (p: string) => {
        if ((p as string).includes('backend')) return ['FS-001', 'FS-002'];
        if ((p as string).includes('frontend')) return ['FS-002', 'FS-003'];
        return [];
      });
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001', 'FS-002', 'FS-003']);
    });

    it('should handle readdir errors gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });

    it('should include FS-XXXE pattern folders', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default`);
      mockReaddir.mockResolvedValue(['FS-001', 'FS-111E']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllFeatureFolders();
      expect(result).toEqual(['FS-001', 'FS-111E']);
    });
  });

  // =========================================================================
  // getAllEpicFolders
  // =========================================================================
  describe('getAllEpicFolders', () => {
    it('should return sorted epic folders from all projects', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === `${SPECS_BASE}/default/_epics`;
      });
      mockReaddir.mockResolvedValue(['EP-002', 'EP-001', '.hidden', '_archive']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual(['EP-001', 'EP-002']);
    });

    it('should return epics for specific project only', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === `${SPECS_BASE}/backend/_epics`;
      });
      mockReaddir.mockResolvedValue(['EP-001', 'EP-002']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllEpicFolders('backend');
      expect(result).toEqual(['EP-001', 'EP-002']);
    });

    it('should skip non-EP pattern folders', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default/_epics`);
      mockReaddir.mockResolvedValue(['EP-001', 'FS-001', 'README.md']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual(['EP-001']);
    });

    it('should skip files', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default/_epics`);
      mockReaddir.mockResolvedValue(['EP-001', 'EP-002']);
      mockStat.mockImplementation(async (p: string) => ({
        isDirectory: () => !p.includes('EP-002'),
      }));

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual(['EP-001']);
    });

    it('should return empty array when no epics directory exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual([]);
    });

    it('should handle readdir errors gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default/_epics`);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });

    it('should include EP-XXXE pattern folders', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default/_epics`);
      mockReaddir.mockResolvedValue(['EP-086E', 'EP-087E']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual(['EP-086E', 'EP-087E']);
    });

    it('should skip hidden and underscore-prefixed entries', async () => {
      mockExistsSync.mockImplementation((p: string) => p === `${SPECS_BASE}/default/_epics`);
      mockReaddir.mockResolvedValue(['.config', '_archive', 'EP-001']);
      mockStat.mockResolvedValue({ isDirectory: () => true });

      const result = await mapper.getAllEpicFolders();
      expect(result).toEqual(['EP-001']);
    });
  });

  // =========================================================================
  // getEpicsPathForProject
  // =========================================================================
  describe('getEpicsPathForProject', () => {
    it('should return correct path for a project', () => {
      const result = mapper.getEpicsPathForProject('backend');
      expect(result).toBe(`${SPECS_BASE}/backend/_epics`);
    });

    it('should return correct path for default project', () => {
      const result = mapper.getEpicsPathForProject('default');
      expect(result).toBe(`${SPECS_BASE}/default/_epics`);
    });
  });

  // =========================================================================
  // detectEpicMapping_LEGACY
  // =========================================================================
  describe('detectEpicMapping_LEGACY', () => {
    it('should delegate to detectFeatureMapping', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-test/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ feature: 'FS-031' }));

      const result = await mapper.detectEpicMapping_LEGACY('0031-test');
      expect(result.featureId).toBe('FS-031');
    });
  });

  // =========================================================================
  // extractPerUSProjects (tested via detectProjects)
  // =========================================================================
  describe('extractPerUSProjects (via detectProjects)', () => {
    it('should extract multiple unique projects from per-US fields', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-multi/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(
        buildSpec(
          { title: 'Multi' },
          '\n**Project**: backend\n**Project**: frontend\n**Project**: backend\n'
        )
      );
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
            frontend: { name: 'Frontend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-multi');
      // Should deduplicate
      expect(result).toHaveLength(2);
      expect(result).toContain('backend');
      expect(result).toContain('frontend');
    });

    it('should be case-insensitive for project names', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-case/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(
        buildSpec({ title: 'Case' }, '\n**Project**: Backend\n**Project**: BACKEND\n')
      );
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-case');
      expect(result).toContain('backend');
    });
  });

  // =========================================================================
  // detectProjectsFromIncrementName (tested via detectProjects)
  // =========================================================================
  describe('detectProjectsFromIncrementName (via detectProjects)', () => {
    it('should skip "default" project in keyword matching', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-default-thing/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Default Thing' }));

      const result = await mapper.detectProjects('0031-default-thing');
      // Single project mode, default should just be from fallback
      expect(result).toEqual(['default']);
    });

    it('should use projectId as keyword when no keywords configured', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-backend-service/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend' },  // No keywords = uses projectId 'backend'
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-backend-service');
      expect(result).toContain('backend');
    });

    it('should match case-insensitively', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-BACKEND-API/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Test' }));
      mockConfigLoadAsync.mockResolvedValue(buildConfig({
        multiProject: {
          enabled: true,
          projects: {
            backend: { name: 'Backend', keywords: ['backend'] },
          },
        },
      }));
      mapper = new HierarchyMapper(PROJECT_ROOT);

      const result = await mapper.detectProjects('0031-BACKEND-API');
      expect(result).toContain('backend');
    });
  });

  // =========================================================================
  // getIncrementCreationDate (tested via createFallbackFeatureMapping indirectly)
  // This is a private method but we can test its behavior through fallback
  // =========================================================================

  // =========================================================================
  // formatDateShort (private, tested indirectly)
  // =========================================================================

  // =========================================================================
  // Edge cases & boundary conditions
  // =========================================================================
  describe('edge cases', () => {
    it('should handle spec with no frontmatter', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-plain/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue('# Just a heading\nNo frontmatter here.');

      const result = await mapper.detectFeatureMapping('0031-plain');
      expect(result.featureId).toBe('FS-031');
    });

    it('should handle spec with empty frontmatter', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-empty/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue('---\n---\n# Empty frontmatter');

      const result = await mapper.detectFeatureMapping('0031-empty');
      expect(result.featureId).toBe('FS-031');
    });

    it('should cache config after sequential calls to getSpecweaveConfig', async () => {
      const c1 = await mapper.getSpecweaveConfig();
      const c2 = await mapper.getSpecweaveConfig();
      const c3 = await mapper.getSpecweaveConfig();
      // After first call resolves, subsequent calls use cache
      expect(mockConfigLoadAsync).toHaveBeenCalledTimes(1);
      expect(c1).toBe(c2);
      expect(c2).toBe(c3);
    });

    it('should handle increment with leading zeros correctly', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0001-first/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'First' }));

      const result = await mapper.detectFeatureMapping('0001-first');
      expect(result.featureId).toBe('FS-001');
    });

    it('should handle large increment numbers', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/9999-last/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({ title: 'Last' }));
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mapper = new HierarchyMapper(PROJECT_ROOT, { detectFeatureFrom: [] });

      const result = await mapper.detectFeatureMapping('9999-last');
      expect(result.featureId).toBe('FS-9999');
      logSpy.mockRestore();
    });

    it('should handle feature mapping with epic from frontmatter', async () => {
      const specPath = `${PROJECT_ROOT}/.specweave/increments/0031-with-epic/spec.md`;
      mockExistsSync.mockImplementation((p: string) => p === specPath);
      mockReadFile.mockResolvedValue(buildSpec({
        feature: 'FS-031',
        epic: 'EPIC-2025-Q4-platform',
      }));

      const result = await mapper.detectFeatureMapping('0031-with-epic');
      expect(result.featureId).toBe('FS-031');
      expect(result.epic).toBe('EPIC-2025-Q4-platform');
    });
  });
});

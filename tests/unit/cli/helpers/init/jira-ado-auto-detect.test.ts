/**
 * Unit tests for cli/helpers/init/jira-ado-auto-detect.ts
 *
 * Tests the JIRA/ADO auto-detection logic including:
 * - Pattern detection (tech-stack, squad-based, domain-based, etc.)
 * - Structure analysis for JIRA and ADO
 * - Hierarchy mapping selection
 * - Coordinator config builders
 * - detectJiraStructure / detectAdoStructure async flows
 * - confirmJiraMapping / confirmAdoMapping interactive flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockOraStart,
  mockOraSucceed,
  mockOraWarn,
  mockOraFail,
  mockSelect,
  mockConfirm,
  mockInput,
  mockJiraClientGetProjects,
  mockFetchBoardsForProject,
  mockFetchAreaPathsForProject,
  mockNormalizeToProjectId,
  mockFetch,
} = vi.hoisted(() => ({
  mockOraStart: vi.fn(),
  mockOraSucceed: vi.fn(),
  mockOraWarn: vi.fn(),
  mockOraFail: vi.fn(),
  mockSelect: vi.fn(),
  mockConfirm: vi.fn(),
  mockInput: vi.fn(),
  mockJiraClientGetProjects: vi.fn(),
  mockFetchBoardsForProject: vi.fn(),
  mockFetchAreaPathsForProject: vi.fn(),
  mockNormalizeToProjectId: vi.fn((name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  ),
  mockFetch: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const chalkProxy: any = new Proxy(passthrough, {
    get: () => passthrough,
  });
  return { default: chalkProxy };
});

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn(function (this: any) {
      mockOraStart();
      return this;
    }),
    succeed: vi.fn(function (this: any, msg?: string) {
      mockOraSucceed(msg);
      return this;
    }),
    warn: vi.fn(function (this: any, msg?: string) {
      mockOraWarn(msg);
      return this;
    }),
    fail: vi.fn(function (this: any, msg?: string) {
      mockOraFail(msg);
      return this;
    }),
  })),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  confirm: mockConfirm,
  input: mockInput,
}));

vi.mock('../../../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: class JiraClient {
    getProjects = mockJiraClientGetProjects;
  },
}));

vi.mock('../../../../../../plugins/specweave-jira/lib/jira-board-resolver.js', () => ({
  fetchBoardsForProject: mockFetchBoardsForProject,
}));

vi.mock('../../../../../../plugins/specweave-ado/lib/ado-board-resolver.js', () => ({
  fetchAreaPathsForProject: mockFetchAreaPathsForProject,
}));

vi.mock('../../../../../src/utils/project-id-generator.js', () => ({
  normalizeToProjectId: mockNormalizeToProjectId,
}));

// Mock global fetch for ADO detection
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Import the module under test (after mocks)
// ---------------------------------------------------------------------------
import {
  type TeamPattern,
  type JiraProjectInfo,
  type AdoProjectInfo,
  type JiraStructure,
  type AdoStructure,
  type JiraMappingResult,
  type AdoMappingResult,
  type StructureAnalysis,
  JIRA_HIERARCHY_PRESETS,
  ADO_HIERARCHY_PRESETS,
  selectJiraHierarchyMapping,
  selectAdoHierarchyMapping,
  detectJiraStructure,
  detectAdoStructure,
  confirmJiraMapping,
  confirmAdoMapping,
  buildJiraCoordinatorConfig,
  buildAdoCoordinatorConfig,
} from '../../../../../src/cli/helpers/init/jira-ado-auto-detect.js';

import {
  DEFAULT_JIRA_HIERARCHY_MAPPING,
  JIRA_SAFE_HIERARCHY_MAPPING,
  DEFAULT_ADO_HIERARCHY_MAPPING,
  ADO_SAFE_HIERARCHY_MAPPING,
  ADO_SCRUM_HIERARCHY_MAPPING,
} from '../../../../../src/core/types/sync-profile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJiraBoard(name: string, type: 'scrum' | 'kanban' | 'simple' = 'scrum') {
  return { id: Math.floor(Math.random() * 1000), name, type, self: `https://jira.example.com/board/${name}` };
}

function makeAdoArea(name: string, path: string) {
  return { id: Math.floor(Math.random() * 1000), identifier: `id-${name}`, name, path, hasChildren: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jira-ado-auto-detect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Re-stub fetch in case it was restored
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // HIERARCHY PRESETS - JIRA
  // =========================================================================
  describe('JIRA_HIERARCHY_PRESETS', () => {
    it('should have standard, safe, and custom presets', () => {
      expect(JIRA_HIERARCHY_PRESETS).toHaveProperty('standard');
      expect(JIRA_HIERARCHY_PRESETS).toHaveProperty('safe');
      expect(JIRA_HIERARCHY_PRESETS).toHaveProperty('custom');
    });

    it('standard preset should use DEFAULT_JIRA_HIERARCHY_MAPPING', () => {
      expect(JIRA_HIERARCHY_PRESETS.standard.config).toBe(DEFAULT_JIRA_HIERARCHY_MAPPING);
    });

    it('safe preset should use JIRA_SAFE_HIERARCHY_MAPPING', () => {
      expect(JIRA_HIERARCHY_PRESETS.safe.config).toBe(JIRA_SAFE_HIERARCHY_MAPPING);
    });

    it('custom preset should have null config', () => {
      expect(JIRA_HIERARCHY_PRESETS.custom.config).toBeNull();
    });

    it('presets should have name and description', () => {
      for (const key of ['standard', 'safe', 'custom'] as const) {
        expect(JIRA_HIERARCHY_PRESETS[key].name).toBeTruthy();
        expect(JIRA_HIERARCHY_PRESETS[key].description).toBeTruthy();
      }
    });
  });

  // =========================================================================
  // HIERARCHY PRESETS - ADO
  // =========================================================================
  describe('ADO_HIERARCHY_PRESETS', () => {
    it('should have agile, scrum, safe, and custom presets', () => {
      expect(ADO_HIERARCHY_PRESETS).toHaveProperty('agile');
      expect(ADO_HIERARCHY_PRESETS).toHaveProperty('scrum');
      expect(ADO_HIERARCHY_PRESETS).toHaveProperty('safe');
      expect(ADO_HIERARCHY_PRESETS).toHaveProperty('custom');
    });

    it('agile preset should use DEFAULT_ADO_HIERARCHY_MAPPING', () => {
      expect(ADO_HIERARCHY_PRESETS.agile.config).toBe(DEFAULT_ADO_HIERARCHY_MAPPING);
    });

    it('scrum preset should use ADO_SCRUM_HIERARCHY_MAPPING', () => {
      expect(ADO_HIERARCHY_PRESETS.scrum.config).toBe(ADO_SCRUM_HIERARCHY_MAPPING);
    });

    it('safe preset should use ADO_SAFE_HIERARCHY_MAPPING', () => {
      expect(ADO_HIERARCHY_PRESETS.safe.config).toBe(ADO_SAFE_HIERARCHY_MAPPING);
    });

    it('custom preset should have null config', () => {
      expect(ADO_HIERARCHY_PRESETS.custom.config).toBeNull();
    });
  });

  // =========================================================================
  // selectJiraHierarchyMapping
  // =========================================================================
  describe('selectJiraHierarchyMapping()', () => {
    it('should return standard config when user selects standard', async () => {
      mockSelect.mockResolvedValueOnce('standard');
      const result = await selectJiraHierarchyMapping();
      expect(result).toBe(DEFAULT_JIRA_HIERARCHY_MAPPING);
    });

    it('should return safe config when user selects safe', async () => {
      mockSelect.mockResolvedValueOnce('safe');
      const result = await selectJiraHierarchyMapping();
      expect(result).toBe(JIRA_SAFE_HIERARCHY_MAPPING);
    });

    it('should handle custom preset by prompting for input', async () => {
      mockSelect.mockResolvedValueOnce('custom');
      mockInput
        .mockResolvedValueOnce('Initiative')  // epic-level types
        .mockResolvedValueOnce('Epic');        // feature-level types

      const result = await selectJiraHierarchyMapping();
      expect(result.epicLevelTypes).toEqual(['Initiative']);
      expect(result.featureLevelTypes).toEqual(['Epic']);
    });

    it('should handle custom preset with empty epic types', async () => {
      mockSelect.mockResolvedValueOnce('custom');
      mockInput
        .mockResolvedValueOnce('')           // empty epic-level types
        .mockResolvedValueOnce('Epic');      // feature-level types

      const result = await selectJiraHierarchyMapping();
      expect(result.epicLevelTypes).toEqual([]);
      expect(result.featureLevelTypes).toEqual(['Epic']);
    });

    it('should handle custom preset with comma-separated feature types', async () => {
      mockSelect.mockResolvedValueOnce('custom');
      mockInput
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Epic, Feature, Capability');

      const result = await selectJiraHierarchyMapping();
      expect(result.featureLevelTypes).toEqual(['Epic', 'Feature', 'Capability']);
    });
  });

  // =========================================================================
  // selectAdoHierarchyMapping
  // =========================================================================
  describe('selectAdoHierarchyMapping()', () => {
    it('should return agile config when user selects agile', async () => {
      mockSelect.mockResolvedValueOnce('agile');
      const result = await selectAdoHierarchyMapping();
      expect(result).toBe(DEFAULT_ADO_HIERARCHY_MAPPING);
    });

    it('should return scrum config when user selects scrum', async () => {
      mockSelect.mockResolvedValueOnce('scrum');
      const result = await selectAdoHierarchyMapping();
      expect(result).toBe(ADO_SCRUM_HIERARCHY_MAPPING);
    });

    it('should return safe config when user selects safe', async () => {
      mockSelect.mockResolvedValueOnce('safe');
      const result = await selectAdoHierarchyMapping();
      expect(result).toBe(ADO_SAFE_HIERARCHY_MAPPING);
    });

    it('should handle custom preset by prompting for input', async () => {
      mockSelect.mockResolvedValueOnce('custom');
      mockInput
        .mockResolvedValueOnce('Capability')      // epic-level
        .mockResolvedValueOnce('Epic, Feature');   // feature-level

      const result = await selectAdoHierarchyMapping();
      expect(result.epicLevelTypes).toEqual(['Capability']);
      expect(result.featureLevelTypes).toEqual(['Epic', 'Feature']);
    });

    it('should handle custom preset with empty epic types', async () => {
      mockSelect.mockResolvedValueOnce('custom');
      mockInput
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Epic');

      const result = await selectAdoHierarchyMapping();
      expect(result.epicLevelTypes).toEqual([]);
      expect(result.featureLevelTypes).toEqual(['Epic']);
    });
  });

  // =========================================================================
  // detectJiraStructure
  // =========================================================================
  describe('detectJiraStructure()', () => {
    it('should return null when no projects are found', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([]);
      const result = await detectJiraStructure();
      expect(result).toBeNull();
      expect(mockOraWarn).toHaveBeenCalled();
    });

    it('should return null when projects is null', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce(null);
      const result = await detectJiraStructure();
      expect(result).toBeNull();
    });

    it('should return structure for a single project with boards', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'My Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend Board', 'scrum'),
        makeJiraBoard('Backend Board', 'kanban'),
      ]);

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(1);
      expect(result!.projects[0].key).toBe('PROJ');
      expect(result!.totalBoards).toBe(2);
      expect(mockOraSucceed).toHaveBeenCalled();
    });

    it('should handle board fetch errors gracefully', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'P1', name: 'Project 1' },
        { key: 'P2', name: 'Project 2' },
      ]);
      mockFetchBoardsForProject
        .mockResolvedValueOnce([makeJiraBoard('Board 1')])
        .mockRejectedValueOnce(new Error('API error'));

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(2);
      expect(result!.projects[0].boards).toHaveLength(1);
      expect(result!.projects[1].boards).toHaveLength(0);
    });

    it('should return null on overall JIRA client error', async () => {
      mockJiraClientGetProjects.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await detectJiraStructure();
      expect(result).toBeNull();
      expect(mockOraFail).toHaveBeenCalled();
    });

    it('should limit to 20 projects for performance', async () => {
      const projects = Array.from({ length: 25 }, (_, i) => ({
        key: `P${i}`,
        name: `Project ${i}`,
      }));
      mockJiraClientGetProjects.mockResolvedValueOnce(projects);
      mockFetchBoardsForProject.mockResolvedValue([]);

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      // Only first 20 should be processed
      expect(result!.projects).toHaveLength(20);
    });

    it('should recommend simple mode for single project with 0-1 boards', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'My Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([makeJiraBoard('Main')]);

      const result = await detectJiraStructure();
      expect(result!.recommendedMode).toBe('simple');
    });

    it('should recommend by-board for single project with multiple boards', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'My Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend'),
        makeJiraBoard('Backend'),
        makeJiraBoard('Mobile'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.recommendedMode).toBe('by-board');
    });

    it('should recommend by-project for multiple projects with few boards each', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'P1', name: 'Project 1' },
        { key: 'P2', name: 'Project 2' },
        { key: 'P3', name: 'Project 3' },
      ]);
      mockFetchBoardsForProject
        .mockResolvedValueOnce([makeJiraBoard('Board 1')])
        .mockResolvedValueOnce([makeJiraBoard('Board 2')])
        .mockResolvedValueOnce([]);

      const result = await detectJiraStructure();
      // 2 boards / 3 projects = 0.67 avg <= 1.5 => by-project
      expect(result!.recommendedMode).toBe('by-project');
    });

    it('should recommend hybrid for multiple projects with many boards each', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'P1', name: 'Project 1' },
        { key: 'P2', name: 'Project 2' },
      ]);
      mockFetchBoardsForProject
        .mockResolvedValueOnce([makeJiraBoard('B1'), makeJiraBoard('B2'), makeJiraBoard('B3')])
        .mockResolvedValueOnce([makeJiraBoard('B4'), makeJiraBoard('B5')]);

      const result = await detectJiraStructure();
      // 5 boards / 2 projects = 2.5 avg > 1.5 => hybrid
      expect(result!.recommendedMode).toBe('hybrid');
    });

    it('should handle null boards from fetchBoardsForProject', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce(null);

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      expect(result!.projects[0].boards).toEqual([]);
      expect(result!.totalBoards).toBe(0);
    });

    it('should include structure analysis with pattern detection', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'My Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend Board', 'scrum'),
        makeJiraBoard('Backend Board', 'kanban'),
        makeJiraBoard('Mobile Board', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis).toBeDefined();
      expect(result!.analysis.pattern).toBe('tech-stack');
      expect(result!.analysis.scrumBoardCount).toBe(2);
      expect(result!.analysis.kanbanBoardCount).toBe(1);
    });
  });

  // =========================================================================
  // detectAdoStructure
  // =========================================================================
  describe('detectAdoStructure()', () => {
    it('should return null when no projects are found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const result = await detectAdoStructure('myorg', 'mytoken');
      expect(result).toBeNull();
      expect(mockOraWarn).toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await detectAdoStructure('myorg', 'mytoken');
      expect(result).toBeNull();
      expect(mockOraFail).toHaveBeenCalled();
    });

    it('should return structure for projects with area paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'MyProject' }],
        }),
      });
      mockFetchAreaPathsForProject.mockResolvedValueOnce([
        makeAdoArea('Frontend', 'MyProject\\Frontend'),
        makeAdoArea('Backend', 'MyProject\\Backend'),
        // Non-top-level should be filtered out (3 parts)
        makeAdoArea('Sub', 'MyProject\\Frontend\\Sub'),
      ]);

      const result = await detectAdoStructure('myorg', 'mytoken');
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(1);
      // Only top-level area paths (2 parts split by \\)
      expect(result!.projects[0].areaPaths).toHaveLength(2);
      expect(result!.totalAreaPaths).toBe(2);
      expect(mockOraSucceed).toHaveBeenCalled();
    });

    it('should handle area path fetch errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'P1' }, { name: 'P2' }],
        }),
      });
      mockFetchAreaPathsForProject
        .mockResolvedValueOnce([makeAdoArea('Frontend', 'P1\\Frontend')])
        .mockRejectedValueOnce(new Error('fetch error'));

      const result = await detectAdoStructure('myorg', 'mytoken');
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(2);
      expect(result!.projects[1].areaPaths).toHaveLength(0);
    });

    it('should limit to 10 projects for performance', async () => {
      const projects = Array.from({ length: 15 }, (_, i) => ({ name: `Proj${i}` }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: projects }),
      });
      mockFetchAreaPathsForProject.mockResolvedValue([]);

      const result = await detectAdoStructure('myorg', 'mytoken');
      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(10);
    });

    it('should recommend simple for single project with 0-1 area paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ name: 'OnlyProject' }] }),
      });
      mockFetchAreaPathsForProject.mockResolvedValueOnce([
        makeAdoArea('Root', 'OnlyProject\\Root'),
      ]);

      const result = await detectAdoStructure('org', 'pat');
      expect(result!.recommendedMode).toBe('simple');
    });

    it('should recommend by-area for single project with many area paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ name: 'Proj' }] }),
      });
      mockFetchAreaPathsForProject.mockResolvedValueOnce([
        makeAdoArea('Frontend', 'Proj\\Frontend'),
        makeAdoArea('Backend', 'Proj\\Backend'),
        makeAdoArea('Mobile', 'Proj\\Mobile'),
      ]);

      const result = await detectAdoStructure('org', 'pat');
      expect(result!.recommendedMode).toBe('by-area');
    });

    it('should recommend by-project for multiple projects with few areas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }],
        }),
      });
      mockFetchAreaPathsForProject
        .mockResolvedValueOnce([makeAdoArea('A', 'P1\\A')])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeAdoArea('B', 'P3\\B')]);

      const result = await detectAdoStructure('org', 'pat');
      // 2 areas / 3 projects = 0.67 avg <= 1.5
      expect(result!.recommendedMode).toBe('by-project');
    });

    it('should recommend by-area for multiple projects with many areas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'P1' }, { name: 'P2' }],
        }),
      });
      mockFetchAreaPathsForProject
        .mockResolvedValueOnce([
          makeAdoArea('FE', 'P1\\FE'),
          makeAdoArea('BE', 'P1\\BE'),
          makeAdoArea('QA', 'P1\\QA'),
        ])
        .mockResolvedValueOnce([
          makeAdoArea('Core', 'P2\\Core'),
          makeAdoArea('Infra', 'P2\\Infra'),
        ]);

      const result = await detectAdoStructure('org', 'pat');
      // 5 areas / 2 projects = 2.5 avg > 1.5
      expect(result!.recommendedMode).toBe('by-area');
    });

    it('should pass correct auth header to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [] })),
      });

      await detectAdoStructure('my-org', 'my-pat-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.azure.com/my-org/_apis/projects?api-version=7.0',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${Buffer.from(':my-pat-123').toString('base64')}`,
          }),
        }),
      );
    });

    it('should handle non-Error exception in catch', async () => {
      mockFetch.mockRejectedValueOnce('string-error');

      const result = await detectAdoStructure('org', 'pat');
      expect(result).toBeNull();
      expect(mockOraFail).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // confirmJiraMapping
  // =========================================================================
  describe('confirmJiraMapping()', () => {
    const baseStructure: JiraStructure = {
      projects: [
        { key: 'CORE', name: 'Core', boards: [makeJiraBoard('Main Board', 'scrum')] },
      ],
      totalBoards: 1,
      recommendedMode: 'simple',
      analysis: {
        pattern: 'unknown',
        confidence: 'low',
        reasoning: 'No clear pattern',
        scrumBoardCount: 1,
        kanbanBoardCount: 0,
        suggestedMapping: ['JIRA-core/main-board'],
      },
    };

    it('should create simple mappings when user selects simple', async () => {
      mockSelect
        .mockResolvedValueOnce('simple')     // mode selection
        .mockResolvedValueOnce('standard');   // hierarchy selection

      const result = await confirmJiraMapping(baseStructure);
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('simple');
      expect(result!.mappings.get('CORE')!.get('*')).toBe('jira');
    });

    it('should create by-project mappings', async () => {
      mockSelect
        .mockResolvedValueOnce('by-project')
        .mockResolvedValueOnce('standard');

      const result = await confirmJiraMapping(baseStructure);
      expect(result!.mode).toBe('by-project');
      expect(result!.mappings.get('CORE')!.get('*')).toBe('JIRA-core');
    });

    it('should create hybrid mappings with board-based folders', async () => {
      const multiBoard: JiraStructure = {
        ...baseStructure,
        projects: [
          {
            key: 'PROJ',
            name: 'Project',
            boards: [
              makeJiraBoard('Frontend', 'scrum'),
              makeJiraBoard('Backend', 'kanban'),
            ],
          },
        ],
        totalBoards: 2,
        recommendedMode: 'hybrid',
      };

      mockSelect
        .mockResolvedValueOnce('hybrid')
        .mockResolvedValueOnce('standard');

      const result = await confirmJiraMapping(multiBoard);
      expect(result!.mode).toBe('hybrid');
      const boardMap = result!.mappings.get('PROJ')!;
      expect(boardMap.get('Frontend')).toBe('JIRA-proj/frontend');
      expect(boardMap.get('Backend')).toBe('JIRA-proj/backend');
    });

    it('should create default folder for projects with no boards in hybrid mode', async () => {
      const noBoardStructure: JiraStructure = {
        ...baseStructure,
        projects: [
          { key: 'EMPTY', name: 'Empty', boards: [] },
        ],
        recommendedMode: 'hybrid',
      };

      mockSelect
        .mockResolvedValueOnce('hybrid')
        .mockResolvedValueOnce('standard');

      const result = await confirmJiraMapping(noBoardStructure);
      expect(result!.mappings.get('EMPTY')!.get('*')).toBe('JIRA-empty/default');
    });

    it('should include hierarchy mapping in result', async () => {
      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('safe');

      const result = await confirmJiraMapping(baseStructure);
      expect(result!.hierarchyMapping).toBe(JIRA_SAFE_HIERARCHY_MAPPING);
    });

    it('should display more than 10 projects with truncation message', async () => {
      const manyProjects: JiraStructure = {
        ...baseStructure,
        projects: Array.from({ length: 15 }, (_, i) => ({
          key: `P${i}`,
          name: `Project ${i}`,
          boards: [],
        })),
      };

      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('standard');

      await confirmJiraMapping(manyProjects);
      // Should not throw, should handle display gracefully
    });

    it('should display analysis with scrum and kanban board counts', async () => {
      const structureWithBoards: JiraStructure = {
        ...baseStructure,
        analysis: {
          ...baseStructure.analysis,
          pattern: 'tech-stack',
          confidence: 'high',
          scrumBoardCount: 3,
          kanbanBoardCount: 2,
        },
      };

      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('standard');

      await confirmJiraMapping(structureWithBoards);
      // Verifying it does not throw; console.log calls are mocked
    });
  });

  // =========================================================================
  // confirmAdoMapping
  // =========================================================================
  describe('confirmAdoMapping()', () => {
    const baseAdoStructure: AdoStructure = {
      projects: [
        {
          name: 'MyProject',
          areaPaths: [
            makeAdoArea('Frontend', 'MyProject\\Frontend'),
            makeAdoArea('Backend', 'MyProject\\Backend'),
          ],
        },
      ],
      totalAreaPaths: 2,
      recommendedMode: 'by-area',
      analysis: {
        pattern: 'tech-stack',
        confidence: 'high',
        reasoning: 'Teams organized by technology layer',
        scrumBoardCount: 0,
        kanbanBoardCount: 0,
        suggestedMapping: ['myproject/frontend', 'myproject/backend'],
      },
    };

    it('should create simple mappings when user selects simple', async () => {
      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('agile');

      const result = await confirmAdoMapping(baseAdoStructure);
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('simple');
      expect(result!.mappings.get('MyProject')!.get('*')).toBe('ado');
    });

    it('should create by-project mappings', async () => {
      mockSelect
        .mockResolvedValueOnce('by-project')
        .mockResolvedValueOnce('agile');

      const result = await confirmAdoMapping(baseAdoStructure);
      expect(result!.mode).toBe('by-project');
      expect(result!.mappings.get('MyProject')!.get('*')).toBe('myproject');
    });

    it('should create by-area mappings with area-based folders', async () => {
      mockSelect
        .mockResolvedValueOnce('by-area')
        .mockResolvedValueOnce('agile');

      const result = await confirmAdoMapping(baseAdoStructure);
      expect(result!.mode).toBe('by-area');
      const areaMap = result!.mappings.get('MyProject')!;
      expect(areaMap.get('MyProject\\Frontend')).toBe('myproject/frontend');
      expect(areaMap.get('MyProject\\Backend')).toBe('myproject/backend');
    });

    it('should create default folder for projects with no area paths in by-area mode', async () => {
      const emptyStructure: AdoStructure = {
        ...baseAdoStructure,
        projects: [{ name: 'EmptyProj', areaPaths: [] }],
      };

      mockSelect
        .mockResolvedValueOnce('by-area')
        .mockResolvedValueOnce('agile');

      const result = await confirmAdoMapping(emptyStructure);
      expect(result!.mappings.get('EmptyProj')!.get('*')).toBe('emptyproj/_default');
    });

    it('should include hierarchy mapping in result', async () => {
      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('scrum');

      const result = await confirmAdoMapping(baseAdoStructure);
      expect(result!.hierarchyMapping).toBe(ADO_SCRUM_HIERARCHY_MAPPING);
    });

    it('should display more than 10 projects with truncation message', async () => {
      const manyProjects: AdoStructure = {
        ...baseAdoStructure,
        projects: Array.from({ length: 15 }, (_, i) => ({
          name: `Proj${i}`,
          areaPaths: [],
        })),
      };

      mockSelect
        .mockResolvedValueOnce('simple')
        .mockResolvedValueOnce('agile');

      await confirmAdoMapping(manyProjects);
      // Should not throw
    });
  });

  // =========================================================================
  // buildJiraCoordinatorConfig
  // =========================================================================
  describe('buildJiraCoordinatorConfig()', () => {
    it('should build config with simple mode', () => {
      const baseConfig = { host: 'https://jira.example.com', email: 'a@b.com', apiToken: 'tok' };
      const mapping: JiraMappingResult = {
        mode: 'simple',
        mappings: new Map([['PROJ', new Map([['*', 'jira']])]]),
        hierarchyMapping: DEFAULT_JIRA_HIERARCHY_MAPPING,
      };

      const result = buildJiraCoordinatorConfig(baseConfig, mapping);

      expect(result.host).toBe('https://jira.example.com');
      expect(result.email).toBe('a@b.com');
      expect(result.apiToken).toBe('tok');
      expect(result.mode).toBe('simple');
      expect(result.projectMappings).toHaveLength(1);
      expect(result.projectMappings[0].projectKey).toBe('PROJ');
      expect(result.projectMappings[0].boardMappings[0]).toEqual({
        boardName: '*',
        specweaveFolder: 'jira',
      });
      expect(result.hierarchyMapping).toBe(DEFAULT_JIRA_HIERARCHY_MAPPING);
    });

    it('should build config with hybrid mode and multiple projects/boards', () => {
      const mapping: JiraMappingResult = {
        mode: 'hybrid',
        mappings: new Map([
          ['P1', new Map([['FE Board', 'JIRA-p1/fe-board'], ['BE Board', 'JIRA-p1/be-board']])],
          ['P2', new Map([['Main', 'JIRA-p2/main']])],
        ]),
      };

      const result = buildJiraCoordinatorConfig({ host: 'h' }, mapping);

      expect(result.mode).toBe('hybrid');
      expect(result.projectMappings).toHaveLength(2);
      expect(result.projectMappings[0].boardMappings).toHaveLength(2);
      expect(result.projectMappings[1].boardMappings).toHaveLength(1);
      expect(result.hierarchyMapping).toBeUndefined();
    });

    it('should preserve all base config fields', () => {
      const mapping: JiraMappingResult = {
        mode: 'by-project',
        mappings: new Map(),
      };

      const result = buildJiraCoordinatorConfig(
        { host: 'h', email: 'e', apiToken: 'a' },
        mapping,
      );

      expect(result.host).toBe('h');
      expect(result.email).toBe('e');
      expect(result.apiToken).toBe('a');
    });
  });

  // =========================================================================
  // buildAdoCoordinatorConfig
  // =========================================================================
  describe('buildAdoCoordinatorConfig()', () => {
    it('should build config with simple mode', () => {
      const baseConfig = { orgUrl: 'https://dev.azure.com/org', project: 'proj', pat: 'mypat' };
      const mapping: AdoMappingResult = {
        mode: 'simple',
        mappings: new Map([['MyProject', new Map([['*', 'ado']])]]),
        hierarchyMapping: DEFAULT_ADO_HIERARCHY_MAPPING,
      };

      const result = buildAdoCoordinatorConfig(baseConfig, mapping);

      expect(result.orgUrl).toBe('https://dev.azure.com/org');
      expect(result.project).toBe('proj');
      expect(result.pat).toBe('mypat');
      expect(result.mode).toBe('simple');
      expect(result.projectMappings).toHaveLength(1);
      expect(result.projectMappings[0].projectName).toBe('MyProject');
      expect(result.projectMappings[0].areaMappings[0]).toEqual({
        areaPath: '*',
        specweaveFolder: 'ado',
      });
      expect(result.hierarchyMapping).toBe(DEFAULT_ADO_HIERARCHY_MAPPING);
    });

    it('should build config with by-area mode and multiple projects', () => {
      const mapping: AdoMappingResult = {
        mode: 'by-area',
        mappings: new Map([
          ['P1', new Map([['P1\\FE', 'p1/fe'], ['P1\\BE', 'p1/be']])],
          ['P2', new Map([['*', 'p2/_default']])],
        ]),
      };

      const result = buildAdoCoordinatorConfig(
        { orgUrl: 'u', project: 'p' },
        mapping,
      );

      expect(result.mode).toBe('by-area');
      expect(result.projectMappings).toHaveLength(2);
      expect(result.projectMappings[0].areaMappings).toHaveLength(2);
      expect(result.projectMappings[1].areaMappings).toHaveLength(1);
      expect(result.hierarchyMapping).toBeUndefined();
    });

    it('should preserve all base config fields', () => {
      const mapping: AdoMappingResult = {
        mode: 'by-project',
        mappings: new Map(),
      };

      const result = buildAdoCoordinatorConfig(
        { orgUrl: 'u', project: 'p', pat: 'x' },
        mapping,
      );

      expect(result.orgUrl).toBe('u');
      expect(result.project).toBe('p');
      expect(result.pat).toBe('x');
    });
  });

  // =========================================================================
  // Pattern Detection (tested through analyzeJiraStructureDeep / analyzeAdoStructureDeep)
  // =========================================================================
  describe('pattern detection via structure analysis', () => {
    it('should detect tech-stack pattern from board names', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend Board', 'scrum'),
        makeJiraBoard('Backend Board', 'kanban'),
        makeJiraBoard('Mobile Board', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('tech-stack');
      expect(result!.analysis.confidence).toBe('high');
    });

    it('should detect squad-based pattern from board names', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Team Alpha', 'scrum'),
        makeJiraBoard('Squad Beta', 'scrum'),
        makeJiraBoard('Pod Gamma', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('squad-based');
    });

    it('should detect domain-based pattern from board names', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Payment Processing', 'scrum'),
        makeJiraBoard('User Management', 'kanban'),
        makeJiraBoard('Order Fulfillment', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('domain-based');
    });

    it('should detect service-based pattern', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Platform Team', 'scrum'),
        makeJiraBoard('Infrastructure Board', 'kanban'),
        makeJiraBoard('DevOps Team', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('service-based');
    });

    it('should detect feature-based pattern', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Feature Launch', 'scrum'),
        makeJiraBoard('Epic Overhaul', 'kanban'),
        makeJiraBoard('Initiative 2025', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('feature-based');
    });

    it('should detect mixed pattern when many pattern categories match', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      // Names that match tech-stack, squad-based, and domain-based => 3 patterns => mixed
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend', 'scrum'),
        makeJiraBoard('Team Alpha', 'scrum'),
        makeJiraBoard('Payment', 'scrum'),
        makeJiraBoard('Platform', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      // 4 matches across 4 categories > 2 => mixed
      expect(result!.analysis.pattern).toBe('mixed');
    });

    it('should detect unknown pattern when no keywords match', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('XYZ Board', 'scrum'),
        makeJiraBoard('ABC Board', 'kanban'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('unknown');
      expect(result!.analysis.confidence).toBe('low');
    });

    it('should assign confidence based on coverage ratio', async () => {
      // All names match same pattern => high confidence (coverage > 0.7)
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend', 'scrum'),
        makeJiraBoard('Backend', 'kanban'),
        makeJiraBoard('Mobile', 'scrum'),
        makeJiraBoard('Web App', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('tech-stack');
      expect(result!.analysis.confidence).toBe('high');
    });

    it('should assign medium confidence when coverage is moderate', async () => {
      // 2 out of 4 match => 50% coverage => medium
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend', 'scrum'),
        makeJiraBoard('Backend', 'kanban'),
        makeJiraBoard('Zebra', 'scrum'),
        makeJiraBoard('Giraffe', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('tech-stack');
      expect(result!.analysis.confidence).toBe('medium');
    });

    it('should assign low confidence when few names match', async () => {
      // 1 out of 5 match => 20% coverage => low
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend', 'scrum'),
        makeJiraBoard('Zebra', 'kanban'),
        makeJiraBoard('Giraffe', 'scrum'),
        makeJiraBoard('Lion', 'scrum'),
        makeJiraBoard('Tiger', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.pattern).toBe('tech-stack');
      expect(result!.analysis.confidence).toBe('low');
    });
  });

  // =========================================================================
  // ADO pattern detection (through detectAdoStructure)
  // =========================================================================
  describe('ADO pattern detection via structure analysis', () => {
    it('should detect pattern from area path names', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'Proj' }],
        }),
      });
      mockFetchAreaPathsForProject.mockResolvedValueOnce([
        makeAdoArea('Frontend', 'Proj\\Frontend'),
        makeAdoArea('Backend', 'Proj\\Backend'),
        makeAdoArea('Mobile', 'Proj\\Mobile'),
      ]);

      const result = await detectAdoStructure('org', 'pat');
      expect(result!.analysis.pattern).toBe('tech-stack');
      // ADO analysis always has 0 scrum/kanban counts
      expect(result!.analysis.scrumBoardCount).toBe(0);
      expect(result!.analysis.kanbanBoardCount).toBe(0);
    });

    it('should generate suggested mappings from area paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ name: 'MyProj' }],
        }),
      });
      mockFetchAreaPathsForProject.mockResolvedValueOnce([
        makeAdoArea('FrontEnd', 'MyProj\\FrontEnd'),
        makeAdoArea('BackEnd', 'MyProj\\BackEnd'),
      ]);

      const result = await detectAdoStructure('org', 'pat');
      expect(result!.analysis.suggestedMapping.length).toBeGreaterThan(0);
      // normalizeToProjectId is mocked; check that mapping contains generated paths
      expect(result!.analysis.suggestedMapping[0]).toContain('/');
    });
  });

  // =========================================================================
  // Reasoning generation
  // =========================================================================
  describe('reasoning generation (via analysis)', () => {
    it('should include board type info in reasoning for JIRA', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Main', 'scrum'),
        makeJiraBoard('Other', 'kanban'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.reasoning).toContain('Scrum');
      expect(result!.analysis.reasoning).toContain('Kanban');
    });

    it('should include pattern description in reasoning', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Frontend', 'scrum'),
        makeJiraBoard('Backend', 'scrum'),
        makeJiraBoard('Mobile', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.reasoning).toContain('technology layer');
    });

    it('should include matched examples in reasoning', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Team Alpha', 'scrum'),
        makeJiraBoard('Squad Beta', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.reasoning).toContain('Found:');
    });
  });

  // =========================================================================
  // Suggested mappings
  // =========================================================================
  describe('suggested mappings in analysis', () => {
    it('should generate JIRA suggested mappings with JIRA- prefix', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'CORE', name: 'Core' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('Sprint Board', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result!.analysis.suggestedMapping.length).toBeGreaterThan(0);
      expect(result!.analysis.suggestedMapping[0]).toMatch(/^JIRA-/);
    });

    it('should limit suggested mappings to first 2 projects and 2 boards each', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'P1', name: 'Project 1' },
        { key: 'P2', name: 'Project 2' },
        { key: 'P3', name: 'Project 3' },
      ]);
      mockFetchBoardsForProject
        .mockResolvedValueOnce([makeJiraBoard('B1'), makeJiraBoard('B2'), makeJiraBoard('B3')])
        .mockResolvedValueOnce([makeJiraBoard('B4'), makeJiraBoard('B5'), makeJiraBoard('B6')])
        .mockResolvedValueOnce([makeJiraBoard('B7')]);

      const result = await detectJiraStructure();
      // Max 2 projects * 2 boards = 4 suggested mappings
      expect(result!.analysis.suggestedMapping.length).toBeLessThanOrEqual(4);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle empty board names in pattern detection', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce([
        makeJiraBoard('', 'scrum'),
      ]);

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      expect(result!.analysis.pattern).toBe('unknown');
    });

    it('should handle project with mixed null and valid boards', async () => {
      mockJiraClientGetProjects.mockResolvedValueOnce([
        { key: 'PROJ', name: 'Project' },
      ]);
      mockFetchBoardsForProject.mockResolvedValueOnce(null);

      const result = await detectJiraStructure();
      expect(result).not.toBeNull();
      expect(result!.totalBoards).toBe(0);
    });

    it('should handle ADO with missing value in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // no value field
      });

      const result = await detectAdoStructure('org', 'pat');
      expect(result).toBeNull();
    });

    it('buildJiraCoordinatorConfig handles empty mappings', () => {
      const result = buildJiraCoordinatorConfig(
        { host: 'h' },
        { mode: 'simple', mappings: new Map() },
      );
      expect(result.projectMappings).toHaveLength(0);
    });

    it('buildAdoCoordinatorConfig handles empty mappings', () => {
      const result = buildAdoCoordinatorConfig(
        { orgUrl: 'u', project: 'p' },
        { mode: 'simple', mappings: new Map() },
      );
      expect(result.projectMappings).toHaveLength(0);
    });

    it('should handle confirmJiraMapping with all pattern types in analysis emoji', async () => {
      const patterns: TeamPattern[] = ['tech-stack', 'squad-based', 'domain-based', 'service-based', 'feature-based', 'mixed', 'unknown'];
      for (const pattern of patterns) {
        const structure: JiraStructure = {
          projects: [{ key: 'P', name: 'P', boards: [] }],
          totalBoards: 0,
          recommendedMode: 'simple',
          analysis: {
            pattern,
            confidence: 'high',
            reasoning: 'test',
            scrumBoardCount: 0,
            kanbanBoardCount: 0,
            suggestedMapping: [],
          },
        };

        mockSelect
          .mockResolvedValueOnce('simple')
          .mockResolvedValueOnce('standard');

        const result = await confirmJiraMapping(structure);
        expect(result).not.toBeNull();
      }
    });

    it('should handle confirmAdoMapping with all pattern types in analysis emoji', async () => {
      const patterns: TeamPattern[] = ['tech-stack', 'squad-based', 'domain-based', 'service-based', 'feature-based', 'mixed', 'unknown'];
      for (const pattern of patterns) {
        const structure: AdoStructure = {
          projects: [{ name: 'P', areaPaths: [] }],
          totalAreaPaths: 0,
          recommendedMode: 'simple',
          analysis: {
            pattern,
            confidence: 'high',
            reasoning: 'test',
            scrumBoardCount: 0,
            kanbanBoardCount: 0,
            suggestedMapping: [],
          },
        };

        mockSelect
          .mockResolvedValueOnce('simple')
          .mockResolvedValueOnce('agile');

        const result = await confirmAdoMapping(structure);
        expect(result).not.toBeNull();
      }
    });
  });
});

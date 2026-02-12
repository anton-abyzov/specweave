/**
 * Tests for Context CLI Command
 *
 * Verifies project and board context functionality:
 * - Getting projects context
 * - Getting boards context for specific projects
 * - Auto-select logic for single-option scenarios
 * - 1-level vs 2-level structure detection
 * - Interactive selection fallback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock with hoisting
const { mockDetectStructureLevel } = vi.hoisted(() => {
  return {
    mockDetectStructureLevel: vi.fn(),
  };
});

vi.mock('../../../../src/utils/structure-level-detector.js', () => ({
  detectStructureLevel: mockDetectStructureLevel,
}));

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

import {
  getProjectsContext,
  getBoardsContext,
  autoSelectProjectBoard,
  contextProjectsCommand,
  contextBoardsCommand,
  contextSelectCommand,
} from '../../../../src/cli/commands/context.js';

describe('Context Command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockConfig: any;

  beforeEach(() => {
    // Setup mock config for 1-level structure
    mockConfig = {
      level: 1,
      projects: [
        { id: 'project-a', name: 'Project A' },
        { id: 'project-b', name: 'Project B' },
      ],
      boardsByProject: undefined,
      detectionReason: 'No ADO area paths or JIRA boards configured',
      source: 'single-project',
    };

    mockDetectStructureLevel.mockReturnValue(mockConfig);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('getProjectsContext - 1-Level Structure', () => {
    it('should return projects context with level 1', () => {
      const result = getProjectsContext('/test/project');

      expect(result.level).toBe(1);
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].id).toBe('project-a');
      expect(result.detectionReason).toBeDefined();
      expect(result.source).toBe('single-project');
    });

    it('should not include boardsByProject for 1-level', () => {
      const result = getProjectsContext('/test/project');

      expect(result.boardsByProject).toBeUndefined();
    });

    it('should use provided projectRoot', () => {
      const projectRoot = '/custom/path';
      getProjectsContext(projectRoot);

      expect(mockDetectStructureLevel).toHaveBeenCalledWith(projectRoot);
    });

    it('should use current directory as default projectRoot', () => {
      getProjectsContext();

      expect(mockDetectStructureLevel).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('getProjectsContext - 2-Level Structure', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
            { id: 'team-api', name: 'Team API', projectId: 'product-a' },
          ],
        },
        detectionReason: 'ADO area path mapping configured',
        source: 'ado-area-path',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);
    });

    it('should return projects context with level 2', () => {
      const result = getProjectsContext('/test/project');

      expect(result.level).toBe(2);
      expect(result.projects).toHaveLength(1);
    });

    it('should include boardsByProject for 2-level', () => {
      const result = getProjectsContext('/test/project');

      expect(result.boardsByProject).toBeDefined();
      expect(result.boardsByProject['product-a']).toHaveLength(2);
      expect(result.boardsByProject['product-a'][0].id).toBe('team-web');
    });
  });

  describe('getBoardsContext', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
            { id: 'team-api', name: 'Team API', projectId: 'product-a' },
          ],
        },
        detectionReason: 'ADO area path mapping configured',
        source: 'ado-area-path',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);
    });

    it('should return boards for specified project', () => {
      const result = getBoardsContext('product-a');

      expect(result.project).toBe('product-a');
      expect(result.boards).toHaveLength(2);
      expect(result.boards[0].id).toBe('team-web');
    });

    it('should handle 1-level structure (no boards)', () => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
        ],
        detectionReason: 'No ADO area paths or JIRA boards',
        source: 'single-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const result = getBoardsContext('project-a');

      expect(result.project).toBe('project-a');
      expect(result.boards).toHaveLength(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('1-level structure');
    });

    it('should handle normalized project ID lookup', () => {
      const result = getBoardsContext('Product-A');

      // Should normalize and find boards
      expect(result.boards).toBeDefined();
    });

    it('should handle project ID lookup', () => {
      mockConfig.boardsByProject = {
        'product-a': [
          { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
        ],
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const result = getBoardsContext('product-a');

      expect(result.boards).toHaveLength(1);
      expect(result.boards[0].id).toBe('team-web');
    });

    it('should use provided projectRoot', () => {
      const projectRoot = '/custom/path';
      getBoardsContext('product-a', projectRoot);

      expect(mockDetectStructureLevel).toHaveBeenCalledWith(projectRoot);
    });

    it('should use current directory as default projectRoot', () => {
      getBoardsContext('product-a');

      expect(mockDetectStructureLevel).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('autoSelectProjectBoard - 1-Level Single Project', () => {
    beforeEach(() => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
        ],
        detectionReason: 'Single project detected',
        source: 'single-project',
      };
    });

    it('should auto-select single project in 1-level', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.autoSelected).toBe(true);
      expect(result.selected.project).toBe('project-a');
      expect(result.level).toBe(1);
    });

    it('should not have board for 1-level auto-select', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.board).toBeUndefined();
    });
  });

  describe('autoSelectProjectBoard - 1-Level Multiple Projects', () => {
    beforeEach(() => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
          { id: 'project-b', name: 'Project B' },
        ],
        detectionReason: 'Multiple projects detected',
        source: 'multi-project',
      };
    });

    it('should not auto-select with multiple projects', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.autoSelected).toBe(false);
    });

    it('should return first project as default', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.project).toBe('project-a');
    });
  });

  describe('autoSelectProjectBoard - 2-Level Single Project Single Board', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
          ],
        },
        detectionReason: 'Single project with single board',
        source: 'ado-area-path',
      };
    });

    it('should auto-select single project and single board in 2-level', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.autoSelected).toBe(true);
      expect(result.selected.project).toBe('product-a');
      expect(result.selected.board).toBe('team-web');
      expect(result.level).toBe(2);
    });
  });

  describe('autoSelectProjectBoard - 2-Level Single Project Multiple Boards', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
            { id: 'team-api', name: 'Team API', projectId: 'product-a' },
          ],
        },
        detectionReason: 'Single project with multiple boards',
        source: 'ado-area-path',
      };
    });

    it('should not auto-select with multiple boards', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.autoSelected).toBe(false);
    });

    it('should return first project and first board as default', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.project).toBe('product-a');
      expect(result.selected.board).toBe('team-web');
    });
  });

  describe('autoSelectProjectBoard - 2-Level Multiple Projects', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
          { id: 'product-b', name: 'Product B' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
          ],
          'product-b': [
            { id: 'team-mobile', name: 'Team Mobile', projectId: 'product-b' },
          ],
        },
        detectionReason: 'Multiple projects',
        source: 'ado-area-path',
      };
    });

    it('should not auto-select with multiple projects', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.autoSelected).toBe(false);
    });

    it('should return first project as default', () => {
      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.project).toBe('product-a');
    });
  });

  describe('contextProjectsCommand', () => {
    it('should output JSON to console', async () => {
      await contextProjectsCommand();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe(1);
      expect(parsed.projects).toBeDefined();
    });

    it('should include level in output', async () => {
      await contextProjectsCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('level');
    });

    it('should include projects in output', async () => {
      await contextProjectsCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('projects');
      expect(Array.isArray(parsed.projects)).toBe(true);
    });

    it('should include detection reason in output', async () => {
      await contextProjectsCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('detectionReason');
    });

    it('should include source in output', async () => {
      await contextProjectsCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('source');
    });

    it('should include boardsByProject only for 2-level', async () => {
      // First test 1-level
      await contextProjectsCommand();
      let output = consoleSpy.mock.calls[0][0];
      let parsed = JSON.parse(output);

      expect(parsed.boardsByProject).toBeUndefined();

      consoleSpy.mockClear();

      // Now test 2-level
      mockConfig.level = 2;
      mockConfig.boardsByProject = {
        'product-a': [
          { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
        ],
      };

      await contextProjectsCommand();
      output = consoleSpy.mock.calls[0][0];
      parsed = JSON.parse(output);

      expect(parsed.boardsByProject).toBeDefined();
    });
  });

  describe('contextBoardsCommand', () => {
    beforeEach(() => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
            { id: 'team-api', name: 'Team API', projectId: 'product-a' },
          ],
        },
        detectionReason: 'ADO area path mapping',
        source: 'ado-area-path',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);
    });

    it('should output boards for specified project', async () => {
      await contextBoardsCommand({ project: 'product-a' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.project).toBe('product-a');
      expect(parsed.boards).toHaveLength(2);
    });

    it('should include project in output', async () => {
      await contextBoardsCommand({ project: 'product-a' });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('project');
    });

    it('should include boards array in output', async () => {
      await contextBoardsCommand({ project: 'product-a' });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('boards');
      expect(Array.isArray(parsed.boards)).toBe(true);
    });

    it('should handle missing project parameter', async () => {
      await contextBoardsCommand({});

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.boardsByProject).toBeDefined();
    });

    it('should show warning for 1-level structure', async () => {
      mockConfig.level = 1;
      mockConfig.boardsByProject = undefined;
      mockDetectStructureLevel.mockReturnValue(mockConfig);

      await contextBoardsCommand({});

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.warning).toBeDefined();
      expect(parsed.warning).toContain('1-level structure');
    });
  });

  describe('contextSelectCommand', () => {
    it('should output JSON with auto-selection flag', async () => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
        ],
        detectionReason: 'Single project',
        source: 'single-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      await contextSelectCommand();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.selected).toBeDefined();
      expect(parsed.autoSelected).toBe(true);
    });

    it('should include auto selection flag in output', async () => {
      await contextSelectCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('autoSelected');
    });

    it('should include level in output', async () => {
      await contextSelectCommand();

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('level');
    });

    it('should auto-select single project without prompting', async () => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
        ],
        detectionReason: 'Single project',
        source: 'single-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;

      await contextSelectCommand();

      // Should not have prompted for selection
      expect(selectMock).not.toHaveBeenCalled();
    });

    it('should handle interactive selection for multiple projects', async () => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
          { id: 'project-b', name: 'Project B' },
        ],
        detectionReason: 'Multiple projects',
        source: 'multi-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;
      selectMock.mockResolvedValue('project-a');

      await contextSelectCommand();

      // Should have prompted for selection
      expect(selectMock).toHaveBeenCalled();
    });

    it('should fallback to default selection if prompts fail', async () => {
      mockConfig = {
        level: 1,
        projects: [
          { id: 'project-a', name: 'Project A' },
          { id: 'project-b', name: 'Project B' },
        ],
        detectionReason: 'Multiple projects',
        source: 'multi-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;
      selectMock.mockRejectedValue(new Error('Prompt failed'));

      await contextSelectCommand();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.selected).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects list', () => {
      mockConfig = {
        level: 1,
        projects: [],
        detectionReason: 'No projects detected',
        source: 'single-project',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.project).toBe('default');
    });

    it('should handle empty boards list for project', () => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [],
        },
        detectionReason: 'Project with no boards',
        source: 'ado-area-path',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const result = autoSelectProjectBoard(mockConfig);

      expect(result.selected.project).toBe('product-a');
      expect(result.selected.board).toBeUndefined();
    });

    it('should normalize project ID with spaces and uppercase', () => {
      mockConfig = {
        level: 2,
        projects: [
          { id: 'product-a', name: 'Product A' },
        ],
        boardsByProject: {
          'product-a': [
            { id: 'team-web', name: 'Team Web', projectId: 'product-a' },
          ],
        },
        detectionReason: 'Test',
        source: 'ado-area-path',
      };

      mockDetectStructureLevel.mockReturnValue(mockConfig);

      const result = getBoardsContext('Product A');

      // Should handle normalization
      expect(result.project).toBe('Product A');
    });
  });
});

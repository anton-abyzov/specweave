import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: import-docs CLI command
 *
 * CRITICAL: This command imports brownfield documentation from external sources.
 * Risk: Data corruption if classification or import logic fails.
 * Coverage: File validation, classification, import process, error handling.
 */

import { importDocs, parseImportDocsArgs, ImportDocsArgs } from '../../../src/cli/commands/import-docs.js';
import { BrownfieldImporter } from '../../../src/core/brownfield/importer.js';
import { ProjectManager } from '../../../src/core/project-manager.js';
import * as inquirer from 'inquirer';
import * as path from 'path';

// Mock dependencies
vi.mock('../../../src/core/brownfield/importer');
vi.mock('../../../src/core/project-manager');
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

describe('import-docs command', () => {
  const mockImporter = BrownfieldImporter as vi.Mocked<typeof BrownfieldImporter>;
  const mockProjectManager = ProjectManager as vi.Mocked<typeof ProjectManager>;
  const mockPrompt = vi.mocked(inquirer.default.prompt);

  const mockProjectRoot = '/test/project';
  const mockSourcePath = '/test/source';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrompt.mockReset();
    console.log = vi.fn();
    console.error = vi.fn();

    // Setup default mocks
    const mockProjectInstance = {
      getAllProjects: vi.fn().mockReturnValue([
        { id: 'default', name: 'Default Project' }
      ]),
      getActiveProject: vi.fn().mockReturnValue({
        id: 'default',
        name: 'Default Project'
      }),
      getProjectById: vi.fn().mockReturnValue({
        id: 'default',
        name: 'Default Project'
      })
    };

    mockProjectManager.mockImplementation(() => mockProjectInstance as any);
  });

  describe('importDocs function', () => {
    it('should throw error if source path is not provided', async () => {
      const args: ImportDocsArgs = {
        sourcePath: ''
      };

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow('Source path is required');
    });

    it('should prompt for source type if not provided', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        dryRun: true
      };

      mockPrompt.mockResolvedValueOnce({ sourceType: 'notion' });

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockPrompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'sourceType',
        message: 'Select source type:',
        choices: expect.any(Array)
      }]);
    });

    it('should handle absolute source path correctly', async () => {
      const absolutePath = '/absolute/path/to/source';
      const args: ImportDocsArgs = {
        sourcePath: absolutePath,
        source: 'notion',
        dryRun: true
      };

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockImportMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePath: absolutePath,
          source: 'notion',
          dryRun: true
        })
      );
    });

    it('should handle relative source path correctly', async () => {
      const relativePath = './relative/path';
      const args: ImportDocsArgs = {
        sourcePath: relativePath,
        source: 'notion',
        dryRun: true
      };

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockImportMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePath: expect.stringContaining('relative/path'),
          source: 'notion',
          dryRun: true
        })
      );
    });

    it('should prompt for target project when multiple projects exist', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        dryRun: true
      };

      const mockProjectInstance = {
        getAllProjects: vi.fn().mockReturnValue([
          { projectId: 'project1', projectName: 'Project One' },
          { projectId: 'project2', projectName: 'Project Two' }
        ]),
        getActiveProject: vi.fn().mockReturnValue({
          projectId: 'project1',
          projectName: 'Project One'
        }),
        getProjectById: vi.fn().mockReturnValue({
          projectId: 'project1',
          projectName: 'Project One'
        })
      };

      mockProjectManager.mockImplementation(() => mockProjectInstance as any);

      mockPrompt.mockResolvedValueOnce({ projectId: 'project2' });

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockPrompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'projectId',
        message: 'Select target project:',
        choices: expect.any(Array),
        default: 'project1'
      }]);

      expect(mockImportMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'project2'
        })
      );
    });

    it('should show confirmation prompt when not in dry run mode', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 3,
        modulesImported: 2,
        teamImported: 1,
        legacyImported: 4,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockPrompt).toHaveBeenCalledWith([{
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with import?',
        default: true
      }]);
    });

    it('should cancel import if user does not confirm', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: false });

      const mockImportMethod = vi.fn();
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockImportMethod).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Import cancelled'));
    });

    it('should display summary for successful import', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 3,
        modulesImported: 2,
        teamImported: 1,
        legacyImported: 4,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Import Summary'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total files: 10'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Specs: 3'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Modules: 2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Team docs: 1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Legacy: 4'));
    });

    it('should display dry run message when in dry run mode', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: true
      };

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Dry run complete'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('no files were imported'));
    });

    it('should handle import errors gracefully', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const errorMessage = 'Failed to read source directory';
      const mockImportMethod = vi.fn().mockRejectedValue(new Error(errorMessage));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow(errorMessage);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Import failed'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should pass preserve structure option correctly', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        preserveStructure: true,
        dryRun: true
      };

      const mockImportReport = {
        totalFiles: 10,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(mockImportMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          preserveStructure: true
        })
      );
    });

    it('should validate all source types', async () => {
      const sourceTypes: Array<'notion' | 'confluence' | 'wiki' | 'custom'> =
        ['notion', 'confluence', 'wiki', 'custom'];

      for (const source of sourceTypes) {
        vi.clearAllMocks();

        const args: ImportDocsArgs = {
          sourcePath: mockSourcePath,
          source,
          project: 'default',
          dryRun: true
        };

        const mockImportReport = {
          totalFiles: 10,
          specsImported: 0,
          modulesImported: 0,
          teamImported: 0,
          legacyImported: 0,
          destination: '/test/destination',
          timestamp: '2024-01-01T00:00:00Z',
          classifications: {
            specs: [] as any[],
            modules: [] as any[],
            team: [] as any[],
            legacy: [] as any[]
          }
        };

        const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
        mockImporter.prototype.import = mockImportMethod;

        await importDocs(mockProjectRoot, args);

        expect(mockImportMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            source
          })
        );
      }
    });
  });

  describe('parseImportDocsArgs function', () => {
    it('should parse source path from first argument', () => {
      const args = ['/path/to/source'];
      const result = parseImportDocsArgs(args);

      expect(result.sourcePath).toBe('/path/to/source');
    });

    it('should parse --source option', () => {
      const args = ['/path/to/source', '--source=notion'];
      const result = parseImportDocsArgs(args);

      expect(result.source).toBe('notion');
    });

    it('should ignore invalid source types', () => {
      const args = ['/path/to/source', '--source=invalid'];
      const result = parseImportDocsArgs(args);

      expect(result.source).toBeUndefined();
    });

    it('should parse all valid source types', () => {
      const sourceTypes = ['notion', 'confluence', 'wiki', 'custom'];

      for (const source of sourceTypes) {
        const args = ['/path/to/source', `--source=${source}`];
        const result = parseImportDocsArgs(args);

        expect(result.source).toBe(source);
      }
    });

    it('should parse --project option', () => {
      const args = ['/path/to/source', '--project=my-project'];
      const result = parseImportDocsArgs(args);

      expect(result.project).toBe('my-project');
    });

    it('should parse --preserve-structure flag', () => {
      const args = ['/path/to/source', '--preserve-structure'];
      const result = parseImportDocsArgs(args);

      expect(result.preserveStructure).toBe(true);
    });

    it('should parse --dry-run flag', () => {
      const args = ['/path/to/source', '--dry-run'];
      const result = parseImportDocsArgs(args);

      expect(result.dryRun).toBe(true);
    });

    it('should parse multiple options together', () => {
      const args = [
        '/path/to/source',
        '--source=confluence',
        '--project=backend',
        '--preserve-structure',
        '--dry-run'
      ];
      const result = parseImportDocsArgs(args);

      expect(result).toEqual({
        sourcePath: '/path/to/source',
        source: 'confluence',
        project: 'backend',
        preserveStructure: true,
        dryRun: true
      });
    });

    it('should handle no arguments', () => {
      const args: string[] = [];
      const result = parseImportDocsArgs(args);

      expect(result.sourcePath).toBe('');
      expect(result.source).toBeUndefined();
      expect(result.project).toBeUndefined();
      expect(result.preserveStructure).toBeUndefined();
      expect(result.dryRun).toBeUndefined();
    });

    it('should ignore unknown options', () => {
      const args = [
        '/path/to/source',
        '--unknown=value',
        '--another-unknown'
      ];
      const result = parseImportDocsArgs(args);

      expect(result).toEqual({
        sourcePath: '/path/to/source'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle project not found error', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'non-existent',
        dryRun: false
      };

      const mockProjectInstance = {
        getAllProjects: vi.fn().mockReturnValue([]),
        getActiveProject: vi.fn().mockReturnValue(null),
        getProjectById: vi.fn().mockReturnValue(null)
      };

      mockProjectManager.mockImplementation(() => mockProjectInstance as any);

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportMethod = vi.fn()
        .mockRejectedValue(new Error("Project 'non-existent' not found"));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow("Project 'non-existent' not found");
    });

    it('should handle source path not existing', async () => {
      const args: ImportDocsArgs = {
        sourcePath: '/non/existent/path',
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportMethod = vi.fn()
        .mockRejectedValue(new Error('Source path does not exist'));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow('Source path does not exist');
    });

    it('should handle no markdown files found', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportMethod = vi.fn()
        .mockRejectedValue(new Error('No markdown files found in source directory'));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow('No markdown files found');
    });

    it('should handle import with zero files in each category', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportReport = {
        totalFiles: 0,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total files: 0'));
    });

    it('should handle permission errors gracefully', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportMethod = vi.fn()
        .mockRejectedValue(new Error('Permission denied: cannot write to destination'));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow('Permission denied');
    });

    it('should handle concurrent imports to same project', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportMethod = vi.fn()
        .mockRejectedValue(new Error('Another import is already in progress for this project'));
      mockImporter.prototype.import = mockImportMethod;

      await expect(importDocs(mockProjectRoot, args))
        .rejects.toThrow('Another import is already in progress');
    });

    it('should handle very large imports correctly', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockImportReport = {
        totalFiles: 10000,
        specsImported: 3000,
        modulesImported: 2000,
        teamImported: 1000,
        legacyImported: 4000,
        destination: '/test/destination',
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: Array(3000).fill({}) as any[],
          modules: Array(2000).fill({}) as any[],
          team: Array(1000).fill({}) as any[],
          legacy: Array(4000).fill({}) as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total files: 10000'));
    });
  });

  describe('import report path handling', () => {
    it('should display correct migration report path', async () => {
      const args: ImportDocsArgs = {
        sourcePath: mockSourcePath,
        source: 'notion',
        project: 'default',
        dryRun: false
      };

      mockPrompt.mockResolvedValueOnce({ confirm: true });

      const mockDestination = '/test/project/.specweave/docs/internal/legacy/default/notion';
      const mockImportReport = {
        totalFiles: 10,
        specsImported: 3,
        modulesImported: 2,
        teamImported: 1,
        legacyImported: 4,
        destination: mockDestination,
        timestamp: '2024-01-01T00:00:00Z',
        classifications: {
          specs: [] as any[],
          modules: [] as any[],
          team: [] as any[],
          legacy: [] as any[]
        }
      };

      const mockImportMethod = vi.fn().mockResolvedValue(mockImportReport);
      mockImporter.prototype.import = mockImportMethod;

      await importDocs(mockProjectRoot, args);

      const expectedReportPath = path.join(mockDestination, '../README.md');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(expectedReportPath));
    });
  });
});
/**
 * Tests for ProjectDetector
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-007: Error Handling
 * @satisfies AC-US7-03, AC-US7-04
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProjectDetector,
  ProjectInfo,
  FileSystemProvider,
} from '../../../../../src/core/lsp/config/project-detector.js';

/**
 * Mock filesystem for testing
 */
function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async exists(path: string): Promise<boolean> {
      for (const dir of Object.keys(structure)) {
        if (structure[dir].some((f) => `${dir}/${f}` === path)) return true;
      }
      return false;
    },
    async readdir(path: string): Promise<string[]> {
      return structure[path] || [];
    },
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('*.ts')) return files.filter((f) => f.endsWith('.ts'));
      if (pattern.includes('*.cs')) return files.filter((f) => f.endsWith('.cs'));
      if (pattern.includes('*.py')) return files.filter((f) => f.endsWith('.py'));
      if (pattern.includes('*.go')) return files.filter((f) => f.endsWith('.go'));
      return files;
    },
    getParentDir(path: string): string | null {
      const parent = path.substring(0, path.lastIndexOf('/'));
      return parent || null;
    },
  };
}

describe('ProjectDetector', () => {
  describe('findRoot', () => {
    it('searches upward for project file', async () => {
      const mockFs = createMockFs({
        '/project': ['package.json', 'tsconfig.json'],
        '/project/src': ['index.ts'],
        '/project/src/utils': ['helpers.ts'],
      });
      const detector = new ProjectDetector(mockFs);

      const root = await detector.findRoot('/project/src/utils');

      expect(root).toBe('/project');
    });

    it('finds .sln file for C# projects', async () => {
      const mockFs = createMockFs({
        '/csharp-project': ['MyApp.sln'],
        '/csharp-project/src': ['Program.cs'],
        '/csharp-project/src/Services': ['MyService.cs'],
      });
      const detector = new ProjectDetector(mockFs);

      const root = await detector.findRoot('/csharp-project/src/Services');

      expect(root).toBe('/csharp-project');
    });

    it('finds go.mod for Go projects', async () => {
      const mockFs = createMockFs({
        '/go-project': ['go.mod', 'go.sum'],
        '/go-project/cmd': ['main.go'],
      });
      const detector = new ProjectDetector(mockFs);

      const root = await detector.findRoot('/go-project/cmd');

      expect(root).toBe('/go-project');
    });

    it('returns null when no project file found', async () => {
      const mockFs = createMockFs({
        '/random': ['file.txt'],
      });
      const detector = new ProjectDetector(mockFs);

      const root = await detector.findRoot('/random');

      expect(root).toBeNull();
    });
  });

  describe('analyzeUnknownProject', () => {
    it('suggests LSP based on file extensions when no project file', async () => {
      const mockFs = createMockFs({
        '/unknown': ['index.ts', 'app.ts', 'utils.ts', 'helper.ts'],
      });
      const detector = new ProjectDetector(mockFs);

      const result = await detector.analyzeUnknownProject('/unknown');

      expect(result.suggestedLanguage).toBe('typescript');
    });

    it('suggests C# when most files are .cs', async () => {
      const mockFs = createMockFs({
        '/csharp-folder': ['Program.cs', 'Service.cs', 'Model.cs'],
      });
      const detector = new ProjectDetector(mockFs);

      const result = await detector.analyzeUnknownProject('/csharp-folder');

      expect(result.suggestedLanguage).toBe('csharp');
    });

    it('suggests Python when most files are .py', async () => {
      const mockFs = createMockFs({
        '/python-folder': ['main.py', 'utils.py', 'tests.py'],
      });
      const detector = new ProjectDetector(mockFs);

      const result = await detector.analyzeUnknownProject('/python-folder');

      expect(result.suggestedLanguage).toBe('python');
    });

    it('returns unknown when no recognized files', async () => {
      const mockFs = createMockFs({
        '/empty': [],
      });
      const detector = new ProjectDetector(mockFs);

      const result = await detector.analyzeUnknownProject('/empty');

      expect(result.suggestedLanguage).toBeNull();
    });
  });

  describe('detectProjectInfo', () => {
    it('returns full project info', async () => {
      const mockFs = createMockFs({
        '/project': ['package.json', 'tsconfig.json'],
        '/project/src': ['index.ts'],
      });
      const detector = new ProjectDetector(mockFs);

      const info = await detector.detectProjectInfo('/project/src');

      expect(info.root).toBe('/project');
      expect(info.language).toBe('typescript');
      expect(info.projectFile).toBeDefined();
    });

    it('provides suggestion when root not found', async () => {
      const mockFs = createMockFs({
        '/unknown': ['app.ts', 'util.ts'],
      });
      const detector = new ProjectDetector(mockFs);

      const info = await detector.detectProjectInfo('/unknown');

      expect(info.root).toBeNull();
      expect(info.suggestedLanguage).toBe('typescript');
    });
  });
});

/**
 * Tests for LanguageAnalyzer
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-003: LSP Server Recommendations
 * @satisfies AC-US3-01, AC-US3-02
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LanguageAnalyzer,
  LanguageScore,
  FileSystemProvider,
} from '../../../../../src/core/lsp/config/language-analyzer.js';

/**
 * Mock filesystem provider for testing
 */
function createMockFs(files: string[]): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      // Handle extension patterns like **/*.ts
      if (pattern.startsWith('**/*.')) {
        const ext = pattern.replace('**/*.', '.');
        return files.filter((f) => f.endsWith(ext));
      }
      // Handle filename patterns like **/go.mod, **/Cargo.toml, **/package.json
      if (pattern.startsWith('**/')) {
        const filename = pattern.replace('**/', '');
        return files.filter((f) => f === filename || f.endsWith(`/${filename}`));
      }
      return files;
    },
    async exists(path: string): Promise<boolean> {
      return files.some((f) => f === path || path.endsWith(f));
    },
  };
}

describe('LanguageAnalyzer', () => {
  describe('analyze', () => {
    it('weights project files higher than source files', async () => {
      // Mock filesystem with 1 .sln and 100 .cs files
      const files = [
        'MyApp.sln',
        ...Array.from({ length: 100 }, (_, i) => `src/Class${i}.cs`),
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('csharp');
      // Score: 1 .sln * 10 + 100 .cs * 1 = 110
      expect(results[0].score).toBeGreaterThan(100);
    });

    it('returns max 3 languages', async () => {
      // Mock with files from 5 different languages
      const files = [
        'app.ts',
        'app.tsx',
        'Program.cs',
        'main.py',
        'main.go',
        'main.rs',
        'Main.java',
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/polyglot');

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('returns languages sorted by score descending', async () => {
      const files = [
        // TypeScript: 10 files = 10 points
        ...Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`),
        // Python: 5 files = 5 points
        ...Array.from({ length: 5 }, (_, i) => `src/file${i}.py`),
        // Go: 15 files = 15 points
        ...Array.from({ length: 15 }, (_, i) => `src/file${i}.go`),
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('go');
      expect(results[0].score).toBe(15);
      expect(results[1].language).toBe('typescript');
      expect(results[1].score).toBe(10);
      expect(results[2].language).toBe('python');
      expect(results[2].score).toBe(5);
    });

    it('detects TypeScript from .ts and .tsx files', async () => {
      const files = ['app.ts', 'component.tsx', 'types.ts'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results.some((r) => r.language === 'typescript')).toBe(true);
    });

    it('detects C# from .cs and .sln files', async () => {
      const files = ['MyApp.sln', 'Program.cs', 'Class1.cs'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('csharp');
    });

    it('detects Python from .py files', async () => {
      const files = ['main.py', 'utils.py', 'requirements.txt'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results.some((r) => r.language === 'python')).toBe(true);
    });

    it('detects Go from .go and go.mod files', async () => {
      const files = ['main.go', 'utils.go', 'go.mod'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('go');
    });

    it('detects Rust from .rs and Cargo.toml files', async () => {
      const files = ['main.rs', 'lib.rs', 'Cargo.toml'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('rust');
    });
  });

  describe('project file weighting', () => {
    it('weights .sln files at 10 points', async () => {
      const files = ['MyApp.sln'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('csharp');
      expect(results[0].score).toBe(10);
    });

    it('weights go.mod files at 10 points', async () => {
      const files = ['go.mod'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('go');
      expect(results[0].score).toBe(10);
    });

    it('weights Cargo.toml files at 10 points', async () => {
      const files = ['Cargo.toml'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('rust');
      expect(results[0].score).toBe(10);
    });

    it('weights package.json at 10 points for TypeScript', async () => {
      const files = ['package.json', 'tsconfig.json'];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      expect(results[0].language).toBe('typescript');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty directory', async () => {
      const mockFs = createMockFs([]);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/empty');

      expect(results).toEqual([]);
    });

    it('ignores node_modules and dist directories', async () => {
      const files = [
        'src/app.ts',
        'node_modules/lodash/index.js',
        'dist/bundle.js',
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      // Should only count src/app.ts, not node_modules or dist
      expect(results[0].language).toBe('typescript');
    });
  });

  describe('cross-platform paths', () => {
    it('ignores node_modules with Windows-style backslash paths', async () => {
      const files = [
        'src\\app.ts',
        'node_modules\\lodash\\index.js',
        'dist\\bundle.js',
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('C:\\project');

      // Should only count src\app.ts, ignoring node_modules and dist
      expect(results[0].language).toBe('typescript');
      expect(results[0].sourceFiles.length).toBe(1);
    });

    it('handles mixed path separators', async () => {
      const files = [
        'src/components\\Button.tsx',
        'node_modules/react\\index.ts',
        'src\\utils/helper.ts',
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('/project');

      // Should count files not in ignored directories
      expect(results[0].language).toBe('typescript');
      // Both src files should be counted, node_modules excluded
      expect(results[0].sourceFiles.length).toBe(2);
    });

    it('ignores .git directory with backslash paths', async () => {
      const files = [
        'src\\main.py',
        '.git\\hooks\\pre-commit',
        '__pycache__\\module.pyc',
      ];
      const mockFs = createMockFs(files);
      const analyzer = new LanguageAnalyzer(mockFs);

      const results = await analyzer.analyze('C:\\python-project');

      expect(results[0].language).toBe('python');
      expect(results[0].sourceFiles.length).toBe(1);
    });
  });
});

describe('LanguageScore interface', () => {
  it('has required properties', () => {
    const score: LanguageScore = {
      language: 'typescript',
      score: 10,
      projectFiles: ['package.json'],
      sourceFiles: ['app.ts'],
    };

    expect(score.language).toBe('typescript');
    expect(score.score).toBe(10);
    expect(score.projectFiles).toContain('package.json');
    expect(score.sourceFiles).toContain('app.ts');
  });
});

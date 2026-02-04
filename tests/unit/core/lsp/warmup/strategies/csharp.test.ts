/**
 * Tests for CSharpStrategy
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSharpStrategy, FileSystemProvider, PromptProvider, CacheProvider } from '../../../../../../src/core/lsp/warmup/strategies/csharp.js';

/**
 * Mock filesystem provider
 */
function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('*.sln')) {
        return files.filter((f) => f.endsWith('.sln'));
      }
      if (pattern.includes('*.csproj')) {
        return files.filter((f) => f.endsWith('.csproj'));
      }
      if (pattern.includes('*.cs')) {
        return files.filter((f) => f.endsWith('.cs'));
      }
      return files;
    },
    async exists(path: string): Promise<boolean> {
      for (const dir of Object.keys(structure)) {
        if (structure[dir].some((f) => `${dir}/${f}` === path || f === path)) {
          return true;
        }
      }
      return false;
    },
    async findUp(pattern: string, startDir: string): Promise<string | null> {
      let dir = startDir;
      while (dir !== '/') {
        const files = structure[dir] || [];
        const match = files.find((f) => {
          if (pattern === '*.sln') return f.endsWith('.sln');
          if (pattern === '*.csproj') return f.endsWith('.csproj');
          return false;
        });
        if (match) return `${dir}/${match}`;
        dir = dir.substring(0, dir.lastIndexOf('/')) || '/';
      }
      return null;
    },
  };
}

/**
 * Mock cache provider
 */
function createMockCache(): CacheProvider & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    async get<T>(key: string): Promise<T | null> {
      return (data[key] as T) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      data[key] = value;
    },
  };
}

describe('CSharpStrategy', () => {
  describe('language property', () => {
    it('returns "csharp" as language', () => {
      const mockFs = createMockFs({});
      const strategy = new CSharpStrategy(mockFs);
      expect(strategy.language).toBe('csharp');
    });
  });

  describe('detectProjectRoot', () => {
    it('detects .sln at project root', async () => {
      const mockFs = createMockFs({
        '/project': ['MyApp.sln', 'Program.cs'],
      });
      const strategy = new CSharpStrategy(mockFs);

      const root = await strategy.detectProjectRoot('/project');

      expect(root).toBe('/project');
      expect(strategy.solutionFile).toBe('MyApp.sln');
    });

    it('searches upward for .sln file', async () => {
      const mockFs = createMockFs({
        '/project': ['MyApp.sln'],
        '/project/src': ['Class1.cs'],
        '/project/src/subfolder': ['Class2.cs'],
      });
      const strategy = new CSharpStrategy(mockFs);

      const root = await strategy.detectProjectRoot('/project/src/subfolder');

      expect(root).toBe('/project');
      expect(strategy.solutionFile).toBe('MyApp.sln');
    });

    it('falls back to .csproj if no .sln', async () => {
      const mockFs = createMockFs({
        '/project': ['MyApp.csproj', 'Program.cs'],
      });
      const strategy = new CSharpStrategy(mockFs);

      const root = await strategy.detectProjectRoot('/project');

      expect(root).toBe('/project');
      expect(strategy.projectFile).toBe('MyApp.csproj');
    });

    it('prefers .sln over .csproj', async () => {
      const mockFs = createMockFs({
        '/project': ['MyApp.sln', 'MyApp.csproj', 'Program.cs'],
      });
      const strategy = new CSharpStrategy(mockFs);

      const root = await strategy.detectProjectRoot('/project');

      expect(strategy.solutionFile).toBe('MyApp.sln');
      expect(strategy.projectFile).toBeUndefined();
    });
  });

  describe('multiple solution files', () => {
    it('prompts for choice when multiple .sln files', async () => {
      const mockFs = createMockFs({
        '/project': ['App1.sln', 'App2.sln', 'Program.cs'],
      });
      const promptMock = vi.fn().mockResolvedValue('App2.sln');
      const strategy = new CSharpStrategy(mockFs, promptMock);

      await strategy.detectProjectRoot('/project');

      expect(promptMock).toHaveBeenCalledWith(
        expect.arrayContaining(['App1.sln', 'App2.sln']),
        expect.any(String)
      );
      expect(strategy.solutionFile).toBe('App2.sln');
    });

    it('caches solution choice', async () => {
      const mockFs = createMockFs({
        '/project': ['App1.sln', 'App2.sln', 'Program.cs'],
      });
      const promptMock = vi.fn().mockResolvedValue('App2.sln');
      const cache = createMockCache();
      const strategy = new CSharpStrategy(mockFs, promptMock, cache);

      await strategy.detectProjectRoot('/project');

      expect(cache.data['csharp:/project:solution']).toBe('App2.sln');
    });

    it('uses cached choice without prompting', async () => {
      const mockFs = createMockFs({
        '/project': ['App1.sln', 'App2.sln', 'Program.cs'],
      });
      const promptMock = vi.fn();
      const cache = createMockCache();
      cache.data['csharp:/project:solution'] = 'App1.sln';
      const strategy = new CSharpStrategy(mockFs, promptMock, cache);

      await strategy.detectProjectRoot('/project');

      expect(promptMock).not.toHaveBeenCalled();
      expect(strategy.solutionFile).toBe('App1.sln');
    });
  });

  describe('getFilesToOpen', () => {
    it('returns .cs files from project', async () => {
      const mockFs = createMockFs({
        '/project': ['MyApp.sln', 'Program.cs', 'Class1.cs', 'Class2.cs'],
      });
      const strategy = new CSharpStrategy(mockFs);
      await strategy.detectProjectRoot('/project');

      const files = await strategy.getFilesToOpen('/project');

      expect(files).toContain('Program.cs');
      expect(files).toContain('Class1.cs');
    });

    it('limits files to reasonable count', async () => {
      const csFiles = Array.from({ length: 100 }, (_, i) => `Class${i}.cs`);
      const mockFs = createMockFs({
        '/project': ['MyApp.sln', ...csFiles],
      });
      const strategy = new CSharpStrategy(mockFs);
      await strategy.detectProjectRoot('/project');

      const files = await strategy.getFilesToOpen('/project');

      // Should return limited count (e.g., 10 files max)
      expect(files.length).toBeLessThanOrEqual(10);
    });
  });

  describe('error handling', () => {
    it('returns null when no C# project found', async () => {
      const mockFs = createMockFs({
        '/project': ['index.ts', 'package.json'],
      });
      const strategy = new CSharpStrategy(mockFs);

      const root = await strategy.detectProjectRoot('/project');

      expect(root).toBeNull();
    });
  });
});

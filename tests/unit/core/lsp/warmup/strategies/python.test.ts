/**
 * Tests for PythonStrategy
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-02
 */

import { describe, it, expect } from 'vitest';
import { PythonStrategy, FileSystemProvider } from '../../../../../../src/core/lsp/warmup/strategies/python.js';

function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('pyproject.toml')) return files.filter((f) => f === 'pyproject.toml');
      if (pattern.includes('requirements.txt')) return files.filter((f) => f === 'requirements.txt');
      if (pattern.includes('setup.py')) return files.filter((f) => f === 'setup.py');
      if (pattern.includes('*.py')) return files.filter((f) => f.endsWith('.py'));
      return files;
    },
    async exists(path: string): Promise<boolean> {
      for (const dir of Object.keys(structure)) {
        if (structure[dir].some((f) => `${dir}/${f}` === path)) return true;
      }
      return false;
    },
    async findUp(pattern: string, startDir: string): Promise<string | null> {
      let dir = startDir;
      while (dir !== '/') {
        const files = structure[dir] || [];
        const match = files.find((f) =>
          f === 'pyproject.toml' || f === 'requirements.txt' || f === 'setup.py'
        );
        if (match) return `${dir}/${match}`;
        dir = dir.substring(0, dir.lastIndexOf('/')) || '/';
      }
      return null;
    },
  };
}

describe('PythonStrategy', () => {
  it('returns "python" as language', () => {
    const mockFs = createMockFs({});
    const strategy = new PythonStrategy(mockFs);
    expect(strategy.language).toBe('python');
  });

  it('detects pyproject.toml at project root', async () => {
    const mockFs = createMockFs({
      '/project': ['pyproject.toml', 'main.py'],
    });
    const strategy = new PythonStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBe('/project');
  });

  it('detects requirements.txt as fallback', async () => {
    const mockFs = createMockFs({
      '/project': ['requirements.txt', 'main.py'],
    });
    const strategy = new PythonStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBe('/project');
  });

  it('returns .py files to open', async () => {
    const mockFs = createMockFs({
      '/project': ['pyproject.toml', 'main.py', 'utils.py'],
    });
    const strategy = new PythonStrategy(mockFs);
    await strategy.detectProjectRoot('/project');

    const files = await strategy.getFilesToOpen('/project');

    expect(files).toContain('main.py');
    expect(files).toContain('utils.py');
  });

  it('returns null when no Python project found', async () => {
    const mockFs = createMockFs({
      '/project': ['main.go', 'go.mod'],
    });
    const strategy = new PythonStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBeNull();
  });
});

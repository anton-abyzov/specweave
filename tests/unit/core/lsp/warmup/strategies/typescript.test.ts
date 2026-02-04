/**
 * Tests for TypeScriptStrategy
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-02
 */

import { describe, it, expect } from 'vitest';
import { TypeScriptStrategy, FileSystemProvider } from '../../../../../../src/core/lsp/warmup/strategies/typescript.js';

function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('tsconfig')) return files.filter((f) => f.includes('tsconfig'));
      if (pattern.includes('package.json')) return files.filter((f) => f === 'package.json');
      if (pattern.includes('*.ts')) return files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
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
        const match = files.find((f) => f.includes('tsconfig') || f === 'package.json');
        if (match) return `${dir}/${match}`;
        dir = dir.substring(0, dir.lastIndexOf('/')) || '/';
      }
      return null;
    },
  };
}

describe('TypeScriptStrategy', () => {
  it('returns "typescript" as language', () => {
    const mockFs = createMockFs({});
    const strategy = new TypeScriptStrategy(mockFs);
    expect(strategy.language).toBe('typescript');
  });

  it('detects tsconfig.json at project root', async () => {
    const mockFs = createMockFs({
      '/project': ['tsconfig.json', 'src/index.ts'],
    });
    const strategy = new TypeScriptStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBe('/project');
  });

  it('returns .ts and .tsx files to open', async () => {
    const mockFs = createMockFs({
      '/project': ['tsconfig.json', 'index.ts', 'App.tsx', 'utils.ts'],
    });
    const strategy = new TypeScriptStrategy(mockFs);
    await strategy.detectProjectRoot('/project');

    const files = await strategy.getFilesToOpen('/project');

    expect(files).toContain('index.ts');
    expect(files).toContain('App.tsx');
  });

  it('returns null when no TypeScript project found', async () => {
    const mockFs = createMockFs({
      '/project': ['main.go', 'go.mod'],
    });
    const strategy = new TypeScriptStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBeNull();
  });
});

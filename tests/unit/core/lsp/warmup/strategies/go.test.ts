/**
 * Tests for GoStrategy
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-02
 */

import { describe, it, expect } from 'vitest';
import { GoStrategy, FileSystemProvider } from '../../../../../../src/core/lsp/warmup/strategies/go.js';

function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('go.mod')) return files.filter((f) => f === 'go.mod');
      if (pattern.includes('*.go')) return files.filter((f) => f.endsWith('.go'));
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
        if (files.includes('go.mod')) return `${dir}/go.mod`;
        dir = dir.substring(0, dir.lastIndexOf('/')) || '/';
      }
      return null;
    },
  };
}

describe('GoStrategy', () => {
  it('returns "go" as language', () => {
    const mockFs = createMockFs({});
    const strategy = new GoStrategy(mockFs);
    expect(strategy.language).toBe('go');
  });

  it('detects go.mod at project root', async () => {
    const mockFs = createMockFs({
      '/project': ['go.mod', 'main.go'],
    });
    const strategy = new GoStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBe('/project');
  });

  it('returns .go files to open', async () => {
    const mockFs = createMockFs({
      '/project': ['go.mod', 'main.go', 'utils.go'],
    });
    const strategy = new GoStrategy(mockFs);
    await strategy.detectProjectRoot('/project');

    const files = await strategy.getFilesToOpen('/project');

    expect(files).toContain('main.go');
    expect(files).toContain('utils.go');
  });

  it('returns null when no Go project found', async () => {
    const mockFs = createMockFs({
      '/project': ['index.ts', 'package.json'],
    });
    const strategy = new GoStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBeNull();
  });
});

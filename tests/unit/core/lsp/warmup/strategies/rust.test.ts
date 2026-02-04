/**
 * Tests for RustStrategy
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-02
 */

import { describe, it, expect } from 'vitest';
import { RustStrategy, FileSystemProvider } from '../../../../../../src/core/lsp/warmup/strategies/rust.js';

function createMockFs(structure: Record<string, string[]>): FileSystemProvider {
  return {
    async glob(pattern: string, cwd: string): Promise<string[]> {
      const files = structure[cwd] || [];
      if (pattern.includes('Cargo.toml')) return files.filter((f) => f === 'Cargo.toml');
      if (pattern.includes('*.rs')) return files.filter((f) => f.endsWith('.rs'));
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
        if (files.includes('Cargo.toml')) return `${dir}/Cargo.toml`;
        dir = dir.substring(0, dir.lastIndexOf('/')) || '/';
      }
      return null;
    },
  };
}

describe('RustStrategy', () => {
  it('returns "rust" as language', () => {
    const mockFs = createMockFs({});
    const strategy = new RustStrategy(mockFs);
    expect(strategy.language).toBe('rust');
  });

  it('detects Cargo.toml at project root', async () => {
    const mockFs = createMockFs({
      '/project': ['Cargo.toml', 'src/main.rs'],
    });
    const strategy = new RustStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBe('/project');
  });

  it('returns .rs files to open', async () => {
    const mockFs = createMockFs({
      '/project': ['Cargo.toml', 'main.rs', 'lib.rs'],
    });
    const strategy = new RustStrategy(mockFs);
    await strategy.detectProjectRoot('/project');

    const files = await strategy.getFilesToOpen('/project');

    expect(files).toContain('main.rs');
    expect(files).toContain('lib.rs');
  });

  it('returns null when no Rust project found', async () => {
    const mockFs = createMockFs({
      '/project': ['main.go', 'go.mod'],
    });
    const strategy = new RustStrategy(mockFs);

    const root = await strategy.detectProjectRoot('/project');

    expect(root).toBeNull();
  });
});

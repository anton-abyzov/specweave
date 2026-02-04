/**
 * Tests for WarmupStrategy interface and executor
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-05
 */

import { describe, it, expect, vi } from 'vitest';
import type { WarmupStrategy, WarmupResult } from '../../../../../src/core/lsp/warmup/strategy.js';
import { WarmupExecutor } from '../../../../../src/core/lsp/warmup/executor.js';

/**
 * Mock strategy for testing
 */
class MockStrategy implements WarmupStrategy {
  readonly language: string = 'mock';
  private files: string[];

  constructor(files: string[]) {
    this.files = files;
  }

  async getFilesToOpen(_projectRoot: string): Promise<string[]> {
    return this.files;
  }
}

describe('WarmupExecutor', () => {
  describe('sequential file opening', () => {
    it('opens files sequentially with delay', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts']);
      const executor = new WarmupExecutor();
      const openTimes: number[] = [];
      const openedFiles: string[] = [];

      await executor.warmup(strategy, '/project', {
        onFileOpen: (file: string) => {
          openTimes.push(Date.now());
          openedFiles.push(file);
        },
        delayMs: 100,
      });

      expect(openedFiles).toEqual(['a.ts', 'b.ts', 'c.ts']);

      // Files should be opened ~100ms apart
      if (openTimes.length >= 2) {
        expect(openTimes[1] - openTimes[0]).toBeGreaterThanOrEqual(90);
      }
      if (openTimes.length >= 3) {
        expect(openTimes[2] - openTimes[1]).toBeGreaterThanOrEqual(90);
      }
    });

    it('respects openCount limit', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']);
      const executor = new WarmupExecutor();
      const openedFiles: string[] = [];

      await executor.warmup(strategy, '/project', {
        openCount: 3,
        onFileOpen: (file: string) => openedFiles.push(file),
      });

      expect(openedFiles.length).toBe(3);
      expect(openedFiles).toEqual(['a.ts', 'b.ts', 'c.ts']);
    });

    it('handles empty file list', async () => {
      const strategy = new MockStrategy([]);
      const executor = new WarmupExecutor();
      const openedFiles: string[] = [];

      const result = await executor.warmup(strategy, '/project', {
        onFileOpen: (file: string) => openedFiles.push(file),
      });

      expect(openedFiles.length).toBe(0);
      expect(result.filesOpened).toBe(0);
    });
  });

  describe('default options', () => {
    it('uses default openCount of 3', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']);
      const executor = new WarmupExecutor();
      const openedFiles: string[] = [];

      await executor.warmup(strategy, '/project', {
        onFileOpen: (file: string) => openedFiles.push(file),
      });

      expect(openedFiles.length).toBe(3);
    });

    it('uses default delay of 100ms', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts']);
      const executor = new WarmupExecutor();
      const openTimes: number[] = [];

      await executor.warmup(strategy, '/project', {
        onFileOpen: () => openTimes.push(Date.now()),
      });

      if (openTimes.length >= 2) {
        expect(openTimes[1] - openTimes[0]).toBeGreaterThanOrEqual(90);
      }
    });
  });

  describe('WarmupResult', () => {
    it('returns result with filesOpened count', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts']);
      const executor = new WarmupExecutor();

      const result = await executor.warmup(strategy, '/project', {
        onFileOpen: () => {},
      });

      expect(result).toBeDefined();
      expect(result.filesOpened).toBe(2);
      expect(result.language).toBe('mock');
    });

    it('includes elapsed time in result', async () => {
      const strategy = new MockStrategy(['a.ts']);
      const executor = new WarmupExecutor();

      const result = await executor.warmup(strategy, '/project', {
        delayMs: 50,
        onFileOpen: () => {},
      });

      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('continues on file open error', async () => {
      const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts']);
      const executor = new WarmupExecutor();
      const openedFiles: string[] = [];
      let errorCount = 0;

      await executor.warmup(strategy, '/project', {
        onFileOpen: (file: string) => {
          if (file === 'b.ts') {
            throw new Error('Failed to open b.ts');
          }
          openedFiles.push(file);
        },
        onError: () => errorCount++,
      });

      // Should have opened a.ts and c.ts, skipped b.ts
      expect(openedFiles).toContain('a.ts');
      expect(openedFiles).toContain('c.ts');
      expect(errorCount).toBe(1);
    });
  });
});

describe('WarmupStrategy interface', () => {
  it('requires language property', () => {
    const strategy = new MockStrategy([]);
    expect(strategy.language).toBe('mock');
  });

  it('requires getFilesToOpen method', async () => {
    const strategy = new MockStrategy(['a.ts']);
    const files = await strategy.getFilesToOpen('/project');
    expect(files).toEqual(['a.ts']);
  });
});

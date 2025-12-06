/**
 * File Sampler Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sampleRepoFiles, formatSamplesForPrompt } from '../../../../../src/core/living-docs/intelligent-analyzer/file-sampler.js';

describe('file-sampler', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sampler-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('sampleRepoFiles', () => {
    it('should prioritize README.md', async () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project\n\nThis is a test.');
      fs.writeFileSync(path.join(testDir, 'other.ts'), 'export const x = 1;');

      const samples = await sampleRepoFiles(testDir);

      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0].path).toBe('README.md');
      expect(samples[0].type).toBe('readme');
    });

    it('should prioritize package.json', async () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), '{"name": "test"}');
      fs.writeFileSync(path.join(testDir, 'other.ts'), 'export const x = 1;');

      const samples = await sampleRepoFiles(testDir);

      const pkgSample = samples.find(s => s.path === 'package.json');
      expect(pkgSample).toBeDefined();
      expect(pkgSample!.type).toBe('config');
    });

    it('should include entry points', async () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export const main = () => {};');

      const samples = await sampleRepoFiles(testDir);

      const entrySample = samples.find(s => s.path === 'src/index.ts');
      expect(entrySample).toBeDefined();
      expect(entrySample!.type).toBe('entry');
    });

    it('should respect maxFiles limit', async () => {
      // Create many files
      for (let i = 0; i < 30; i++) {
        fs.writeFileSync(path.join(testDir, `file${i}.ts`), `export const x${i} = ${i};`);
      }

      const samples = await sampleRepoFiles(testDir, { maxFiles: 5, maxLinesPerFile: 500, maxTotalChars: 100000 });

      expect(samples.length).toBeLessThanOrEqual(5);
    });

    it('should truncate large files', async () => {
      // Create a file with many lines
      const lines = Array.from({ length: 1000 }, (_, i) => `const line${i} = ${i};`);
      fs.writeFileSync(path.join(testDir, 'large.ts'), lines.join('\n'));

      const samples = await sampleRepoFiles(testDir, { maxFiles: 20, maxLinesPerFile: 100, maxTotalChars: 100000 });

      const largeSample = samples.find(s => s.path === 'large.ts');
      expect(largeSample).toBeDefined();
      expect(largeSample!.truncated).toBe(true);
      expect(largeSample!.content).toContain('truncated');
    });

    it('should ignore node_modules', async () => {
      fs.mkdirSync(path.join(testDir, 'node_modules', 'some-dep'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'node_modules', 'some-dep', 'index.js'), 'module.exports = {};');
      fs.writeFileSync(path.join(testDir, 'src.ts'), 'export const x = 1;');

      const samples = await sampleRepoFiles(testDir);

      const nodeModulesSample = samples.find(s => s.path.includes('node_modules'));
      expect(nodeModulesSample).toBeUndefined();
    });
  });

  describe('formatSamplesForPrompt', () => {
    it('should format samples with headers', () => {
      const samples = [
        { path: 'README.md', content: '# Test', type: 'readme' as const, truncated: false },
        { path: 'index.ts', content: 'export const x = 1;', type: 'entry' as const, truncated: false },
      ];

      const formatted = formatSamplesForPrompt(samples);

      expect(formatted).toContain('=== README.md (readme) ===');
      expect(formatted).toContain('=== index.ts (entry) ===');
      expect(formatted).toContain('# Test');
      expect(formatted).toContain('export const x = 1;');
    });
  });
});

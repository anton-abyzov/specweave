import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: BrownfieldAnalyzer Edge Cases
 * Coverage Target: 95%
 */

import { BrownfieldAnalyzer } from '../../../src/core/brownfield/analyzer.js';
import { withTempDir } from '../../utils/temp-dir.js';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldAnalyzer - Edge Cases', () => {
  let analyzer: BrownfieldAnalyzer;

  beforeEach(() => {
    analyzer = new BrownfieldAnalyzer();
  });

  it('should handle empty markdown files', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'empty.md'), '');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(1);
      expect(result.legacy.length).toBe(1);
      expect(result.legacy[0].confidence).toBe(0);
    });
  });

  it('should handle empty directories', async () => {
    await withTempDir(async (tmpDir) => {
      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(0);
      expect(result.specs.length).toBe(0);
      expect(result.statistics.specsConfidence).toBe(0);
    });
  });

  it('should skip hidden files and directories', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, '.hidden.md'), 'user story content');
      await fs.ensureDir(path.join(tmpDir, '.hidden-dir'));
      await fs.writeFile(path.join(tmpDir, '.hidden-dir/file.md'), 'spec content');
      await fs.writeFile(path.join(tmpDir, 'visible.md'), 'feature');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(1); // Only visible.md
    });
  });

  it('should skip node_modules directory', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.ensureDir(path.join(tmpDir, 'node_modules'));
      await fs.writeFile(path.join(tmpDir, 'node_modules/package.md'), 'content');
      await fs.writeFile(path.join(tmpDir, 'real.md'), 'user story');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(1); // Only real.md
    });
  });

  it('should only process .md and .markdown files', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'file.md'), 'spec');
      await fs.writeFile(path.join(tmpDir, 'file.markdown'), 'module');
      await fs.writeFile(path.join(tmpDir, 'file.txt'), 'ignored');
      await fs.writeFile(path.join(tmpDir, 'file.mdx'), 'ignored');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(2); // Only .md and .markdown
    });
  });

  it('should handle special characters in filenames', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'файл-с-юникодом.md'), 'user story');
      await fs.writeFile(path.join(tmpDir, 'file (with spaces).md'), 'module component');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(2);
    });
  });

  it('should handle deeply nested directories', async () => {
    await withTempDir(async (tmpDir) => {
      const deepPath = path.join(tmpDir, 'a/b/c/d/e');
      await fs.ensureDir(deepPath);
      await fs.writeFile(path.join(deepPath, 'deep.md'), 'user story acceptance criteria feature spec');

      const result = await analyzer.analyze(tmpDir);

      expect(result.totalFiles).toBe(1);
      expect(result.specs.length).toBe(1);
      expect(result.specs[0].relativePath).toContain(path.join('a', 'b', 'c', 'd', 'e', 'deep.md'));
    });
  });
});

/**
 * Unit Tests: BrownfieldImporter Structure Preservation
 * Coverage Target: 95%
 */

import { BrownfieldImporter } from '../../../src/core/brownfield/importer';
import { FileClassification } from '../../../src/core/brownfield/analyzer';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldImporter - Structure Preservation', () => {
  let importer: BrownfieldImporter;

  beforeEach(async () => {
    await withTempDir(async (tmpDir) => {
      // Create .specweave structure with default project
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

      // Create config.json with default project
      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              id: 'default',
              name: 'Default Project',
              description: 'Default project'
            }
          }
        }
      }, null, 2));

      importer = new BrownfieldImporter(tmpDir);
    });
  });

  it('should preserve deeply nested folder structures', async () => {
    await withTempDir(async (tmpDir) => {
      // Create deeply nested source structure
      const sourceDir = path.join(tmpDir, 'source');
      const deepPath = path.join(sourceDir, 'level1/level2/level3/level4/level5');
      await fs.ensureDir(deepPath);
      await fs.writeFile(path.join(deepPath, 'deep-doc.md'), 'deep content');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(deepPath, 'deep-doc.md'),
          relativePath: path.join('level1', 'level2', 'level3', 'level4', 'level5', 'deep-doc.md'),
          type: 'spec',
          confidence: 0.8,
          keywords: ['user story'],
          reasons: ['test']
        }
      ];

      // Import with structure preservation
      await (importer as any).importFiles(files, destDir, true, sourceDir);

      // Verify deep structure preserved
      const deepFile = await fs.readFile(
        path.join(destDir, 'level1/level2/level3/level4/level5/deep-doc.md'),
        'utf-8'
      );
      expect(deepFile).toBe('deep content');

      // Verify all parent directories created
      expect(await fs.pathExists(path.join(destDir, 'level1'))).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'level1/level2'))).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'level1/level2/level3/level4'))).toBe(true);
    });
  });

  it('should handle mixed file depths correctly', async () => {
    await withTempDir(async (tmpDir) => {
      // Create files at different depths
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'root.md'), 'root content');

      await fs.ensureDir(path.join(sourceDir, 'level1'));
      await fs.writeFile(path.join(sourceDir, 'level1/mid.md'), 'mid content');

      await fs.ensureDir(path.join(sourceDir, 'level1/level2/level3'));
      await fs.writeFile(path.join(sourceDir, 'level1/level2/level3/deep.md'), 'deep content');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'root.md'),
          relativePath: 'root.md',
          type: 'spec',
          confidence: 0.9,
          keywords: ['user story'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'level1/mid.md'),
          relativePath: path.join('level1', 'mid.md'),
          type: 'module',
          confidence: 0.8,
          keywords: ['component'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'level1/level2/level3/deep.md'),
          relativePath: path.join('level1', 'level2', 'level3', 'deep.md'),
          type: 'team',
          confidence: 0.7,
          keywords: ['getting started'],
          reasons: ['test']
        }
      ];

      // Import with structure preservation
      await (importer as any).importFiles(files, destDir, true, sourceDir);

      // Verify all files in correct locations
      const rootFile = await fs.readFile(path.join(destDir, 'root.md'), 'utf-8');
      const midFile = await fs.readFile(path.join(destDir, 'level1/mid.md'), 'utf-8');
      const deepFile = await fs.readFile(path.join(destDir, 'level1/level2/level3/deep.md'), 'utf-8');

      expect(rootFile).toBe('root content');
      expect(midFile).toBe('mid content');
      expect(deepFile).toBe('deep content');
    });
  });

  it('should handle special characters in folder names', async () => {
    await withTempDir(async (tmpDir) => {
      // Create folders with special characters
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(path.join(sourceDir, 'folder with spaces'));
      await fs.writeFile(path.join(sourceDir, 'folder with spaces/doc.md'), 'spaced content');

      await fs.ensureDir(path.join(sourceDir, 'folder-with-dashes'));
      await fs.writeFile(path.join(sourceDir, 'folder-with-dashes/doc.md'), 'dashed content');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'folder with spaces/doc.md'),
          relativePath: path.join('folder with spaces', 'doc.md'),
          type: 'spec',
          confidence: 0.8,
          keywords: ['user story'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'folder-with-dashes/doc.md'),
          relativePath: path.join('folder-with-dashes', 'doc.md'),
          type: 'module',
          confidence: 0.7,
          keywords: ['component'],
          reasons: ['test']
        }
      ];

      // Import with structure preservation
      await (importer as any).importFiles(files, destDir, true, sourceDir);

      // Verify special characters preserved
      const spacedFile = await fs.readFile(path.join(destDir, 'folder with spaces/doc.md'), 'utf-8');
      const dashedFile = await fs.readFile(path.join(destDir, 'folder-with-dashes/doc.md'), 'utf-8');

      expect(spacedFile).toBe('spaced content');
      expect(dashedFile).toBe('dashed content');
    });
  });

  it('should create parent directories for nested files', async () => {
    await withTempDir(async (tmpDir) => {
      // Create source file in nested location
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(path.join(sourceDir, 'a/b/c'));
      await fs.writeFile(path.join(sourceDir, 'a/b/c/file.md'), 'content');

      // Destination does NOT exist yet
      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'a/b/c/file.md'),
          relativePath: path.join('a', 'b', 'c', 'file.md'),
          type: 'legacy',
          confidence: 0,
          keywords: [],
          reasons: ['test']
        }
      ];

      // Import with structure preservation
      await (importer as any).importFiles(files, destDir, true, sourceDir);

      // Verify all parent directories created
      expect(await fs.pathExists(path.join(destDir, 'a'))).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'a/b'))).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'a/b/c'))).toBe(true);

      // Verify file copied
      const copiedFile = await fs.readFile(path.join(destDir, 'a/b/c/file.md'), 'utf-8');
      expect(copiedFile).toBe('content');
    });
  });
});

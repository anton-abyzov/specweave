/**
 * Unit Tests: BrownfieldImporter File Copying Logic
 * Coverage Target: 95%
 */

import { BrownfieldImporter } from '../../../src/core/brownfield/importer';
import { FileClassification } from '../../../src/core/brownfield/analyzer';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldImporter - File Copying Logic', () => {
  let importer: BrownfieldImporter;
  let testRoot: string;

  beforeEach(async () => {
    await withTempDir(async (tmpDir) => {
      testRoot = tmpDir;

      // Create .specweave structure with default project
      const specweaveRoot = path.join(testRoot, '.specweave');
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

      importer = new BrownfieldImporter(testRoot);
    });
  });

  it('should copy files to destination directory', async () => {
    await withTempDir(async (tmpDir) => {
      // Create source files
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'file1.md'), 'content1');
      await fs.writeFile(path.join(sourceDir, 'file2.md'), 'content2');

      // Create destination
      const destDir = path.join(tmpDir, 'dest');

      // Create file classifications
      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'file1.md'),
          relativePath: 'file1.md',
          type: 'spec',
          confidence: 0.8,
          keywords: ['user story'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'file2.md'),
          relativePath: 'file2.md',
          type: 'spec',
          confidence: 0.7,
          keywords: ['feature'],
          reasons: ['test']
        }
      ];

      // Call importFiles (accessing private method via 'as any')
      await (importer as any).importFiles(files, destDir, false, sourceDir);

      // Verify files were copied
      const copiedFile1 = await fs.readFile(path.join(destDir, 'file1.md'), 'utf-8');
      const copiedFile2 = await fs.readFile(path.join(destDir, 'file2.md'), 'utf-8');

      expect(copiedFile1).toBe('content1');
      expect(copiedFile2).toBe('content2');
    });
  });

  it('should preserve folder structure when preserveStructure=true', async () => {
    await withTempDir(async (tmpDir) => {
      // Create nested source structure
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(path.join(sourceDir, 'docs/specs'));
      await fs.writeFile(path.join(sourceDir, 'docs/specs/spec1.md'), 'spec content');
      await fs.writeFile(path.join(sourceDir, 'readme.md'), 'readme content');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'docs/specs/spec1.md'),
          relativePath: path.join('docs', 'specs', 'spec1.md'),
          type: 'spec',
          confidence: 0.9,
          keywords: ['user story'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'readme.md'),
          relativePath: 'readme.md',
          type: 'team',
          confidence: 0.8,
          keywords: ['getting started'],
          reasons: ['test']
        }
      ];

      // Import with structure preservation
      await (importer as any).importFiles(files, destDir, true, sourceDir);

      // Verify structure preserved
      const nestedFile = await fs.readFile(path.join(destDir, 'docs/specs/spec1.md'), 'utf-8');
      const rootFile = await fs.readFile(path.join(destDir, 'readme.md'), 'utf-8');

      expect(nestedFile).toBe('spec content');
      expect(rootFile).toBe('readme content');

      // Verify directory structure exists
      expect(await fs.pathExists(path.join(destDir, 'docs/specs'))).toBe(true);
    });
  });

  it('should flatten structure when preserveStructure=false', async () => {
    await withTempDir(async (tmpDir) => {
      // Create nested source structure
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(path.join(sourceDir, 'nested/deep/folder'));
      await fs.writeFile(path.join(sourceDir, 'nested/deep/folder/doc.md'), 'deep content');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'nested/deep/folder/doc.md'),
          relativePath: path.join('nested', 'deep', 'folder', 'doc.md'),
          type: 'module',
          confidence: 0.7,
          keywords: ['component'],
          reasons: ['test']
        }
      ];

      // Import without structure preservation (flatten)
      await (importer as any).importFiles(files, destDir, false, sourceDir);

      // Verify file is in root of destination (flattened)
      const flattenedFile = await fs.readFile(path.join(destDir, 'doc.md'), 'utf-8');
      expect(flattenedFile).toBe('deep content');

      // Verify nested directories were NOT created
      expect(await fs.pathExists(path.join(destDir, 'nested'))).toBe(false);
    });
  });

  it('should handle duplicate filenames by appending timestamp', async () => {
    await withTempDir(async (tmpDir) => {
      // Create source files with same name in different folders
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(path.join(sourceDir, 'folder1'));
      await fs.ensureDir(path.join(sourceDir, 'folder2'));
      await fs.writeFile(path.join(sourceDir, 'folder1/doc.md'), 'content1');
      await fs.writeFile(path.join(sourceDir, 'folder2/doc.md'), 'content2');

      const destDir = path.join(tmpDir, 'dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'folder1/doc.md'),
          relativePath: path.join('folder1', 'doc.md'),
          type: 'spec',
          confidence: 0.8,
          keywords: ['user story'],
          reasons: ['test']
        },
        {
          path: path.join(sourceDir, 'folder2/doc.md'),
          relativePath: path.join('folder2', 'doc.md'),
          type: 'spec',
          confidence: 0.7,
          keywords: ['feature'],
          reasons: ['test']
        }
      ];

      // Import without structure preservation (will cause filename collision)
      await (importer as any).importFiles(files, destDir, false, sourceDir);

      // Verify first file has original name
      const firstFile = await fs.readFile(path.join(destDir, 'doc.md'), 'utf-8');
      expect(firstFile).toBe('content1');

      // Verify second file has timestamped name (doc-{timestamp}.md)
      const destFiles = await fs.readdir(destDir);
      const timestampedFile = destFiles.find(f => f.startsWith('doc-') && f.endsWith('.md') && f !== 'doc.md');
      expect(timestampedFile).toBeDefined();

      if (timestampedFile) {
        const secondFile = await fs.readFile(path.join(destDir, timestampedFile), 'utf-8');
        expect(secondFile).toBe('content2');
      }
    });
  });

  it('should create destination directories if they do not exist', async () => {
    await withTempDir(async (tmpDir) => {
      // Create source file
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'test.md'), 'content');

      // Destination does NOT exist yet
      const destDir = path.join(tmpDir, 'nonexistent/nested/dest');

      const files: FileClassification[] = [
        {
          path: path.join(sourceDir, 'test.md'),
          relativePath: 'test.md',
          type: 'legacy',
          confidence: 0,
          keywords: [],
          reasons: ['test']
        }
      ];

      // Import should create destination directory
      await (importer as any).importFiles(files, destDir, false, sourceDir);

      // Verify destination was created
      expect(await fs.pathExists(destDir)).toBe(true);

      // Verify file was copied
      const copiedFile = await fs.readFile(path.join(destDir, 'test.md'), 'utf-8');
      expect(copiedFile).toBe('content');
    });
  });
});

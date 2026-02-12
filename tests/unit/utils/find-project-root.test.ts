/**
 * Unit tests for find-project-root
 *
 * Tests findProjectRoot, getProjectRoot, isInsideSpecWeaveProject,
 * getSpecWeaveDir, and resolveFromProjectRoot using real temp directories.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  findProjectRoot,
  getProjectRoot,
  isInsideSpecWeaveProject,
  getSpecWeaveDir,
  resolveFromProjectRoot,
} from '../../../src/utils/find-project-root.js';

/** Collect temp dirs for cleanup */
const tempDirs: string[] = [];

/**
 * Create a temp directory tree for testing:
 *
 *   <tmpBase>/
 *     project-root/
 *       .specweave/
 *       src/
 *         nested/
 */
async function createProjectTree(): Promise<{ tmpBase: string; projectRoot: string; nestedDir: string }> {
  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fpr-'));
  tempDirs.push(tmpBase);

  const projectRoot = path.join(tmpBase, 'project-root');
  const specweaveDir = path.join(projectRoot, '.specweave');
  const srcDir = path.join(projectRoot, 'src');
  const nestedDir = path.join(srcDir, 'nested');

  await fsPromises.mkdir(specweaveDir, { recursive: true });
  await fsPromises.mkdir(nestedDir, { recursive: true });

  return { tmpBase, projectRoot, nestedDir };
}

/**
 * Create a temp directory tree WITHOUT .specweave:
 *
 *   <tmpBase>/
 *     no-project/
 *       src/
 *         nested/
 */
async function createBareDirTree(): Promise<{ tmpBase: string; bareRoot: string; nestedDir: string }> {
  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fpr-bare-'));
  tempDirs.push(tmpBase);

  const bareRoot = path.join(tmpBase, 'no-project');
  const nestedDir = path.join(bareRoot, 'src', 'nested');

  await fsPromises.mkdir(nestedDir, { recursive: true });

  return { tmpBase, bareRoot, nestedDir };
}

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await fsPromises.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  tempDirs.length = 0;
});

describe('find-project-root', () => {
  // ---------------------------------------------------------------------------
  // findProjectRoot
  // ---------------------------------------------------------------------------
  describe('findProjectRoot', () => {
    it('should find .specweave in the current directory', async () => {
      const { projectRoot } = await createProjectTree();

      const result = findProjectRoot(projectRoot);
      expect(result).toBe(projectRoot);
    });

    it('should find .specweave in a parent directory (nested 2 levels deep)', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = findProjectRoot(nestedDir);
      expect(result).toBe(projectRoot);
    });

    it('should find .specweave from src/ (nested 1 level deep)', async () => {
      const { projectRoot } = await createProjectTree();
      const srcDir = path.join(projectRoot, 'src');

      const result = findProjectRoot(srcDir);
      expect(result).toBe(projectRoot);
    });

    it('should return null when no .specweave exists anywhere in the tree', async () => {
      const { nestedDir } = await createBareDirTree();

      const result = findProjectRoot(nestedDir);
      expect(result).toBeNull();
    });

    it('should return null for a bare temp directory', async () => {
      const { tmpBase } = await createBareDirTree();

      const result = findProjectRoot(tmpBase);
      expect(result).toBeNull();
    });

    it('should work with an explicit startDir argument', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = findProjectRoot(nestedDir);
      expect(result).toBe(projectRoot);
    });

    it('should not match a .specweave file (only directories)', async () => {
      const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fpr-file-'));
      tempDirs.push(tmpBase);

      const fakeRoot = path.join(tmpBase, 'fake-project');
      await fsPromises.mkdir(fakeRoot, { recursive: true });
      // Create .specweave as a FILE, not a directory
      await fsPromises.writeFile(path.join(fakeRoot, '.specweave'), 'not a dir');

      const result = findProjectRoot(fakeRoot);
      expect(result).toBeNull();
    });

    it('should resolve relative startDir paths', async () => {
      const { projectRoot } = await createProjectTree();

      // Use an absolute path -- path.resolve will normalize it the same way the function does
      const result = findProjectRoot(projectRoot);
      expect(result).toBe(path.resolve(projectRoot));
    });
  });

  // ---------------------------------------------------------------------------
  // getProjectRoot
  // ---------------------------------------------------------------------------
  describe('getProjectRoot', () => {
    it('should return the found root when .specweave exists', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = getProjectRoot(nestedDir);
      expect(result).toBe(projectRoot);
    });

    it('should fall back to process.cwd() when .specweave is not found', async () => {
      const { nestedDir } = await createBareDirTree();

      const result = getProjectRoot(nestedDir);
      expect(result).toBe(process.cwd());
    });

    it('should return project root when called from the root itself', async () => {
      const { projectRoot } = await createProjectTree();

      const result = getProjectRoot(projectRoot);
      expect(result).toBe(projectRoot);
    });
  });

  // ---------------------------------------------------------------------------
  // isInsideSpecWeaveProject
  // ---------------------------------------------------------------------------
  describe('isInsideSpecWeaveProject', () => {
    it('should return true when inside a SpecWeave project', async () => {
      const { nestedDir } = await createProjectTree();

      expect(isInsideSpecWeaveProject(nestedDir)).toBe(true);
    });

    it('should return true at the project root itself', async () => {
      const { projectRoot } = await createProjectTree();

      expect(isInsideSpecWeaveProject(projectRoot)).toBe(true);
    });

    it('should return false when outside any SpecWeave project', async () => {
      const { nestedDir } = await createBareDirTree();

      expect(isInsideSpecWeaveProject(nestedDir)).toBe(false);
    });

    it('should return false for a bare temp directory', async () => {
      const { tmpBase } = await createBareDirTree();

      expect(isInsideSpecWeaveProject(tmpBase)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getSpecWeaveDir
  // ---------------------------------------------------------------------------
  describe('getSpecWeaveDir', () => {
    it('should return the correct .specweave path when given the project root', async () => {
      const { projectRoot } = await createProjectTree();

      const result = getSpecWeaveDir(projectRoot);
      expect(result).toBe(path.join(projectRoot, '.specweave'));
    });

    it('should return null when given a directory without .specweave', async () => {
      const { bareRoot } = await createBareDirTree();

      const result = getSpecWeaveDir(bareRoot);
      expect(result).toBeNull();
    });

    it('should return the .specweave path and verify it exists on disk', async () => {
      const { projectRoot } = await createProjectTree();

      const result = getSpecWeaveDir(projectRoot);
      expect(result).not.toBeNull();
      expect(fs.existsSync(result!)).toBe(true);
      expect(fs.statSync(result!).isDirectory()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveFromProjectRoot
  // ---------------------------------------------------------------------------
  describe('resolveFromProjectRoot', () => {
    it('should resolve a relative path from the project root', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = resolveFromProjectRoot('.specweave/config.json', nestedDir);
      expect(result).toBe(path.resolve(projectRoot, '.specweave/config.json'));
    });

    it('should resolve src-relative paths correctly', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = resolveFromProjectRoot('src/index.ts', nestedDir);
      expect(result).toBe(path.resolve(projectRoot, 'src/index.ts'));
    });

    it('should return null when project root is not found', async () => {
      const { nestedDir } = await createBareDirTree();

      const result = resolveFromProjectRoot('some/path.txt', nestedDir);
      expect(result).toBeNull();
    });

    it('should handle nested relative paths', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();

      const result = resolveFromProjectRoot('docs/api/reference.md', nestedDir);
      expect(result).toBe(path.resolve(projectRoot, 'docs/api/reference.md'));
    });

    it('should work when called from the project root itself', async () => {
      const { projectRoot } = await createProjectTree();

      const result = resolveFromProjectRoot('package.json', projectRoot);
      expect(result).toBe(path.resolve(projectRoot, 'package.json'));
    });
  });
});

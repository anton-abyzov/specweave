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
  findUmbrellaRoot,
  resolveEffectiveRoot,
  hasSpecweaveIncrements,
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
  // config.json is required for findProjectRoot to recognize a valid project
  await fsPromises.writeFile(path.join(specweaveDir, 'config.json'), '{}');
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

/**
 * Create an umbrella workspace tree for testing:
 *
 *   <tmpBase>/
 *     umbrella/
 *       .specweave/
 *         config.json  (umbrella.enabled: true)
 *       repositories/
 *         org/
 *           child-repo/
 *             .git/
 *             src/
 *               deep/
 */
async function createUmbrellaTree(configOverride?: Record<string, unknown>): Promise<{
  tmpBase: string;
  umbrellaRoot: string;
  childRepo: string;
  childRepoNested: string;
}> {
  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-umb-'));
  tempDirs.push(tmpBase);

  const umbrellaRoot = path.join(tmpBase, 'umbrella');
  const specweaveDir = path.join(umbrellaRoot, '.specweave');
  const reposDir = path.join(umbrellaRoot, 'repositories', 'org');
  const childRepo = path.join(reposDir, 'child-repo');

  await fsPromises.mkdir(specweaveDir, { recursive: true });
  await fsPromises.writeFile(
    path.join(specweaveDir, 'config.json'),
    JSON.stringify(configOverride ?? { umbrella: { enabled: true } })
  );
  await fsPromises.mkdir(path.join(specweaveDir, 'increments', '0001-test'), { recursive: true });
  await fsPromises.mkdir(path.join(childRepo, '.git'), { recursive: true });
  await fsPromises.mkdir(path.join(childRepo, 'src', 'deep'), { recursive: true });

  return { tmpBase, umbrellaRoot, childRepo, childRepoNested: path.join(childRepo, 'src', 'deep') };
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

    it('should not match a stale .specweave directory (no config.json)', async () => {
      const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fpr-stale-'));
      tempDirs.push(tmpBase);

      const staleRoot = path.join(tmpBase, 'stale-project');
      const specweaveDir = path.join(staleRoot, '.specweave');
      await fsPromises.mkdir(path.join(specweaveDir, 'logs'), { recursive: true });
      await fsPromises.mkdir(path.join(specweaveDir, 'state'), { recursive: true });
      // No config.json — this is a stale folder

      const result = findProjectRoot(staleRoot);
      expect(result).toBeNull();
    });

    it('should skip stale parent .specweave and find valid child project', async () => {
      const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fpr-skip-'));
      tempDirs.push(tmpBase);

      // Parent has stale .specweave (no config.json)
      const parentDir = path.join(tmpBase, 'parent');
      await fsPromises.mkdir(path.join(parentDir, '.specweave', 'state'), { recursive: true });

      // Child has valid .specweave/config.json
      const childDir = path.join(parentDir, 'child-project');
      const childSpecweave = path.join(childDir, '.specweave');
      await fsPromises.mkdir(childSpecweave, { recursive: true });
      await fsPromises.writeFile(path.join(childSpecweave, 'config.json'), '{}');

      // From inside child, should find child (not stale parent)
      const result = findProjectRoot(childDir);
      expect(result).toBe(childDir);

      // From inside a nested dir in child, should still find child
      const nestedDir = path.join(childDir, 'src', 'deep');
      await fsPromises.mkdir(nestedDir, { recursive: true });
      const nestedResult = findProjectRoot(nestedDir);
      expect(nestedResult).toBe(childDir);
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

  // ---------------------------------------------------------------------------
  // findUmbrellaRoot
  // ---------------------------------------------------------------------------
  describe('findUmbrellaRoot', () => {
    it('should return umbrella root when called from the umbrella root itself', async () => {
      const { umbrellaRoot } = await createUmbrellaTree();
      const result = findUmbrellaRoot(umbrellaRoot);
      expect(result).toBe(umbrellaRoot);
    });

    it('should return umbrella root when called from a child repo', async () => {
      const { umbrellaRoot, childRepo } = await createUmbrellaTree();
      const result = findUmbrellaRoot(childRepo);
      expect(result).toBe(umbrellaRoot);
    });

    it('should return umbrella root when called from deeply nested child dir', async () => {
      const { umbrellaRoot, childRepoNested } = await createUmbrellaTree();
      const result = findUmbrellaRoot(childRepoNested);
      expect(result).toBe(umbrellaRoot);
    });

    it('should detect umbrella via umbrella.enabled flag', async () => {
      const { umbrellaRoot, childRepo } = await createUmbrellaTree({ umbrella: { enabled: true } });
      const result = findUmbrellaRoot(childRepo);
      expect(result).toBe(umbrellaRoot);
    });

    it('should detect umbrella via repository.umbrellaRepo flag', async () => {
      const { umbrellaRoot, childRepo } = await createUmbrellaTree({ repository: { umbrellaRepo: true } });
      const result = findUmbrellaRoot(childRepo);
      expect(result).toBe(umbrellaRoot);
    });

    it('should return null for a standalone project (no umbrella flags)', async () => {
      const { projectRoot } = await createProjectTree();
      const result = findUmbrellaRoot(projectRoot);
      expect(result).toBeNull();
    });

    it('should return null when no .specweave exists', async () => {
      const { nestedDir } = await createBareDirTree();
      const result = findUmbrellaRoot(nestedDir);
      expect(result).toBeNull();
    });

    it('should detect umbrella via repositories/ directory fallback', async () => {
      const { umbrellaRoot, childRepo } = await createUmbrellaTree({ someOther: true });
      // Config has no umbrella flags but repositories/ dir exists
      const result = findUmbrellaRoot(childRepo);
      expect(result).toBe(umbrellaRoot);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveEffectiveRoot
  // ---------------------------------------------------------------------------
  describe('resolveEffectiveRoot', () => {
    it('should return umbrella root when inside an umbrella workspace', async () => {
      const { umbrellaRoot, childRepo } = await createUmbrellaTree();
      const result = resolveEffectiveRoot(childRepo);
      expect(result).toBe(umbrellaRoot);
    });

    it('should return umbrella root from deeply nested child dir', async () => {
      const { umbrellaRoot, childRepoNested } = await createUmbrellaTree();
      const result = resolveEffectiveRoot(childRepoNested);
      expect(result).toBe(umbrellaRoot);
    });

    it('should return project root for standalone project', async () => {
      const { projectRoot, nestedDir } = await createProjectTree();
      const result = resolveEffectiveRoot(nestedDir);
      expect(result).toBe(projectRoot);
    });

    it('should fall back to process.cwd() when no project found', async () => {
      const { nestedDir } = await createBareDirTree();
      const result = resolveEffectiveRoot(nestedDir);
      expect(result).toBe(process.cwd());
    });
  });

  // ---------------------------------------------------------------------------
  // hasSpecweaveIncrements
  // ---------------------------------------------------------------------------
  describe('hasSpecweaveIncrements', () => {
    it('should return true when increments directory has content', async () => {
      const { umbrellaRoot } = await createUmbrellaTree();
      // createUmbrellaTree already creates .specweave/increments/0001-test/
      expect(hasSpecweaveIncrements(umbrellaRoot)).toBe(true);
    });

    it('should return false when no .specweave exists', async () => {
      const { bareRoot } = await createBareDirTree();
      expect(hasSpecweaveIncrements(bareRoot)).toBe(false);
    });

    it('should return false when increments directory is empty', async () => {
      const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-inc-empty-'));
      tempDirs.push(tmpBase);
      const root = path.join(tmpBase, 'project');
      await fsPromises.mkdir(path.join(root, '.specweave', 'increments'), { recursive: true });
      expect(hasSpecweaveIncrements(root)).toBe(false);
    });

    it('should return false when only hidden files in increments', async () => {
      const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-inc-hidden-'));
      tempDirs.push(tmpBase);
      const root = path.join(tmpBase, 'project');
      const incDir = path.join(root, '.specweave', 'increments');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(path.join(incDir, '.gitkeep'), '');
      expect(hasSpecweaveIncrements(root)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getSpecweavePath (umbrella-aware)
  // ---------------------------------------------------------------------------
  describe('getSpecweavePath', () => {
    it('should be exported as a function', async () => {
      const mod = await import('../../../src/utils/find-project-root.js');
      expect(typeof mod.getSpecweavePath).toBe('function');
    });

    it('should return umbrella .specweave path from child repo', async () => {
      const mod = await import('../../../src/utils/find-project-root.js');
      const { umbrellaRoot, childRepo } = await createUmbrellaTree();
      const result = mod.getSpecweavePath(childRepo);
      expect(result).toBe(path.join(umbrellaRoot, '.specweave'));
    });

    it('should return umbrella .specweave from deeply nested child dir', async () => {
      const mod = await import('../../../src/utils/find-project-root.js');
      const { umbrellaRoot, childRepoNested } = await createUmbrellaTree();
      const result = mod.getSpecweavePath(childRepoNested);
      expect(result).toBe(path.join(umbrellaRoot, '.specweave'));
    });

    it('should return project .specweave for standalone project', async () => {
      const mod = await import('../../../src/utils/find-project-root.js');
      const { projectRoot, nestedDir } = await createProjectTree();
      const result = mod.getSpecweavePath(nestedDir);
      expect(result).toBe(path.join(projectRoot, '.specweave'));
    });

    it('should return cwd-based .specweave when no project found', async () => {
      const mod = await import('../../../src/utils/find-project-root.js');
      const { nestedDir } = await createBareDirTree();
      const result = mod.getSpecweavePath(nestedDir);
      expect(result).toBe(path.join(process.cwd(), '.specweave'));
    });
  });
});

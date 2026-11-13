/**
 * Unit tests for init/path-utils
 *
 * Tests findPackageRoot, detectNestedSpecweave, countFilesRecursive
 * with real temp directories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync, symlinkSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  findPackageRoot,
  detectNestedSpecweave,
  countFilesRecursive,
  scanUmbrellaRepos,
  buildWorkspaceConfig,
} from '../../../../../src/cli/helpers/init/path-utils.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-path-test-${name}-${suffix}`);
}

describe('path-utils', () => {
  // ─── findPackageRoot ────────────────────────────────────────────

  describe('findPackageRoot', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('pkg');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should find package root with specweave package.json', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'specweave' }));
      const sub = path.join(dir, 'src', 'utils');
      mkdirSync(sub, { recursive: true });

      const result = findPackageRoot(sub);
      expect(result).toBe(dir);
    });

    it('should return null if package.json has different name', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'other-pkg' }));
      const sub = path.join(dir, 'src');
      mkdirSync(sub, { recursive: true });

      expect(findPackageRoot(sub)).toBeNull();
    });

    it('should return null if no package.json exists', () => {
      const sub = path.join(dir, 'deep', 'nested');
      mkdirSync(sub, { recursive: true });

      expect(findPackageRoot(sub)).toBeNull();
    });

    it('should handle invalid JSON in package.json', () => {
      writeFileSync(path.join(dir, 'package.json'), 'not valid json');
      expect(findPackageRoot(dir)).toBeNull();
    });
  });

  // ─── detectNestedSpecweave ──────────────────────────────────────

  describe('detectNestedSpecweave', () => {
    let parentDir: string;
    let childDir: string;

    beforeEach(() => {
      parentDir = tmpPath('nested-parent');
      childDir = path.join(parentDir, 'subproject');
      mkdirSync(childDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(parentDir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect .specweave in parent directory', () => {
      mkdirSync(path.join(parentDir, '.specweave'), { recursive: true });
      const result = detectNestedSpecweave(childDir);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(1);
      const parentFolder = result!.find(f => f.path === parentDir);
      expect(parentFolder).toBeTruthy();
      expect(parentFolder!.depth).toBe(1);
    });

    it('should return null when no parent .specweave exists', () => {
      expect(detectNestedSpecweave(childDir)).toBeNull();
    });

    it('should set isHomeDir correctly', () => {
      // This test can only validate the flag is boolean — we can't actually
      // create .specweave in the real home dir in tests
      const result = detectNestedSpecweave(childDir);
      if (result) {
        for (const folder of result) {
          expect(typeof folder.isHomeDir).toBe('boolean');
        }
      }
    });
  });

  // ─── countFilesRecursive ────────────────────────────────────────

  describe('countFilesRecursive', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('count');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should return 0 for empty directory', () => {
      expect(countFilesRecursive(dir)).toBe(0);
    });

    it('should count flat files', () => {
      writeFileSync(path.join(dir, 'a.txt'), 'a');
      writeFileSync(path.join(dir, 'b.txt'), 'b');
      writeFileSync(path.join(dir, 'c.txt'), 'c');
      expect(countFilesRecursive(dir)).toBe(3);
    });

    it('should count files recursively in subdirectories', () => {
      writeFileSync(path.join(dir, 'root.txt'), 'root');
      const sub = path.join(dir, 'sub');
      mkdirSync(sub);
      writeFileSync(path.join(sub, 'nested.txt'), 'nested');
      const deep = path.join(sub, 'deep');
      mkdirSync(deep);
      writeFileSync(path.join(deep, 'deep.txt'), 'deep');

      expect(countFilesRecursive(dir)).toBe(3);
    });

    it('should return 0 for non-existent directory', () => {
      expect(countFilesRecursive('/nonexistent/dir/xyz')).toBe(0);
    });
  });

  // ─── scanUmbrellaRepos ──────────────────────────────────────────

  describe('scanUmbrellaRepos', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('umbrella');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should return null when no repositories/ directory exists', () => {
      expect(scanUmbrellaRepos(dir)).toBeNull();
    });

    it('should return null when repositories/ is empty', () => {
      mkdirSync(path.join(dir, 'repositories'));
      expect(scanUmbrellaRepos(dir)).toBeNull();
    });

    it('should return null when repositories/ has org dirs but no git repos', () => {
      mkdirSync(path.join(dir, 'repositories', 'acme', 'foo'), { recursive: true });
      expect(scanUmbrellaRepos(dir)).toBeNull();
    });

    it('should discover repos with .git directories', () => {
      const repoPath = path.join(dir, 'repositories', 'acme', 'my-app');
      mkdirSync(path.join(repoPath, '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir);
      expect(result).not.toBeNull();
      expect(result!.isUmbrella).toBe(true);
      expect(result!.totalRepoCount).toBe(1);
      expect(result!.orgs).toEqual(['acme']);
      expect(result!.repos).toHaveLength(1);
      expect(result!.repos[0].org).toBe('acme');
      expect(result!.repos[0].name).toBe('my-app');
      expect(result!.repos[0].hasGit).toBe(true);
    });

    it('should discover multiple repos across multiple orgs', () => {
      mkdirSync(path.join(dir, 'repositories', 'org-a', 'repo1', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'org-a', 'repo2', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'org-b', 'repo3', '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir);
      expect(result).not.toBeNull();
      expect(result!.totalRepoCount).toBe(3);
      expect(result!.orgs).toContain('org-a');
      expect(result!.orgs).toContain('org-b');
    });

    it('should skip directories without .git', () => {
      mkdirSync(path.join(dir, 'repositories', 'acme', 'has-git', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'acme', 'no-git'), { recursive: true });

      const result = scanUmbrellaRepos(dir);
      expect(result).not.toBeNull();
      expect(result!.totalRepoCount).toBe(1);
      expect(result!.repos[0].name).toBe('has-git');
    });

    it('should skip hidden directories', () => {
      mkdirSync(path.join(dir, 'repositories', '.hidden', 'repo', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'visible', '.hidden-repo', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'visible', 'real-repo', '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir);
      expect(result).not.toBeNull();
      expect(result!.totalRepoCount).toBe(1);
      expect(result!.repos[0].name).toBe('real-repo');
    });

    it('should include relative path in repo results', () => {
      mkdirSync(path.join(dir, 'repositories', 'acme', 'my-app', '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir);
      expect(result!.repos[0].path).toBe(path.join('repositories', 'acme', 'my-app'));
    });

    it('counts a repository directly under repositories/, with no org folder', () => {
      mkdirSync(path.join(dir, 'repositories', 'my-app', '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir)!;
      expect(result.repos.map((r) => [r.org, r.name, r.path])).toEqual([['', 'my-app', path.join('repositories', 'my-app')]]);
      expect(result.orgs).toEqual([]);
    });

    it('counts checkouts under any folder names, up to three levels, in a folder that is not a checkout', () => {
      mkdirSync(path.join(dir, 'api', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'services', 'web', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'node_modules', 'dep', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'a', 'b', 'c', 'too-deep', '.git'), { recursive: true });

      const result = scanUmbrellaRepos(dir)!;
      expect(result.repos.map((r) => r.path)).toEqual(['api', path.join('services', 'web')]);
      expect(result.repos.map((r) => r.org)).toEqual(['', '']);
    });

    it('in a checkout, or a folder inside one, counts only repositories/ and leaves other nested clones out', () => {
      mkdirSync(path.join(dir, '.git'));
      mkdirSync(path.join(dir, 'repositories', 'acme', 'api', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'fixtures', 'sample', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'packages', 'tool', 'test', 'fixtures', 'repo-a', '.git'), { recursive: true });

      expect(scanUmbrellaRepos(dir)!.repos.map((r) => r.path)).toEqual([path.join('repositories', 'acme', 'api')]);
      expect(scanUmbrellaRepos(path.join(dir, 'packages', 'tool'))).toBeNull();
    });

    it('counts a linked worktree under repositories/, as before', () => {
      mkdirSync(path.join(dir, 'repositories', 'acme', 'api', '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'acme', 'api-feature'), { recursive: true });
      writeFileSync(
        path.join(dir, 'repositories', 'acme', 'api-feature', '.git'),
        `gitdir: ${path.join(dir, 'repositories', 'acme', 'api', '.git', 'worktrees', 'api-feature')}\n`,
      );

      expect(scanUmbrellaRepos(dir)!.repos.map((r) => r.name)).toEqual(['api', 'api-feature']);
    });

    it.skipIf(process.platform === 'win32')('lists a checkout reached through a symlink once', () => {
      mkdirSync(path.join(dir, 'repositories', 'acme', 'api', '.git'), { recursive: true });
      symlinkSync(path.join(dir, 'repositories', 'acme', 'api'), path.join(dir, 'repositories', 'acme', 'api-alias'));

      const result = scanUmbrellaRepos(dir)!;
      expect(result.repos.map((r) => r.path)).toEqual([path.join('repositories', 'acme', 'api')]);
    });

    it.skipIf(process.platform === 'win32')('counts a repositories/ symlink to a checkout outside the folder, as before', async () => {
      const outside = tmpPath('outside');
      mkdirSync(path.join(outside, '.git'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories', 'acme'), { recursive: true });
      symlinkSync(outside, path.join(dir, 'repositories', 'acme', 'api'));
      try {
        expect(scanUmbrellaRepos(dir)!.repos.map((r) => r.path)).toEqual([path.join('repositories', 'acme', 'api')]);
      } finally {
        await fs.rm(outside, { recursive: true, force: true });
      }
    });
  });

  describe('buildWorkspaceConfig', () => {
    it('gives two repositories with one name distinct ids from their parent folders', () => {
      const repo = (p: string) => ({ org: '', name: path.basename(p), path: p, hasGit: true });
      const config = buildWorkspaceConfig(
        {
          isUmbrella: true,
          repositoriesDir: 'repositories',
          orgs: [],
          repos: [repo('api'), repo(path.join('apps', 'api')), repo(path.join('services', 'api')), repo(path.join('repositories', 'api'))],
          totalRepoCount: 4,
        },
        'w',
      );
      expect(config.workspace.repos.map((r) => r.id)).toEqual(['api', 'apps-api', 'services-api', 'api-2']);
    });
  });
});

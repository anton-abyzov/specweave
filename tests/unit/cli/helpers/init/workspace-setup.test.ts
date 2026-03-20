/**
 * Tests for workspace-setup module
 * T-001 through T-008 (0640-init-ux-nonempty-workspace)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, symlinkSync, existsSync } from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

// --- ESM Mocks (vi.hoisted for ESM compatibility) ---

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  detectProvider: vi.fn(),
  execFileNoThrowSync: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mocks.select,
}));

vi.mock('../../../../../src/cli/helpers/init/provider-detection.js', () => ({
  detectProvider: mocks.detectProvider,
}));

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mocks.execFileNoThrowSync,
}));

import {
  scanWorkspaceContent,
  promptMigrationChoice,
  promptStartEmptySubChoice,
  copyLocalPathIntoRepositories,
  detectOrgRepo,
  restructureIntoRepositories,
  showRestructureWarnings,
  type WorkspaceContentScan,
} from '../../../../../src/cli/helpers/init/workspace-setup.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-ws-setup-${name}-${suffix}`);
}

describe('workspace-setup', () => {
  let dir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    dir = tmpPath('test');
    mkdirSync(dir, { recursive: true });
    mocks.detectProvider.mockReturnValue(null);
    mocks.execFileNoThrowSync.mockReturnValue({ stdout: '', stderr: '', exitCode: 0, success: true });
  });

  afterEach(async () => {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
  });

  // ─── T-001: scanWorkspaceContent ────────────────────────────────

  describe('scanWorkspaceContent', () => {
    it('should detect source files', () => {
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;');
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasSourceFiles).toBe(true);
      expect(scan.detectedLanguages).toContain('TypeScript');
    });

    it('should detect package manager files', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'test' }));
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasPackageManager).toBe(true);
    });

    it('should detect git repo', () => {
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasGitRepo).toBe(true);
    });

    it('should detect uncommitted changes via git status', () => {
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      mocks.execFileNoThrowSync.mockReturnValue({
        stdout: 'M src/index.ts\n', stderr: '', exitCode: 0, success: true,
      });
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasUncommittedChanges).toBe(true);
    });

    it('should report no uncommitted changes when git status clean', () => {
      mkdirSync(path.join(dir, '.git'), { recursive: true });
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasUncommittedChanges).toBe(false);
    });

    it('should count non-hidden files at depth 0-1', () => {
      writeFileSync(path.join(dir, 'README.md'), '# Project');
      writeFileSync(path.join(dir, 'package.json'), '{}');
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {};');
      writeFileSync(path.join(dir, '.hidden'), 'hidden');
      const scan = scanWorkspaceContent(dir);
      expect(scan.fileCount).toBe(3);
    });

    it('should return empty scan for empty directory', () => {
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasSourceFiles).toBe(false);
      expect(scan.hasPackageManager).toBe(false);
      expect(scan.hasGitRepo).toBe(false);
      expect(scan.hasUncommittedChanges).toBe(false);
      expect(scan.fileCount).toBe(0);
      expect(scan.detectedLanguages).toEqual([]);
    });

    it('should skip node_modules during scan', () => {
      mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
      writeFileSync(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {}');
      const scan = scanWorkspaceContent(dir);
      expect(scan.hasSourceFiles).toBe(false);
      expect(scan.fileCount).toBe(0);
    });

    it('should detect multiple languages', () => {
      writeFileSync(path.join(dir, 'app.ts'), 'const x = 1;');
      writeFileSync(path.join(dir, 'script.py'), 'x = 1');
      const scan = scanWorkspaceContent(dir);
      expect(scan.detectedLanguages).toContain('TypeScript');
      expect(scan.detectedLanguages).toContain('Python');
    });
  });

  // ─── T-002: promptMigrationChoice ──────────────────────────────

  describe('promptMigrationChoice', () => {
    const baseScan: WorkspaceContentScan = {
      hasSourceFiles: true, hasPackageManager: true, hasGitRepo: true,
      hasUncommittedChanges: false, fileCount: 10, detectedLanguages: ['TypeScript'],
    };

    it('should return continue-in-place in CI mode', async () => {
      const result = await promptMigrationChoice(baseScan, 'en', true);
      expect(result).toBe('continue-in-place');
      expect(mocks.select).not.toHaveBeenCalled();
    });

    it('should show 3-option select menu interactively', async () => {
      mocks.select.mockResolvedValue('start-empty');
      const result = await promptMigrationChoice(baseScan, 'en', false);
      expect(result).toBe('start-empty');
      expect(mocks.select).toHaveBeenCalledTimes(1);
      const callArgs = mocks.select.mock.calls[0][0];
      expect(callArgs.choices).toHaveLength(3);
    });

    it('should have start-empty as default choice', async () => {
      mocks.select.mockResolvedValue('start-empty');
      await promptMigrationChoice(baseScan, 'en', false);
      const callArgs = mocks.select.mock.calls[0][0];
      expect(callArgs.default).toBe('start-empty');
    });

    it('should return restructure when selected', async () => {
      mocks.select.mockResolvedValue('restructure');
      const result = await promptMigrationChoice(baseScan, 'en', false);
      expect(result).toBe('restructure');
    });

    it('should return continue-in-place when selected', async () => {
      mocks.select.mockResolvedValue('continue-in-place');
      const result = await promptMigrationChoice(baseScan, 'en', false);
      expect(result).toBe('continue-in-place');
    });
  });

  // ─── T-003: promptStartEmptySubChoice ──────────────────────────

  describe('promptStartEmptySubChoice', () => {
    it('should show 3 sub-options', async () => {
      mocks.select.mockResolvedValue('clone-github');
      await promptStartEmptySubChoice('en');
      expect(mocks.select).toHaveBeenCalledTimes(1);
      const callArgs = mocks.select.mock.calls[0][0];
      expect(callArgs.choices).toHaveLength(3);
    });

    it('should return clone-github when selected', async () => {
      mocks.select.mockResolvedValue('clone-github');
      expect(await promptStartEmptySubChoice('en')).toBe('clone-github');
    });

    it('should return copy-local when selected', async () => {
      mocks.select.mockResolvedValue('copy-local');
      expect(await promptStartEmptySubChoice('en')).toBe('copy-local');
    });

    it('should return add-later when selected', async () => {
      mocks.select.mockResolvedValue('add-later');
      expect(await promptStartEmptySubChoice('en')).toBe('add-later');
    });

    it('should have descriptive text for each option', async () => {
      mocks.select.mockResolvedValue('clone-github');
      await promptStartEmptySubChoice('en');
      const callArgs = mocks.select.mock.calls[0][0];
      for (const choice of callArgs.choices) {
        expect(choice.description).toBeDefined();
        expect(choice.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── T-004: copyLocalPathIntoRepositories ──────────────────────

  describe('copyLocalPathIntoRepositories', () => {
    let sourceDir: string;

    beforeEach(() => {
      sourceDir = tmpPath('source');
      mkdirSync(sourceDir, { recursive: true });
    });

    afterEach(async () => {
      await fsPromises.rm(sourceDir, { recursive: true, force: true }).catch(() => {});
    });

    it('should copy files into repositories/{org}/{repo}/', () => {
      writeFileSync(path.join(sourceDir, 'index.ts'), 'export const x = 1;');
      mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
      writeFileSync(path.join(sourceDir, 'src', 'app.ts'), 'export {};');

      const result = copyLocalPathIntoRepositories(dir, sourceDir, 'myorg', 'myrepo');
      expect(result.errors).toEqual([]);
      expect(result.copied).toContain('index.ts');
      expect(result.copied).toContain('src');

      const destDir = path.join(dir, 'repositories', 'myorg', 'myrepo');
      expect(existsSync(path.join(destDir, 'index.ts'))).toBe(true);
      expect(existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(true);
    });

    it('should exclude .git directory from copy', () => {
      writeFileSync(path.join(sourceDir, 'index.ts'), 'export {};');
      mkdirSync(path.join(sourceDir, '.git', 'objects'), { recursive: true });
      writeFileSync(path.join(sourceDir, '.git', 'HEAD'), 'ref: refs/heads/main');

      const result = copyLocalPathIntoRepositories(dir, sourceDir, 'myorg', 'myrepo');
      expect(result.skipped).toContain('.git');

      const destDir = path.join(dir, 'repositories', 'myorg', 'myrepo');
      expect(existsSync(path.join(destDir, '.git'))).toBe(false);
      expect(existsSync(path.join(destDir, 'index.ts'))).toBe(true);
    });

    it('should resolve relative paths to absolute', () => {
      writeFileSync(path.join(sourceDir, 'file.ts'), 'export {};');
      const result = copyLocalPathIntoRepositories(dir, path.resolve(sourceDir), 'myorg', 'myrepo');
      expect(result.errors).toEqual([]);
      expect(result.copied).toContain('file.ts');
    });

    it('should reject same directory as source', () => {
      writeFileSync(path.join(dir, 'file.ts'), 'export {};');
      const result = copyLocalPathIntoRepositories(dir, dir, 'myorg', 'myrepo');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.copied).toEqual([]);
    });

    it('should reject non-existent source', () => {
      const result = copyLocalPathIntoRepositories(dir, '/tmp/nonexistent-' + Date.now(), 'myorg', 'myrepo');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject if target already exists', () => {
      writeFileSync(path.join(sourceDir, 'file.ts'), 'export {};');
      const destDir = path.join(dir, 'repositories', 'myorg', 'myrepo');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(path.join(destDir, 'existing.ts'), 'export {};');

      const result = copyLocalPathIntoRepositories(dir, sourceDir, 'myorg', 'myrepo');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ─── T-005: detectOrgRepo ──────────────────────────────────────

  describe('detectOrgRepo', () => {
    it('should detect from git remote (level 1)', () => {
      mocks.detectProvider.mockReturnValue({ provider: 'github', owner: 'myorg', repo: 'myrepo' });
      const result = detectOrgRepo(dir);
      expect(result).toEqual({ org: 'myorg', repoName: 'myrepo', source: 'git-remote' });
    });

    it('should detect from package.json repository URL object (level 2)', () => {
      writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ repository: { url: 'https://github.com/testorg/testrepo.git' } }),
      );
      const result = detectOrgRepo(dir);
      expect(result).toEqual({ org: 'testorg', repoName: 'testrepo', source: 'package-json-repo' });
    });

    it('should detect from package.json repository string (level 2)', () => {
      writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ repository: 'https://github.com/testorg/testrepo' }),
      );
      const result = detectOrgRepo(dir);
      expect(result).toEqual({ org: 'testorg', repoName: 'testrepo', source: 'package-json-repo' });
    });

    it('should detect from package.json scope (level 3)', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@myorg/pkg' }));
      const result = detectOrgRepo(dir);
      expect(result).toEqual({ org: 'myorg', repoName: 'pkg', source: 'package-json-scope' });
    });

    it('should return null when nothing detected', () => {
      const result = detectOrgRepo(dir);
      expect(result).toBeNull();
    });

    it('should prioritize git remote over package.json', () => {
      mocks.detectProvider.mockReturnValue({ provider: 'github', owner: 'gitorg', repo: 'gitrepo' });
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@pkgorg/pkgrepo' }));
      const result = detectOrgRepo(dir);
      expect(result?.source).toBe('git-remote');
      expect(result?.org).toBe('gitorg');
    });

    it('should prioritize repository URL over scope', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: '@scopeorg/scoperepo',
        repository: { url: 'https://github.com/urlorg/urlrepo.git' },
      }));
      const result = detectOrgRepo(dir);
      expect(result?.source).toBe('package-json-repo');
      expect(result?.org).toBe('urlorg');
    });
  });

  // ─── T-006 & T-007: restructureIntoRepositories ────────────────

  describe('restructureIntoRepositories', () => {
    it('should move non-excluded entries into repositories/{org}/{repo}/', () => {
      writeFileSync(path.join(dir, 'index.ts'), 'export {};');
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'app.ts'), 'export {};');
      writeFileSync(path.join(dir, 'package.json'), '{}');

      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');

      expect(result.moved).toContain('index.ts');
      expect(result.moved).toContain('src');
      expect(result.moved).toContain('package.json');
      expect(result.errors).toEqual([]);

      const destDir = path.join(dir, 'repositories', 'myorg', 'myrepo');
      expect(existsSync(path.join(destDir, 'index.ts'))).toBe(true);
      expect(existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(true);
      expect(existsSync(path.join(destDir, 'package.json'))).toBe(true);

      // Originals should be gone
      expect(existsSync(path.join(dir, 'index.ts'))).toBe(false);
      expect(existsSync(path.join(dir, 'src'))).toBe(false);
    });

    // T-007: Skip list
    it('should skip .git, .specweave, node_modules, repositories', () => {
      mkdirSync(path.join(dir, '.git', 'objects'), { recursive: true });
      mkdirSync(path.join(dir, '.specweave'), { recursive: true });
      mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
      mkdirSync(path.join(dir, 'repositories'), { recursive: true });
      writeFileSync(path.join(dir, 'index.ts'), 'export {};');

      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');

      expect(result.skipped).toContain('.git');
      expect(result.skipped).toContain('.specweave');
      expect(result.skipped).toContain('node_modules');
      expect(result.skipped).toContain('repositories');
      expect(result.moved).toContain('index.ts');
    });

    it('should skip hidden dotfiles and dotdirs', () => {
      writeFileSync(path.join(dir, '.env'), 'SECRET=value');
      mkdirSync(path.join(dir, '.vscode'), { recursive: true });
      writeFileSync(path.join(dir, 'index.ts'), 'export {};');

      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');

      expect(result.skipped).toContain('.env');
      expect(result.skipped).toContain('.vscode');
      expect(result.moved).toContain('index.ts');
    });

    it('should skip symlinks', () => {
      writeFileSync(path.join(dir, 'real.ts'), 'export {};');
      try {
        symlinkSync(path.join(dir, 'real.ts'), path.join(dir, 'link.ts'));
      } catch {
        // Skip test on platforms without symlink support
        return;
      }

      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');

      expect(result.skipped).toContain('link.ts');
      expect(result.moved).toContain('real.ts');
    });

    it('should refuse if target directory already exists', () => {
      writeFileSync(path.join(dir, 'index.ts'), 'export {};');
      const destDir = path.join(dir, 'repositories', 'myorg', 'myrepo');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(path.join(destDir, 'existing.ts'), 'export {};');

      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.moved).toEqual([]);
    });

    it('should return correct targetDir path', () => {
      writeFileSync(path.join(dir, 'index.ts'), 'export {};');
      const result = restructureIntoRepositories(dir, 'myorg', 'myrepo');
      expect(result.targetDir).toBe(path.join(dir, 'repositories', 'myorg', 'myrepo'));
    });
  });

  // ─── T-008: showRestructureWarnings ────────────────────────────

  describe('showRestructureWarnings', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should warn about git commit when uncommitted changes exist', () => {
      const scan: WorkspaceContentScan = {
        hasSourceFiles: true, hasPackageManager: true, hasGitRepo: true,
        hasUncommittedChanges: true, fileCount: 10, detectedLanguages: ['TypeScript'],
      };
      showRestructureWarnings(scan);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/git commit/i);
    });

    it('should warn about symlinks, CI paths, and relative imports', () => {
      const scan: WorkspaceContentScan = {
        hasSourceFiles: true, hasPackageManager: true, hasGitRepo: true,
        hasUncommittedChanges: false, fileCount: 10, detectedLanguages: ['TypeScript'],
      };
      showRestructureWarnings(scan);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toMatch(/symlink/i);
      expect(output).toMatch(/ci/i);
      expect(output).toMatch(/import/i);
    });

    it('should not show commit warning when no uncommitted changes', () => {
      const scan: WorkspaceContentScan = {
        hasSourceFiles: true, hasPackageManager: true, hasGitRepo: true,
        hasUncommittedChanges: false, fileCount: 10, detectedLanguages: ['TypeScript'],
      };
      showRestructureWarnings(scan);
      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).not.toMatch(/git commit/i);
    });
  });
});

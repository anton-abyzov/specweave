/**
 * Discovery Phase Tests
 *
 * Tests for the living docs discovery module that scans codebase structure
 * without LLM calls to detect files, tech stack, docs, entry points, and modules.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as realFs from 'fs';
import * as realPath from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockExistsSync,
  mockStatSync,
  mockReaddirSync,
  mockReadFileSync,
  mockDetectUmbrellaStructure,
  mockPersistUmbrellaConfig,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockDetectUmbrellaStructure: vi.fn(),
  mockPersistUmbrellaConfig: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  default: {
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
  },
}));

vi.mock('../../../../src/core/living-docs/umbrella-detector.js', () => ({
  detectUmbrellaStructure: mockDetectUmbrellaStructure,
  persistUmbrellaConfig: mockPersistUmbrellaConfig,
}));

// ── Import SUT ─────────────────────────────────────────────────────────────

import {
  runDiscovery,
  calculateTier,
  selectRepresentativeFiles,
  type DiscoveryResult,
  type SamplingConfig,
} from '../../../../src/core/living-docs/discovery.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a mock Dirent-like object */
function dirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

/** Default non-umbrella detection result */
function nonUmbrellaResult() {
  return {
    isUmbrella: false,
    config: null,
    modules: [],
    source: 'none' as const,
    stats: { totalRepos: 0, clonedRepos: 0, failedRepos: 0, skippedRepos: 0 },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default umbrella detection: not umbrella
    mockDetectUmbrellaStructure.mockResolvedValue(nonUmbrellaResult());
  });

  // ──────────────────────────────────────────────────────────────────────
  // calculateTier
  // ──────────────────────────────────────────────────────────────────────

  describe('calculateTier', () => {
    it('should return "small" tier for < 500 files', () => {
      const config = calculateTier(100);
      expect(config.tier).toBe('small');
      expect(config.filesPerDir).toBe('all');
    });

    it('should return "small" tier for 0 files', () => {
      const config = calculateTier(0);
      expect(config.tier).toBe('small');
    });

    it('should return "small" tier for 499 files', () => {
      const config = calculateTier(499);
      expect(config.tier).toBe('small');
    });

    it('should return "medium" tier for 500 files', () => {
      const config = calculateTier(500);
      expect(config.tier).toBe('medium');
      expect(config.filesPerDir).toBe(5);
    });

    it('should return "medium" tier for 1999 files', () => {
      const config = calculateTier(1999);
      expect(config.tier).toBe('medium');
    });

    it('should return "large" tier for 2000 files', () => {
      const config = calculateTier(2000);
      expect(config.tier).toBe('large');
      expect(config.filesPerDir).toBe(3);
    });

    it('should return "large" tier for 9999 files', () => {
      const config = calculateTier(9999);
      expect(config.tier).toBe('large');
    });

    it('should return "massive" tier for 10000 files', () => {
      const config = calculateTier(10000);
      expect(config.tier).toBe('massive');
      expect(config.filesPerDir).toBe(1);
    });

    it('should return "massive" tier for very large numbers', () => {
      const config = calculateTier(1000000);
      expect(config.tier).toBe('massive');
    });

    it('should include priorityPatterns in all tiers', () => {
      for (const count of [10, 1000, 5000, 50000]) {
        const config = calculateTier(count);
        expect(config.priorityPatterns.length).toBeGreaterThan(0);
      }
    });

    it('should include skipPatterns in all tiers', () => {
      for (const count of [10, 1000, 5000, 50000]) {
        const config = calculateTier(count);
        expect(config.skipPatterns.length).toBeGreaterThan(0);
        expect(config.skipPatterns).toContain('node_modules/**');
      }
    });

    it('should have progressively more skipPatterns for larger tiers', () => {
      const small = calculateTier(10);
      const large = calculateTier(5000);
      const massive = calculateTier(50000);
      expect(large.skipPatterns.length).toBeGreaterThanOrEqual(small.skipPatterns.length);
      expect(massive.skipPatterns.length).toBeGreaterThanOrEqual(large.skipPatterns.length);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // selectRepresentativeFiles
  // ──────────────────────────────────────────────────────────────────────

  describe('selectRepresentativeFiles', () => {
    it('should return all files when maxFiles is "all"', () => {
      const files = ['a.ts', 'b.ts', 'c.ts'];
      const result = selectRepresentativeFiles(files, 'all');
      expect(result).toEqual(files);
    });

    it('should return all files when count is under maxFiles', () => {
      const files = ['a.ts', 'b.ts'];
      const result = selectRepresentativeFiles(files, 5);
      expect(result).toEqual(files);
    });

    it('should return exactly maxFiles count when files exceed limit', () => {
      const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toHaveLength(2);
    });

    it('should prioritize index files', () => {
      const files = ['utils.ts', 'helper.ts', 'index.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toContain('index.ts');
    });

    it('should prioritize main files', () => {
      const files = ['utils.ts', 'helper.ts', 'main.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toContain('main.ts');
    });

    it('should prioritize app files', () => {
      const files = ['utils.ts', 'helper.ts', 'app.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toContain('app.ts');
    });

    it('should prioritize files matching module name', () => {
      const files = ['utils.ts', 'helper.ts', 'auth.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2, 'auth');
      expect(result).toContain('auth.ts');
    });

    it('should prioritize type files', () => {
      const files = ['utils.ts', 'types.ts', 'helper.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toContain('types.ts');
    });

    it('should prioritize config files', () => {
      const files = ['utils.ts', 'my-config.ts', 'helper.ts', 'other.ts'];
      const result = selectRepresentativeFiles(files, 2);
      expect(result).toContain('my-config.ts');
    });

    it('should handle empty file list', () => {
      const result = selectRepresentativeFiles([], 5);
      expect(result).toEqual([]);
    });

    it('should handle maxFiles of 0', () => {
      const files = ['a.ts', 'b.ts'];
      const result = selectRepresentativeFiles(files, 0);
      expect(result).toHaveLength(0);
    });

    it('should fill remaining slots with regular files after priority', () => {
      const files = ['index.ts', 'a.ts', 'b.ts', 'c.ts'];
      const result = selectRepresentativeFiles(files, 3);
      expect(result).toContain('index.ts');
      expect(result).toHaveLength(3);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // runDiscovery
  // ──────────────────────────────────────────────────────────────────────

  describe('runDiscovery', () => {
    const projectPath = '/fake/project';

    /**
     * Sets up a minimal mock filesystem for discovery scans.
     * The project root has one .ts file and one .md file.
     */
    function setupMinimalProject() {
      // readdirSync returns entries based on path
      mockReaddirSync.mockImplementation((dirPath: string, opts?: any) => {
        if (dirPath === projectPath) {
          return [
            dirent('app.ts', false),
            dirent('README.md', false),
          ];
        }
        return [];
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p === projectPath) return true;
        if (p === realPath.join(projectPath, 'README.md')) return true;
        if (p === realPath.join(projectPath, 'package.json')) return false;
        return false;
      });

      mockStatSync.mockImplementation((p: string) => {
        return { size: 400, isDirectory: () => false, isFile: () => true, birthtime: new Date(), mtime: new Date() };
      });
    }

    it('should return a DiscoveryResult with required fields', async () => {
      setupMinimalProject();

      const result = await runDiscovery(projectPath, []);

      expect(result).toHaveProperty('codebaseStats');
      expect(result).toHaveProperty('techStack');
      expect(result).toHaveProperty('existingDocs');
      expect(result).toHaveProperty('entryPoints');
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('samplingConfig');
      expect(result).toHaveProperty('discoveredAt');
    });

    it('should count files and directories', async () => {
      setupMinimalProject();

      const result = await runDiscovery(projectPath, []);

      // 2 files (app.ts, README.md)
      expect(result.codebaseStats.totalFiles).toBe(2);
      // 1 directory (the project root)
      expect(result.codebaseStats.totalDirs).toBe(1);
    });

    it('should track extensions', async () => {
      setupMinimalProject();

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.byExtension['.ts']).toBe(1);
      expect(result.codebaseStats.byExtension['.md']).toBe(1);
    });

    it('should categorize files by type', async () => {
      setupMinimalProject();

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.byType.code).toBe(1);
      expect(result.codebaseStats.byType.docs).toBe(1);
    });

    it('should estimate LOC for code files', async () => {
      setupMinimalProject();

      const result = await runDiscovery(projectPath, []);

      // 400 bytes / 40 = 10 LOC
      expect(result.codebaseStats.estimatedLOC).toBe(10);
    });

    it('should classify test files correctly', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [
            dirent('utils.test.ts', false),
            dirent('app.spec.ts', false),
            dirent('main.ts', false),
          ];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 200,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.byType.tests).toBe(2);
      expect(result.codebaseStats.byType.code).toBe(1);
    });

    it('should recurse into non-skipped directories', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('src', true)];
        }
        if (dirPath === realPath.join(projectPath, 'src')) {
          return [dirent('index.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.totalFiles).toBe(1);
      expect(result.codebaseStats.totalDirs).toBe(2); // root + src
    });

    it('should skip node_modules, .git, dist, and similar directories', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [
            dirent('node_modules', true),
            dirent('.git', true),
            dirent('dist', true),
            dirent('src', true),
          ];
        }
        if (dirPath === realPath.join(projectPath, 'src')) {
          return [dirent('file.ts', false)];
        }
        // These should never be read, but return empty if they are
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      // Only src/file.ts should be counted
      expect(result.codebaseStats.totalFiles).toBe(1);
      // root + src (node_modules/.git/dist skipped)
      expect(result.codebaseStats.totalDirs).toBe(2);
    });

    it('should skip directories starting with a dot', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [
            dirent('.hidden', true),
            dirent('visible', true),
          ];
        }
        if (dirPath === realPath.join(projectPath, 'visible')) {
          return [dirent('a.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.totalFiles).toBe(1);
    });

    it('should call onProgress callback', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('a.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const onProgress = vi.fn();
      await runDiscovery(projectPath, [], onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should scan additional sources', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('a.ts', false)];
        }
        if (dirPath === realPath.join(projectPath, 'extra')) {
          return [dirent('b.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'extra')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 100,
        isDirectory: () => p === realPath.join(projectPath, 'extra'),
        isFile: () => p !== realPath.join(projectPath, 'extra'),
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, ['extra']);

      // a.ts from root + b.ts from extra
      expect(result.codebaseStats.totalFiles).toBe(2);
    });

    it('should detect TypeScript from package.json with typescript dependency', async () => {
      const pkgJson = JSON.stringify({
        dependencies: {},
        devDependencies: { typescript: '^5.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('TypeScript');
      expect(result.techStack.detectedFrom).toContain('package.json');
    });

    it('should detect JavaScript when no typescript dep', async () => {
      const pkgJson = JSON.stringify({
        dependencies: { express: '^4.0.0' },
        devDependencies: {},
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        if (p === realPath.join(projectPath, 'tsconfig.json')) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('JavaScript');
      expect(result.techStack.frameworks).toContain('Express');
    });

    it('should detect multiple frameworks from package.json', async () => {
      const pkgJson = JSON.stringify({
        dependencies: {
          react: '^18.0.0',
          next: '^14.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
          vite: '^5.0.0',
        },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('React');
      expect(result.techStack.frameworks).toContain('Next.js');
      expect(result.techStack.buildTools).toContain('Vite');
      expect(result.techStack.testFrameworks).toContain('Vitest');
    });

    it('should detect Python from requirements.txt', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'requirements.txt')) return true;
        if (p === realPath.join(projectPath, 'pyproject.toml')) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'requirements.txt'))
          return 'django>=4.0\npytest>=7.0\n';
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Python');
      expect(result.techStack.frameworks).toContain('Django');
      expect(result.techStack.testFrameworks).toContain('pytest');
    });

    it('should detect Python from pyproject.toml', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'pyproject.toml')) return true;
        if (p === realPath.join(projectPath, 'requirements.txt')) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'pyproject.toml'))
          return '[tool.poetry.dependencies]\nfastapi = "^0.100"\n';
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Python');
      expect(result.techStack.frameworks).toContain('FastAPI');
      expect(result.techStack.detectedFrom).toContain('pyproject.toml');
    });

    it('should detect Go from go.mod', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'go.mod')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'go.mod'))
          return 'module example.com/project\nrequire github.com/gin-gonic/gin v1.9\n';
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Go');
      expect(result.techStack.frameworks).toContain('Gin');
      expect(result.techStack.detectedFrom).toContain('go.mod');
    });

    it('should detect Rust from Cargo.toml', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'Cargo.toml')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'Cargo.toml'))
          return '[dependencies]\nactix-web = "4"\n';
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Rust');
      expect(result.techStack.frameworks).toContain('Actix');
    });

    it('should detect Java from pom.xml (Maven)', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'pom.xml')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('');
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Java');
      expect(result.techStack.buildTools).toContain('Maven');
    });

    it('should detect Java from build.gradle (Gradle)', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'build.gradle')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('');
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.languages).toContain('Java');
      expect(result.techStack.buildTools).toContain('Gradle');
    });

    it('should find README.md in existing docs', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('README.md', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'README.md')) return true;
        return false;
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.existingDocs.readme).toBe('README.md');
    });

    it('should find CONTRIBUTING.md', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('CONTRIBUTING.md', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'CONTRIBUTING.md')) return true;
        return false;
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.existingDocs.contributing).toBe('CONTRIBUTING.md');
    });

    it('should find docs folder', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('docs', true)];
        }
        if (dirPath === realPath.join(projectPath, 'docs')) {
          return [];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'docs')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 100,
        isDirectory: () => p === realPath.join(projectPath, 'docs'),
        isFile: () => p !== realPath.join(projectPath, 'docs'),
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, []);

      expect(result.existingDocs.docsFolder).toBe('docs');
    });

    it('should find wiki folder', async () => {
      mockReaddirSync.mockImplementation(() => []);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'wiki')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 100,
        isDirectory: () => p === realPath.join(projectPath, 'wiki'),
        isFile: () => p !== realPath.join(projectPath, 'wiki'),
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, []);

      expect(result.existingDocs.wikiFolder).toBe('wiki');
    });

    it('should collect markdown files in root', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return ['README.md', 'CHANGELOG.md', 'src'];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.existingDocs.mdFiles).toContain('README.md');
      expect(result.existingDocs.mdFiles).toContain('CHANGELOG.md');
      expect(result.existingDocs.mdFiles).not.toContain('src');
    });

    it('should find entry points at root and in src folders', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('src', true), dirent('index.ts', false)];
        }
        if (dirPath === realPath.join(projectPath, 'src')) {
          return [dirent('main.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'index.ts')) return true;
        if (p === realPath.join(projectPath, 'src')) return true;
        if (p === realPath.join(projectPath, 'src', 'main.ts')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 100,
        isDirectory: () => p === realPath.join(projectPath, 'src'),
        isFile: () => p !== realPath.join(projectPath, 'src'),
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, []);

      expect(result.entryPoints.index).toContain('index.ts');
      expect(result.entryPoints.main).toContain(realPath.join('src', 'main.ts'));
    });

    it('should extract exports from package.json main, module, and bin', async () => {
      const pkgJson = JSON.stringify({
        main: 'dist/index.js',
        module: 'dist/index.mjs',
        bin: { mycli: 'dist/cli.js' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.entryPoints.exports).toContain('dist/index.js');
      expect(result.entryPoints.exports).toContain('dist/index.mjs');
      expect(result.entryPoints.exports).toContain('dist/cli.js');
    });

    it('should extract string bin from package.json', async () => {
      const pkgJson = JSON.stringify({
        bin: 'dist/cli.js',
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.entryPoints.exports).toContain('dist/cli.js');
    });

    it('should build modules from src subdirectories (non-umbrella)', async () => {
      mockReaddirSync.mockImplementation((dirPath: string, opts?: any) => {
        if (dirPath === projectPath) {
          return [dirent('src', true)];
        }
        if (dirPath === realPath.join(projectPath, 'src')) {
          return [dirent('core', true), dirent('utils', true)];
        }
        if (dirPath === realPath.join(projectPath, 'src', 'core')) {
          return [dirent('main.ts', false), dirent('types.ts', false)];
        }
        if (dirPath === realPath.join(projectPath, 'src', 'utils')) {
          return [dirent('helper.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'src')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 200,
        isDirectory: () => {
          return p === realPath.join(projectPath, 'src');
        },
        isFile: () => p !== realPath.join(projectPath, 'src'),
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, []);

      expect(result.modules.length).toBe(2);
      const moduleNames = result.modules.map(m => m.name);
      expect(moduleNames).toContain('core');
      expect(moduleNames).toContain('utils');
    });

    it('should set umbrella info when umbrella is detected', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      mockDetectUmbrellaStructure.mockResolvedValue({
        isUmbrella: true,
        config: { enabled: true, childRepos: [{ id: 'repo1', path: 'repos/repo1', name: 'repo1' }] },
        modules: [
          {
            name: 'repo1',
            path: 'repos/repo1',
            fileCount: 10,
            estimatedLOC: 100,
            hasTests: true,
            hasReadme: true,
            entryPoints: [],
            extensions: {},
          },
        ],
        source: 'config' as const,
        stats: { totalRepos: 1, clonedRepos: 1, failedRepos: 0, skippedRepos: 0 },
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.umbrella).toBeDefined();
      expect(result.umbrella!.isUmbrella).toBe(true);
      expect(result.umbrella!.source).toBe('config');
      expect(result.umbrella!.childRepoCount).toBe(1);
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].name).toBe('repo1');
    });

    it('should persist umbrella config when detected', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const umbrellaConfig = { enabled: true, childRepos: [{ id: 'r1', path: 'repos/r1', name: 'r1' }] };
      mockDetectUmbrellaStructure.mockResolvedValue({
        isUmbrella: true,
        config: umbrellaConfig,
        modules: [{ name: 'r1', path: 'repos/r1', fileCount: 5, estimatedLOC: 50, hasTests: false, hasReadme: false, entryPoints: [], extensions: {} }],
        source: 'clone-job' as const,
        stats: { totalRepos: 1, clonedRepos: 1, failedRepos: 0, skippedRepos: 0 },
      });
      mockPersistUmbrellaConfig.mockResolvedValue(undefined);

      await runDiscovery(projectPath, []);

      expect(mockPersistUmbrellaConfig).toHaveBeenCalledWith(projectPath, umbrellaConfig);
    });

    it('should set non-umbrella info when no umbrella detected', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = await runDiscovery(projectPath, []);

      expect(result.umbrella).toBeDefined();
      expect(result.umbrella!.isUmbrella).toBe(false);
      expect(result.umbrella!.source).toBe('none');
      expect(result.umbrella!.childRepoCount).toBe(0);
    });

    it('should handle readdirSync errors gracefully', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('EPERM: permission denied');
      });
      mockExistsSync.mockReturnValue(false);

      const result = await runDiscovery(projectPath, []);

      // Should still return a valid result even if root dir can't be read
      expect(result).toHaveProperty('codebaseStats');
      expect(result.codebaseStats.totalFiles).toBe(0);
    });

    it('should handle statSync errors gracefully during LOC estimation', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('app.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = await runDiscovery(projectPath, []);

      // Should count the file but not crash on stat error
      expect(result.codebaseStats.totalFiles).toBe(1);
      expect(result.codebaseStats.estimatedLOC).toBe(0);
    });

    it('should set discoveredAt to an ISO date string', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = await runDiscovery(projectPath, []);

      expect(() => new Date(result.discoveredAt)).not.toThrow();
      expect(result.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should calculate tier based on total files', async () => {
      // Create enough mock files to trigger "medium" tier (500+)
      const files = Array.from({ length: 600 }, (_, i) => dirent(`file${i}.ts`, false));
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) return files;
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.tier).toBe('medium');
      expect(result.samplingConfig.tier).toBe('medium');
    });

    it('should handle additional sources with absolute paths', async () => {
      const absSource = '/absolute/extra';
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) return [dirent('a.ts', false)];
        if (dirPath === absSource) return [dirent('b.ts', false)];
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === absSource) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 100,
        isDirectory: () => p === absSource,
        isFile: () => p !== absSource,
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, [absSource]);

      expect(result.codebaseStats.totalFiles).toBe(2);
    });

    it('should deduplicate tech stack entries', async () => {
      // Package.json with typescript AND tsconfig.json present
      const pkgJson = JSON.stringify({
        dependencies: {},
        devDependencies: { typescript: '^5.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        if (p === realPath.join(projectPath, 'tsconfig.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      // TypeScript should only appear once
      const tsCount = result.techStack.languages.filter(l => l === 'TypeScript').length;
      expect(tsCount).toBe(1);
    });

    it('should detect all supported JS frameworks', async () => {
      const pkgJson = JSON.stringify({
        dependencies: {
          vue: '^3.0',
          angular: '^17.0',
          svelte: '^4.0',
          fastify: '^4.0',
          nestjs: '^10.0',
        },
        devDependencies: {
          webpack: '^5.0',
          esbuild: '^0.19',
          jest: '^29.0',
          playwright: '^1.0',
          cypress: '^13.0',
        },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('Vue');
      expect(result.techStack.frameworks).toContain('Angular');
      expect(result.techStack.frameworks).toContain('Svelte');
      expect(result.techStack.frameworks).toContain('Fastify');
      expect(result.techStack.frameworks).toContain('NestJS');
      expect(result.techStack.buildTools).toContain('Webpack');
      expect(result.techStack.buildTools).toContain('esbuild');
      expect(result.techStack.testFrameworks).toContain('Jest');
      expect(result.techStack.testFrameworks).toContain('Playwright');
      expect(result.techStack.testFrameworks).toContain('Cypress');
    });

    it('should detect Flask from Python project', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'requirements.txt')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'requirements.txt')) return 'flask>=2.0\n';
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('Flask');
    });

    it('should detect Go frameworks Echo and Fiber', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'go.mod')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'go.mod'))
          return 'module x\nrequire echo v4\nrequire fiber v2\n';
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('Echo');
      expect(result.techStack.frameworks).toContain('Fiber');
    });

    it('should detect Rust frameworks Axum and Rocket', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'Cargo.toml')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'Cargo.toml'))
          return '[dependencies]\naxum = "0.7"\nrocket = "0.5"\n';
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('Axum');
      expect(result.techStack.frameworks).toContain('Rocket');
    });

    it('should handle invalid JSON in package.json gracefully', async () => {
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return '{invalid json';
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      // Should not crash, just no tech stack detected from package.json
      expect(result.techStack.languages).not.toContain('TypeScript');
      expect(result.techStack.languages).not.toContain('JavaScript');
    });

    it('should sort modules by file count (largest first)', async () => {
      mockReaddirSync.mockImplementation((dirPath: string, opts?: any) => {
        if (dirPath === projectPath) return [dirent('src', true)];
        if (dirPath === realPath.join(projectPath, 'src')) {
          return [dirent('small', true), dirent('big', true)];
        }
        if (dirPath === realPath.join(projectPath, 'src', 'small')) {
          return [dirent('a.ts', false)];
        }
        if (dirPath === realPath.join(projectPath, 'src', 'big')) {
          return [dirent('a.ts', false), dirent('b.ts', false), dirent('c.ts', false)];
        }
        return [];
      });
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'src')) return true;
        return false;
      });
      mockStatSync.mockImplementation((p: string) => ({
        size: 200,
        isDirectory: () => p === realPath.join(projectPath, 'src'),
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      }));

      const result = await runDiscovery(projectPath, []);

      expect(result.modules.length).toBe(2);
      expect(result.modules[0].name).toBe('big');
      expect(result.modules[1].name).toBe('small');
    });

    it('should recognize various test file patterns', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [
            dirent('utils.test.ts', false),
            dirent('app.spec.js', false),
            dirent('test_helper.py', false),
          ];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.byType.tests).toBe(3);
    });

    it('should treat unknown extensions as assets', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) {
          return [dirent('data.xyz', false)];
        }
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.codebaseStats.byType.assets).toBe(1);
    });

    it('should detect Angular via @angular/core', async () => {
      const pkgJson = JSON.stringify({
        dependencies: { '@angular/core': '^17.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('Angular');
    });

    it('should detect NestJS via @nestjs/core', async () => {
      const pkgJson = JSON.stringify({
        dependencies: { '@nestjs/core': '^10.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.frameworks).toContain('NestJS');
    });

    it('should detect @playwright/test', async () => {
      const pkgJson = JSON.stringify({
        devDependencies: { '@playwright/test': '^1.40.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.testFrameworks).toContain('Playwright');
    });

    it('should detect build tools Rollup and Parcel', async () => {
      const pkgJson = JSON.stringify({
        devDependencies: { rollup: '^4.0.0', parcel: '^2.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.buildTools).toContain('Rollup');
      expect(result.techStack.buildTools).toContain('Parcel');
    });

    it('should detect Mocha test framework', async () => {
      const pkgJson = JSON.stringify({
        devDependencies: { mocha: '^10.0.0' },
      });

      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === realPath.join(projectPath, 'package.json')) return pkgJson;
        throw new Error('not found');
      });

      const result = await runDiscovery(projectPath, []);

      expect(result.techStack.testFrameworks).toContain('Mocha');
    });

    it('should not scan additional sources that do not exist', async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === projectPath) return [dirent('a.ts', false)];
        return [];
      });
      mockExistsSync.mockReturnValue(false);
      mockStatSync.mockReturnValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await runDiscovery(projectPath, ['nonexistent']);

      // Should only count file from main project
      expect(result.codebaseStats.totalFiles).toBe(1);
    });
  });
});

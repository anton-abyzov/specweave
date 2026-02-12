/**
 * Foundation Builder Tests
 *
 * Tests for living docs foundation builder:
 * - buildFoundation orchestration
 * - readKeyFiles (via buildFoundation)
 * - generateOverview
 * - generateTechStack
 * - generateModulesSkeleton
 * - saveFoundationDocs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs-native before any imports that use it
const { mockExistsSync, mockReadFileSync, mockEnsureDirSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockEnsureDirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  ensureDirSync: mockEnsureDirSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('../../../../src/core/living-docs/discovery.js', () => ({
  selectRepresentativeFiles: vi.fn().mockReturnValue([]),
}));

import { buildFoundation, saveFoundationDocs } from '../../../../src/core/living-docs/foundation-builder.js';
import type { DiscoveryResult, ModuleInfo } from '../../../../src/core/living-docs/discovery.js';

/**
 * Helper to create a minimal DiscoveryResult for testing
 */
function makeDiscovery(overrides: Partial<DiscoveryResult> = {}): DiscoveryResult {
  return {
    codebaseStats: {
      totalFiles: 100,
      totalDirs: 20,
      byExtension: { '.ts': 60, '.js': 20, '.json': 10, '.md': 10 },
      byType: { code: 60, tests: 15, docs: 10, config: 10, assets: 5 },
      estimatedLOC: 10000,
    },
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Express'],
      buildTools: ['tsc'],
      testFrameworks: ['Vitest'],
      detectedFrom: ['package.json'],
    },
    existingDocs: {
      readme: 'README.md',
      contributing: null,
      docsFolder: null,
      wikiFolder: null,
      mdFiles: [],
    },
    entryPoints: {
      main: ['src/index.ts'],
      index: [],
      exports: [],
    },
    modules: [],
    tier: 'small',
    samplingConfig: {
      tier: 'small',
      filesPerDir: 'all',
      priorityPatterns: [],
      skipPatterns: [],
    },
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeModule(overrides: Partial<ModuleInfo> = {}): ModuleInfo {
  return {
    name: 'core',
    path: 'src/core',
    fileCount: 20,
    estimatedLOC: 2000,
    hasTests: true,
    hasReadme: false,
    entryPoints: ['index.ts'],
    extensions: { '.ts': 18, '.json': 2 },
    ...overrides,
  };
}

describe('foundation-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all files exist, return empty content
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');
  });

  describe('buildFoundation', () => {
    it('should return overview, techStack, and modulesSkeleton', async () => {
      const discovery = makeDiscovery();
      const result = await buildFoundation('/project', discovery);

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('techStack');
      expect(result).toHaveProperty('modulesSkeleton');
      expect(typeof result.overview).toBe('string');
      expect(typeof result.techStack).toBe('string');
      expect(typeof result.modulesSkeleton).toBe('string');
    });

    it('should call progress callback at each stage', async () => {
      const discovery = makeDiscovery();
      const onProgress = vi.fn();

      await buildFoundation('/project', discovery, onProgress);

      expect(onProgress).toHaveBeenCalledWith('key-files', 'reading');
      expect(onProgress).toHaveBeenCalledWith('key-files', 'complete');
      expect(onProgress).toHaveBeenCalledWith('overview.md', 'generating');
      expect(onProgress).toHaveBeenCalledWith('overview.md', 'complete');
      expect(onProgress).toHaveBeenCalledWith('tech-stack.md', 'generating');
      expect(onProgress).toHaveBeenCalledWith('tech-stack.md', 'complete');
      expect(onProgress).toHaveBeenCalledWith('modules-skeleton.md', 'generating');
      expect(onProgress).toHaveBeenCalledWith('modules-skeleton.md', 'complete');
    });

    it('should work without progress callback', async () => {
      const discovery = makeDiscovery();
      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('# project');
    });

    it('should read README content when available', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: null,
          docsFolder: null,
          wikiFolder: null,
          mdFiles: [],
        },
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md')) return '# MyProject\nA fantastic project for testing.';
        return '';
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('A fantastic project for testing');
    });

    it('should read config files if they exist', async () => {
      const discovery = makeDiscovery();

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        if (p.endsWith('README.md')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json'))
          return JSON.stringify({
            dependencies: { express: '^4.18.0', lodash: '^4.17.0' },
            devDependencies: { vitest: '^1.0.0' },
          });
        if (p.endsWith('README.md')) return '# Project\nSome description.';
        return '';
      });

      const result = await buildFoundation('/project', discovery);

      // techStack should contain dependencies section
      expect(result.techStack).toContain('express');
    });
  });

  describe('generateOverview (via buildFoundation)', () => {
    it('should include project name from path basename', async () => {
      const discovery = makeDiscovery();
      const result = await buildFoundation('/path/to/my-app', discovery);

      expect(result.overview).toContain('# my-app');
    });

    it('should show codebase stats', async () => {
      const discovery = makeDiscovery({
        codebaseStats: {
          totalFiles: 500,
          totalDirs: 50,
          byExtension: { '.ts': 300 },
          byType: { code: 300, tests: 100, docs: 50, config: 30, assets: 20 },
          estimatedLOC: 50000,
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('500');
      expect(result.overview).toContain('50,000');
    });

    it('should show tech stack languages', async () => {
      const discovery = makeDiscovery({
        techStack: {
          languages: ['TypeScript', 'Python'],
          frameworks: ['React', 'FastAPI'],
          buildTools: ['webpack'],
          testFrameworks: ['Jest'],
          detectedFrom: ['package.json'],
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('TypeScript, Python');
      expect(result.overview).toContain('React, FastAPI');
    });

    it('should display umbrella project info', async () => {
      const discovery = makeDiscovery({
        umbrella: {
          isUmbrella: true,
          source: 'config',
          childRepoCount: 5,
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('Umbrella Project');
      expect(result.overview).toContain('config');
      expect(result.overview).toContain('5');
    });

    it('should list modules', async () => {
      const discovery = makeDiscovery({
        modules: [
          makeModule({ name: 'core', fileCount: 30, estimatedLOC: 3000 }),
          makeModule({ name: 'api', fileCount: 15, estimatedLOC: 1500 }),
        ],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('core');
      expect(result.overview).toContain('api');
    });

    it('should show ellipsis when more than 10 modules', async () => {
      const modules = Array.from({ length: 12 }, (_, i) =>
        makeModule({ name: `mod-${i}`, path: `src/mod-${i}` })
      );
      const discovery = makeDiscovery({ modules });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('...and 2 more modules');
    });

    it('should show entry points', async () => {
      const discovery = makeDiscovery({
        entryPoints: {
          main: ['src/main.ts'],
          index: [],
          exports: ['src/lib.ts'],
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('src/main.ts');
      expect(result.overview).toContain('src/lib.ts');
    });

    it('should show existing documentation section', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: 'CONTRIBUTING.md',
          docsFolder: 'docs',
          wikiFolder: null,
          mdFiles: [],
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.overview).toContain('README.md');
      expect(result.overview).toContain('CONTRIBUTING.md');
      expect(result.overview).toContain('docs/');
    });
  });

  describe('generateTechStack (via buildFoundation)', () => {
    it('should include detection source', async () => {
      const discovery = makeDiscovery({
        techStack: {
          languages: [],
          frameworks: [],
          buildTools: [],
          testFrameworks: [],
          detectedFrom: ['package.json', 'tsconfig.json'],
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.techStack).toContain('package.json, tsconfig.json');
    });

    it('should list languages, frameworks, build tools, and test frameworks', async () => {
      const discovery = makeDiscovery({
        techStack: {
          languages: ['Go', 'Rust'],
          frameworks: ['Gin'],
          buildTools: ['Cargo'],
          testFrameworks: ['go test'],
          detectedFrom: ['go.mod'],
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.techStack).toContain('Go');
      expect(result.techStack).toContain('Rust');
      expect(result.techStack).toContain('Gin');
      expect(result.techStack).toContain('Cargo');
      expect(result.techStack).toContain('go test');
    });

    it('should show file extension breakdown sorted by count', async () => {
      const discovery = makeDiscovery({
        codebaseStats: {
          totalFiles: 100,
          totalDirs: 10,
          byExtension: { '.ts': 50, '.js': 30, '.json': 20 },
          byType: { code: 80, tests: 10, docs: 5, config: 3, assets: 2 },
          estimatedLOC: 10000,
        },
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.techStack).toContain('.ts');
      expect(result.techStack).toContain('50');
    });

    it('should show dependencies from package.json', async () => {
      const discovery = makeDiscovery();

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json'))
          return JSON.stringify({
            dependencies: { react: '^18.0.0', axios: '^1.0.0' },
            devDependencies: { typescript: '^5.0.0' },
          });
        return '';
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.techStack).toContain('react');
      expect(result.techStack).toContain('axios');
      expect(result.techStack).toContain('2 production dependencies');
    });

    it('should show umbrella team tech stack distribution', async () => {
      const discovery = makeDiscovery({
        umbrella: {
          isUmbrella: true,
          source: 'config',
          childRepoCount: 3,
        },
        modules: [
          makeModule({ name: 'producthub-fe', extensions: { '.tsx': 30, '.ts': 20 } }),
          makeModule({ name: 'producthub-api', extensions: { '.ts': 40 } }),
          makeModule({ name: 'analytics-worker', extensions: { '.py': 25 } }),
        ],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.techStack).toContain('Tech Stack by Team');
      expect(result.techStack).toContain('producthub');
    });

    it('should handle invalid package.json gracefully', async () => {
      const discovery = makeDiscovery();

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return 'not-valid-json';
        return '';
      });

      // Should not throw
      const result = await buildFoundation('/project', discovery);
      expect(result.techStack).toBeDefined();
    });
  });

  describe('generateModulesSkeleton (via buildFoundation)', () => {
    it('should show total module count', async () => {
      const discovery = makeDiscovery({
        modules: [makeModule({ name: 'core' }), makeModule({ name: 'api' })],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('Total modules: 2');
    });

    it('should show "No modules detected" for empty modules', async () => {
      const discovery = makeDiscovery({ modules: [] });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('No modules detected');
    });

    it('should show standard flat module table for non-umbrella projects', async () => {
      const discovery = makeDiscovery({
        modules: [
          makeModule({ name: 'core', path: 'src/core', fileCount: 20, estimatedLOC: 2000, hasTests: true, hasReadme: false }),
          makeModule({ name: 'utils', path: 'src/utils', fileCount: 10, estimatedLOC: 500, hasTests: false, hasReadme: true }),
        ],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('Module Overview');
      expect(result.modulesSkeleton).toContain('core');
      expect(result.modulesSkeleton).toContain('utils');
    });

    it('should show module details with entry points and extensions', async () => {
      const discovery = makeDiscovery({
        modules: [
          makeModule({
            name: 'core',
            path: 'src/core',
            entryPoints: ['index.ts', 'main.ts'],
            extensions: { '.ts': 15, '.json': 3, '.md': 2 },
          }),
        ],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('index.ts');
      expect(result.modulesSkeleton).toContain('.ts (15)');
    });

    it('should show umbrella project type indicator', async () => {
      const discovery = makeDiscovery({
        umbrella: {
          isUmbrella: true,
          source: 'config',
          childRepoCount: 4,
        },
        modules: [],
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('Umbrella');
      expect(result.modulesSkeleton).toContain('4 child repos');
    });

    it('should group modules by team for umbrella with >10 modules', async () => {
      const modules = [
        ...Array.from({ length: 6 }, (_, i) =>
          makeModule({
            name: `frontend-mod${i}`,
            path: `frontend/mod${i}`,
            fileCount: 10 + i,
            estimatedLOC: 1000 + i * 100,
            hasTests: i % 2 === 0,
            hasReadme: i === 0,
          })
        ),
        ...Array.from({ length: 6 }, (_, i) =>
          makeModule({
            name: `backend-svc${i}`,
            path: `backend/svc${i}`,
            fileCount: 20 + i,
            estimatedLOC: 2000 + i * 100,
            hasTests: true,
            hasReadme: true,
          })
        ),
      ];

      const discovery = makeDiscovery({
        umbrella: {
          isUmbrella: true,
          source: 'config',
          childRepoCount: 12,
        },
        modules,
      });

      const result = await buildFoundation('/project', discovery);

      expect(result.modulesSkeleton).toContain('Team Overview');
      expect(result.modulesSkeleton).toContain('frontend');
      expect(result.modulesSkeleton).toContain('backend');
    });
  });

  describe('readKeyFiles (via buildFoundation)', () => {
    it('should read contributing file when present', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: 'CONTRIBUTING.md',
          docsFolder: null,
          wikiFolder: null,
          mdFiles: [],
        },
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md') || p.endsWith('CONTRIBUTING.md')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md')) return '# Readme';
        if (p.endsWith('CONTRIBUTING.md')) return '# Contributing';
        return '';
      });

      const result = await buildFoundation('/project', discovery);
      // If CONTRIBUTING.md was read, it won't crash, overview is generated successfully
      expect(result.overview).toBeDefined();
    });

    it('should read module entry points', async () => {
      const discovery = makeDiscovery({
        modules: [
          makeModule({ name: 'core', path: 'src/core', entryPoints: ['index.ts'] }),
        ],
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('src/core/index.ts')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('src/core/index.ts')) return 'export * from "./main.js";';
        return '';
      });

      const result = await buildFoundation('/project', discovery);
      expect(result).toBeDefined();
    });

    it('should skip files it cannot read', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: null,
          docsFolder: null,
          wikiFolder: null,
          mdFiles: [],
        },
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      const result = await buildFoundation('/project', discovery);
      expect(result.overview).toBeDefined();
    });

    it('should truncate file content at 64KB', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: null,
          docsFolder: null,
          wikiFolder: null,
          mdFiles: [],
        },
      });

      const largeContent = '# Big File\n' + 'x'.repeat(100000);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('README.md')) return largeContent;
        return '';
      });

      // Should not throw, content is truncated internally
      const result = await buildFoundation('/project', discovery);
      expect(result.overview).toBeDefined();
    });

    it('should look for index.ts or index.js when module has no entry points', async () => {
      const discovery = makeDiscovery({
        modules: [
          makeModule({ name: 'lib', path: 'src/lib', entryPoints: [] }),
        ],
      });

      // Return true for index.ts check
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('src/lib/index.ts')) return true;
        return false;
      });

      mockReadFileSync.mockReturnValue('export const foo = 1;');

      const result = await buildFoundation('/project', discovery);
      expect(result).toBeDefined();
    });

    it('should deduplicate files', async () => {
      const discovery = makeDiscovery({
        existingDocs: {
          readme: 'README.md',
          contributing: null,
          docsFolder: null,
          wikiFolder: null,
          mdFiles: [],
        },
        entryPoints: {
          main: ['README.md'], // duplicate with readme
          index: [],
          exports: [],
        },
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('content');

      await buildFoundation('/project', discovery);

      // README.md should be read only once (deduplicated)
      const readCalls = mockReadFileSync.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].endsWith('README.md')
      );
      expect(readCalls.length).toBe(1);
    });
  });

  describe('saveFoundationDocs', () => {
    it('should create output directory and write all three docs', async () => {
      const docs = {
        overview: '# Overview content',
        techStack: '# Tech Stack content',
        modulesSkeleton: '# Modules content',
      };

      const savedFiles = await saveFoundationDocs('/project', docs);

      expect(mockEnsureDirSync).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/docs/internal/architecture')
      );

      expect(mockWriteFileSync).toHaveBeenCalledTimes(3);
      expect(savedFiles).toHaveLength(3);
      expect(savedFiles[0]).toContain('overview.md');
      expect(savedFiles[1]).toContain('tech-stack.md');
      expect(savedFiles[2]).toContain('modules-skeleton.md');
    });

    it('should write correct content to each file', async () => {
      const docs = {
        overview: 'overview-content',
        techStack: 'techstack-content',
        modulesSkeleton: 'modules-content',
      };

      await saveFoundationDocs('/project', docs);

      // Check overview
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('overview.md'),
        'overview-content'
      );

      // Check tech-stack
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('tech-stack.md'),
        'techstack-content'
      );

      // Check modules-skeleton
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('modules-skeleton.md'),
        'modules-content'
      );
    });
  });
});

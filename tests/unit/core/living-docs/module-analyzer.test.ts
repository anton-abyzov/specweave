/**
 * Module Analyzer Tests
 *
 * Tests for the living docs module analyzer including:
 * - analyzeModule: full module analysis pipeline
 * - generateRichModuleSummary: markdown summary generation
 * - saveModuleAnalysis: writing analysis to disk
 * - Internal helpers via integration: file type detection, JS/Python export/import
 *   extraction, dependency normalization
 *
 * @see src/core/living-docs/module-analyzer.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mocks ---
const {
  mockExistsSync,
  mockReaddirSync,
  mockReadFileSync,
  mockStatSync,
  mockEnsureDirSync,
  mockWriteFileSync,
  mockSelectRepresentativeFiles,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockEnsureDirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockSelectRepresentativeFiles: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  statSync: mockStatSync,
  ensureDirSync: mockEnsureDirSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('../../../../src/core/living-docs/discovery.js', () => ({
  selectRepresentativeFiles: mockSelectRepresentativeFiles,
}));

import {
  analyzeModule,
  generateRichModuleSummary,
  saveModuleAnalysis,
} from '../../../../src/core/living-docs/module-analyzer.js';
import type {
  AnalyzedFile,
  ExportInfo,
  ImportInfo,
  ModuleAnalysis,
  AIModuleInsights,
  ModuleDependencyInfo,
} from '../../../../src/core/living-docs/module-analyzer.js';
import type { ModuleInfo } from '../../../../src/core/living-docs/discovery.js';
import type { WorkItemMatch } from '../../../../src/core/living-docs/workitem-matcher.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModuleInfo(overrides?: Partial<ModuleInfo>): ModuleInfo {
  return {
    name: 'auth',
    path: 'src/auth',
    fileCount: 5,
    estimatedLOC: 500,
    hasTests: true,
    hasReadme: false,
    entryPoints: ['index.ts'],
    extensions: { '.ts': 5 },
    ...overrides,
  };
}

function makeAnalyzedFile(overrides?: Partial<AnalyzedFile>): AnalyzedFile {
  return {
    path: 'index.ts',
    size: 1024,
    type: 'source',
    exports: [],
    imports: [],
    lineCount: 50,
    ...overrides,
  };
}

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  };
}

function makeWorkItemMatch(overrides?: Partial<WorkItemMatch>): WorkItemMatch {
  return {
    workItem: {
      id: 'US-001',
      featureId: 'FS-001',
      title: 'User authentication',
      filePath: 'specs/auth.md',
      keywords: ['auth', 'login'],
    },
    moduleName: 'auth',
    score: 0.85,
    matchDetails: [],
    ...overrides,
  } as WorkItemMatch;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-11T12:00:00.000Z'));
});

// ---------------------------------------------------------------------------
// analyzeModule
// ---------------------------------------------------------------------------

describe('analyzeModule', () => {
  it('should return a valid analysis for a module with source files', async () => {
    const module = makeModuleInfo();

    // getModuleFiles: directory exists, has two TS files
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('src/auth')) return true;
      if (p.endsWith('handler.ts')) return true;
      if (p.endsWith('utils.ts')) return true;
      return false;
    });

    mockReaddirSync.mockReturnValue([
      makeDirent('handler.ts', false),
      makeDirent('utils.ts', false),
    ]);

    // selectRepresentativeFiles returns both files
    mockSelectRepresentativeFiles.mockReturnValue(['handler.ts', 'utils.ts']);

    // File contents
    const handlerContent = [
      'import { Request } from "express";',
      'import { validate } from "./utils";',
      '',
      'export async function handleLogin(req: Request) {',
      '  return { token: "abc" };',
      '}',
      '',
      'export class AuthHandler {',
      '  handle() {}',
      '}',
    ].join('\n');

    const utilsContent = [
      'export const SECRET = "key";',
      'export function hash(val: string) { return val; }',
    ].join('\n');

    mockReadFileSync.mockImplementation((p: string) => {
      if (p.includes('handler.ts')) return handlerContent;
      if (p.includes('utils.ts')) return utilsContent;
      return '';
    });

    mockStatSync.mockReturnValue({ size: 512 });

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.moduleName).toBe('auth');
    expect(result.modulePath).toBe('src/auth');
    expect(result.filesAnalyzed.length).toBe(2);
    expect(result.totalExports).toBeGreaterThan(0);
    expect(result.docStatus).toBe('generated');
    expect(result.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should return skipped status when no files can be analyzed', async () => {
    const module = makeModuleInfo();

    // Directory does not exist
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);
    mockSelectRepresentativeFiles.mockReturnValue([]);

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed).toHaveLength(0);
    expect(result.docStatus).toBe('skipped');
    expect(result.totalExports).toBe(0);
  });

  it('should track external dependencies from imports', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('index.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['index.ts']);
    mockStatSync.mockReturnValue({ size: 256 });

    const content = [
      'import express from "express";',
      'import { z } from "zod";',
      'import { helper } from "./helper";',
      'import { Config } from "@myorg/config";',
    ].join('\n');

    mockReadFileSync.mockReturnValue(content);

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.externalDeps).toContain('express');
    expect(result.externalDeps).toContain('zod');
    expect(result.externalDeps).toContain('@myorg/config');
    // Relative imports should not be in externalDeps
    expect(result.externalDeps).not.toContain('./helper');
  });

  it('should map work item matches into relatedWorkItems', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);
    mockSelectRepresentativeFiles.mockReturnValue([]);

    const matches: WorkItemMatch[] = [
      makeWorkItemMatch({ score: 0.9 }),
      makeWorkItemMatch({
        workItem: {
          id: 'US-002',
          featureId: 'FS-002',
          title: 'Password reset',
          filePath: 'specs/reset.md',
          keywords: ['reset'],
        },
        score: 0.5,
      }),
    ];

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      matches,
    );

    expect(result.relatedWorkItems).toHaveLength(2);
    expect(result.relatedWorkItems[0]).toEqual({
      id: 'US-001',
      title: 'User authentication',
      score: 0.9,
    });
    expect(result.relatedWorkItems[1].id).toBe('US-002');
  });

  it('should call onProgress callback for each file', async () => {
    const module = makeModuleInfo({ name: 'core' });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('a.ts', false),
      makeDirent('b.ts', false),
    ]);
    mockSelectRepresentativeFiles.mockReturnValue(['a.ts', 'b.ts']);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReadFileSync.mockReturnValue('export const x = 1;');

    const progress = vi.fn();

    await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
      progress,
    );

    expect(progress).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledWith('core', 1, 2);
    expect(progress).toHaveBeenCalledWith('core', 2, 2);
  });

  it('should calculate filesSkipped from difference between all and sampled files', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('a.ts', false),
      makeDirent('b.ts', false),
      makeDirent('c.ts', false),
      makeDirent('d.ts', false),
    ]);
    // Sampling selects only 2 of 4
    mockSelectRepresentativeFiles.mockReturnValue(['a.ts', 'b.ts']);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReadFileSync.mockReturnValue('export const x = 1;');

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'medium', filesPerDir: 2, priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesSkipped).toBe(2); // 4 total - 2 sampled
  });

  it('should handle file read errors gracefully', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockImplementation((p: string) => {
      // Module dir exists, but the individual file also "exists" for the check
      return true;
    });
    mockReaddirSync.mockReturnValue([makeDirent('broken.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['broken.ts']);

    // Reading the file throws
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    // Error is caught, file is skipped
    expect(result.filesAnalyzed).toHaveLength(0);
    expect(result.docStatus).toBe('skipped');
  });

  it('should skip non-source files in directory scan', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('app.ts', false),
      makeDirent('readme.md', false),
      makeDirent('image.png', false),
      makeDirent('data.json', false),
    ]);
    // Only app.ts is a source file; selectRepresentativeFiles gets only source files
    mockSelectRepresentativeFiles.mockImplementation((files: string[]) => files);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReadFileSync.mockReturnValue('export const x = 1;');

    const result = await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    // Only app.ts should be passed to selectRepresentativeFiles (isSourceFile filters)
    expect(mockSelectRepresentativeFiles).toHaveBeenCalledWith(
      ['app.ts'],
      'all',
      'auth',
    );
  });

  it('should skip node_modules and dist directories during scan', async () => {
    const module = makeModuleInfo();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir.endsWith('src/auth')) {
        return [
          makeDirent('index.ts', false),
          makeDirent('node_modules', true),
          makeDirent('dist', true),
          makeDirent('sub', true),
        ];
      }
      if (dir.endsWith('sub')) {
        return [makeDirent('nested.ts', false)];
      }
      return [];
    });
    mockSelectRepresentativeFiles.mockImplementation((files: string[]) => files);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReadFileSync.mockReturnValue('export const x = 1;');

    await analyzeModule(
      '/project',
      module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    // Should have index.ts and sub/nested.ts, but NOT any node_modules/dist contents
    expect(mockSelectRepresentativeFiles).toHaveBeenCalledWith(
      ['index.ts', 'sub/nested.ts'],
      'all',
      'auth',
    );
  });
});

// ---------------------------------------------------------------------------
// analyzeFile - tested via analyzeModule integration (file type detection)
// ---------------------------------------------------------------------------

describe('file type detection (via analyzeModule)', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReadFileSync.mockReturnValue('const x = 1;');
  });

  it('should detect test files from .test. suffix', async () => {
    const module = makeModuleInfo();
    mockReaddirSync.mockReturnValue([makeDirent('auth.test.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['auth.test.ts']);

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].type).toBe('test');
  });

  it('should detect test files from .spec. suffix', async () => {
    const module = makeModuleInfo();
    mockReaddirSync.mockReturnValue([makeDirent('auth.spec.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['auth.spec.ts']);

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].type).toBe('test');
  });

  it('should detect test files from __tests__ directory', async () => {
    const module = makeModuleInfo();
    // Simulate a file inside __tests__/ subfolder
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir.endsWith('src/auth')) {
        return [makeDirent('__tests__', true)];
      }
      if (dir.endsWith('__tests__')) {
        return [makeDirent('helper.ts', false)];
      }
      return [];
    });
    mockSelectRepresentativeFiles.mockReturnValue(['__tests__/helper.ts']);

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].type).toBe('test');
  });

  it('should detect config files', async () => {
    const module = makeModuleInfo();
    mockReaddirSync.mockReturnValue([makeDirent('tsconfig.json', false)]);
    // tsconfig.json is NOT a "source file" (.json not in the extensions list),
    // so it would be filtered out by isSourceFile. We test config detection on
    // a file that IS a source extension but has "config" in the name.
    mockReaddirSync.mockReturnValue([makeDirent('auth-config.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['auth-config.ts']);

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].type).toBe('config');
  });

  it('should default to source type for regular files', async () => {
    const module = makeModuleInfo();
    mockReaddirSync.mockReturnValue([makeDirent('handler.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['handler.ts']);

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].type).toBe('source');
  });
});

// ---------------------------------------------------------------------------
// JS/TS export extraction (via analyzeModule integration)
// ---------------------------------------------------------------------------

describe('JS/TS export extraction', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReaddirSync.mockReturnValue([makeDirent('module.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['module.ts']);
  });

  it('should extract export const declarations', async () => {
    mockReadFileSync.mockReturnValue('export const API_KEY = "abc";\nexport let counter = 0;');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'API_KEY',
      type: 'const',
      isDefault: false,
    }));
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'counter',
      type: 'const',
      isDefault: false,
    }));
  });

  it('should extract export function declarations', async () => {
    mockReadFileSync.mockReturnValue('export function handleRequest() {}\nexport async function fetchData() {}');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'handleRequest',
      type: 'function',
      isDefault: false,
    }));
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'fetchData',
      type: 'function',
      isDefault: false,
    }));
  });

  it('should extract export class declarations', async () => {
    mockReadFileSync.mockReturnValue('export class AuthService {\n  login() {}\n}');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'AuthService',
      type: 'class',
      isDefault: false,
    }));
  });

  it('should extract export interface declarations', async () => {
    mockReadFileSync.mockReturnValue('export interface UserProfile {\n  name: string;\n}');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'UserProfile',
      type: 'interface',
      isDefault: false,
    }));
  });

  it('should extract export type declarations', async () => {
    mockReadFileSync.mockReturnValue('export type UserId = string;');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'UserId',
      type: 'type',
      isDefault: false,
    }));
  });

  it('should extract export default declarations', async () => {
    mockReadFileSync.mockReturnValue('export default class Router {}');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'Router',
      type: 'class',
      isDefault: true,
    }));
  });

  it('should extract default export without name', async () => {
    mockReadFileSync.mockReturnValue('export default { key: "value" };');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'default',
      isDefault: true,
    }));
  });

  it('should include line numbers in exports', async () => {
    const content = [
      '// comment',
      'export const A = 1;',
      '',
      'export function B() {}',
    ].join('\n');
    mockReadFileSync.mockReturnValue(content);

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    const a = exports.find(e => e.name === 'A');
    const b = exports.find(e => e.name === 'B');
    expect(a?.line).toBe(2);
    expect(b?.line).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// JS/TS import extraction (via analyzeModule integration)
// ---------------------------------------------------------------------------

describe('JS/TS import extraction', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReaddirSync.mockReturnValue([makeDirent('module.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['module.ts']);
  });

  it('should extract named imports', async () => {
    mockReadFileSync.mockReturnValue('import { foo, bar } from "some-pkg";');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'some-pkg',
      isExternal: true,
    }));
    const imp = imports.find(i => i.from === 'some-pkg');
    expect(imp?.names).toContain('foo');
    expect(imp?.names).toContain('bar');
  });

  it('should extract default imports', async () => {
    mockReadFileSync.mockReturnValue('import express from "express";');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'express',
      isExternal: true,
      names: ['express'],
    }));
  });

  it('should extract namespace imports', async () => {
    mockReadFileSync.mockReturnValue('import * as path from "path";');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'path',
      isExternal: true,
      names: ['path'],
    }));
  });

  it('should mark relative imports as non-external', async () => {
    mockReadFileSync.mockReturnValue('import { helper } from "./utils";');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    const relImport = imports.find(i => i.from === './utils');
    expect(relImport).toBeDefined();
    expect(relImport!.isExternal).toBe(false);
  });

  it('should handle scoped package imports', async () => {
    mockReadFileSync.mockReturnValue('import { z } from "@scope/pkg/sub";');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    // The external dep should be the scoped package name, not the sub-path
    expect(result.externalDeps).toContain('@scope/pkg');
    expect(result.externalDeps).not.toContain('@scope/pkg/sub');
  });
});

// ---------------------------------------------------------------------------
// Python export extraction (via analyzeModule integration)
// ---------------------------------------------------------------------------

describe('Python export extraction', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReaddirSync.mockReturnValue([makeDirent('main.py', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['main.py']);
  });

  it('should extract Python function definitions', async () => {
    mockReadFileSync.mockReturnValue('def process_data(input):\n    pass\n\ndef transform():\n    pass');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'process_data',
      type: 'function',
    }));
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'transform',
      type: 'function',
    }));
  });

  it('should extract Python class definitions', async () => {
    mockReadFileSync.mockReturnValue('class DataProcessor:\n    pass');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    expect(exports).toContainEqual(expect.objectContaining({
      name: 'DataProcessor',
      type: 'class',
    }));
  });

  it('should skip private Python functions and classes', async () => {
    mockReadFileSync.mockReturnValue('def _private_fn():\n    pass\n\nclass _Internal:\n    pass\n\ndef public_fn():\n    pass');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const exports = result.filesAnalyzed[0].exports;
    const names = exports.map(e => e.name);
    expect(names).toContain('public_fn');
    expect(names).not.toContain('_private_fn');
    expect(names).not.toContain('_Internal');
  });
});

// ---------------------------------------------------------------------------
// Python import extraction (via analyzeModule integration)
// ---------------------------------------------------------------------------

describe('Python import extraction', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 100 });
    mockReaddirSync.mockReturnValue([makeDirent('main.py', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['main.py']);
  });

  it('should extract "from X import Y" style imports', async () => {
    mockReadFileSync.mockReturnValue('from flask import Flask, jsonify');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'flask',
      isExternal: true,
    }));
    const flaskImport = imports.find(i => i.from === 'flask');
    expect(flaskImport?.names).toContain('Flask');
    expect(flaskImport?.names).toContain('jsonify');
  });

  it('should extract "import X" style imports', async () => {
    mockReadFileSync.mockReturnValue('import os\nimport json');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'os',
      isExternal: true,
    }));
    expect(imports).toContainEqual(expect.objectContaining({
      from: 'json',
      isExternal: true,
    }));
  });

  it('should mark relative Python imports as non-external', async () => {
    mockReadFileSync.mockReturnValue('from .utils import helper');

    const result = await analyzeModule(
      '/project', makeModuleInfo(),
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const imports = result.filesAnalyzed[0].imports;
    const rel = imports.find(i => i.from === '.utils');
    expect(rel).toBeDefined();
    expect(rel!.isExternal).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateRichModuleSummary
// ---------------------------------------------------------------------------

describe('generateRichModuleSummary', () => {
  it('should produce markdown with module name as heading', () => {
    const module = makeModuleInfo({ name: 'payments' });
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('# payments');
  });

  it('should include module path', () => {
    const module = makeModuleInfo({ path: 'src/payments' });
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('`src/payments`');
  });

  it('should infer purpose from well-known module names', () => {
    const cases: Array<{ name: string; expected: string }> = [
      { name: 'cli', expected: 'Command-line interface' },
      { name: 'core', expected: 'Core business logic' },
      { name: 'api', expected: 'API layer' },
      { name: 'utils', expected: 'utility functions' },
      { name: 'auth', expected: 'Authentication' },
      { name: 'middleware', expected: 'middleware' },
      { name: 'config', expected: 'Configuration' },
    ];

    for (const { name, expected } of cases) {
      const module = makeModuleInfo({ name });
      const result = generateRichModuleSummary(module, [], 0);
      expect(result.toLowerCase()).toContain(expected.toLowerCase());
    }
  });

  it('should use AI insights purpose when provided', () => {
    const module = makeModuleInfo({ name: 'xyz' });
    const aiInsights: AIModuleInsights = {
      purpose: 'Handles payment processing via Stripe API',
    };

    const result = generateRichModuleSummary(module, [], 0, aiInsights);

    expect(result).toContain('Handles payment processing via Stripe API');
  });

  it('should fall back to inferred purpose for unknown module names', () => {
    const module = makeModuleInfo({ name: 'mywidget' });
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('Provides mywidget functionality');
  });

  it('should include overview with file count and LOC', () => {
    const module = makeModuleInfo({ name: 'core', fileCount: 42, estimatedLOC: 5000 });
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('42 files');
    expect(result).toContain('5,000 lines of code');
  });

  it('should show dependency graph imports', () => {
    const module = makeModuleInfo();
    const depGraph: ModuleDependencyInfo = {
      imports: ['utils', 'config'],
      importedBy: ['api'],
    };

    const result = generateRichModuleSummary(module, [], 0, undefined, depGraph);

    expect(result).toContain('`utils`');
    expect(result).toContain('`config`');
    expect(result).toContain('`api`');
  });

  it('should show "No dependencies detected" when empty', () => {
    const module = makeModuleInfo();
    const depGraph: ModuleDependencyInfo = { imports: [], importedBy: [] };

    const result = generateRichModuleSummary(module, [], 0, undefined, depGraph);

    expect(result).toContain('No dependencies detected');
  });

  it('should include analysis counts for source and test files', () => {
    const files: AnalyzedFile[] = [
      makeAnalyzedFile({ type: 'source', path: 'a.ts' }),
      makeAnalyzedFile({ type: 'source', path: 'b.ts' }),
      makeAnalyzedFile({ type: 'test', path: 'a.test.ts' }),
    ];

    const result = generateRichModuleSummary(makeModuleInfo(), files, 10);

    expect(result).toContain('**Source Files**: 2');
    expect(result).toContain('**Test Files**: 1');
    expect(result).toContain('**Total Exports**: 10');
    expect(result).toContain('**Files Analyzed**: 3');
  });

  it('should list top exports (up to 10)', () => {
    const exports: ExportInfo[] = Array.from({ length: 12 }, (_, i) => ({
      name: `fn${i}`,
      type: 'function' as const,
      isDefault: false,
      line: i + 1,
    }));

    const files: AnalyzedFile[] = [
      makeAnalyzedFile({ exports }),
    ];

    const result = generateRichModuleSummary(makeModuleInfo(), files, 12);

    expect(result).toContain('`fn0`');
    expect(result).toContain('`fn9`');
    expect(result).toContain('...and 2 more exports');
    // fn10 and fn11 should not be individually listed
    expect(result).not.toContain('`fn10`');
  });

  it('should not show Main Exports section when there are no exports', () => {
    const result = generateRichModuleSummary(makeModuleInfo(), [], 0);

    expect(result).not.toContain('## Main Exports');
  });

  it('should show README and test status', () => {
    const moduleWithReadme = makeModuleInfo({ hasReadme: true });
    const testFiles: AnalyzedFile[] = [
      makeAnalyzedFile({ type: 'test', path: 'x.test.ts' }),
    ];

    const result = generateRichModuleSummary(moduleWithReadme, testFiles, 0);

    expect(result).toContain('**Has README**: Yes');
    expect(result).toContain('**Has Tests**: Yes');
  });

  it('should show No for README and tests when missing', () => {
    const module = makeModuleInfo({ hasReadme: false });
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('**Has README**: No');
    expect(result).toContain('**Has Tests**: No');
  });

  it('should format AI integration points', () => {
    const module = makeModuleInfo();
    const aiInsights: AIModuleInsights = {
      integrationPoints: ['REST API at /api/v1', 'WebSocket on port 3001'],
    };

    const result = generateRichModuleSummary(module, [], 0, aiInsights);

    expect(result).toContain('REST API at /api/v1');
    expect(result).toContain('WebSocket on port 3001');
  });

  it('should format AI patterns', () => {
    const module = makeModuleInfo();
    const aiInsights: AIModuleInsights = {
      patterns: [
        { name: 'Repository Pattern', evidence: 'Uses data access objects' },
      ],
    };

    const result = generateRichModuleSummary(module, [], 0, aiInsights);

    expect(result).toContain('**Repository Pattern**');
    expect(result).toContain('Uses data access objects');
  });

  it('should show placeholder text when no AI patterns or integration points', () => {
    const module = makeModuleInfo();
    const result = generateRichModuleSummary(module, [], 0);

    expect(result).toContain('No external integration points detected');
    expect(result).toContain('No specific patterns detected');
  });

  it('should include generation date footer', () => {
    const result = generateRichModuleSummary(makeModuleInfo(), [], 0);

    expect(result).toContain('*Analysis generated on 2026-02-11*');
  });
});

// ---------------------------------------------------------------------------
// saveModuleAnalysis
// ---------------------------------------------------------------------------

describe('saveModuleAnalysis', () => {
  it('should create output directory and write markdown file', async () => {
    const analysis: ModuleAnalysis = {
      moduleName: 'auth',
      modulePath: 'src/auth',
      analyzedAt: '2026-02-11T12:00:00.000Z',
      filesAnalyzed: [],
      filesSkipped: 0,
      totalExports: 0,
      externalDeps: [],
      internalDeps: [],
      relatedWorkItems: [],
      summary: '# auth\n\nSummary content',
      docStatus: 'generated',
    };

    const result = await saveModuleAnalysis('/project', analysis);

    expect(mockEnsureDirSync).toHaveBeenCalledWith(
      expect.stringContaining('.specweave/docs/internal/modules'),
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('auth.md'),
      expect.stringContaining('# auth'),
    );
    expect(result).toContain('auth.md');
  });

  it('should regenerate summary with AI insights if available', async () => {
    const analysis: ModuleAnalysis = {
      moduleName: 'payments',
      modulePath: 'src/payments',
      analyzedAt: '2026-02-11T12:00:00.000Z',
      filesAnalyzed: [
        makeAnalyzedFile({
          path: 'handler.ts',
          lineCount: 100,
          exports: [{ name: 'processPayment', type: 'function', isDefault: false }],
          imports: [],
        }),
      ],
      filesSkipped: 2,
      totalExports: 1,
      externalDeps: ['stripe'],
      internalDeps: [],
      relatedWorkItems: [],
      summary: 'old summary',
      docStatus: 'generated',
      aiInsights: {
        purpose: 'Stripe payment processing module',
        integrationPoints: ['Stripe webhook endpoint'],
        patterns: [{ name: 'Strategy', evidence: 'Payment method selection' }],
      },
    };

    await saveModuleAnalysis('/project', analysis);

    // The written content should be the regenerated rich summary, not 'old summary'
    const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
    expect(writtenContent).toContain('Stripe payment processing module');
    expect(writtenContent).toContain('Stripe webhook endpoint');
    expect(writtenContent).toContain('**Strategy**');
    expect(writtenContent).not.toBe('old summary');
  });

  it('should use original summary when no AI insights are provided', async () => {
    const analysis: ModuleAnalysis = {
      moduleName: 'utils',
      modulePath: 'src/utils',
      analyzedAt: '2026-02-11T12:00:00.000Z',
      filesAnalyzed: [],
      filesSkipped: 0,
      totalExports: 0,
      externalDeps: [],
      internalDeps: [],
      relatedWorkItems: [],
      summary: '# utils\n\nOriginal summary here',
      docStatus: 'generated',
    };

    await saveModuleAnalysis('/project', analysis);

    const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
    expect(writtenContent).toBe('# utils\n\nOriginal summary here');
  });

  it('should return the output file path', async () => {
    const analysis: ModuleAnalysis = {
      moduleName: 'core',
      modulePath: 'src/core',
      analyzedAt: '2026-02-11T12:00:00.000Z',
      filesAnalyzed: [],
      filesSkipped: 0,
      totalExports: 0,
      externalDeps: [],
      internalDeps: [],
      relatedWorkItems: [],
      summary: '# core',
      docStatus: 'generated',
    };

    const result = await saveModuleAnalysis('/project', analysis);

    expect(result).toMatch(/\/project\/.specweave\/docs\/internal\/modules\/core\.md$/);
  });
});

// ---------------------------------------------------------------------------
// Source file detection (isSourceFile via getModuleFiles integration)
// ---------------------------------------------------------------------------

describe('source file extension filtering', () => {
  it('should accept TypeScript and JavaScript files', async () => {
    const module = makeModuleInfo();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('a.ts', false),
      makeDirent('b.tsx', false),
      makeDirent('c.js', false),
      makeDirent('d.jsx', false),
      makeDirent('e.mjs', false),
      makeDirent('f.cjs', false),
    ]);
    mockSelectRepresentativeFiles.mockImplementation((files: string[]) => files);
    mockStatSync.mockReturnValue({ size: 50 });
    mockReadFileSync.mockReturnValue('');

    await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const passedFiles = mockSelectRepresentativeFiles.mock.calls[0][0] as string[];
    expect(passedFiles).toEqual(['a.ts', 'b.tsx', 'c.js', 'd.jsx', 'e.mjs', 'f.cjs']);
  });

  it('should accept various language source files', async () => {
    const module = makeModuleInfo();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('main.py', false),
      makeDirent('app.go', false),
      makeDirent('lib.rs', false),
      makeDirent('App.java', false),
      makeDirent('main.c', false),
      makeDirent('util.h', false),
    ]);
    mockSelectRepresentativeFiles.mockImplementation((files: string[]) => files);
    mockStatSync.mockReturnValue({ size: 50 });
    mockReadFileSync.mockReturnValue('');

    await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const passedFiles = mockSelectRepresentativeFiles.mock.calls[0][0] as string[];
    expect(passedFiles).toContain('main.py');
    expect(passedFiles).toContain('app.go');
    expect(passedFiles).toContain('lib.rs');
    expect(passedFiles).toContain('App.java');
    expect(passedFiles).toContain('main.c');
    expect(passedFiles).toContain('util.h');
  });

  it('should reject non-source files', async () => {
    const module = makeModuleInfo();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('readme.md', false),
      makeDirent('data.json', false),
      makeDirent('style.css', false),
      makeDirent('logo.png', false),
      makeDirent('.env', false),
      makeDirent('Makefile', false),
    ]);
    mockSelectRepresentativeFiles.mockImplementation((files: string[]) => files);

    await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    const passedFiles = mockSelectRepresentativeFiles.mock.calls[0][0] as string[];
    expect(passedFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Line count tracking
// ---------------------------------------------------------------------------

describe('line count tracking', () => {
  it('should count lines accurately in analyzed files', async () => {
    const module = makeModuleInfo();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('file.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['file.ts']);
    mockStatSync.mockReturnValue({ size: 200 });
    mockReadFileSync.mockReturnValue('line1\nline2\nline3\nline4\nline5');

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].lineCount).toBe(5);
  });

  it('should count single line as 1', async () => {
    const module = makeModuleInfo();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('file.ts', false)]);
    mockSelectRepresentativeFiles.mockReturnValue(['file.ts']);
    mockStatSync.mockReturnValue({ size: 10 });
    mockReadFileSync.mockReturnValue('single line');

    const result = await analyzeModule(
      '/project', module,
      { tier: 'small', filesPerDir: 'all', priorityPatterns: [], skipPatterns: [] },
      [],
    );

    expect(result.filesAnalyzed[0].lineCount).toBe(1);
  });
});

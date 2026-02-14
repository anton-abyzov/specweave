/**
 * Tests for init guard - prevent createDirectoryStructure inside .specweave/increments/
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Mock the heavy dependencies to keep the test fast
const mocks = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  writeJsonSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  default: mocks,
  ...mocks,
}));

vi.mock('../../../../../src/core/living-docs/scaffolding/index.js', () => ({
  LivingDocsScaffold: vi.fn().mockImplementation(() => ({
    scaffold: vi.fn().mockResolvedValue({ success: true, dirsCreated: [], errors: [] }),
  })),
  scanExistingDocs: vi.fn(),
  findSimilarFolders: vi.fn(),
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('chalk', () => ({
  default: {
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    blue: (s: string) => s,
    gray: (s: string) => s,
  },
}));

describe('createDirectoryStructure guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when target is inside .specweave/increments/', async () => {
    const { createDirectoryStructure } = await import(
      '../../../../../src/cli/helpers/init/directory-structure.js'
    );

    const badTarget = path.join('/project', '.specweave', 'increments', 'something');

    await expect(
      createDirectoryStructure(badTarget, 'claude')
    ).rejects.toThrow(/Cannot initialize SpecWeave inside .specweave\/increments/);
  });

  it('should throw when target IS the increments directory', async () => {
    const { createDirectoryStructure } = await import(
      '../../../../../src/cli/helpers/init/directory-structure.js'
    );

    const badTarget = path.join('/project', '.specweave', 'increments');

    await expect(
      createDirectoryStructure(badTarget, 'claude')
    ).rejects.toThrow(/Cannot initialize SpecWeave inside .specweave\/increments/);
  });

  it('should NOT throw for normal project directory', async () => {
    const { createDirectoryStructure } = await import(
      '../../../../../src/cli/helpers/init/directory-structure.js'
    );

    const goodTarget = '/project/my-app';

    // Should not throw (may fail for other reasons in test env, but not the guard)
    try {
      await createDirectoryStructure(goodTarget, 'claude');
    } catch (err: any) {
      // Only fail if it's the guard error
      expect(err.message).not.toMatch(/Cannot initialize SpecWeave inside .specweave\/increments/);
    }
  });
});

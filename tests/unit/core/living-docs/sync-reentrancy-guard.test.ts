/**
 * Unit tests for the LivingDocsSync reentrancy guard.
 *
 * The guard uses a static `activeSyncs` Set to prevent concurrent
 * syncIncrement() calls for the same incrementId.  These tests mock
 * every heavy dependency so only the guard logic is exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — evaluated before any import
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  return {
    existsSync: vi.fn().mockReturnValue(false),
    fsAccess: vi.fn().mockResolvedValue(undefined),
    fsReaddir: vi.fn().mockResolvedValue([]),
    fsReadFile: vi.fn().mockResolvedValue(''),
    fsMkdir: vi.fn().mockResolvedValue(undefined),
    fsWriteFile: vi.fn().mockResolvedValue(undefined),
    fsStat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
    fsRename: vi.fn().mockResolvedValue(undefined),
    fsCopyFile: vi.fn().mockResolvedValue(undefined),
    fsRm: vi.fn().mockResolvedValue(undefined),
    autoDetectProjectIdSync: vi.fn().mockReturnValue('test-project'),
    isTemplateFile: vi.fn().mockReturnValue(false),
    buildRegistry: vi.fn().mockResolvedValue(undefined),
    deriveFeatureId: vi.fn().mockReturnValue('FS-001'),
    extractIncrementNumber: vi.fn().mockReturnValue(1),
    getProfilesByProvider: vi.fn().mockReturnValue([]),
    getGitHubAuthFromProject: vi.fn().mockResolvedValue(null),
    resolveSyncTarget: vi.fn().mockReturnValue(undefined),
    // Track actual sync work so we can count how many times it ran
    syncWorkTracker: vi.fn(),
  };
});

// --- fs mock (node:fs + node:fs/promises) -----------------------------------

vi.mock('fs', () => ({
  existsSync: mocks.existsSync,
  promises: {
    access: mocks.fsAccess,
    readdir: mocks.fsReaddir,
    readFile: mocks.fsReadFile,
    mkdir: mocks.fsMkdir,
    writeFile: mocks.fsWriteFile,
    stat: mocks.fsStat,
    rename: mocks.fsRename,
    copyFile: mocks.fsCopyFile,
    rm: mocks.fsRm,
  },
}));

// --- yaml / gray-matter (heavy parsers) ------------------------------------

vi.mock('yaml', () => ({
  default: { parse: vi.fn().mockReturnValue({}), stringify: vi.fn().mockReturnValue('') },
}));

vi.mock('gray-matter', () => ({
  default: vi.fn().mockReturnValue({ data: {}, content: '' }),
}));

// --- Internal helpers -------------------------------------------------------

vi.mock('../../../../src/core/living-docs/feature-id-manager.js', () => ({
  FeatureIDManager: class {
    buildRegistry = mocks.buildRegistry;
    getFeatureId = vi.fn().mockReturnValue('FS-001');
  },
}));

vi.mock('../../../../src/core/living-docs/task-project-specific-generator.js', () => ({
  TaskProjectSpecificGenerator: class {
    generate = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../../../src/core/living-docs/feature-consistency-validator.js', () => ({
  FeatureConsistencyValidator: class {
    validate = vi.fn().mockResolvedValue({ valid: true, issues: [] });
  },
}));

vi.mock('../../../../src/core/living-docs/board-matcher.js', () => ({
  BoardMatcher: class {
    match = vi.fn().mockResolvedValue({ board: null, confidence: 0 });
  },
}));

vi.mock('../../../../src/core/living-docs/cross-project-sync.js', () => ({
  CrossProjectSync: class {
    sync = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  Logger: class {},
  consoleLogger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../src/utils/project-detection.js', () => ({
  autoDetectProjectIdSync: mocks.autoDetectProjectIdSync,
}));

vi.mock('../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mocks.getGitHubAuthFromProject,
  resolveGitHubToken: mocks.getGitHubAuthFromProject,
  describeGitHubAuth: () => 'GitHub token: mock',
}));

vi.mock('../../../../src/sync/sync-target-resolver.js', () => ({
  resolveSyncTarget: mocks.resolveSyncTarget,
}));

vi.mock('../../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mocks.deriveFeatureId,
  extractIncrementNumber: mocks.extractIncrementNumber,
}));

vi.mock('../../../../src/core/increment/template-creator.js', () => ({
  isTemplateFile: mocks.isTemplateFile,
}));

vi.mock('../../../../src/core/living-docs/types.js', () => ({}));

vi.mock('../../../../src/core/types/sync-profile.js', () => ({
  getProfilesByProvider: mocks.getProfilesByProvider,
}));

vi.mock('../../../../src/core/living-docs/sync-helpers/index.js', () => ({
  calculateUSStatus: vi.fn().mockReturnValue('active'),
  extractUserStories: vi.fn().mockReturnValue([]),
  extractAcceptanceCriteria: vi.fn().mockReturnValue([]),
  generateFeatureFile: vi.fn().mockReturnValue(''),
  generateReadmeFile: vi.fn().mockReturnValue(''),
  generateUserStoryFile: vi.fn().mockReturnValue(''),
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue({}),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  findExistingUserStoryFile: vi.fn().mockResolvedValue(null),
  cleanupDuplicateFiles: vi.fn().mockResolvedValue(undefined),
  cleanupTempFiles: vi.fn().mockResolvedValue(undefined),
  slugifyTitle: vi.fn().mockReturnValue('test'),
}));

vi.mock('../../../../src/core/project/project-resolution.js', () => ({
  ProjectResolutionService: class {
    resolve = vi.fn().mockResolvedValue({ projectId: 'test-project' });
  },
}));

vi.mock('../../../../src/utils/image-generator.js', () => ({
  generateLivingDocsImagesEnhanced: vi.fn().mockResolvedValue(undefined),
  getRelativeImagePath: vi.fn().mockReturnValue(''),
  markdownImage: vi.fn().mockReturnValue(''),
  extractKeywordsFromContent: vi.fn().mockReturnValue([]),
}));

// ---------------------------------------------------------------------------
// Import the class under test (after all mocks are in place)
// ---------------------------------------------------------------------------

import { LivingDocsSync } from '../../../../src/core/living-docs/living-docs-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a LivingDocsSync instance wired for testing.
 *
 * `resolveIncrementDir` is stubbed to return the id as-is so the guard
 * key stays stable (mirrors the real behaviour when a full dir name is
 * passed).  The first internal await inside the try-block
 * (`resolveIncrementDir`) is the natural point to inject a controllable
 * delay so we can observe concurrency.
 */
function createSync(): LivingDocsSync {
  return new LivingDocsSync('/fake/root');
}

/**
 * Patch `resolveIncrementDir` on an instance to introduce an artificial
 * delay AND track that real sync work began.
 */
function patchResolveWithDelay(
  sync: LivingDocsSync,
  delayMs: number,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sync as any).resolveIncrementDir = async (id: string) => {
    mocks.syncWorkTracker(id);
    await new Promise((r) => setTimeout(r, delayMs));
    return id;
  };
}

/**
 * Patch `resolveIncrementDir` to throw, simulating a sync failure.
 */
function patchResolveWithError(
  sync: LivingDocsSync,
  error: Error,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sync as any).resolveIncrementDir = async (id: string) => {
    mocks.syncWorkTracker(id);
    throw error;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LivingDocsSync reentrancy guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the static activeSyncs Set between tests so they don't leak
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LivingDocsSync as any).activeSyncs.clear();
  });

  it('blocks concurrent sync for the SAME incrementId', async () => {
    const sync = createSync();
    patchResolveWithDelay(sync, 50);

    // Fire two syncs concurrently for the same id
    const [r1, r2] = await Promise.all([
      sync.syncIncrement('0001-feature'),
      sync.syncIncrement('0001-feature'),
    ]);

    // Only one call should have entered the real sync body
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(1);

    // Exactly one result must be the early-return from the guard:
    // success=false, featureId='', no errors (it just bails out)
    const blockedResults = [r1, r2].filter(
      (r) => r.featureId === '' && r.errors.length === 0,
    );
    expect(blockedResults).toHaveLength(1);
    expect(blockedResults[0].success).toBe(false);
  });

  it('allows concurrent sync for DIFFERENT incrementIds', async () => {
    const sync = createSync();
    patchResolveWithDelay(sync, 50);

    await Promise.all([
      sync.syncIncrement('0001-alpha'),
      sync.syncIncrement('0002-beta'),
    ]);

    // Both should have entered the real sync body
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(2);
    expect(mocks.syncWorkTracker).toHaveBeenCalledWith('0001-alpha');
    expect(mocks.syncWorkTracker).toHaveBeenCalledWith('0002-beta');
  });

  it('clears the guard after successful sync (allows re-sync)', async () => {
    const sync = createSync();
    patchResolveWithDelay(sync, 5);

    // First sync
    await sync.syncIncrement('0001-feature');
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(1);

    // Second sync — guard should be cleared, so this enters the body
    await sync.syncIncrement('0001-feature');
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(2);
  });

  it('clears the guard even when sync throws (finally block)', async () => {
    const sync = createSync();
    patchResolveWithError(sync, new Error('boom'));

    // First sync — will hit the catch branch
    const r1 = await sync.syncIncrement('0001-feature');
    expect(r1.success).toBe(false);
    expect(r1.errors.length).toBeGreaterThan(0);
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(1);

    // Second sync — guard must be cleared despite the earlier failure
    patchResolveWithDelay(sync, 5);
    await sync.syncIncrement('0001-feature');
    expect(mocks.syncWorkTracker).toHaveBeenCalledTimes(2);
  });
});

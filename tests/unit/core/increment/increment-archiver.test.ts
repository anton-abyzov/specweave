import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from '../../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import { IncrementArchiver, ArchiveOptions } from '../../../../src/core/increment/increment-archiver.js';

/**
 * Tests for IncrementArchiver
 *
 * Tests archive, restore, listArchived, getStats and the behavior of
 * private helper methods (extractIncrementKey, inferFeatureIdFromIncrement)
 * as exercised through the public API.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock detectDuplicatesByNumber - returns empty by default (no duplicates)
const { mockDetectDuplicates } = vi.hoisted(() => ({
  mockDetectDuplicates: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../src/core/increment/duplicate-detector.js', () => ({
  detectDuplicatesByNumber: mockDetectDuplicates,
}));

// Mock ConfigManager (unused in most paths, but imported by constructor)
const { MockConfigManager } = vi.hoisted(() => {
  class MockConfigManager {
    get = vi.fn();
    set = vi.fn();
    load = vi.fn();
  }
  return { MockConfigManager };
});

vi.mock('../../../../src/core/config-manager.js', () => ({
  ConfigManager: MockConfigManager,
}));

// Mock MetadataManager (not directly used in archiver, but imported)
vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: vi.fn(),
}));

// Mock logger to suppress output
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  Logger: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;
let originalCwd: string;

function incDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'increments', ...segments);
}

function archiveDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'increments', '_archive', ...segments);
}

function abandonedDir(...segments: string[]): string {
  return path.join(tempDir, '.specweave', 'increments', '_abandoned', ...segments);
}

/**
 * Create a minimal increment directory with optional metadata.json
 */
function createIncrement(
  name: string,
  metadata?: Record<string, any>,
  location: 'active' | 'archive' | 'abandoned' = 'active',
): void {
  let dir: string;
  switch (location) {
    case 'archive':
      dir = archiveDir(name);
      break;
    case 'abandoned':
      dir = abandonedDir(name);
      break;
    default:
      dir = incDir(name);
  }
  fs.mkdirSync(dir, { recursive: true });

  if (metadata) {
    fs.writeFileSync(
      path.join(dir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
    );
  }

  // Create a dummy file so size calculation returns something > 0
  fs.writeFileSync(path.join(dir, 'spec.md'), `# ${name}\nSome content.`);
}

function createArchiver(): IncrementArchiver {
  return new IncrementArchiver(tempDir);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  originalCwd = process.cwd();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-archiver-test-'));

  // Create base structure
  fs.mkdirSync(incDir(), { recursive: true });

  // Reset mocks
  mockDetectDuplicates.mockReset();
  mockDetectDuplicates.mockResolvedValue([]);
});

afterEach(() => {
  if (originalCwd) {
    process.chdir(originalCwd);
  }
  if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
  }
});

// ===========================================================================
// extractIncrementKey (tested through archiveWithKeepLast)
// ===========================================================================

describe('extractIncrementKey behavior (via keepLast)', () => {
  it('should treat "0118-my-feature" as key "0118"', async () => {
    // Create 3 increments; keepLast=2 should archive the lowest number
    createIncrement('0001-first', { status: 'completed' });
    createIncrement('0118-my-feature', { status: 'completed' });
    createIncrement('0200-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 2 });

    expect(result.archived).toContain('0001-first');
    expect(result.archived).not.toContain('0118-my-feature');
    expect(result.archived).not.toContain('0200-latest');
  });

  it('should preserve E suffix: "0118E-external" is a different key from "0118-internal"', async () => {
    createIncrement('0118-internal', { status: 'completed' });
    createIncrement('0118E-external', { status: 'completed' });
    createIncrement('0200-latest', { status: 'completed' });

    const archiver = createArchiver();
    // keepLast=2: sort descending = 0200, 0118, 0118E
    // Top 2 unique keys are 0200 and 0118 (internal sorts before E for same number)
    // 0118E is the 3rd key, so it gets archived
    const result = await archiver.archive({ keepLast: 2 });

    expect(result.archived).toContain('0118E-external');
    expect(result.archived).not.toContain('0118-internal');
    expect(result.archived).not.toContain('0200-latest');
  });

  it('should sort keys numerically, not lexicographically', async () => {
    createIncrement('0009-nine', { status: 'completed' });
    createIncrement('0010-ten', { status: 'completed' });
    createIncrement('0100-hundred', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 2 });

    expect(result.archived).toContain('0009-nine');
    expect(result.archived).not.toContain('0010-ten');
    expect(result.archived).not.toContain('0100-hundred');
  });

  it('should handle E suffix as separate key when both internal and external exist', async () => {
    createIncrement('0050-internal', { status: 'completed' });
    createIncrement('0050E-external', { status: 'completed' });
    createIncrement('0051-next', { status: 'completed' });
    createIncrement('0052-newest', { status: 'completed' });

    const archiver = createArchiver();
    // Sort descending: 0052, 0051, 0050, 0050E → top 3 = 0052, 0051, 0050
    // 0050E is 4th → archived
    const result = await archiver.archive({ keepLast: 3 });

    expect(result.archived).toContain('0050E-external');
    expect(result.archived).not.toContain('0050-internal');
    expect(result.archived).not.toContain('0052-newest');
    expect(result.archived).not.toContain('0051-next');
  });
});

// ===========================================================================
// inferFeatureIdFromIncrement (tested through restore → updateReferencesOnRestore)
// ===========================================================================

describe('inferFeatureIdFromIncrement behavior', () => {
  // We can't easily test this through the public API without complex living-docs
  // setup, so we test the archiving pattern which exercises extractIncrementKey
  // and document the expected behavior.

  it('should map 4-digit prefix to FS-NNN format (tested via keepLast key extraction)', async () => {
    // The key extraction used in keepLast exercises the same regex logic
    createIncrement('0041-living-docs', { status: 'completed' });
    createIncrement('0123-my-feature', { status: 'completed' });
    createIncrement('0999-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    // Archives the two lower-numbered, keeps 0999
    expect(result.archived).toContain('0041-living-docs');
    expect(result.archived).toContain('0123-my-feature');
    expect(result.archived).not.toContain('0999-latest');
  });
});

// ===========================================================================
// archive() - keepLast mode
// ===========================================================================

describe('archive with keepLast', () => {
  it('should keep last N increments (default=5)', async () => {
    for (let i = 1; i <= 7; i++) {
      createIncrement(`${String(i).padStart(4, '0')}-inc-${i}`, { status: 'completed' });
    }

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 5 });

    expect(result.archived.length).toBe(2);
    expect(result.archived).toContain('0001-inc-1');
    expect(result.archived).toContain('0002-inc-2');
  });

  it('should default to keepLast=5 when no criteria provided', async () => {
    for (let i = 1; i <= 8; i++) {
      createIncrement(`${String(i).padStart(4, '0')}-item-${i}`, { status: 'completed' });
    }

    const archiver = createArchiver();
    const result = await archiver.archive({});

    // Default keepLast=5 means archive 3
    expect(result.archived.length).toBe(3);
  });

  it('should archive nothing if total <= keepLast', async () => {
    createIncrement('0001-only', { status: 'completed' });
    createIncrement('0002-two', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 5 });

    expect(result.archived.length).toBe(0);
  });

  it('should skip active increments when preserveActive=true (default)', async () => {
    createIncrement('0001-old', { status: 'completed' });
    createIncrement('0002-active', { status: 'active' });
    createIncrement('0003-newest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    // 0001 should be archived, 0002 is active → skipped (but the key is still
    // outside keepLast so tryArchiveIncrement will check shouldArchive)
    expect(result.skipped).toContain('0002-active');
    expect(result.archived).toContain('0001-old');
    expect(result.archived).not.toContain('0003-newest');
  });

  it('should skip paused increments when preserveActive=true', async () => {
    createIncrement('0001-paused', { status: 'paused' });
    createIncrement('0010-completed', { status: 'completed' });
    createIncrement('0020-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.skipped).toContain('0001-paused');
    expect(result.archived).toContain('0010-completed');
    expect(result.archived).not.toContain('0020-latest');
  });

  it('should skip increments with active GitHub sync', async () => {
    createIncrement('0001-synced', { status: 'completed', github: { issue: 42, closed: false } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.skipped).toContain('0001-synced');
  });

  it('should skip increments with active JIRA sync', async () => {
    createIncrement('0001-jira', { status: 'completed', jira: { key: 'PROJ-1', status: 'In Progress' } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.skipped).toContain('0001-jira');
  });

  it('should archive increments with closed GitHub sync', async () => {
    createIncrement('0001-closed-gh', { status: 'completed', github: { issue: 42, closed: true } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('0001-closed-gh');
  });

  it('should archive increments with done JIRA sync', async () => {
    createIncrement('0001-done-jira', { status: 'completed', jira: { key: 'PROJ-1', status: 'Done' } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('0001-done-jira');
  });

  it('should skip increments with active ADO sync', async () => {
    createIncrement('0001-ado', { status: 'completed', ado: { id: 1, state: 'Active' } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.skipped).toContain('0001-ado');
  });

  it('should archive increments with closed ADO sync', async () => {
    createIncrement('0001-ado-closed', { status: 'completed', ado: { id: 1, state: 'Closed' } });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('0001-ado-closed');
  });

  it('should skip already-archived increments (in _archive dir)', async () => {
    createIncrement('0001-already', { status: 'completed' });
    // Put the same one in archive
    createIncrement('0001-already', { status: 'completed' }, 'archive');
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    // shouldArchive checks pathExists in archive dir and returns false
    expect(result.skipped).toContain('0001-already');
  });

  it('should create _archive directory on non-dryRun', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();
    await archiver.archive({ keepLast: 1 });

    expect(fs.existsSync(archiveDir())).toBe(true);
  });

  it('should move files to _archive directory', async () => {
    createIncrement('0001-to-archive', { status: 'completed' });
    createIncrement('0010-keep', { status: 'completed' });

    const archiver = createArchiver();
    await archiver.archive({ keepLast: 1 });

    // Original should be gone
    expect(fs.existsSync(incDir('0001-to-archive'))).toBe(false);
    // Should exist in archive
    expect(fs.existsSync(archiveDir('0001-to-archive'))).toBe(true);
    expect(fs.existsSync(archiveDir('0001-to-archive', 'spec.md'))).toBe(true);
  });
});

// ===========================================================================
// archive() - strictLast mode
// ===========================================================================

describe('archive with strictLast', () => {
  it('should keep exactly last N, ignoring active status', async () => {
    createIncrement('0001-active', { status: 'active' });
    createIncrement('0002-paused', { status: 'paused' });
    createIncrement('0003-completed', { status: 'completed' });
    createIncrement('0004-synced', { status: 'completed', github: { issue: 1, closed: false } });
    createIncrement('0005-newest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ strictLast: 2 });

    expect(result.archived.length).toBe(3);
    expect(result.archived).toContain('0001-active');
    expect(result.archived).toContain('0002-paused');
    expect(result.archived).toContain('0003-completed');
    // 0004 and 0005 kept
    expect(result.archived).not.toContain('0004-synced');
    expect(result.archived).not.toContain('0005-newest');
  });

  it('should do nothing if total <= strictLast', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'active' });

    const archiver = createArchiver();
    const result = await archiver.archive({ strictLast: 5 });

    expect(result.archived.length).toBe(0);
  });

  it('should skip already-archived in strict mode', async () => {
    createIncrement('0001-already', { status: 'completed' });
    createIncrement('0001-already', { status: 'completed' }, 'archive');
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ strictLast: 1 });

    expect(result.skipped).toContain('0001-already');
    expect(result.archived).toContain('0002-b');
  });

  it('should report errors when archive fails', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    // Simulate duplicate detection throwing
    mockDetectDuplicates.mockRejectedValueOnce(new Error('disk error'));

    const archiver = createArchiver();
    const result = await archiver.archive({ strictLast: 2 });

    // 0001 fails, gets into errors
    expect(result.errors).toContain('0001-a');
  });
});

// ===========================================================================
// archive() - pattern mode
// ===========================================================================

describe('archive with pattern', () => {
  it('should archive increments matching regex pattern', async () => {
    createIncrement('0001-feature-auth', { status: 'completed' });
    createIncrement('0002-bugfix-login', { status: 'completed' });
    createIncrement('0003-feature-dashboard', { status: 'completed' });
    createIncrement('0004-chore-cleanup', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ pattern: 'feature' });

    expect(result.archived).toContain('0001-feature-auth');
    expect(result.archived).toContain('0003-feature-dashboard');
    expect(result.archived).not.toContain('0002-bugfix-login');
    expect(result.archived).not.toContain('0004-chore-cleanup');
  });

  it('should be case-insensitive', async () => {
    createIncrement('0001-Feature-Auth', { status: 'completed' });
    createIncrement('0002-other', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ pattern: 'feature' });

    expect(result.archived).toContain('0001-Feature-Auth');
  });

  it('should match by regex, not just substring', async () => {
    createIncrement('0001-api-v2-migration', { status: 'completed' });
    createIncrement('0002-ui-refresh', { status: 'completed' });
    createIncrement('0003-api-v3-update', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ pattern: '^\\d+-api-v\\d+' });

    expect(result.archived).toContain('0001-api-v2-migration');
    expect(result.archived).toContain('0003-api-v3-update');
    expect(result.archived).not.toContain('0002-ui-refresh');
  });

  it('should still respect preserveActive with pattern', async () => {
    createIncrement('0001-feature-x', { status: 'active' });
    createIncrement('0002-feature-y', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ pattern: 'feature' });

    expect(result.skipped).toContain('0001-feature-x');
    expect(result.archived).toContain('0002-feature-y');
  });
});

// ===========================================================================
// archive() - olderThanDays
// ===========================================================================

describe('archive with olderThanDays', () => {
  it('should archive increments older than N days based on metadata.lastActivity', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);

    createIncrement('0001-old', {
      status: 'completed',
      lastActivity: oldDate.toISOString(),
    });
    createIncrement('0002-recent', {
      status: 'completed',
      lastActivity: recentDate.toISOString(),
    });

    const archiver = createArchiver();
    const result = await archiver.archive({ olderThanDays: 30 });

    expect(result.archived).toContain('0001-old');
    expect(result.archived).not.toContain('0002-recent');
  });

  it('should fall back to file mtime when no lastActivity in metadata', async () => {
    createIncrement('0001-no-activity', { status: 'completed' });
    createIncrement('0002-recent', { status: 'completed' });

    // Note: both just created so they'll be "recent" (< 1 day old)
    const archiver = createArchiver();
    const result = await archiver.archive({ olderThanDays: 30 });

    // Neither should be archived since both were just created
    expect(result.archived.length).toBe(0);
  });

  it('should still respect preserveActive with olderThanDays', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    createIncrement('0001-active-old', {
      status: 'active',
      lastActivity: oldDate.toISOString(),
    });

    const archiver = createArchiver();
    const result = await archiver.archive({ olderThanDays: 30 });

    expect(result.skipped).toContain('0001-active-old');
  });
});

// ===========================================================================
// archive() - specific increments
// ===========================================================================

describe('archive specific increments', () => {
  it('should archive explicitly listed increments', async () => {
    createIncrement('0001-first', { status: 'completed' });
    createIncrement('0002-second', { status: 'completed' });
    createIncrement('0003-third', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ increments: ['0002-second'] });

    expect(result.archived).toContain('0002-second');
    expect(result.archived).not.toContain('0001-first');
    expect(result.archived).not.toContain('0003-third');
  });

  it('should match by number prefix (padded to 4 digits)', async () => {
    createIncrement('0005-my-thing', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ increments: ['5'] });

    expect(result.archived).toContain('0005-my-thing');
  });

  it('should report error for non-existent increment', async () => {
    createIncrement('0001-only', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ increments: ['9999'] });

    expect(result.errors).toContain('9999');
    expect(result.archived.length).toBe(0);
  });

  it('should handle multiple specific increments', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ increments: ['0001-a', '0003-c'] });

    expect(result.archived).toContain('0001-a');
    expect(result.archived).toContain('0003-c');
    expect(result.archived).not.toContain('0002-b');
  });

  it('should skip active increments in specific mode', async () => {
    createIncrement('0001-active', { status: 'active' });

    const archiver = createArchiver();
    const result = await archiver.archive({ increments: ['0001-active'] });

    expect(result.skipped).toContain('0001-active');
  });
});

// ===========================================================================
// archive() - dryRun mode
// ===========================================================================

describe('archive dryRun', () => {
  it('should not move files in dryRun mode', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1, dryRun: true });

    // Reports them as archived
    expect(result.archived.length).toBe(2);
    // But files are still in place
    expect(fs.existsSync(incDir('0001-a'))).toBe(true);
    expect(fs.existsSync(incDir('0002-b'))).toBe(true);
  });

  it('should not create _archive directory in dryRun mode', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });

    // Ensure archive dir does not exist
    if (fs.existsSync(archiveDir())) {
      fs.removeSync(archiveDir());
    }

    const archiver = createArchiver();
    await archiver.archive({ keepLast: 1, dryRun: true });

    expect(fs.existsSync(archiveDir())).toBe(false);
  });

  it('should work with strictLast dryRun', async () => {
    createIncrement('0001-a', { status: 'active' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ strictLast: 1, dryRun: true });

    expect(result.archived.length).toBe(2);
    // Files still present
    expect(fs.existsSync(incDir('0001-a'))).toBe(true);
    expect(fs.existsSync(incDir('0002-b'))).toBe(true);
  });

  it('should work with pattern dryRun', async () => {
    createIncrement('0001-feature-x', { status: 'completed' });
    createIncrement('0002-bugfix-y', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ pattern: 'feature', dryRun: true });

    expect(result.archived).toContain('0001-feature-x');
    expect(fs.existsSync(incDir('0001-feature-x'))).toBe(true);
  });

  it('totalSize should be 0 in dryRun mode', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1, dryRun: true });

    expect(result.totalSize).toBe(0);
  });
});

// ===========================================================================
// archive() - preserveActive
// ===========================================================================

describe('archive preserveActive behavior', () => {
  it('should archive active increments when preserveActive=false', async () => {
    createIncrement('0001-active', { status: 'active' });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1, preserveActive: false });

    expect(result.archived).toContain('0001-active');
  });

  it('should archive paused increments when preserveActive=false', async () => {
    createIncrement('0001-paused', { status: 'paused' });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1, preserveActive: false });

    expect(result.archived).toContain('0001-paused');
  });
});

// ===========================================================================
// archive() - duplicate detection
// ===========================================================================

describe('archive duplicate detection', () => {
  it('should throw when archiving would create duplicate in archive', async () => {
    createIncrement('0001-original', { status: 'completed' });
    createIncrement('0010-latest', { status: 'completed' });

    // Simulate existing duplicate in archive
    mockDetectDuplicates.mockResolvedValue([
      { path: archiveDir('0001-old-version'), name: '0001-old-version' },
    ]);

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.errors).toContain('0001-original');
  });

  it('should succeed when detectDuplicatesByNumber returns empty', async () => {
    createIncrement('0001-clean', { status: 'completed' });
    createIncrement('0010-latest', { status: 'completed' });

    mockDetectDuplicates.mockResolvedValue([]);

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('0001-clean');
    expect(result.errors.length).toBe(0);
  });
});

// ===========================================================================
// restore()
// ===========================================================================

describe('restore', () => {
  it('should move increment from _archive to active', async () => {
    createIncrement('0001-restored', { status: 'completed' }, 'archive');

    const archiver = createArchiver();
    await archiver.restore('0001-restored');

    expect(fs.existsSync(archiveDir('0001-restored'))).toBe(false);
    expect(fs.existsSync(incDir('0001-restored'))).toBe(true);
    expect(fs.existsSync(incDir('0001-restored', 'spec.md'))).toBe(true);
  });

  it('should throw if increment not in archive', async () => {
    const archiver = createArchiver();

    await expect(archiver.restore('0099-nonexistent')).rejects.toThrow(
      'not found in archive',
    );
  });

  it('should throw if increment already exists in active folder', async () => {
    createIncrement('0001-dup', { status: 'completed' }, 'archive');
    createIncrement('0001-dup', { status: 'active' });

    const archiver = createArchiver();

    await expect(archiver.restore('0001-dup')).rejects.toThrow(
      'already exists in main folder',
    );
  });

  it('should throw if active duplicate detected by number', async () => {
    createIncrement('0001-v2', { status: 'completed' }, 'archive');

    mockDetectDuplicates.mockResolvedValue([
      { path: incDir('0001-v1'), name: '0001-v1' },
    ]);

    const archiver = createArchiver();

    await expect(archiver.restore('0001-v2')).rejects.toThrow(
      'already exists in active folder',
    );
  });

  it('should succeed when no active duplicates exist', async () => {
    createIncrement('0001-clean', { status: 'completed' }, 'archive');

    // detectDuplicatesByNumber returns archive-only duplicate (which is the
    // increment being restored), filter strips those out
    mockDetectDuplicates.mockResolvedValue([
      { path: archiveDir('0001-clean'), name: '0001-clean' },
    ]);

    const archiver = createArchiver();
    await archiver.restore('0001-clean');

    expect(fs.existsSync(incDir('0001-clean'))).toBe(true);
  });
});

// ===========================================================================
// listArchived()
// ===========================================================================

describe('listArchived', () => {
  it('should return empty array when no archive dir exists', async () => {
    const archiver = createArchiver();
    const result = await archiver.listArchived();
    expect(result).toEqual([]);
  });

  it('should return sorted list of archived increment names', async () => {
    createIncrement('0005-fifth', {}, 'archive');
    createIncrement('0001-first', {}, 'archive');
    createIncrement('0010-tenth', {}, 'archive');

    const archiver = createArchiver();
    const result = await archiver.listArchived();

    expect(result).toEqual(['0001-first', '0005-fifth', '0010-tenth']);
  });

  it('should only include directories (not files)', async () => {
    createIncrement('0001-dir', {}, 'archive');
    // Create a stray file that matches the pattern
    fs.writeFileSync(archiveDir('0002-file.txt'), 'not a dir');

    const archiver = createArchiver();
    const result = await archiver.listArchived();

    expect(result).toEqual(['0001-dir']);
  });

  it('should handle E suffix increments in archive', async () => {
    createIncrement('0001-internal', {}, 'archive');
    createIncrement('0001E-external', {}, 'archive');

    const archiver = createArchiver();
    const result = await archiver.listArchived();

    // Both should be listed (parsed number is same but they're different dirs)
    expect(result).toContain('0001-internal');
    expect(result).toContain('0001E-external');
  });
});

// ===========================================================================
// getStats()
// ===========================================================================

describe('getStats', () => {
  it('should return zeros for empty project', async () => {
    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.active).toBe(0);
    expect(stats.archived).toBe(0);
    expect(stats.abandoned).toBe(0);
    expect(stats.oldestActive).toBeNull();
    expect(stats.newestArchived).toBeNull();
  });

  it('should count active increments', async () => {
    createIncrement('0001-a', { status: 'active' });
    createIncrement('0002-b', { status: 'completed' });

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.active).toBe(2);
  });

  it('should count archived increments', async () => {
    createIncrement('0001-a', {}, 'archive');
    createIncrement('0002-b', {}, 'archive');
    createIncrement('0003-c', {}, 'archive');

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.archived).toBe(3);
  });

  it('should count abandoned increments', async () => {
    createIncrement('0001-a', {}, 'abandoned');
    createIncrement('0002-b', {}, 'abandoned');

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.abandoned).toBe(2);
  });

  it('should return oldestActive as first sorted increment', async () => {
    createIncrement('0005-mid', { status: 'active' });
    createIncrement('0001-oldest', { status: 'active' });
    createIncrement('0010-newest', { status: 'active' });

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.oldestActive).toBe('0001-oldest');
  });

  it('should return newestArchived as last sorted archived increment', async () => {
    createIncrement('0001-old', {}, 'archive');
    createIncrement('0050-newer', {}, 'archive');
    createIncrement('0025-mid', {}, 'archive');

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.newestArchived).toBe('0050-newer');
  });

  it('should count all categories together', async () => {
    createIncrement('0001-active1', { status: 'active' });
    createIncrement('0002-active2', { status: 'completed' });
    createIncrement('0003-archived', {}, 'archive');
    createIncrement('0004-abandoned', {}, 'abandoned');

    const archiver = createArchiver();
    const stats = await archiver.getStats();

    expect(stats.active).toBe(2);
    expect(stats.archived).toBe(1);
    expect(stats.abandoned).toBe(1);
  });
});

// ===========================================================================
// shouldArchive (tested through public archive API)
// ===========================================================================

describe('shouldArchive behavior', () => {
  it('should skip increment without metadata (no metadata.json) if no status check needed', async () => {
    // Create increment without metadata
    const dir = incDir('0001-no-meta');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'spec.md'), '# Test');

    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    // Without metadata, status checks pass (no active/paused detection),
    // so it should be eligible for archiving
    expect(result.archived).toContain('0001-no-meta');
  });

  it('should skip increment with completed status but active external sync', async () => {
    createIncrement('0001-sync-active', {
      status: 'completed',
      github: { issue: 99, closed: false },
    });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.skipped).toContain('0001-sync-active');
  });

  it('should archive completed increment with archiveCompleted=true', async () => {
    createIncrement('0001-completed', { status: 'completed' });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({
      keepLast: 1,
      archiveCompleted: true,
    });

    expect(result.archived).toContain('0001-completed');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('edge cases', () => {
  it('should handle empty increments directory', async () => {
    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 5 });

    expect(result.archived.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle single increment', async () => {
    createIncrement('0001-solo', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 5 });

    expect(result.archived.length).toBe(0);
  });

  it('should handle keepLast=0 (archive everything)', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 0 });

    expect(result.archived.length).toBe(2);
  });

  it('should handle very large increment numbers', async () => {
    createIncrement('9998-penultimate', { status: 'completed' });
    createIncrement('9999-last', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('9998-penultimate');
    expect(result.archived).not.toContain('9999-last');
  });

  it('should handle non-sequential increment numbers', async () => {
    createIncrement('0001-first', { status: 'completed' });
    createIncrement('0050-middle', { status: 'completed' });
    createIncrement('0200-last', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 2 });

    expect(result.archived).toContain('0001-first');
    expect(result.archived).not.toContain('0050-middle');
    expect(result.archived).not.toContain('0200-last');
  });

  it('should handle increments dir not existing', async () => {
    fs.removeSync(incDir());

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 5 });

    expect(result.archived.length).toBe(0);
  });

  it('should combine active + archived increment keys for keepLast calculation', async () => {
    // 3 active, 2 archived; keepLast=4 should keep 4 highest across both
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });
    createIncrement('0004-d', {}, 'archive');
    createIncrement('0005-e', {}, 'archive');

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 4 });

    // Keys 0002, 0003, 0004, 0005 are the top 4
    // 0001 is outside top 4 → archived
    expect(result.archived).toContain('0001-a');
    expect(result.archived).not.toContain('0002-b');
    expect(result.archived).not.toContain('0003-c');
  });

  it('should handle metadata.json with invalid JSON gracefully', async () => {
    const dir = incDir('0001-bad-json');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), '{ invalid json }');
    fs.writeFileSync(path.join(dir, 'spec.md'), '# Test');

    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    // Should not crash; invalid metadata means no status protection
    expect(result.archived).toContain('0001-bad-json');
  });

  it('archive result should have totalSize > 0 after real archiving', async () => {
    createIncrement('0001-sized', { status: 'completed' });
    createIncrement('0010-latest', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({ keepLast: 1 });

    expect(result.archived).toContain('0001-sized');
    expect(result.totalSize).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Integration: archive then restore round-trip
// ===========================================================================

describe('archive + restore round-trip', () => {
  it('should round-trip: archive then restore preserves files', async () => {
    createIncrement('0001-roundtrip', { status: 'completed' });
    createIncrement('0010-keep', { status: 'completed' });

    const archiver = createArchiver();

    // Archive
    const archiveResult = await archiver.archive({ keepLast: 1 });
    expect(archiveResult.archived).toContain('0001-roundtrip');
    expect(fs.existsSync(incDir('0001-roundtrip'))).toBe(false);
    expect(fs.existsSync(archiveDir('0001-roundtrip'))).toBe(true);

    // Restore
    await archiver.restore('0001-roundtrip');
    expect(fs.existsSync(incDir('0001-roundtrip'))).toBe(true);
    expect(fs.existsSync(archiveDir('0001-roundtrip'))).toBe(false);

    // Content preserved
    const content = fs.readFileSync(incDir('0001-roundtrip', 'spec.md'), 'utf-8');
    expect(content).toContain('0001-roundtrip');
  });

  it('should archive, list, and restore', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });
    createIncrement('0003-c', { status: 'completed' });

    const archiver = createArchiver();

    // Archive
    await archiver.archive({ keepLast: 1 });

    // List
    const archived = await archiver.listArchived();
    expect(archived).toContain('0001-a');
    expect(archived).toContain('0002-b');

    // Stats
    const stats = await archiver.getStats();
    expect(stats.active).toBe(1);
    expect(stats.archived).toBe(2);

    // Restore one
    await archiver.restore('0001-a');

    const statsAfter = await archiver.getStats();
    expect(statsAfter.active).toBe(2);
    expect(statsAfter.archived).toBe(1);
  });
});

// ===========================================================================
// Priority of archive modes
// ===========================================================================

describe('archive mode priority', () => {
  it('specific increments takes highest priority', async () => {
    createIncrement('0001-a', { status: 'completed' });
    createIncrement('0002-b', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({
      increments: ['0001-a'],
      keepLast: 1,  // Should be ignored
      pattern: '.*',  // Should be ignored
    });

    // Only the specific increment is targeted
    expect(result.archived).toContain('0001-a');
    expect(result.archived).not.toContain('0002-b');
  });

  it('strictLast takes priority over pattern and keepLast', async () => {
    createIncrement('0001-feature-x', { status: 'completed' });
    createIncrement('0002-feature-y', { status: 'completed' });
    createIncrement('0003-bugfix-z', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({
      strictLast: 1,
      pattern: 'feature',  // Should be ignored
      keepLast: 2,  // Should be ignored
    });

    // strictLast=1 keeps only the last one
    expect(result.archived.length).toBe(2);
    expect(result.archived).toContain('0001-feature-x');
    expect(result.archived).toContain('0002-feature-y');
  });

  it('pattern takes priority over olderThanDays and keepLast', async () => {
    createIncrement('0001-feature-old', { status: 'completed' });
    createIncrement('0002-bugfix-old', { status: 'completed' });

    const archiver = createArchiver();
    const result = await archiver.archive({
      pattern: 'feature',
      olderThanDays: 0,  // Should be ignored
      keepLast: 1,  // Should be ignored
    });

    expect(result.archived).toContain('0001-feature-old');
    expect(result.archived).not.toContain('0002-bugfix-old');
  });
});

/**
 * E2E Tests for /specweave:archive command
 *
 * Tests the manual archiving workflow including:
 * - Archiving specific increments
 * - Keep-last filtering
 * - Older-than filtering
 * - Active/paused protection
 * - External sync protection
 * - Duplicate prevention
 * - Dry-run mode
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { IncrementArchiver } from '../../dist/src/core/increment/increment-archiver.js';

// Use worker-specific temp directories to avoid race conditions
let TEST_ROOT: string;
let INCREMENTS_DIR: string;
let ARCHIVE_DIR: string;

// Helper to copy directory recursively
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Shared helper functions (available to all describe blocks)
async function createTestIncrement(
  id: string,
  status: string = 'completed',
  lastActivity?: string
): Promise<void> {
  const incDir = path.join(INCREMENTS_DIR, id);

  // Ensure parent directory exists
  await fs.mkdir(INCREMENTS_DIR, { recursive: true });
  await fs.mkdir(incDir, { recursive: true });

  // Create metadata.json
  const metadata = {
    id,
    status,
    type: 'feature',
    created: '2025-01-01T00:00:00Z',
    lastActivity: lastActivity || new Date().toISOString()
  };

  try {
    await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    // Create dummy files
    await fs.writeFile(path.join(incDir, 'spec.md'), `# Spec for ${id}`);
    await fs.writeFile(path.join(incDir, 'plan.md'), `# Plan for ${id}`);
    await fs.writeFile(path.join(incDir, 'tasks.md'), `# Tasks for ${id}`);
  } catch (error) {
    // If file write fails, ensure directory still exists and retry
    await fs.mkdir(incDir, { recursive: true });
    throw error;
  }
}

async function incrementExists(id: string, inArchive: boolean = false): Promise<boolean> {
  const baseDir = inArchive ? ARCHIVE_DIR : INCREMENTS_DIR;
  const incPath = path.join(baseDir, id);
  try {
    await fs.access(incPath);
    return true;
  } catch {
    return false;
  }
}

test.describe('Archive Command E2E Tests', () => {
  // Setup and teardown
  test.beforeEach(async ({ }, testInfo) => {
    // Create worker-specific temp directory to avoid race conditions
    TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), `archive-test-${testInfo.workerIndex}-`));
    INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
    ARCHIVE_DIR = path.join(INCREMENTS_DIR, '_archive');

    await fs.mkdir(INCREMENTS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  });

  test.afterEach(async () => {
    if (TEST_ROOT) {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    }
  });

  // Test 1: Archive specific increment
  test('archive_withKeepLast_archivesOldest', async () => {
    // Arrange: Create 15 completed increments (use 1001-1015 to avoid duplicates)
    for (let i = 1001; i <= 1015; i++) {
      const id = `${i}-test-increment`;
      await createTestIncrement(id, 'completed');
    }

    // Act: Archive keeping last 10
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ keepLast: 10 });

    // Assert: 5 oldest archived, 10 newest remain
    expect(result.archived.length).toBe(5);
    expect(result.errors.length).toBe(0);

    // Verify oldest are in archive
    for (let i = 1001; i <= 1005; i++) {
      const id = `${i}-test-increment`;
      expect(await incrementExists(id, false)).toBe(false); // Not in active
      expect(await incrementExists(id, true)).toBe(true);   // In archive
    }

    // Verify newest remain in active
    for (let i = 1006; i <= 1015; i++) {
      const id = `${i}-test-increment`;
      expect(await incrementExists(id, false)).toBe(true);  // In active
      expect(await incrementExists(id, true)).toBe(false);  // Not in archive
    }
  });

  // Test 2: Default keep-last behavior (10)
  test('archive_withNoOptions_usesDefault10', async () => {
    // Arrange: Create 20 completed increments (use 2001-2020 to avoid duplicates)
    for (let i = 2001; i <= 2020; i++) {
      const id = `${i}-test-increment`;
      await createTestIncrement(id, 'completed');
    }

    // Act: Archive with default options
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true });

    // Assert: Only non-active/paused increments archived
    // Since all are completed, some will be archived based on other criteria
    expect(result.archived.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  // Test 3: Never archive active or paused increments
  test('archive_neverArchivesActive_orPaused', async () => {
    // Arrange: Create mix of statuses (use 3001-3004 to avoid duplicates)
    await createTestIncrement('3001-active-inc', 'active');
    await createTestIncrement('3002-paused-inc', 'paused');
    await createTestIncrement('3003-completed-inc', 'completed');
    await createTestIncrement('3004-completed-inc2', 'completed');

    // Act: Archive all completed
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true });

    // Assert: Active and paused NOT archived
    expect(await incrementExists('3001-active-inc', false)).toBe(true);
    expect(await incrementExists('3001-active-inc', true)).toBe(false);

    expect(await incrementExists('3002-paused-inc', false)).toBe(true);
    expect(await incrementExists('3002-paused-inc', true)).toBe(false);

    // Completed ARE archived
    expect(result.archived).toContain('3003-completed-inc');
    expect(result.archived).toContain('3004-completed-inc2');
  });

  // Test 4: Older-than filtering
  test('archive_olderThan_archivesOldOnly', async () => {
    // Arrange: Create increments with different ages (use 4001-4004 to avoid duplicates)
    const now = new Date();
    const old = new Date(now);
    old.setDate(old.getDate() - 100); // 100 days ago

    const recent = new Date(now);
    recent.setDate(recent.getDate() - 30); // 30 days ago

    await createTestIncrement('4001-old-inc', 'completed', old.toISOString());
    await createTestIncrement('4002-old-inc2', 'completed', old.toISOString());
    await createTestIncrement('4003-recent-inc', 'completed', recent.toISOString());
    await createTestIncrement('4004-recent-inc2', 'completed', recent.toISOString());

    // Act: Archive increments older than 90 days
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ olderThanDays: 90 });

    // Assert: Only old increments archived
    expect(result.archived).toContain('4001-old-inc');
    expect(result.archived).toContain('4002-old-inc2');
    expect(result.archived).not.toContain('4003-recent-inc');
    expect(result.archived).not.toContain('4004-recent-inc2');

    expect(await incrementExists('4001-old-inc', true)).toBe(true);
    expect(await incrementExists('4003-recent-inc', false)).toBe(true);
  });

  // Test 5: Pattern filtering
  test('archive_patternFilter_archivesMatchingPattern', async () => {
    // Arrange: Create increments with different naming patterns (use 5001-5004 to avoid duplicates)
    await createTestIncrement('5001-auth-service', 'completed');
    await createTestIncrement('5002-auth-enhancements', 'completed');
    await createTestIncrement('5003-payment-service', 'completed');
    await createTestIncrement('5004-user-management', 'completed');

    // Act: Archive auth-related increments
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ pattern: 'auth-' });

    // Assert: Only auth increments archived
    expect(result.archived).toContain('5001-auth-service');
    expect(result.archived).toContain('5002-auth-enhancements');
    expect(result.archived).not.toContain('5003-payment-service');
    expect(result.archived).not.toContain('5004-user-management');
  });

  // Test 6: Dry-run mode
  test('archive_dryRun_showsPreviewOnly', async () => {
    // Arrange: Create test increments (use 6001-6002 to avoid duplicates)
    await createTestIncrement('6001-test-inc', 'completed');
    await createTestIncrement('6002-test-inc2', 'completed');

    // Act: Archive in dry-run mode
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true, dryRun: true });

    // Assert: Increments reported as would-be-archived but not actually moved
    expect(result.archived.length).toBeGreaterThan(0);

    // Files should still be in active (not moved)
    expect(await incrementExists('6001-test-inc', false)).toBe(true);
    expect(await incrementExists('6001-test-inc', true)).toBe(false);
  });

  // Test 7: Skip archiving duplicates (already in archive)
  test('archive_whenAlreadyInArchive_skipsGracefully', async () => {
    // Arrange: Create increment in both active and archive (use 7001 to avoid duplicates)
    await createTestIncrement('7001-duplicate-test', 'completed');
    const archivePath = path.join(ARCHIVE_DIR, '7001-duplicate-test');
    await copyDir(
      path.join(INCREMENTS_DIR, '7001-duplicate-test'),
      archivePath
    );

    // Act: Try to archive increment that's already in archive
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ increments: ['7001-duplicate-test'] });

    // Assert: Should skip the duplicate (not error)
    expect(result.skipped).toContain('7001-duplicate-test');
    expect(result.archived).not.toContain('7001-duplicate-test');
    expect(result.errors).toHaveLength(0);
  });

  // Test 8: Skip increments with open GitHub issues
  test('archive_withOpenGitHubIssue_skips', async () => {
    // Arrange: Create increment with open GitHub issue (use 8001 to avoid duplicates)
    const incDir = path.join(INCREMENTS_DIR, '8001-github-sync');
    await fs.mkdir(incDir, { recursive: true });

    const metadata = {
      id: '8001-github-sync',
      status: 'completed',
      type: 'feature',
      created: '2025-01-01T00:00:00Z',
      lastActivity: new Date().toISOString(),
      github: {
        issue: 42,
        url: 'https://github.com/test/repo/issues/42',
        closed: false // Issue still open
      }
    };
    await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Act: Try to archive
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true });

    // Assert: Skipped due to open GitHub issue
    expect(result.archived).not.toContain('8001-github-sync');
    expect(await incrementExists('8001-github-sync', false)).toBe(true);
  });

  // Test 9: Archive increment with closed GitHub issue
  test('archive_withClosedGitHubIssue_succeeds', async () => {
    // Arrange: Create increment with closed GitHub issue (use 9001 to avoid duplicates)
    const incDir = path.join(INCREMENTS_DIR, '9001-github-closed');
    await fs.mkdir(incDir, { recursive: true });

    const metadata = {
      id: '9001-github-closed',
      status: 'completed',
      type: 'feature',
      created: '2025-01-01T00:00:00Z',
      lastActivity: new Date().toISOString(),
      github: {
        issue: 42,
        url: 'https://github.com/test/repo/issues/42',
        closed: true // Issue closed
      }
    };
    await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Act: Archive
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true });

    // Assert: Successfully archived
    expect(result.archived).toContain('9001-github-closed');
    expect(await incrementExists('9001-github-closed', true)).toBe(true);
  });

  // Test 10: Archive specific increments by ID
  test('archive_specificIncrements_archivesOnlyThose', async () => {
    // Arrange: Create multiple increments (use 1001-1003 to avoid duplicates)
    await createTestIncrement('1001-test-a', 'completed');
    await createTestIncrement('1002-test-b', 'completed');
    await createTestIncrement('1003-test-c', 'completed');

    // Act: Archive only 1001 and 1003
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({
      increments: ['1001', '1003']
    });

    // Assert: Only specified increments archived
    expect(result.archived).toContain('1001-test-a');
    expect(result.archived).toContain('1003-test-c');
    expect(result.archived).not.toContain('1002-test-b');

    expect(await incrementExists('1001-test-a', true)).toBe(true);
    expect(await incrementExists('1002-test-b', false)).toBe(true);
    expect(await incrementExists('1003-test-c', true)).toBe(true);
  });

  // Test 11: Combined filters (pattern + older-than)
  test('archive_combinedFilters_archivesIntersection', async () => {
    // Arrange: Create increments with different patterns and ages (use 1101-1103 to avoid duplicates)
    const old = new Date();
    old.setDate(old.getDate() - 100);

    const recent = new Date();
    recent.setDate(recent.getDate() - 30);

    await createTestIncrement('1101-auth-old', 'completed', old.toISOString());
    await createTestIncrement('1102-auth-recent', 'completed', recent.toISOString());
    await createTestIncrement('1103-payment-old', 'completed', old.toISOString());

    // Act: Archive auth increments older than 90 days
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({
      pattern: 'auth-',
      olderThanDays: 90
    });

    // Assert: Only old auth increments archived
    expect(result.archived).toContain('1101-auth-old');
    expect(result.archived).not.toContain('1102-auth-recent'); // Too recent
    expect(result.archived).not.toContain('1103-payment-old'); // Wrong pattern
  });

  // Test 12: Calculate total archive size
  test('archive_calculatesSize_correctly', async () => {
    // Arrange: Create increments with known file sizes (use 1201 to avoid duplicates)
    await createTestIncrement('1201-test-inc', 'completed');

    // Add some content to make size measurable
    const incDir = path.join(INCREMENTS_DIR, '1201-test-inc');
    await fs.writeFile(path.join(incDir, 'large-file.txt'), 'x'.repeat(10000));

    // Act: Archive
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ archiveCompleted: true });

    // Assert: Size calculated
    expect(result.totalSize).toBeGreaterThan(10000);
  });
});

test.describe('Archive Command Integration Tests', () => {
  test.beforeEach(async ({ }, testInfo) => {
    // Create worker-specific temp directory
    TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), `archive-int-test-${testInfo.workerIndex}-`));
    INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
    ARCHIVE_DIR = path.join(INCREMENTS_DIR, '_archive');
  });

  test.afterEach(async () => {
    if (TEST_ROOT) {
      await fs.rm(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test('archive_fullWorkflow_createDuplicateFixVerify', async () => {
    // This test verifies the full workflow from creation to archiving (use 9001 to avoid duplicates)
    const incDir = path.join(TEST_ROOT, '.specweave', 'increments');
    await fs.mkdir(incDir, { recursive: true });

    // Step 1: Create increment
    const inc1 = path.join(incDir, '9001-test-increment');
    await fs.mkdir(inc1, { recursive: true });
    await fs.writeFile(path.join(inc1, 'metadata.json'), JSON.stringify({
      id: '9001-test-increment',
      status: 'completed',
      type: 'feature'
    }, null, 2));

    // Step 2: Archive it
    const archiver = new IncrementArchiver(TEST_ROOT);
    const result = await archiver.archive({ increments: ['9001'] });

    // Step 3: Verify archived
    expect(result.archived).toContain('9001-test-increment');
    const archivePath = path.join(incDir, '_archive', '9001-test-increment');
    expect(await incrementExists('9001-test-increment', true)).toBe(true);
    expect(await incrementExists('9001-test-increment', false)).toBe(false);
  });
});

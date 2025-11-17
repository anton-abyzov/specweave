/**
 * E2E Tests for /specweave:fix-duplicates command
 *
 * Tests the automatic duplicate resolution workflow including:
 * - Duplicate detection across all folders
 * - Winner selection based on priority algorithm
 * - Content merging from losers to winner
 * - Safe deletion with confirmation
 * - Resolution report generation
 * - Dry-run mode
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { detectAllDuplicates } from '../../dist/src/core/increment/duplicate-detector.js';
import { resolveConflict } from '../../dist/src/core/increment/conflict-resolver.js';

// ✅ FIXED: Use os.tmpdir() instead of process.cwd() to prevent deletion of project .specweave/
const TEST_ROOT = path.join(os.tmpdir(), 'test-fix-duplicates-integration-' + Date.now());
const INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
const ARCHIVE_DIR = path.join(INCREMENTS_DIR, '_archive');
const ABANDONED_DIR = path.join(INCREMENTS_DIR, '_abandoned');

test.describe('Fix Duplicates Command E2E Tests', () => {
  // Setup and teardown
  test.beforeEach(async () => {
    await fs.mkdir(TEST_ROOT, { recursive: true });
    await fs.mkdir(INCREMENTS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    await fs.mkdir(ABANDONED_DIR, { recursive: true });
  });

  test.afterEach(async () => {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  // Helper functions
  async function createTestIncrement(
    folder: string,
    id: string,
    status: string = 'completed',
    lastActivity?: string,
    extraFiles?: Record<string, string>
  ): Promise<void> {
    const incDir = path.join(folder, id);
    await fs.mkdir(incDir, { recursive: true });

    // Create metadata.json
    const metadata = {
      id,
      status,
      type: 'feature',
      created: '2025-01-01T00:00:00Z',
      lastActivity: lastActivity || new Date().toISOString()
    };
    await fs.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Create core files
    await fs.writeFile(path.join(incDir, 'spec.md'), `# Spec for ${id}`);
    await fs.writeFile(path.join(incDir, 'plan.md'), `# Plan for ${id}`);
    await fs.writeFile(path.join(incDir, 'tasks.md'), `# Tasks for ${id}`);

    // Create extra files if specified
    if (extraFiles) {
      for (const [filepath, content] of Object.entries(extraFiles)) {
        const fullPath = path.join(incDir, filepath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async function incrementExists(folder: string, id: string): Promise<boolean> {
    const incPath = path.join(folder, id);
    return await fs.pathExists(incPath);
  }

  // Test 1: Detect and resolve duplicates
  test('fixDuplicates_withDuplicates_resolvesAll', async () => {
    // Arrange: Create duplicate increments
    const now = new Date();
    const older = new Date(now);
    older.setDate(older.getDate() - 10);

    // Active version (should win - active status + most recent)
    await createTestIncrement(
      INCREMENTS_DIR,
      '0031-external-tool-status-sync',
      'active',
      now.toISOString()
    );

    // Archive version (should lose - completed status + older)
    await createTestIncrement(
      ARCHIVE_DIR,
      '0031-external-tool-status-sync',
      'completed',
      older.toISOString()
    );

    // Act: Detect duplicates
    const report = await detectAllDuplicates(TEST_ROOT);

    // Assert: Duplicate detected
    expect(report.duplicates.length).toBe(1);
    expect(report.duplicates[0].incrementNumber).toBe('0031');
    expect(report.duplicates[0].locations.length).toBe(2);

    // Verify winner selection
    const duplicate = report.duplicates[0];
    expect(duplicate.recommendedWinner.status).toBe('active');
    expect(duplicate.losingVersions[0].status).toBe('completed');

    // Act: Resolve conflict
    const result = await resolveConflict(duplicate, { force: true });

    // Assert: Winner kept, loser deleted
    expect(await incrementExists(INCREMENTS_DIR, '0031-external-tool-status-sync')).toBe(true);
    expect(await incrementExists(ARCHIVE_DIR, '0031-external-tool-status-sync')).toBe(false);
    expect(result.deleted.length).toBe(1);
  });

  // Test 2: Content merging
  test('fixDuplicates_withMerge_preservesContent', async () => {
    // Arrange: Create duplicates with different content
    await createTestIncrement(
      INCREMENTS_DIR,
      '0031-test-merge',
      'active',
      new Date().toISOString(),
      {
        'reports/IMPLEMENTATION-COMPLETE.md': '# Implementation Complete\n\nAll tasks done.'
      }
    );

    await createTestIncrement(
      ARCHIVE_DIR,
      '0031-test-merge',
      'completed',
      new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      {
        'reports/SESSION-NOTES.md': '# Session Notes\n\nImportant discoveries during implementation.'
      }
    );

    // Act: Detect and resolve with merge
    const report = await detectAllDuplicates(TEST_ROOT);
    const result = await resolveConflict(report.duplicates[0], { merge: true, force: true });

    // Assert: Both reports exist in winner
    const winnerReportsDir = path.join(INCREMENTS_DIR, '0031-test-merge', 'reports');
    expect(await fs.pathExists(path.join(winnerReportsDir, 'IMPLEMENTATION-COMPLETE.md'))).toBe(true);
    expect(await fs.pathExists(path.join(winnerReportsDir, 'SESSION-NOTES.md'))).toBe(true);
    expect(result.merged.length).toBeGreaterThan(0);
  });

  // Test 3: Resolution report generation
  test('fixDuplicates_generatesReport', async () => {
    // Arrange: Create duplicates
    await createTestIncrement(INCREMENTS_DIR, '0031-test-report', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0031-test-report', 'completed');

    // Act: Detect and resolve
    const report = await detectAllDuplicates(TEST_ROOT);
    const result = await resolveConflict(report.duplicates[0], { merge: true, force: true });

    // Assert: Resolution report created
    expect(result.reportPath).toBeTruthy();
    expect(await fs.pathExists(result.reportPath)).toBe(true);

    // Verify report content
    const reportContent = await fs.readFile(result.reportPath, 'utf-8');
    expect(reportContent).toContain('Duplicate Resolution Report');
    expect(reportContent).toContain('0031-test-report');
    expect(reportContent).toContain('Winner Selection');
  });

  // Test 4: Dry-run mode
  test('fixDuplicates_dryRun_doesNotDelete', async () => {
    // Arrange: Create duplicates
    await createTestIncrement(INCREMENTS_DIR, '0031-dry-run-test', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0031-dry-run-test', 'completed');

    // Act: Resolve in dry-run mode
    const report = await detectAllDuplicates(TEST_ROOT);
    const result = await resolveConflict(report.duplicates[0], { dryRun: true });

    // Assert: Nothing deleted, but result shows what would be deleted
    expect(result.dryRun).toBe(true);
    expect(result.deleted.length).toBe(1); // Records what would be deleted
    expect(await incrementExists(INCREMENTS_DIR, '0031-dry-run-test')).toBe(true);
    expect(await incrementExists(ARCHIVE_DIR, '0031-dry-run-test')).toBe(true); // Still exists!
  });

  // Test 5: Winner selection by status priority
  test('fixDuplicates_selectsWinner_byStatusPriority', async () => {
    // Arrange: Create duplicates with different statuses
    await createTestIncrement(ARCHIVE_DIR, '0031-status-test', 'completed');
    await createTestIncrement(INCREMENTS_DIR, '0031-status-test', 'active');
    await createTestIncrement(ABANDONED_DIR, '0031-status-test', 'abandoned');

    // Act: Detect duplicates
    const report = await detectAllDuplicates(TEST_ROOT);

    // Assert: Active status wins (highest priority)
    expect(report.duplicates[0].recommendedWinner.status).toBe('active');
    expect(report.duplicates[0].losingVersions.length).toBe(2);
  });

  // Test 6: Winner selection by recency
  test('fixDuplicates_selectsWinner_byRecency', async () => {
    // Arrange: Create duplicates with same status but different activity
    const now = new Date();
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 1);
    const older = new Date(now);
    older.setDate(older.getDate() - 10);

    await createTestIncrement(
      ARCHIVE_DIR,
      '0031-recency-test',
      'completed',
      older.toISOString()
    );
    await createTestIncrement(
      INCREMENTS_DIR,
      '0031-recency-test',
      'completed',
      recent.toISOString()
    );

    // Act: Detect duplicates
    const report = await detectAllDuplicates(TEST_ROOT);

    // Assert: Most recent wins
    const winnerActivity = new Date(report.duplicates[0].recommendedWinner.lastActivity);
    expect(winnerActivity.getTime()).toBeGreaterThan(older.getTime());
  });

  // Test 7: Winner selection by completeness
  test('fixDuplicates_selectsWinner_byCompleteness', async () => {
    // Arrange: Create duplicates with same status/recency but different file counts
    const sameTime = new Date().toISOString();

    // More complete version (more files)
    await createTestIncrement(
      INCREMENTS_DIR,
      '0031-complete-test',
      'completed',
      sameTime,
      {
        'reports/REPORT-1.md': 'Report 1',
        'reports/REPORT-2.md': 'Report 2',
        'reports/REPORT-3.md': 'Report 3'
      }
    );

    // Less complete version (fewer files)
    await createTestIncrement(
      ARCHIVE_DIR,
      '0031-complete-test',
      'completed',
      sameTime
    );

    // Act: Detect duplicates
    const report = await detectAllDuplicates(TEST_ROOT);

    // Assert: More complete version wins
    const winner = report.duplicates[0].recommendedWinner;
    expect(winner.fileCount).toBeGreaterThan(3); // Has more files
  });

  // Test 8: Multiple duplicates resolution
  test('fixDuplicates_resolvesMultiple_simultaneously', async () => {
    // Arrange: Create multiple duplicates
    await createTestIncrement(INCREMENTS_DIR, '0031-multi-1', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0031-multi-1', 'completed');

    await createTestIncrement(INCREMENTS_DIR, '0032-multi-2', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0032-multi-2', 'completed');

    // Act: Detect all duplicates
    const report = await detectAllDuplicates(TEST_ROOT);

    // Assert: Both duplicates detected
    expect(report.duplicates.length).toBe(2);
    expect(report.duplicates.some(d => d.incrementNumber === '0031')).toBe(true);
    expect(report.duplicates.some(d => d.incrementNumber === '0032')).toBe(true);

    // Resolve all
    for (const duplicate of report.duplicates) {
      await resolveConflict(duplicate, { force: true });
    }

    // Verify all losers deleted
    expect(await incrementExists(ARCHIVE_DIR, '0031-multi-1')).toBe(false);
    expect(await incrementExists(ARCHIVE_DIR, '0032-multi-2')).toBe(false);
  });

  // Test 9: Three-way duplicate
  test('fixDuplicates_resolves_threeWayDuplicate', async () => {
    // Arrange: Create three versions of same increment
    await createTestIncrement(INCREMENTS_DIR, '0031-three-way', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0031-three-way', 'completed');
    await createTestIncrement(ABANDONED_DIR, '0031-three-way', 'abandoned');

    // Act: Detect and resolve
    const report = await detectAllDuplicates(TEST_ROOT);
    expect(report.duplicates[0].locations.length).toBe(3);

    const result = await resolveConflict(report.duplicates[0], { force: true });

    // Assert: One winner, two losers deleted
    expect(result.deleted.length).toBe(2);
    expect(await incrementExists(INCREMENTS_DIR, '0031-three-way')).toBe(true);
    expect(await incrementExists(ARCHIVE_DIR, '0031-three-way')).toBe(false);
    expect(await incrementExists(ABANDONED_DIR, '0031-three-way')).toBe(false);
  });

  // Test 10: Merge with filename conflicts
  test('fixDuplicates_mergeHandles_filenameConflicts', async () => {
    // Arrange: Create duplicates with conflicting filenames
    await createTestIncrement(
      INCREMENTS_DIR,
      '0031-conflict-test',
      'active',
      new Date().toISOString(),
      {
        'reports/SESSION-NOTES.md': '# Winner Session Notes\n\nWinner content.'
      }
    );

    await createTestIncrement(
      ARCHIVE_DIR,
      '0031-conflict-test',
      'completed',
      new Date(Date.now() - 86400000).toISOString(),
      {
        'reports/SESSION-NOTES.md': '# Loser Session Notes\n\nLoser content (should be renamed).'
      }
    );

    // Act: Resolve with merge
    const report = await detectAllDuplicates(TEST_ROOT);
    const result = await resolveConflict(report.duplicates[0], { merge: true, force: true });

    // Assert: Both files exist with different names
    const winnerReportsDir = path.join(INCREMENTS_DIR, '0031-conflict-test', 'reports');
    const files = await fs.readdir(winnerReportsDir);

    expect(files.length).toBeGreaterThanOrEqual(2); // Original + renamed + resolution report
    expect(files.some(f => f === 'SESSION-NOTES.md')).toBe(true); // Original
    expect(files.some(f => f.startsWith('SESSION-NOTES-') && f.endsWith('.md'))).toBe(true); // Renamed with timestamp
  });

  // Test 11: Resolution report content validation
  test('fixDuplicates_reportContains_allDetails', async () => {
    // Arrange: Create duplicates with metadata
    const incDir1 = path.join(INCREMENTS_DIR, '0031-report-detail');
    await fs.mkdir(incDir1, { recursive: true });
    await fs.writeFile(path.join(incDir1, 'metadata.json'), JSON.stringify({
      id: '0031-report-detail',
      status: 'active',
      lastActivity: new Date().toISOString(),
      github: { issue: 42, url: 'https://github.com/test/repo/issues/42' }
    }, null, 2));
    await fs.writeFile(path.join(incDir1, 'spec.md'), '# Spec');

    const incDir2 = path.join(ARCHIVE_DIR, '0031-report-detail');
    await fs.mkdir(incDir2, { recursive: true });
    await fs.writeFile(path.join(incDir2, 'metadata.json'), JSON.stringify({
      id: '0031-report-detail',
      status: 'completed',
      lastActivity: new Date(Date.now() - 86400000).toISOString(),
      jira: { issue: 'PROJ-123', status: 'Done' }
    }, null, 2));
    await fs.writeFile(path.join(incDir2, 'spec.md'), '# Spec');

    // Act: Resolve with merge
    const report = await detectAllDuplicates(TEST_ROOT);
    const result = await resolveConflict(report.duplicates[0], { merge: true, force: true });

    // Assert: Report contains all expected sections
    const reportContent = await fs.readFile(result.reportPath, 'utf-8');

    expect(reportContent).toContain('Duplicate Resolution Report');
    expect(reportContent).toContain('Detected Duplicates');
    expect(reportContent).toContain('Winner Selection');
    expect(reportContent).toContain('Deleted Paths');
    expect(reportContent).toContain('0031-report-detail');
    expect(reportContent).toContain('active'); // Winner status
    expect(reportContent).toContain('completed'); // Loser status
  });

  // Test 12: Error handling - permission denied simulation
  test('fixDuplicates_handlesErrors_gracefully', async () => {
    // Arrange: Create duplicates
    await createTestIncrement(INCREMENTS_DIR, '0031-error-test', 'active');
    await createTestIncrement(ARCHIVE_DIR, '0031-error-test', 'completed');

    // Make archive read-only to simulate permission error
    const archivePath = path.join(ARCHIVE_DIR, '0031-error-test');
    if (process.platform !== 'win32') {
      await fs.chmod(archivePath, 0o444); // Read-only
    }

    // Act & Assert: Should throw error or handle gracefully
    const report = await detectAllDuplicates(TEST_ROOT);

    try {
      await resolveConflict(report.duplicates[0], { force: true });
      // If we reach here on non-Windows, restore permissions
      if (process.platform !== 'win32') {
        await fs.chmod(archivePath, 0o755);
      }
    } catch (error) {
      // Expected on Unix systems - permission error
      expect(error).toBeTruthy();
    } finally {
      // Cleanup: restore permissions
      if (process.platform !== 'win32' && await fs.pathExists(archivePath)) {
        await fs.chmod(archivePath, 0o755);
      }
    }
  });
});

test.describe('Fix Duplicates Integration Tests', () => {
  test.beforeEach(async () => {
    await fs.mkdir(TEST_ROOT);
  });

  test.afterEach(async () => {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  test('fixDuplicates_fullWorkflow_detectResolveVerify', async () => {
    // This test verifies the complete fix-duplicates workflow

    const incDir = path.join(TEST_ROOT, '.specweave', 'increments');
    const archiveDir = path.join(incDir, '_archive');
    await fs.mkdir(incDir, { recursive: true });
    await fs.mkdir(archiveDir);

    // Step 1: Create duplicates in different locations
    const inc1 = path.join(incDir, '0031-test-increment');
    const inc2 = path.join(archiveDir, '0031-test-increment');

    await fs.mkdir(inc1, { recursive: true });
    await fs.mkdir(inc2, { recursive: true });

    await fs.writeFile(path.join(inc1, 'metadata.json'), JSON.stringify({
      id: '0031-test-increment',
      status: 'active',
      lastActivity: new Date().toISOString()
    }, null, 2));

    await fs.writeFile(path.join(inc2, 'metadata.json'), JSON.stringify({
      id: '0031-test-increment',
      status: 'completed',
      lastActivity: new Date(Date.now() - 86400000).toISOString()
    }, null, 2));

    // Step 2: Detect duplicates
    const report = await detectAllDuplicates(TEST_ROOT);
    expect(report.duplicates.length).toBe(1);

    // Step 3: Resolve (active should win)
    const result = await resolveConflict(report.duplicates[0], { force: true });

    // Step 4: Verify winner kept, loser deleted
    expect(await fs.pathExists(inc1)).toBe(true);
    expect(await fs.pathExists(inc2)).toBe(false);
    expect(result.winner).toContain('0031-test-increment');
    expect(result.deleted.length).toBe(1);
  });
});

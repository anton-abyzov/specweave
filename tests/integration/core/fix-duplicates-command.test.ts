/**
 * Duplicate increment detection: winner selection across active, archive and
 * abandoned folders (status priority, recency, completeness).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from '../../../src/utils/fs-native.js';
import * as os from 'os';
import { detectAllDuplicates } from '../../../dist/src/core/increment/duplicate-detector.js';

// ✅ FIXED: Use os.tmpdir() instead of process.cwd() to prevent deletion of project .specweave/
// ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
const TEST_ROOT = path.join(os.tmpdir(), `test-fix-duplicates-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const INCREMENTS_DIR = path.join(TEST_ROOT, '.specweave', 'increments');
const ARCHIVE_DIR = path.join(INCREMENTS_DIR, '_archive');
const ABANDONED_DIR = path.join(INCREMENTS_DIR, '_abandoned');

describe('Fix Duplicates Command E2E Tests', () => {
  // Setup and teardown
  beforeEach(async () => {
    await fs.mkdir(TEST_ROOT, { recursive: true });
    await fs.mkdir(INCREMENTS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    await fs.mkdir(ABANDONED_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.remove(TEST_ROOT);
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

  // Test 5: Winner selection by status priority
  it('fixDuplicates_selectsWinner_byStatusPriority', async () => {
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
  it('fixDuplicates_selectsWinner_byRecency', async () => {
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
  it('fixDuplicates_selectsWinner_byCompleteness', async () => {
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
});

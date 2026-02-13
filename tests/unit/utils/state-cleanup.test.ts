/**
 * Tests for state-cleanup utility (v1.0.254)
 *
 * Verifies orphaned state file removal logic:
 * - Only removes files matching known orphan patterns
 * - Only removes files older than 7 days
 * - Leaves recent files and non-matching files untouched
 * - Handles missing directories gracefully
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { cleanOrphanedStateFiles } from '../../../src/utils/state-cleanup.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sw-state-cleanup-'));
}

describe('cleanOrphanedStateFiles', () => {
  let stateDir: string;

  beforeEach(() => {
    stateDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it('should return 0 for non-existent directory', () => {
    expect(cleanOrphanedStateFiles('/tmp/nonexistent-dir-xyz')).toBe(0);
  });

  it('should return 0 for empty directory', () => {
    expect(cleanOrphanedStateFiles(stateDir)).toBe(0);
  });

  it('should remove .prev-status-* files older than 7 days', () => {
    const file = path.join(stateDir, '.prev-status-0001');
    fs.writeFileSync(file, 'active');
    // Set mtime to 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    fs.utimesSync(file, tenDaysAgo, tenDaysAgo);

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(1);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('should remove .github-sync-* files older than 7 days', () => {
    const file = path.join(stateDir, '.github-sync-0042');
    fs.writeFileSync(file, '');
    const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    fs.utimesSync(file, oldDate, oldDate);

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(1);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('should remove .living-specs-* files older than 7 days', () => {
    const file = path.join(stateDir, '.living-specs-done-0010');
    fs.writeFileSync(file, '');
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    fs.utimesSync(file, oldDate, oldDate);

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(1);
  });

  it('should NOT remove files newer than 7 days', () => {
    const file = path.join(stateDir, '.prev-status-0001');
    fs.writeFileSync(file, 'active');
    // File was just created — it's recent

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(0);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('should NOT remove files that do not match orphan patterns', () => {
    const file = path.join(stateDir, 'dashboard.json');
    fs.writeFileSync(file, '{}');
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(file, oldDate, oldDate);

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(0);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('should handle a mix of old and new orphan files', () => {
    // Old file — should be removed
    const oldFile = path.join(stateDir, '.prev-status-0001');
    fs.writeFileSync(oldFile, '');
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, oldDate, oldDate);

    // New file — should be kept
    const newFile = path.join(stateDir, '.prev-status-0002');
    fs.writeFileSync(newFile, '');

    // Non-matching old file — should be kept
    const otherFile = path.join(stateDir, 'skill-triggers-index.json');
    fs.writeFileSync(otherFile, '{}');
    fs.utimesSync(otherFile, oldDate, oldDate);

    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(1);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(newFile)).toBe(true);
    expect(fs.existsSync(otherFile)).toBe(true);
  });

  it('should not crash on directories matching orphan patterns', () => {
    const dir = path.join(stateDir, '.prev-status-subdir');
    fs.mkdirSync(dir);

    // Should not crash and should not count as removed
    const removed = cleanOrphanedStateFiles(stateDir);
    expect(removed).toBe(0);
  });
});

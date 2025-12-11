/**
 * Unit tests for Sync Metadata Management
 *
 * Tests cover:
 * - TC-103: Load sync metadata from file
 * - TC-104: Update sync metadata after import
 * - TC-105: Use "since-last-import" as time range (integration-level, partially tested here)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import {
  loadSyncMetadata,
  updateSyncMetadata,
  getLastImportTimestamp,
  hasPlatformBeenImported,
  clearPlatformMetadata,
  SYNC_METADATA_FILE,
  type SyncMetadata,
  type PlatformSyncMetadata,
} from '../../../src/sync/sync-metadata.js';

describe('Sync Metadata Management', () => {
  let testDir: string;
  let metadataPath: string;

  beforeEach(() => {
    // Create isolated test directory with .specweave/ folder
    // CRITICAL: .specweave/ must exist for updateSyncMetadata safety checks
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `sync-metadata-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
    metadataPath = path.join(testDir, SYNC_METADATA_FILE);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('TC-103: Load sync metadata from file', () => {
    it('should load existing sync metadata correctly', () => {
      // Arrange
      const expectedMetadata: SyncMetadata = {
        github: {
          lastImport: '2025-11-01T00:00:00Z',
          lastImportCount: 42,
          lastSyncResult: 'success',
        },
        jira: {
          lastImport: '2025-11-05T12:30:00Z',
          lastImportCount: 18,
          lastSyncResult: 'partial',
        },
        lastUpdated: '2025-11-05T12:30:00Z',
      };

      // Ensure directory exists
      fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
      fs.writeFileSync(metadataPath, JSON.stringify(expectedMetadata, null, 2), 'utf-8');

      // Act
      const actualMetadata = loadSyncMetadata(testDir);

      // Assert
      expect(actualMetadata).toEqual(expectedMetadata);
      expect(actualMetadata.github?.lastImport).toBe('2025-11-01T00:00:00Z');
      expect(actualMetadata.github?.lastImportCount).toBe(42);
      expect(actualMetadata.jira?.lastSyncResult).toBe('partial');
    });

    it('should return empty object when metadata file does not exist', () => {
      // Act
      const metadata = loadSyncMetadata(testDir);

      // Assert
      expect(metadata).toEqual({});
    });

    it('should throw error when metadata file is corrupted', () => {
      // Arrange
      fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
      fs.writeFileSync(metadataPath, 'invalid json {', 'utf-8');

      // Act & Assert
      expect(() => loadSyncMetadata(testDir)).toThrow('Failed to load sync metadata');
    });
  });

  describe('TC-104: Update sync metadata after import', () => {
    it('should update GitHub sync metadata correctly', () => {
      // Arrange
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:30:00Z',
        lastImportCount: 30,
        lastSyncResult: 'success',
      };

      // Act
      updateSyncMetadata(testDir, 'github', platformMetadata);

      // Assert
      const loadedMetadata = loadSyncMetadata(testDir);
      expect(loadedMetadata.github).toBeDefined();
      expect(loadedMetadata.github?.lastImport).toBe('2025-11-19T10:30:00Z');
      expect(loadedMetadata.github?.lastImportCount).toBe(30);
      expect(loadedMetadata.github?.lastSyncResult).toBe('success');
      expect(loadedMetadata.lastUpdated).toBeDefined();
    });

    it('should update multiple platforms independently', () => {
      // Arrange
      const githubMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:00:00Z',
        lastImportCount: 30,
        lastSyncResult: 'success',
      };

      const jiraMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T11:00:00Z',
        lastImportCount: 12,
        lastSyncResult: 'success',
      };

      // Act
      updateSyncMetadata(testDir, 'github', githubMetadata);
      updateSyncMetadata(testDir, 'jira', jiraMetadata);

      // Assert
      const loadedMetadata = loadSyncMetadata(testDir);
      expect(loadedMetadata.github?.lastImportCount).toBe(30);
      expect(loadedMetadata.jira?.lastImportCount).toBe(12);
    });

    it('should preserve existing platform data when updating another platform', () => {
      // Arrange
      const githubMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:00:00Z',
        lastImportCount: 30,
      };

      const adoMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T12:00:00Z',
        lastImportCount: 15,
      };

      // Act
      updateSyncMetadata(testDir, 'github', githubMetadata);
      updateSyncMetadata(testDir, 'ado', adoMetadata);

      // Assert
      const loadedMetadata = loadSyncMetadata(testDir);
      expect(loadedMetadata.github?.lastImportCount).toBe(30);
      expect(loadedMetadata.ado?.lastImportCount).toBe(15);
    });

    it('should fail if .specweave/ does not exist (safety check)', () => {
      // Arrange - create directory WITHOUT .specweave/ folder
      const deepTestDir = path.join(testDir, 'nested', 'deep', 'path');
      fs.mkdirSync(deepTestDir, { recursive: true });
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:30:00Z',
        lastImportCount: 5,
      };

      // Act & Assert - should fail because .specweave/ doesn't exist
      expect(() => updateSyncMetadata(deepTestDir, 'github', platformMetadata))
        .toThrow('SAFETY CHECK FAILED');
    });

    it('should succeed when .specweave/ exists in nested path', () => {
      // Arrange - create directory WITH .specweave/ folder
      const deepTestDir = path.join(testDir, 'nested', 'deep', 'path');
      fs.mkdirSync(path.join(deepTestDir, '.specweave'), { recursive: true });
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:30:00Z',
        lastImportCount: 5,
      };

      // Act
      updateSyncMetadata(deepTestDir, 'github', platformMetadata);

      // Assert
      expect(fs.existsSync(path.join(deepTestDir, SYNC_METADATA_FILE))).toBe(true);
      const loadedMetadata = loadSyncMetadata(deepTestDir);
      expect(loadedMetadata.github?.lastImportCount).toBe(5);
    });
  });

  describe('getLastImportTimestamp', () => {
    it('should return last import timestamp for platform', () => {
      // Arrange
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:30:00Z',
        lastImportCount: 30,
      };
      updateSyncMetadata(testDir, 'github', platformMetadata);

      // Act
      const timestamp = getLastImportTimestamp(testDir, 'github');

      // Assert
      expect(timestamp).toBe('2025-11-19T10:30:00Z');
    });

    it('should return undefined for platform that has never been imported', () => {
      // Act
      const timestamp = getLastImportTimestamp(testDir, 'jira');

      // Assert
      expect(timestamp).toBeUndefined();
    });
  });

  describe('hasPlatformBeenImported', () => {
    it('should return true for platform that has been imported', () => {
      // Arrange
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: '2025-11-19T10:30:00Z',
        lastImportCount: 30,
      };
      updateSyncMetadata(testDir, 'github', platformMetadata);

      // Act
      const hasBeenImported = hasPlatformBeenImported(testDir, 'github');

      // Assert
      expect(hasBeenImported).toBe(true);
    });

    it('should return false for platform that has never been imported', () => {
      // Act
      const hasBeenImported = hasPlatformBeenImported(testDir, 'ado');

      // Assert
      expect(hasBeenImported).toBe(false);
    });
  });

  describe('clearPlatformMetadata', () => {
    it('should clear metadata for specific platform', () => {
      // Arrange
      updateSyncMetadata(testDir, 'github', {
        lastImport: '2025-11-19T10:00:00Z',
        lastImportCount: 30,
      });
      updateSyncMetadata(testDir, 'jira', {
        lastImport: '2025-11-19T11:00:00Z',
        lastImportCount: 12,
      });

      // Act
      clearPlatformMetadata(testDir, 'github');

      // Assert
      const loadedMetadata = loadSyncMetadata(testDir);
      expect(loadedMetadata.github).toBeUndefined();
      expect(loadedMetadata.jira).toBeDefined();
      expect(loadedMetadata.jira?.lastImportCount).toBe(12);
    });
  });

  describe('TC-105: Since-last-import time range support', () => {
    it('should store timestamp in format compatible with time range filtering', () => {
      // Arrange
      const now = new Date();
      const platformMetadata: PlatformSyncMetadata = {
        lastImport: now.toISOString(),
        lastImportCount: 25,
      };

      // Act
      updateSyncMetadata(testDir, 'github', platformMetadata);

      // Assert
      const timestamp = getLastImportTimestamp(testDir, 'github');
      expect(timestamp).toBeDefined();
      expect(() => new Date(timestamp!)).not.toThrow();

      const parsedDate = new Date(timestamp!);
      expect(parsedDate.getTime()).toBeCloseTo(now.getTime(), -3); // Within 1 second
    });

    it('should allow retrieval of last import timestamp for use in API filters', () => {
      // Arrange
      const lastImportTime = '2025-11-01T00:00:00Z';
      updateSyncMetadata(testDir, 'github', {
        lastImport: lastImportTime,
        lastImportCount: 100,
      });

      // Act
      const retrievedTimestamp = getLastImportTimestamp(testDir, 'github');

      // Assert
      expect(retrievedTimestamp).toBe(lastImportTime);

      // Verify it can be used for comparison
      const currentTime = new Date();
      const lastImportDate = new Date(retrievedTimestamp!);
      expect(currentTime.getTime()).toBeGreaterThan(lastImportDate.getTime());
    });
  });

  describe('Error handling', () => {
    it('should reject when .specweave is a file not a directory', () => {
      // Arrange
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir, { recursive: true });

      // Create a file where the directory should be
      const conflictPath = path.join(readOnlyDir, '.specweave');
      fs.writeFileSync(conflictPath, 'conflict', 'utf-8');

      // Act & Assert - should fail validation because .specweave is a file
      expect(() => {
        updateSyncMetadata(readOnlyDir, 'github', {
          lastImport: '2025-11-19T10:30:00Z',
          lastImportCount: 1,
        });
      }).toThrow('exists but is not a directory');
    });

    it('should reject when .specweave folder does not exist', () => {
      // Arrange
      const noSpecweaveDir = path.join(testDir, 'no-specweave');
      fs.mkdirSync(noSpecweaveDir, { recursive: true });

      // Act & Assert - should fail validation
      expect(() => {
        updateSyncMetadata(noSpecweaveDir, 'github', {
          lastImport: '2025-11-19T10:30:00Z',
          lastImportCount: 1,
        });
      }).toThrow('SAFETY CHECK FAILED');
    });
  });
});

/**
 * Unit tests for ImportState
 *
 * Tests save/load operations, TTL expiry, and error tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import {
  ImportState,
  saveImportState,
  loadImportState,
  deleteImportState,
  hasImportState,
} from '../../../../src/core/progress/import-state.js';

describe('ImportState', () => {
  let testDir: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = mkdtempSync(join(tmpdir(), 'import-state-test-'));
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('TC-027: Save Import State', () => {
    it('should save import state to disk', async () => {
      const state: ImportState = {
        total: 127,
        completed: 50,
        succeeded: 45,
        failed: 5,
        errors: [
          { id: 'PROJ-1', error: 'Network timeout', timestamp: Date.now() },
        ],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);

      const stateFilePath = join(testDir, '.specweave', 'cache', 'import-state.json');
      expect(existsSync(stateFilePath)).toBe(true);
    });

    it('should include all required fields in saved state', async () => {
      const state: ImportState = {
        total: 100,
        completed: 25,
        succeeded: 20,
        failed: 5,
        errors: [],
        timestamp: Date.now(),
        canceled: false,
        lastProcessedId: 'PROJ-25',
      };

      await saveImportState(state, testDir);

      const loaded = await loadImportState(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.total).toBe(100);
      expect(loaded!.completed).toBe(25);
      expect(loaded!.succeeded).toBe(20);
      expect(loaded!.failed).toBe(5);
      expect(loaded!.errors).toEqual([]);
      expect(loaded!.canceled).toBe(false);
      expect(loaded!.lastProcessedId).toBe('PROJ-25');
    });

    it('should save multiple errors in state', async () => {
      const state: ImportState = {
        total: 50,
        completed: 10,
        succeeded: 7,
        failed: 3,
        errors: [
          { id: 'PROJ-1', error: 'Network error', timestamp: Date.now() },
          { id: 'PROJ-5', error: 'Auth failed', timestamp: Date.now() },
          { id: 'PROJ-8', error: 'Timeout', timestamp: Date.now() },
        ],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);

      const loaded = await loadImportState(testDir);

      expect(loaded!.errors).toHaveLength(3);
      expect(loaded!.errors[0].id).toBe('PROJ-1');
      expect(loaded!.errors[1].id).toBe('PROJ-5');
      expect(loaded!.errors[2].id).toBe('PROJ-8');
    });

    it('should create cache directory if it does not exist', async () => {
      const cacheDir = join(testDir, '.specweave', 'cache');
      expect(existsSync(cacheDir)).toBe(false);

      const state: ImportState = {
        total: 10,
        completed: 5,
        succeeded: 5,
        failed: 0,
        errors: [],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);

      expect(existsSync(cacheDir)).toBe(true);
    });
  });

  describe('TC-028: Load Import State', () => {
    it('should load saved import state', async () => {
      const state: ImportState = {
        total: 200,
        completed: 75,
        succeeded: 70,
        failed: 5,
        errors: [],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);
      const loaded = await loadImportState(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.total).toBe(200);
      expect(loaded!.completed).toBe(75);
    });

    it('should return null if state file does not exist', async () => {
      const loaded = await loadImportState(testDir);

      expect(loaded).toBeNull();
    });

    it('should return null if state file has invalid JSON', async () => {
      const stateFilePath = join(testDir, '.specweave', 'cache', 'import-state.json');
      const { mkdirpSync } = await import('../../../../src/utils/fs-native.js');
      mkdirpSync(join(testDir, '.specweave', 'cache'));

      // Write invalid JSON
      const { writeFileSync } = await import('fs');
      writeFileSync(stateFilePath, 'invalid json {', 'utf-8');

      const loaded = await loadImportState(testDir);

      expect(loaded).toBeNull();
    });
  });

  describe('TC-029: State Expiry (24-Hour TTL)', () => {
    it('should return null for expired state (25 hours old)', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: now,
        canceled: false,
      };

      await saveImportState(state, testDir);

      // Advance time by 25 hours
      vi.setSystemTime(now + 25 * 60 * 60 * 1000);

      const loaded = await loadImportState(testDir);

      expect(loaded).toBeNull();

      vi.useRealTimers();
    });

    it('should load valid state within 24-hour TTL', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: now,
        canceled: false,
      };

      await saveImportState(state, testDir);

      // Advance time by 23 hours (within TTL)
      vi.setSystemTime(now + 23 * 60 * 60 * 1000);

      const loaded = await loadImportState(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.total).toBe(100);

      vi.useRealTimers();
    });

    it('should delete stale state file on expiry', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: now,
        canceled: false,
      };

      await saveImportState(state, testDir);

      const stateFilePath = join(testDir, '.specweave', 'cache', 'import-state.json');
      expect(existsSync(stateFilePath)).toBe(true);

      // Advance time by 25 hours
      vi.setSystemTime(now + 25 * 60 * 60 * 1000);

      await loadImportState(testDir);

      expect(existsSync(stateFilePath)).toBe(false);

      vi.useRealTimers();
    });

    it('should respect custom TTL', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: now,
        canceled: false,
      };

      await saveImportState(state, testDir);

      // Advance time by 2 hours
      vi.setSystemTime(now + 2 * 60 * 60 * 1000);

      // Load with 1-hour TTL (should be expired)
      const loaded = await loadImportState(testDir, 1 * 60 * 60 * 1000);

      expect(loaded).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Delete Import State', () => {
    it('should delete import state file', async () => {
      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);

      const stateFilePath = join(testDir, '.specweave', 'cache', 'import-state.json');
      expect(existsSync(stateFilePath)).toBe(true);

      await deleteImportState(testDir);

      expect(existsSync(stateFilePath)).toBe(false);
    });

    it('should not throw if state file does not exist', async () => {
      await expect(deleteImportState(testDir)).resolves.not.toThrow();
    });
  });

  describe('Has Import State', () => {
    it('should return true if state file exists', async () => {
      const state: ImportState = {
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        errors: [],
        timestamp: Date.now(),
        canceled: false,
      };

      await saveImportState(state, testDir);

      expect(hasImportState(testDir)).toBe(true);
    });

    it('should return false if state file does not exist', () => {
      expect(hasImportState(testDir)).toBe(false);
    });
  });
});

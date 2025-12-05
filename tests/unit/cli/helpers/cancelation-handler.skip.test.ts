/**
 * Unit Tests: CancelationHandler
 *
 * Tests graceful Ctrl+C handling with state persistence and resume capability
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  CancelationHandler,
  type CancelationState
} from '../../../../src/cli/helpers/cancelation-handler.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('CancelationHandler', () => {
  let testDir: string;
  let stateFile: string;

  beforeEach(async () => {
    // Create temp directory for test state files
    testDir = path.join(os.tmpdir(), `cancel-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    stateFile = path.join(testDir, 'import-state.json');
  });

  afterEach(async () => {
    // Cleanup temp directory
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('SIGINT Handler Registration', () => {
    it('should register SIGINT handler on construction', () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      // Check that handler is registered (indirectly via listenerCount)
      const listenerCount = process.listenerCount('SIGINT');
      expect(listenerCount).toBeGreaterThan(0);

      handler.dispose();
    });

    it('should detect SIGINT signal and set canceled flag', () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      expect(handler.shouldCancel()).toBe(false);

      // Simulate SIGINT
      process.emit('SIGINT', 'SIGINT');

      expect(handler.shouldCancel()).toBe(true);

      handler.dispose();
    });

    it('should execute cleanup callback on SIGINT', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const cleanupSpy = vi.fn().mockResolvedValue(undefined);
      handler.onCleanup(cleanupSpy);

      // Simulate SIGINT
      process.emit('SIGINT', 'SIGINT');

      // Wait for async cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      handler.dispose();
    });

    it('should unregister handler on dispose', () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const beforeCount = process.listenerCount('SIGINT');
      handler.dispose();
      const afterCount = process.listenerCount('SIGINT');

      expect(afterCount).toBeLessThan(beforeCount);
    });
  });

  describe('State Persistence', () => {
    it('should save state to file with atomic write', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const state: CancelationState = {
        operation: 'jira-import',
        provider: 'jira',
        domain: 'example.atlassian.net',
        timestamp: new Date().toISOString(),
        version: '1.0',
        total: 100,
        completed: 50,
        succeeded: 48,
        failed: 2,
        skipped: 0,
        remaining: [
          { key: 'PROJECT-51', name: 'Project 51' },
          { key: 'PROJECT-52', name: 'Project 52' }
        ],
        errors: [
          {
            projectKey: 'PROJECT-10',
            error: 'Permission denied',
            timestamp: new Date().toISOString()
          }
        ]
      };

      await handler.saveState(state);

      // Verify file exists
      expect(existsSync(stateFile)).toBe(true);

      // Verify content
      const content = await fs.readFile(stateFile, 'utf-8');
      const savedState = JSON.parse(content);

      expect(savedState.operation).toBe('jira-import');
      expect(savedState.completed).toBe(50);
      expect(savedState.succeeded).toBe(48);
      expect(savedState.failed).toBe(2);
      expect(savedState.remaining).toHaveLength(2);

      handler.dispose();
    });

    it('should load state from file', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const originalState: CancelationState = {
        operation: 'jira-import',
        provider: 'jira',
        timestamp: new Date().toISOString(),
        version: '1.0',
        total: 127,
        completed: 75,
        succeeded: 73,
        failed: 2,
        skipped: 0,
        remaining: [],
        errors: []
      };

      await handler.saveState(originalState);

      const loadedState = await handler.loadState();

      expect(loadedState).not.toBeNull();
      expect(loadedState!.operation).toBe('jira-import');
      expect(loadedState!.completed).toBe(75);
      expect(loadedState!.succeeded).toBe(73);

      handler.dispose();
    });

    it('should return null if state file does not exist', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const loadedState = await handler.loadState();

      expect(loadedState).toBeNull();

      handler.dispose();
    });

    it('should reject expired state (> 24 hours old)', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      // Create state from 25 hours ago
      const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      const expiredState: CancelationState = {
        operation: 'jira-import',
        provider: 'jira',
        timestamp: expiredTimestamp,
        version: '1.0',
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        skipped: 0,
        remaining: [],
        errors: []
      };

      await handler.saveState(expiredState);

      const loadedState = await handler.loadState();

      expect(loadedState).toBeNull(); // Expired state rejected
      expect(existsSync(stateFile)).toBe(false); // Deleted

      handler.dispose();
    });

    it('should accept fresh state (< 24 hours old)', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      // Create state from 1 hour ago
      const freshTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

      const freshState: CancelationState = {
        operation: 'jira-import',
        provider: 'jira',
        timestamp: freshTimestamp,
        version: '1.0',
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        skipped: 0,
        remaining: [],
        errors: []
      };

      await handler.saveState(freshState);

      const loadedState = await handler.loadState();

      expect(loadedState).not.toBeNull(); // Fresh state accepted
      expect(loadedState!.completed).toBe(50);

      handler.dispose();
    });

    it('should clear state file', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const state: CancelationState = {
        operation: 'jira-import',
        provider: 'jira',
        timestamp: new Date().toISOString(),
        version: '1.0',
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        skipped: 0,
        remaining: [],
        errors: []
      };

      await handler.saveState(state);
      expect(existsSync(stateFile)).toBe(true);

      await handler.clearState();
      expect(existsSync(stateFile)).toBe(false);

      handler.dispose();
    });
  });

  describe('Cleanup Callback', () => {
    it('should execute cleanup callback before state save', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      let callbackExecuted = false;
      handler.onCleanup(async () => {
        callbackExecuted = true;
      });

      process.emit('SIGINT', 'SIGINT');

      // Wait for async cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callbackExecuted).toBe(true);

      handler.dispose();
    });

    it('should handle cleanup callback errors gracefully', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      handler.onCleanup(async () => {
        throw new Error('Cleanup failed');
      });

      // Should not throw - errors are caught and logged
      expect(() => {
        process.emit('SIGINT', 'SIGINT');
      }).not.toThrow();

      handler.dispose();
    });
  });

  describe('State Validation', () => {
    it('should reject state with incompatible version', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      const incompatibleState = {
        operation: 'jira-import',
        provider: 'jira',
        timestamp: new Date().toISOString(),
        version: '2.0', // Incompatible version
        total: 100,
        completed: 50,
        succeeded: 50,
        failed: 0,
        skipped: 0,
        remaining: [],
        errors: []
      };

      await fs.writeFile(stateFile, JSON.stringify(incompatibleState), 'utf-8');

      const loadedState = await handler.loadState();

      expect(loadedState).toBeNull(); // Incompatible state rejected
      expect(existsSync(stateFile)).toBe(false); // Deleted

      handler.dispose();
    });

    it('should handle corrupted state file gracefully', async () => {
      const handler = new CancelationHandler({ stateFile, logger: silentLogger });

      // Write corrupted JSON
      await fs.writeFile(stateFile, '{ invalid json }', 'utf-8');

      const loadedState = await handler.loadState();

      expect(loadedState).toBeNull(); // Corrupted state rejected
      expect(existsSync(stateFile)).toBe(false); // Deleted

      handler.dispose();
    });
  });
});

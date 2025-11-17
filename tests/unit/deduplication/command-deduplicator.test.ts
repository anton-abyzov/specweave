import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: CommandDeduplicator
 *
 * Tests the global command deduplication system that prevents duplicate
 * command invocations within a configurable time window.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { CommandDeduplicator } from '../../../src/core/deduplication/command-deduplicator.js';

describe('CommandDeduplicator', () => {
  // ✅ SAFE: Use temp directory instead of project root .specweave/
  const testCachePath = path.join(os.tmpdir(), 'specweave-test-deduplicator', 'command-invocations.json');
  let deduplicator: CommandDeduplicator;

  beforeEach(async () => {
    // Create fresh deduplicator with short window for fast tests
    deduplicator = new CommandDeduplicator({
      windowMs: 500,           // 500ms window for fast tests
      cachePath: testCachePath,
      maxCacheSize: 100,
      cleanupIntervalMs: 1000,
      debug: false
    });

    // Clear cache before each test
    await deduplicator.clear();
  });

  afterEach(async () => {
    // ✅ SAFE: Cleanup temp directory (not project .specweave/)
    const testDir = path.dirname(testCachePath);
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Basic Duplicate Detection', () => {
    it('should detect duplicate command within time window', async () => {
      const command = '/specweave:do';
      const args = ['0031'];

      // First invocation - should NOT be duplicate
      const isDup1 = await deduplicator.checkDuplicate(command, args);
      expect(isDup1).toBe(false);

      // Record first invocation
      await deduplicator.recordInvocation(command, args);

      // Second invocation immediately - SHOULD be duplicate
      const isDup2 = await deduplicator.checkDuplicate(command, args);
      expect(isDup2).toBe(true);
    });

    it('should allow same command after time window expires', async () => {
      const command = '/specweave:do';
      const args = ['0031'];

      // First invocation
      await deduplicator.recordInvocation(command, args);

      // Check immediately - should be duplicate
      const isDup1 = await deduplicator.checkDuplicate(command, args);
      expect(isDup1).toBe(true);

      // Wait for window to expire (500ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check again - should NOT be duplicate anymore
      const isDup2 = await deduplicator.checkDuplicate(command, args);
      expect(isDup2).toBe(false);
    });

    it('should treat different arguments as different commands', async () => {
      const command = '/specweave:do';

      // Record with args ['0031']
      await deduplicator.recordInvocation(command, ['0031']);

      // Check with different args ['0032'] - should NOT be duplicate
      const isDup = await deduplicator.checkDuplicate(command, ['0032']);
      expect(isDup).toBe(false);
    });

    it('should treat different commands as different invocations', async () => {
      // Record /specweave:do
      await deduplicator.recordInvocation('/specweave:do', ['0031']);

      // Check /specweave:progress - should NOT be duplicate
      const isDup = await deduplicator.checkDuplicate('/specweave:progress', []);
      expect(isDup).toBe(false);
    });

    it('should handle commands without arguments', async () => {
      const command = '/specweave:progress';

      // First invocation - no args
      await deduplicator.recordInvocation(command, []);

      // Check immediately - should be duplicate
      const isDup = await deduplicator.checkDuplicate(command, []);
      expect(isDup).toBe(true);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total invocations', async () => {
      await deduplicator.recordInvocation('/specweave:do', ['0031']);
      await deduplicator.recordInvocation('/specweave:do', ['0032']);
      await deduplicator.recordInvocation('/specweave:progress', []);

      const stats = deduplicator.getStats();
      expect(stats.totalInvocations).toBe(3);
    });

    it('should track duplicates blocked', async () => {
      const command = '/specweave:do';
      const args = ['0031'];

      // Record first invocation
      await deduplicator.recordInvocation(command, args);

      // Try to invoke again (duplicate)
      await deduplicator.checkDuplicate(command, args);

      // Try again (another duplicate)
      await deduplicator.checkDuplicate(command, args);

      const stats = deduplicator.getStats();
      expect(stats.totalDuplicatesBlocked).toBe(2);
    });

    it('should track current cache size', async () => {
      await deduplicator.recordInvocation('/cmd1', []);
      await deduplicator.recordInvocation('/cmd2', []);
      await deduplicator.recordInvocation('/cmd3', []);

      const stats = deduplicator.getStats();
      expect(stats.currentCacheSize).toBe(3);
    });
  });

  describe('Cache Persistence', () => {
    it('should persist cache to disk', async () => {
      await deduplicator.recordInvocation('/specweave:do', ['0031']);

      // Check file exists
      const exists = await fs.pathExists(testCachePath);
      expect(exists).toBe(true);

      // Read and verify content
      const data = await fs.readJson(testCachePath);
      expect(data.invocations).toHaveLength(1);
      expect(data.invocations[0].command).toBe('/specweave:do');
      expect(data.invocations[0].args).toEqual(['0031']);
    });

    it('should load cache from disk on initialization', async () => {
      // Create first deduplicator and record invocation
      await deduplicator.recordInvocation('/specweave:do', ['0031']);

      // Create second deduplicator (should load from disk)
      const deduplicator2 = new CommandDeduplicator({
        windowMs: 500,
        cachePath: testCachePath,
        debug: false
      });

      // Check should detect duplicate (loaded from disk)
      const isDup = await deduplicator2.checkDuplicate('/specweave:do', ['0031']);
      expect(isDup).toBe(true);
    });

    it('should handle missing cache file gracefully', async () => {
      // Ensure cache file doesn't exist
      if (await fs.pathExists(testCachePath)) {
        await fs.remove(testCachePath);
      }

      // Create deduplicator (should create empty cache)
      const dedup = new CommandDeduplicator({
        cachePath: testCachePath,
        debug: false
      });

      const stats = dedup.getStats();
      expect(stats.totalInvocations).toBe(0);
      expect(stats.currentCacheSize).toBe(0);
    });

    it('should handle corrupted cache file gracefully', async () => {
      // Write corrupted JSON to cache file
      await fs.ensureDir(path.dirname(testCachePath));
      await fs.writeFile(testCachePath, 'invalid json {{{');

      // Create deduplicator (should handle error and start fresh)
      const dedup = new CommandDeduplicator({
        cachePath: testCachePath,
        debug: false
      });

      const stats = dedup.getStats();
      expect(stats.totalInvocations).toBe(0);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should remove old entries during cleanup', async () => {
      // Create deduplicator with very short window
      const dedup = new CommandDeduplicator({
        windowMs: 100,           // 100ms window
        cachePath: testCachePath,
        cleanupIntervalMs: 200,  // Cleanup every 200ms
        debug: false
      });

      // Record invocation
      await dedup.recordInvocation('/cmd1', []);
      expect(dedup.getStats().currentCacheSize).toBe(1);

      // Wait for entries to become old (>10x window = 1000ms)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Record another invocation (triggers cleanup)
      await dedup.recordInvocation('/cmd2', []);

      // Old entry should be cleaned up
      const stats = dedup.getStats();
      expect(stats.currentCacheSize).toBe(1); // Only new entry
    });

    it('should enforce max cache size after cleanup', async () => {
      const dedup = new CommandDeduplicator({
        windowMs: 10,  // Very short window so entries become old quickly
        cachePath: testCachePath,
        maxCacheSize: 5,  // Very small cache
        cleanupIntervalMs: 10,  // Cleanup very frequently
        debug: false
      });

      // Add 10 invocations
      for (let i = 0; i < 10; i++) {
        await dedup.recordInvocation(`/cmd${i}`, []);
      }

      // Wait for entries to become old (>10x window = 100ms)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup by recording one more
      await dedup.recordInvocation('/final', []);

      // After cleanup, cache should be small
      const stats = dedup.getStats();
      // Cleanup removes old entries (>10x window) AND enforces maxCacheSize
      // So we should have at most maxCacheSize entries
      expect(stats.currentCacheSize).toBeLessThanOrEqual(5);
    });
  });

  describe('Fingerprinting', () => {
    it('should create same fingerprint for identical commands', async () => {
      const command = '/specweave:do';
      const args = ['0031'];

      // Record first invocation
      await deduplicator.recordInvocation(command, args);

      // Load cache and check fingerprints
      const data = await fs.readJson(testCachePath);
      const fp1 = data.invocations[0].fingerprint;

      // Clear and record again
      await deduplicator.clear();
      await deduplicator.recordInvocation(command, args);

      const data2 = await fs.readJson(testCachePath);
      const fp2 = data2.invocations[0].fingerprint;

      // Fingerprints should match
      expect(fp1).toBe(fp2);
    });

    it('should create different fingerprints for different commands', async () => {
      await deduplicator.recordInvocation('/cmd1', ['arg1']);
      await deduplicator.recordInvocation('/cmd2', ['arg2']);

      const data = await fs.readJson(testCachePath);
      const fp1 = data.invocations[0].fingerprint;
      const fp2 = data.invocations[1].fingerprint;

      expect(fp1).not.toBe(fp2);
    });

    it('should create different fingerprints for same command with different args', async () => {
      await deduplicator.recordInvocation('/specweave:do', ['0031']);
      await deduplicator.recordInvocation('/specweave:do', ['0032']);

      const data = await fs.readJson(testCachePath);
      const fp1 = data.invocations[0].fingerprint;
      const fp2 = data.invocations[1].fingerprint;

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all cached invocations', async () => {
      // Add several invocations
      await deduplicator.recordInvocation('/cmd1', []);
      await deduplicator.recordInvocation('/cmd2', []);
      await deduplicator.recordInvocation('/cmd3', []);

      expect(deduplicator.getStats().currentCacheSize).toBe(3);

      // Clear cache
      await deduplicator.clear();

      // Cache should be empty
      const stats = deduplicator.getStats();
      expect(stats.currentCacheSize).toBe(0);
      expect(stats.totalInvocations).toBe(0);
      expect(stats.totalDuplicatesBlocked).toBe(0);
    });

    it('should reset statistics after clear', async () => {
      // Add invocations and duplicates
      await deduplicator.recordInvocation('/cmd', []);
      await deduplicator.checkDuplicate('/cmd', []); // Duplicate

      expect(deduplicator.getStats().totalDuplicatesBlocked).toBe(1);

      // Clear
      await deduplicator.clear();

      // Stats should be reset
      const stats = deduplicator.getStats();
      expect(stats.totalInvocations).toBe(0);
      expect(stats.totalDuplicatesBlocked).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty command string', async () => {
      await deduplicator.recordInvocation('', []);
      const isDup = await deduplicator.checkDuplicate('', []);
      expect(isDup).toBe(true);
    });

    it('should handle commands with special characters', async () => {
      const command = '/specweave:do@#$%^&*()';
      await deduplicator.recordInvocation(command, []);
      const isDup = await deduplicator.checkDuplicate(command, []);
      expect(isDup).toBe(true);
    });

    it('should handle very long argument arrays', async () => {
      const args = Array.from({ length: 100 }, (_, i) => `arg${i}`);
      await deduplicator.recordInvocation('/cmd', args);
      const isDup = await deduplicator.checkDuplicate('/cmd', args);
      expect(isDup).toBe(true);
    });

    it('should handle unicode in commands and args', async () => {
      const command = '/日本語コマンド';
      const args = ['аргумент', '参数', '🚀'];
      await deduplicator.recordInvocation(command, args);
      const isDup = await deduplicator.checkDuplicate(command, args);
      expect(isDup).toBe(true);
    });

    it('should handle rapid sequential invocations', async () => {
      const command = '/specweave:do';
      const args = ['0031'];

      // Record first
      await deduplicator.recordInvocation(command, args);

      // Rapid checks (should all be duplicates)
      const results = await Promise.all([
        deduplicator.checkDuplicate(command, args),
        deduplicator.checkDuplicate(command, args),
        deduplicator.checkDuplicate(command, args)
      ]);

      expect(results).toEqual([true, true, true]);
    });
  });

  describe('Configuration', () => {
    it('should respect custom window size', async () => {
      const dedup = new CommandDeduplicator({
        windowMs: 2000,  // 2 second window
        cachePath: testCachePath,
        debug: false
      });

      await dedup.recordInvocation('/cmd', []);

      // After 1 second - should still be duplicate
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await dedup.checkDuplicate('/cmd', [])).toBe(true);

      // After 2.1 seconds - should NOT be duplicate
      await new Promise(resolve => setTimeout(resolve, 1200));
      expect(await dedup.checkDuplicate('/cmd', [])).toBe(false);
    });

    it('should respect debug flag', async () => {
      // This test just verifies debug mode doesn't crash
      const dedup = new CommandDeduplicator({
        windowMs: 500,
        cachePath: testCachePath,
        debug: true  // Enable debug
      });

      // Should not throw with debug enabled
      await expect(dedup.recordInvocation('/cmd', [])).resolves.not.toThrow();
      await expect(dedup.checkDuplicate('/cmd', [])).resolves.not.toThrow();
    });
  });
});

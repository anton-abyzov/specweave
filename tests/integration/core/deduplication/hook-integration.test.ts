/**
 * Integration Tests: Deduplication Hook Integration
 *
 * Tests the bash hook that integrates with CommandDeduplicator
 * to prevent duplicate command invocations at the hook level.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { findProjectRoot } from '../../../test-utils/project-root.js';

const execAsync = promisify(exec);

describe('Deduplication Hook Integration', () => {
  // ✅ SAFE: Find project root from test file location, not process.cwd()
  const projectRoot = findProjectRoot(import.meta.url);
  const hookPath = path.join(projectRoot, 'plugins', 'specweave', 'hooks', 'pre-command-deduplication.sh');

  // ✅ SAFE: Use os.tmpdir() instead of process.cwd() to prevent deletion of project files
  const testDir = path.join(os.tmpdir(), 'dedup-hook-test-' + Date.now());
  const cachePath = path.join(testDir, '.specweave', 'state', 'command-invocations.json');

  beforeEach(async () => {
    // Create isolated test directory
    await fs.ensureDir(path.dirname(cachePath));

    // Set SPECWEAVE_ROOT env var so hook uses test directory
    process.env.SPECWEAVE_ROOT = testDir;

    // Ensure dist is built - use reliable project root path
    // ✅ SAFE: projectRoot is determined from test file location, not process.cwd()
    const distPath = path.join(projectRoot, 'dist/src/core/deduplication/command-deduplicator.js');

    if (!await fs.pathExists(distPath)) {
      throw new Error(`TypeScript not compiled! Run: npm run build\nProject root: ${projectRoot}\nLooked for: ${distPath}`);
    }
  });

  afterEach(async () => {
    // Cleanup test directory (safe - isolated from real .specweave/)
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }

    // Reset environment variable
    delete process.env.SPECWEAVE_ROOT;
  });

  describe('Hook Execution', () => {
    it('should approve first command invocation', async () => {
      const input = JSON.stringify({
        prompt: '/specweave:do 0031'
      });

      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
      expect(output.reason).toBeUndefined();
    });

    it('should block duplicate command within 1 second', async () => {
      const input = JSON.stringify({
        prompt: '/specweave:do 0031'
      });

      // First invocation
      await execAsync(`echo '${input}' | bash "${hookPath}"`);

      // Second invocation immediately (should be blocked)
      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('block');
      expect(output.reason).toContain('DUPLICATE COMMAND DETECTED');
      expect(output.reason).toContain('/specweave:do');
    });

    it('should allow command after time window expires', async () => {
      const input = JSON.stringify({
        prompt: '/specweave:do 0031'
      });

      // First invocation
      await execAsync(`echo '${input}' | bash "${hookPath}"`);

      // Wait for window to expire (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Second invocation after window (should be approved)
      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
    });

    it('should treat different commands as separate invocations', async () => {
      const input1 = JSON.stringify({ prompt: '/specweave:do 0031' });
      const input2 = JSON.stringify({ prompt: '/specweave:progress' });

      // First command
      await execAsync(`echo '${input1}' | bash "${hookPath}"`);

      // Different command (should NOT be blocked)
      const { stdout } = await execAsync(`echo '${input2}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
    });

    it('should treat different arguments as separate commands', async () => {
      const input1 = JSON.stringify({ prompt: '/specweave:do 0031' });
      const input2 = JSON.stringify({ prompt: '/specweave:do 0032' });

      // First invocation with args ['0031']
      await execAsync(`echo '${input1}' | bash "${hookPath}"`);

      // Second invocation with different args ['0032'] (should NOT be blocked)
      const { stdout } = await execAsync(`echo '${input2}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
    });
  });

  describe('Non-Command Input', () => {
    it('should approve non-slash-command prompts', async () => {
      const input = JSON.stringify({
        prompt: 'Please help me implement a feature'
      });

      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
    });

    it('should approve empty prompts', async () => {
      const input = JSON.stringify({
        prompt: ''
      });

      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('approve');
    });
  });

  describe('Error Handling', () => {
    it('should fail-open if deduplication module unavailable', async () => {
      // Temporarily rename dist folder
      const distPath = path.join(process.cwd(), 'dist');
      const distBackup = path.join(process.cwd(), 'dist-backup');

      // Clean up any existing backup from previous test runs
      if (await fs.pathExists(distBackup)) {
        await fs.remove(distBackup);
      }

      if (await fs.pathExists(distPath)) {
        await fs.move(distPath, distBackup);
      }

      try {
        const input = JSON.stringify({ prompt: '/specweave:do' });
        const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
        const output = JSON.parse(stdout.trim());

        // Should approve (fail-open behavior)
        expect(output.decision).toBe('approve');
      } finally {
        // Restore dist folder
        if (await fs.pathExists(distBackup)) {
          await fs.move(distBackup, distPath);
        }
      }
    });

    it('should handle malformed JSON input gracefully', async () => {
      const input = 'invalid json {{{';

      // Should not crash (may return error, but shouldn't hang)
      await expect(
        execAsync(`echo '${input}' | bash "${hookPath}"`, { timeout: 5000 })
      ).resolves.toBeDefined();
    });
  });

  describe('Cache Persistence', () => {
    it('should create cache file on first invocation', async () => {
      const input = JSON.stringify({ prompt: '/specweave:do 0031' });

      await execAsync(`echo '${input}' | bash "${hookPath}"`);

      // Cache file should exist
      const exists = await fs.pathExists(cachePath);
      expect(exists).toBe(true);
    });

    it('should update cache file on subsequent invocations', async () => {
      const input1 = JSON.stringify({ prompt: '/specweave:do 0031' });
      const input2 = JSON.stringify({ prompt: '/specweave:progress' });

      // First invocation
      await execAsync(`echo '${input1}' | bash "${hookPath}"`);
      const data1 = await fs.readJson(cachePath);
      expect(data1.invocations).toHaveLength(1);

      // Second invocation (different command)
      await execAsync(`echo '${input2}' | bash "${hookPath}"`);
      const data2 = await fs.readJson(cachePath);
      expect(data2.invocations).toHaveLength(2);
    });
  });

  describe('Statistics in Error Message', () => {
    it('should include statistics in duplicate block message', async () => {
      const input = JSON.stringify({ prompt: '/specweave:do 0031' });

      // First invocation
      await execAsync(`echo '${input}' | bash "${hookPath}"`);

      // Second invocation (duplicate)
      const { stdout } = await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const output = JSON.parse(stdout.trim());

      expect(output.decision).toBe('block');
      expect(output.reason).toContain('Deduplication Stats');
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time (<100ms)', async () => {
      const input = JSON.stringify({ prompt: '/specweave:do 0031' });

      const start = Date.now();
      await execAsync(`echo '${input}' | bash "${hookPath}"`);
      const elapsed = Date.now() - start;

      // Hook should execute quickly (<100ms)
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle rapid sequential invocations', async () => {
      const input = JSON.stringify({ prompt: '/specweave:do 0031' });

      // Fire 5 invocations rapidly
      const promises = Array.from({ length: 5 }, () =>
        execAsync(`echo '${input}' | bash "${hookPath}"`)
      );

      const results = await Promise.all(promises);

      // Parse all outputs
      const outputs = results.map(r => JSON.parse(r.stdout.trim()));

      // All should have a decision (either approve or block)
      expect(outputs.every(o => o.decision === 'approve' || o.decision === 'block')).toBe(true);

      // At least one should be approved (the first or due to race conditions)
      const approved = outputs.filter(o => o.decision === 'approve');
      expect(approved.length).toBeGreaterThanOrEqual(1);

      // Note: Due to race conditions in parallel execution, we may not get
      // blocks. The deduplicator uses file-based locking which isn't perfect
      // for truly simultaneous calls. This test verifies the hook doesn't crash
      // under load, not that it perfectly handles race conditions.
    });
  });
});

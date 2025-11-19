/**
 * Integration Tests: sync-specs command
 *
 * Tests the CLI command for syncing increment specs to living docs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import * as os from 'os';
import { syncSpecs } from '../../../src/cli/commands/sync-specs.js';

describe('sync-specs command', () => {
  let testRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    // SAFE: Use isolated temp directory
    testRoot = path.join(os.tmpdir(), `test-sync-specs-cmd-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testRoot);
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    await fs.remove(testRoot);
  });

  describe('Sync Single Increment', () => {
    it('should sync specific increment when ID provided', async () => {
      // Create increment 0040
      await createTestIncrement(testRoot, '0040-test', 'completed');

      // Execute sync
      await syncSpecs(['0040-test']);

      // Verify files created
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md')
      )).toBe(true);

      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040/README.md')
      )).toBe(true);
    });

    it('should sync ALL increments when no ID provided (NEW DEFAULT v0.23.0+)', async () => {
      // Create multiple increments
      await createTestIncrement(testRoot, '0039-old', 'completed');
      await createTestIncrement(testRoot, '0040-latest', 'completed');
      await createTestIncrement(testRoot, '0041-active', 'in-progress'); // In-progress, should also be synced

      // Execute sync without increment ID (NEW: syncs ALL, not just completed)
      await syncSpecs([]);

      // Should sync ALL increments with spec.md (regardless of status)
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-039/FEATURE.md')
      )).toBe(true);

      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md')
      )).toBe(true);

      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-041/FEATURE.md')
      )).toBe(true);
    });
  });

  describe('Sync All Increments', () => {
    it('should sync all increments with --all flag (explicit)', async () => {
      // Create multiple increments
      await createTestIncrement(testRoot, '0039-first', 'completed');
      await createTestIncrement(testRoot, '0040-second', 'completed');
      await createTestIncrement(testRoot, '0041-active', 'in-progress');

      // Execute sync --all
      await syncSpecs(['--all']);

      // Should sync ALL increments with spec.md (regardless of status)
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-039/FEATURE.md')
      )).toBe(true);

      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md')
      )).toBe(true);

      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-041/FEATURE.md')
      )).toBe(true);
    });

    it('should skip increments without spec.md', async () => {
      // Create increment without spec.md
      const incrementPath = path.join(testRoot, '.specweave/increments/0034-broken');
      await fs.ensureDir(incrementPath);
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0034-broken',
        status: 'completed'
      });

      // Create valid increment
      await createTestIncrement(testRoot, '0040-valid', 'completed');

      // Execute sync --all (should skip 0034)
      await syncSpecs(['--all']);

      // Should sync only 0040
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md')
      )).toBe(true);

      // Should NOT create FS-034 (no spec.md)
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-034')
      )).toBe(false);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not create files with --dry-run flag', async () => {
      await createTestIncrement(testRoot, '0040-test', 'completed');

      // Execute dry run
      await syncSpecs(['0040-test', '--dry-run']);

      // Should NOT create files
      expect(await fs.pathExists(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040')
      )).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should exit with error if increment not found', async () => {
      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await syncSpecs(['0099-nonexistent']);
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should succeed with no increments found (empty result)', async () => {
      // No increments created - should not fail, just return empty

      // Mock console.log to capture output
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      await syncSpecs([]);

      // Should complete successfully with 0 synced
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Sync complete: 0 succeeded'));
      mockLog.mockRestore();
    });
  });

  describe('Feature ID Auto-Generation', () => {
    it('should auto-generate FS-040 for increment 0040', async () => {
      await createTestIncrement(testRoot, '0040-test', 'completed');
      await syncSpecs(['0040-test']);

      const featureContent = await fs.readFile(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'),
        'utf-8'
      );

      expect(featureContent).toContain('id: FS-040');
    });

    it('should auto-generate FS-041 for increment 0041', async () => {
      await createTestIncrement(testRoot, '0041-test', 'completed');
      await syncSpecs(['0041-test']);

      const featureContent = await fs.readFile(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-041/FEATURE.md'),
        'utf-8'
      );

      expect(featureContent).toContain('id: FS-041');
    });

    it('should auto-generate FS-042 for increment 0042', async () => {
      await createTestIncrement(testRoot, '0042-test', 'completed');
      await syncSpecs(['0042-test']);

      const featureContent = await fs.readFile(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-042/FEATURE.md'),
        'utf-8'
      );

      expect(featureContent).toContain('id: FS-042');
    });
  });

  describe('User Story Creation', () => {
    it('should create user story files with proper frontmatter', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
title: "Test Feature"
---

# Test Feature

### US-001: First Story

**As a** user
**I want** to test
**So that** it works

- [ ] AC-US1-01: First criterion
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test',
        status: 'completed'
      });

      await syncSpecs(['0040-test']);

      const userStoryFiles = await fs.readdir(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040')
      );

      const storyFile = userStoryFiles.find(f => f.startsWith('us-001'));
      expect(storyFile).toBeDefined();

      const storyContent = await fs.readFile(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040', storyFile!),
        'utf-8'
      );

      // Verify frontmatter
      expect(storyContent).toContain('id: US-001');
      expect(storyContent).toContain('feature: FS-040');
      expect(storyContent).toContain('title: "First Story"');

      // Verify content
      expect(storyContent).toContain('**As a** user');
      expect(storyContent).toContain('**I want** to test');
      expect(storyContent).toContain('**So that** it works');

      // Verify acceptance criteria
      expect(storyContent).toContain('- [ ] **AC-US1-01**: First criterion');
    });
  });
});

/**
 * Helper: Create a test increment
 */
async function createTestIncrement(
  root: string,
  incrementId: string,
  status: string
): Promise<void> {
  const incrementPath = path.join(root, `.specweave/increments/${incrementId}`);
  await fs.ensureDir(incrementPath);

  await fs.writeFile(
    path.join(incrementPath, 'spec.md'),
    `---
increment: ${incrementId}
title: "Test Increment ${incrementId}"
status: ${status}
---

# Test Increment ${incrementId}

## Overview

Test increment for sync testing.
`
  );

  await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
    id: incrementId,
    status,
    created: new Date().toISOString()
  });
}

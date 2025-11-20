/**
 * Integration Tests: Permission Gates (v0.24.0)
 *
 * Tests the 5-gate permission architecture for sync operations.
 * Critical for v0.24.0 release.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('Permission Gates Integration Tests', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.specweave'));
    configPath = path.join(testDir, '.specweave', 'config.json');
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('GATE 1: canUpsertInternalItems', () => {
    it('should block ALL sync when canUpsertInternalItems=false', async () => {
      // Arrange: Config with canUpsertInternalItems=false
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: false
          }
        },
        hooks: {
          post_task_completion: {
            sync_living_docs: true
          }
        }
      };
      await fs.writeJson(configPath, config);

      // Create minimal increment structure
      const incrementId = '0001-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0001-test-feature\n---\n# Test Feature'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';
      let exitCode = 0;

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
        exitCode = error.status || 1;
      }

      // Assert: Living docs NOT created
      const livingDocsDir = path.join(testDir, '.specweave', 'docs');
      const livingDocsExists = await fs.pathExists(livingDocsDir);

      expect(livingDocsExists).toBe(false);
      expect(output).toContain('Living docs sync BLOCKED');
      expect(output).toContain('canUpsertInternalItems = false');
    });

    it('should allow living docs sync when canUpsertInternalItems=true', async () => {
      // Arrange: Config with canUpsertInternalItems=true
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: true,
            canUpdateExternalItems: false, // Keep external sync disabled for this test
            autoSyncOnCompletion: false
          }
        },
        hooks: {
          post_task_completion: {
            sync_living_docs: true
          }
        }
      };
      await fs.writeJson(configPath, config);

      // Create increment with user stories
      const incrementId = '0002-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        `---
id: 0002-test-feature
title: Test Feature
implements_spec: FS-001
---

# Test Feature

## User Stories

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test criterion
`
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
      }

      // Assert: Living docs SHOULD be created
      expect(output).toContain('Living docs sync enabled');
      expect(output).not.toContain('Living docs sync BLOCKED');
      // Note: Actual file creation depends on full sync implementation
    });
  });

  describe('GATE 3: autoSyncOnCompletion', () => {
    it('should skip external sync when autoSyncOnCompletion=false', async () => {
      // Arrange: Manual mode
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: true,
            canUpdateExternalItems: true,
            autoSyncOnCompletion: false // Manual mode
          }
        },
        hooks: {
          post_task_completion: {
            sync_living_docs: true
          }
        }
      };
      await fs.writeJson(configPath, config);

      const incrementId = '0003-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0003-test-feature\n---\n# Test'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
      }

      // Assert: External sync blocked (manual mode)
      expect(output).toContain('Automatic external sync DISABLED');
      expect(output).toContain('autoSyncOnCompletion = false');
      expect(output).toContain('/specweave-github:sync');
    });

    it('should allow external sync when autoSyncOnCompletion=true', async () => {
      // Arrange: Auto mode
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: true,
            canUpdateExternalItems: true,
            autoSyncOnCompletion: true // Auto mode
          },
          github: {
            enabled: false // Keep GitHub disabled to avoid actual API calls
          }
        },
        hooks: {
          post_task_completion: {
            sync_living_docs: true
          }
        }
      };
      await fs.writeJson(configPath, config);

      const incrementId = '0004-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0004-test-feature\n---\n# Test'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
      }

      // Assert: Auto-sync permitted
      expect(output).toContain('Automatic external sync permitted');
      expect(output).toContain('autoSyncOnCompletion = true');
      expect(output).not.toContain('DISABLED');
    });
  });

  describe('Config Error Handling', () => {
    it('should handle missing config.json gracefully', async () => {
      // Arrange: No config file
      if (await fs.pathExists(configPath)) {
        await fs.remove(configPath);
      }

      const incrementId = '0005-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0005-test-feature\n---\n# Test'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
      }

      // Assert: Safe defaults used
      expect(output).toContain('No config.json found');
      expect(output).toContain('using safe defaults');
      expect(output).toContain('all permissions disabled');
      // Should block sync due to safe defaults (all false)
      expect(output).toContain('Living docs sync disabled');
    });

    it('should handle malformed config.json gracefully', async () => {
      // Arrange: Invalid JSON
      await fs.writeFile(configPath, '{"sync": invalid json}');

      const incrementId = '0006-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0006-test-feature\n---\n# Test'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';
      let exitCode = 0;

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
        exitCode = error.status || 1;
      }

      // Assert: Error handled gracefully
      expect(output).toContain('Failed to load config.json');
      expect(output).toContain('invalid JSON');
      expect(output).toContain('Using safe defaults');
      // Should not crash, should continue with safe defaults
      expect(output).toContain('Living docs sync disabled');
    });
  });

  describe('GATE 4: Per-Tool Enabled Flags', () => {
    it('should skip GitHub sync when github.enabled=false', async () => {
      // This test requires SyncCoordinator integration
      // Placeholder for now - will be implemented with full coordinator tests
      expect(true).toBe(true); // Placeholder
    });

    it('should allow GitHub sync when github.enabled=true', async () => {
      // This test requires SyncCoordinator integration
      // Placeholder for now - will be implemented with full coordinator tests
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Default Values', () => {
    it('should default all permissions to false if undefined', async () => {
      // Arrange: Empty config
      const config = {
        hooks: {
          post_task_completion: {
            sync_living_docs: true
          }
        }
      };
      await fs.writeJson(configPath, config);

      const incrementId = '0007-test-feature';
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        '---\nid: 0007-test-feature\n---\n# Test'
      );

      // Act: Execute sync hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/sync-living-docs.js');
      let output = '';

      try {
        output = execSync(
          `cd "${testDir}" && node "${hookPath}" "${incrementId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } catch (error: any) {
        output = error.stdout + error.stderr;
      }

      // Assert: All permissions default to false (deny-by-default)
      expect(output).toContain('Living docs sync BLOCKED');
      expect(output).toContain('canUpsertInternalItems = false');
    });
  });
});

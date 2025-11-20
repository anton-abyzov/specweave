/**
 * Integration Tests: Sync Direction and Permission Architecture
 *
 * Tests the three-permission architecture (v0.24.0):
 * - canUpsertInternalItems: CREATE + UPDATE internal items
 * - canUpdateExternalItems: UPDATE external items (full content)
 * - canUpdateStatus: UPDATE status (both types)
 *
 * Validates:
 * 1. Increment → Living Docs is ALWAYS one-way (immutable)
 * 2. Living Docs ↔ External Tool respects three permissions
 * 3. Config validation blocks invalid settings
 *
 * See: .specweave/increments/0047-us-task-linkage (FS-047)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { validateSyncConfig, assertValidSyncConfig } from '../../../src/core/types/sync-config-validator.js';
import { PermissionChecker } from '../../../src/core/utils/permission-checker.js';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('Sync Direction and Permissions (Integration)', () => {
  let testRoot: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-sync-direction-test-${Date.now()}`);
    await fs.ensureDir(testRoot);
    await fs.ensureDir(path.join(testRoot, '.specweave'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'docs', 'internal', 'specs'));
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  describe('TC-090: Increment → Living Docs is always one-way', () => {
    it('should validate incrementToLivingDocs=one-way', async () => {
      const config = {
        sync: {
          incrementToLivingDocs: 'one-way' as const,
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject incrementToLivingDocs=two-way', async () => {
      const config = {
        sync: {
          incrementToLivingDocs: 'two-way' as any,
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/MUST be 'one-way'/i);
      expect(result.errors[0]).toMatch(/IMMUTABLE/i);
    });

    it('should reject incrementToLivingDocs with invalid value', async () => {
      const config = {
        sync: {
          incrementToLivingDocs: 'bidirectional' as any,
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/MUST be 'one-way'/i);
    });

    it('should throw error with assertValidSyncConfig', async () => {
      const config = {
        sync: {
          incrementToLivingDocs: 'two-way' as any,
        },
      };

      expect(() => assertValidSyncConfig(config)).toThrow(/MUST be 'one-way'/i);
    });

    it('should sync increment to living docs (one-way only)', async () => {
      // Create test increment
      const incrementId = '0001-test-feature';
      const incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      // Create spec.md with feature ID
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: Test Feature
epic: FS-001
---

# Test Feature

## User Stories

### US-001: Test User Story
`
      );

      // Create config
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            incrementToLivingDocs: 'one-way',
          },
        })
      );

      // Execute sync (increment → living docs)
      const sync = new LivingDocsSync(testRoot, { logger: silentLogger });
      const result = await sync.syncIncrement(incrementId, {
        explicitFeatureId: 'FS-001',
      });

      // Verify sync succeeded (one-way)
      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-001');

      // Verify living docs were created
      const livingDocsPath = path.join(testRoot, '.specweave', 'docs', 'internal', 'specs', '_features', 'FS-001');
      expect(await fs.pathExists(livingDocsPath)).toBe(true);

      // Verify increment was NOT modified (one-way sync)
      const specContent = await fs.readFile(path.join(incrementPath, 'spec.md'), 'utf-8');
      expect(specContent).toContain('epic: FS-001'); // Original content preserved
    });
  });

  describe('TC-091: Internal US no sync (default: all permissions=false)', () => {
    it('should load default permissions (all false)', async () => {
      // Create config with no sync settings (defaults apply)
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test' },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      expect(checker.canUpsertInternalItems()).toBe(false);
      expect(checker.canUpdateExternalItems()).toBe(false);
      expect(checker.canUpdateStatus()).toBe(false);
    });

    it('should not sync internal US with all permissions false', async () => {
      // Create config with explicit false permissions
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: false,
              canUpdateExternalItems: false,
              canUpdateStatus: false,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // All permissions should be false (read-only mode)
      expect(checker.canUpsertInternalItems()).toBe(false);
      expect(checker.canUpdateExternalItems()).toBe(false);
      expect(checker.canUpdateStatus()).toBe(false);

      // Attempting operations should fail
      expect(() => checker.requirePermission('upsert-internal')).toThrow(/Permission denied.*canUpsertInternalItems=false/);
    });
  });

  describe('TC-092: External US no sync (default: all permissions=false)', () => {
    it('should not pull from external with all permissions false', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: false,
              canUpdateExternalItems: false,
              canUpdateStatus: false,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // No sync operations allowed (read-only mode)
      expect(checker.canUpsertInternalItems()).toBe(false);
      expect(checker.canUpdateExternalItems()).toBe(false);
      expect(checker.canUpdateStatus()).toBe(false);
    });
  });

  describe('TC-093: Internal US push with canUpdateExternalItems=true', () => {
    it('should allow pushing internal US with canUpsertInternalItems=true', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: false,
              canUpdateStatus: false,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // Can create/update internal items
      expect(checker.canUpsertInternalItems()).toBe(true);
      expect(() => checker.requirePermission('upsert-internal')).not.toThrow();

      // Cannot update external items or status
      expect(checker.canUpdateExternalItems()).toBe(false);
      expect(checker.canUpdateStatus()).toBe(false);
    });
  });

  describe('TC-094: External US pull with canUpsertInternalItems=true', () => {
    it('should allow pulling external US status with canUpdateStatus=true', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: false,
              canUpdateExternalItems: false,
              canUpdateStatus: true,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // Can update status (import-only mode)
      expect(checker.canUpdateStatus()).toBe(true);
      expect(() => checker.requirePermission('update-status')).not.toThrow();

      // Cannot create/update items
      expect(checker.canUpsertInternalItems()).toBe(false);
      expect(checker.canUpdateExternalItems()).toBe(false);
    });
  });

  describe('TC-095: Full sync with all permissions enabled', () => {
    it('should allow all operations with all permissions true', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: true,
              canUpdateStatus: true,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // All operations allowed (bidirectional sync)
      expect(checker.canUpsertInternalItems()).toBe(true);
      expect(checker.canUpdateExternalItems()).toBe(true);
      expect(checker.canUpdateStatus()).toBe(true);

      // All permission checks pass
      expect(() => checker.requirePermission('upsert-internal')).not.toThrow();
      expect(() => checker.requirePermission('update-external')).not.toThrow();
      expect(() => checker.requirePermission('update-status')).not.toThrow();
    });

    it('should warn when all permissions enabled (conflict risk)', async () => {
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: true,
            canUpdateExternalItems: true,
            canUpdateStatus: true,
          },
        },
      };

      const result = validateSyncConfig(config);

      // Valid but with warning
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/full sync mode/i);
      expect(result.warnings[0]).toMatch(/conflict/i);
    });
  });

  describe('TC-096: Config validation prevents invalid settings', () => {
    it('should reject autoIncrementCreation=true', async () => {
      const config = {
        sync: {
          autoIncrementCreation: true,
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/autoIncrementCreation MUST be false/i);
      expect(result.errors[0]).toMatch(/FORBIDDEN/i);
    });

    it('should accept autoIncrementCreation=false', async () => {
      const config = {
        sync: {
          autoIncrementCreation: false,
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate sync settings structure', async () => {
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: 'invalid' as any,
            canUpdateExternalItems: true,
            canUpdateStatus: true,
          },
        },
      };

      const result = validateSyncConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid sync settings/i);
      expect(result.errors[0]).toMatch(/boolean/i);
    });

    it('should warn about conflicting permissions', async () => {
      const config = {
        sync: {
          settings: {
            canUpsertInternalItems: false,
            canUpdateExternalItems: true,
            canUpdateStatus: false,
          },
        },
      };

      const result = validateSyncConfig(config);

      // Valid but with warning
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/canUpdateExternalItems=true.*canUpdateStatus=false/i);
    });
  });

  describe('Permission Checker Integration', () => {
    it('should migrate legacy syncDirection=bidirectional', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              syncDirection: 'bidirectional',
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // Should migrate to all permissions enabled
      expect(checker.canUpsertInternalItems()).toBe(true);
      expect(checker.canUpdateExternalItems()).toBe(true);
      expect(checker.canUpdateStatus()).toBe(true);
    });

    it('should migrate legacy syncDirection=export', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              syncDirection: 'export',
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);

      // Should migrate to upsert-only mode
      expect(checker.canUpsertInternalItems()).toBe(true);
      expect(checker.canUpdateExternalItems()).toBe(false);
      expect(checker.canUpdateStatus()).toBe(false);
    });

    it('should get permission summary', async () => {
      await fs.writeFile(
        path.join(testRoot, '.specweave', 'config.json'),
        JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: false,
              canUpdateStatus: true,
            },
          },
        })
      );

      const checker = await PermissionChecker.load(testRoot);
      const summary = checker.getPermissionSummary();

      expect(summary).toContain('✅ Can CREATE and UPDATE internal items');
      expect(summary).toContain('❌ Cannot update external items');
      expect(summary).toContain('✅ Can UPDATE status');
    });
  });
});

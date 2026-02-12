/**
 * Permission Enforcer Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  PermissionEnforcer,
  createPermissionEnforcerFromConfig,
  SyncOperation,
  ItemOrigin,
} from '../../../../src/core/sync/permission-enforcer.js';
import { SyncSettings, DEFAULT_SYNC_SETTINGS } from '../../../../src/core/types/sync-settings.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('PermissionEnforcer', () => {
  let enforcer: PermissionEnforcer;

  // Explicit all-disabled settings for testing deny scenarios
  const ALL_DISABLED: SyncSettings = {
    canUpsertInternalItems: false,
    canUpdateExternalItems: false,
    canUpdateStatus: false,
  };

  beforeEach(() => {
    enforcer = new PermissionEnforcer({
      settings: { ...ALL_DISABLED },
      logger: silentLogger,
      enableLogging: false, // Disable file logging in tests
    });
  });

  describe('checkPermission', () => {
    it('should always allow read operations', () => {
      const result = enforcer.checkPermission('github', 'read', 'FS-001', 'internal');

      expect(result.allowed).toBe(true);
      expect(result.operation).toBe('read');
    });

    it('should deny status updates when disabled', () => {
      const result = enforcer.checkPermission('github', 'update-status', 'FS-001', 'internal');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('canUpdateStatus');
    });

    it('should allow status updates when enabled', () => {
      enforcer.updateSettings({ canUpdateStatus: true });

      const result = enforcer.checkPermission('github', 'update-status', 'FS-001', 'internal');

      expect(result.allowed).toBe(true);
    });

    it('should deny internal upsert when disabled', () => {
      const result = enforcer.checkPermission('github', 'upsert-internal', 'FS-001', 'internal');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('canUpsertInternalItems');
    });

    it('should allow internal upsert when enabled', () => {
      enforcer.updateSettings({ canUpsertInternalItems: true });

      const result = enforcer.checkPermission('github', 'upsert-internal', 'FS-001', 'internal');

      expect(result.allowed).toBe(true);
    });

    it('should deny external upsert when disabled', () => {
      const result = enforcer.checkPermission('github', 'upsert-external', 'FS-001E', 'external');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('canUpdateExternalItems');
    });

    it('should allow external upsert when enabled', () => {
      enforcer.updateSettings({ canUpdateExternalItems: true });

      const result = enforcer.checkPermission('github', 'upsert-external', 'FS-001E', 'external');

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkUpsertPermission', () => {
    it('should detect internal items', () => {
      enforcer.updateSettings({ canUpsertInternalItems: true });

      const result = enforcer.checkUpsertPermission('github', 'FS-001');

      expect(result.origin).toBe('internal');
      expect(result.operation).toBe('upsert-internal');
      expect(result.allowed).toBe(true);
    });

    it('should detect external items (E suffix)', () => {
      enforcer.updateSettings({ canUpdateExternalItems: true });

      const result = enforcer.checkUpsertPermission('github', 'FS-001E');

      expect(result.origin).toBe('external');
      expect(result.operation).toBe('upsert-external');
      expect(result.allowed).toBe(true);
    });

    it('should detect external items (-E- in ID)', () => {
      enforcer.updateSettings({ canUpdateExternalItems: true });

      const result = enforcer.checkUpsertPermission('jira', 'FS-E-123');

      expect(result.origin).toBe('external');
      expect(result.operation).toBe('upsert-external');
    });
  });

  describe('checkStatusUpdatePermission', () => {
    it('should check status update permission', () => {
      const result = enforcer.checkStatusUpdatePermission('ado', 'FS-001');

      expect(result.operation).toBe('update-status');
      expect(result.allowed).toBe(false);
    });

    it('should allow when enabled', () => {
      enforcer.updateSettings({ canUpdateStatus: true });

      const result = enforcer.checkStatusUpdatePermission('ado', 'FS-001');

      expect(result.allowed).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('should update settings partially', () => {
      enforcer.updateSettings({ canUpdateStatus: true });

      const settings = enforcer.getSettings();

      expect(settings.canUpdateStatus).toBe(true);
      expect(settings.canUpsertInternalItems).toBe(false);
      expect(settings.canUpdateExternalItems).toBe(false);
    });

    it('should update multiple settings', () => {
      enforcer.updateSettings({
        canUpsertInternalItems: true,
        canUpdateStatus: true,
      });

      const settings = enforcer.getSettings();

      expect(settings.canUpdateStatus).toBe(true);
      expect(settings.canUpsertInternalItems).toBe(true);
    });
  });

  describe('isSyncEnabled', () => {
    it('should return false when all disabled', () => {
      expect(enforcer.isSyncEnabled()).toBe(false);
    });

    it('should return true when any enabled', () => {
      enforcer.updateSettings({ canUpdateStatus: true });

      expect(enforcer.isSyncEnabled()).toBe(true);
    });
  });

  describe('getPermissionsSummary', () => {
    it('should return summary for disabled state', () => {
      const summary = enforcer.getPermissionsSummary();

      expect(summary.canCreateInternal).toBe(false);
      expect(summary.canUpdateExternal).toBe(false);
      expect(summary.canUpdateStatus).toBe(false);
      expect(summary.summary).toContain('read-only');
    });

    it('should return summary for enabled state', () => {
      enforcer.updateSettings({
        canUpsertInternalItems: true,
        canUpdateStatus: true,
      });

      const summary = enforcer.getPermissionsSummary();

      expect(summary.canCreateInternal).toBe(true);
      expect(summary.canUpdateStatus).toBe(true);
      expect(summary.summary).toContain('create/update internal');
      expect(summary.summary).toContain('update status');
    });
  });

  describe('permission result structure', () => {
    it('should include all required fields', () => {
      const result = enforcer.checkPermission('github', 'read', 'FS-001', 'internal');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('itemId');
      expect(result).toHaveProperty('origin');
      expect(result).toHaveProperty('timestamp');

      expect(result.platform).toBe('github');
      expect(result.itemId).toBe('FS-001');
      expect(result.origin).toBe('internal');
    });
  });
});

describe('createPermissionEnforcerFromConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should read settings from config.json', async () => {
    // Create config file
    const config = {
      version: '2.0',
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: false,
          canUpdateStatus: true,
        },
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    const enforcer = await createPermissionEnforcerFromConfig(tempDir, silentLogger);
    const settings = enforcer.getSettings();

    expect(settings.canUpsertInternalItems).toBe(true);
    expect(settings.canUpdateExternalItems).toBe(false);
    expect(settings.canUpdateStatus).toBe(true);
  });

  it('should use defaults when config is missing', async () => {
    const enforcer = await createPermissionEnforcerFromConfig(tempDir, silentLogger);
    const settings = enforcer.getSettings();

    expect(settings.canUpsertInternalItems).toBe(true);
    expect(settings.canUpdateExternalItems).toBe(true);
    expect(settings.canUpdateStatus).toBe(true);
  });

  it('should use defaults when sync settings are missing', async () => {
    const config = {
      version: '2.0',
      // No sync section
    };

    await fs.writeFile(
      path.join(tempDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    const enforcer = await createPermissionEnforcerFromConfig(tempDir, silentLogger);
    const settings = enforcer.getSettings();

    expect(settings.canUpsertInternalItems).toBe(true);
    expect(settings.canUpdateExternalItems).toBe(true);
    expect(settings.canUpdateStatus).toBe(true);
  });
});

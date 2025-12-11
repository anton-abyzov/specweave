/**
 * Integration Tests: Sync Interceptor Pattern
 *
 * Tests end-to-end permission enforcement through the interceptor.
 * Verifies that all sync operations go through permission checks
 * and audit logging.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SyncInterceptor, createSyncInterceptor } from '../../../src/core/sync/sync-interceptor.js';
import { SyncAuditLogger } from '../../../src/core/sync/sync-audit-logger.js';
import { PermissionEnforcer } from '../../../src/core/sync/permission-enforcer.js';
import { SyncPlatform } from '../../../src/core/types/sync-config.js';
import { SyncSettings } from '../../../src/core/types/sync-settings.js';

describe('Interceptor Integration Tests', () => {
  let testDir: string;
  let specweavePath: string;

  beforeEach(async () => {
    // Create isolated test directory
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `specweave-interceptor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    specweavePath = path.join(testDir, '.specweave');
    await fs.mkdir(specweavePath, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Full Permission Flow', () => {
    it('should enforce permissions and log all operations', async () => {
      // Arrange - Create permissive settings
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger = new SyncAuditLogger({
        specweavePath,
      });

      const interceptor = new SyncInterceptor({
        permissionEnforcer,
        auditLogger,
      });

      // Act 1: Allowed operation
      const result1 = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        async () => ({ id: 123, title: 'Test Issue' })
      );

      // Assert 1: Operation succeeded
      expect(result1.allowed).toBe(true);
      expect(result1.result).toEqual({ id: 123, title: 'Test Issue' });

      // Act 2: Denied operation (external update disabled)
      const result2 = await interceptor.intercept(
        'github',
        'upsert-external',
        'EXT-002E',
        'external',
        async () => ({ id: 456 })
      );

      // Assert 2: Operation denied
      expect(result2.allowed).toBe(false);
      expect(result2.result).toBeNull();

      // Act 3: Read operation (always allowed)
      const result3 = await interceptor.interceptRead(
        'github',
        'FS-003',
        async () => ({ id: 789 })
      );

      // Assert 3: Read succeeded
      expect(result3.allowed).toBe(true);

      // Verify audit log
      const stats = await auditLogger.getStats();
      expect(stats.total).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.denied).toBe(1);
    });

    it('should block external item updates when disabled', async () => {
      // Arrange - External updates disabled
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false, // External updates blocked
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger = new SyncAuditLogger({ specweavePath });
      const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger });

      // Act - Try to update external item
      const result = await interceptor.intercept(
        'github',
        'upsert-external',
        'JIRA-123E',
        'external',
        async () => ({ id: 999 })
      );

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.result).toBeNull();
      expect(result.permission.reason).toContain('canUpdateExternalItems');

      // Verify audit log has denial
      const deniedEntries = await auditLogger.getDeniedEntries();
      expect(deniedEntries.length).toBe(1);
      expect(deniedEntries[0].itemId).toBe('JIRA-123E');
    });

    it('should handle operation errors gracefully', async () => {
      // Arrange - All permissions enabled
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger = new SyncAuditLogger({ specweavePath });
      const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger });

      // Act - Operation that throws
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        async () => {
          throw new Error('Network timeout');
        }
      );

      // Assert
      expect(result.allowed).toBe(true); // Was allowed, but failed
      expect(result.result).toBeNull();
      expect(result.error?.message).toBe('Network timeout');

      // Verify audit log has error
      const errorEntries = await auditLogger.getErrorEntries();
      expect(errorEntries.length).toBe(1);
      expect(errorEntries[0].error).toBe('Network timeout');
    });
  });

  describe('Platform Support', () => {
    const testPlatforms: SyncPlatform[] = ['github', 'jira', 'ado'];

    testPlatforms.forEach((platform) => {
      it(`should work with ${platform} platform`, async () => {
        // Arrange - Global permissions (apply to all platforms)
        const settings: SyncSettings = {
          canUpsertInternalItems: true,
          canUpdateExternalItems: false,
          canUpdateStatus: true,
        };

        const permissionEnforcer = new PermissionEnforcer({
          settings,
          specweavePath,
        });
        const auditLogger = new SyncAuditLogger({ specweavePath });
        const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger });

        // Act - Create internal item on this platform
        const result = await interceptor.intercept(
          platform,
          'upsert-internal',
          'FS-001',
          'internal',
          async () => ({ id: 1 })
        );

        // Assert - Should be allowed (global permission enabled)
        expect(result.allowed).toBe(true);

        // Verify audit log includes correct platform
        const entries = await auditLogger.getRecentEntries(1);
        expect(entries[0].platform).toBe(platform);
      });
    });
  });

  describe('Audit Log Persistence', () => {
    it('should persist logs across logger instances', async () => {
      // Arrange - First logger
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger1 = new SyncAuditLogger({ specweavePath });
      const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger: auditLogger1 });

      // Act - Log operations
      await interceptor.intercept('github', 'read', 'FS-001', 'internal', async () => ({ id: 1 }));
      await interceptor.intercept('github', 'upsert-internal', 'FS-002', 'internal', async () => ({ id: 2 }));

      // Create new logger instance (simulates process restart)
      const auditLogger2 = new SyncAuditLogger({ specweavePath });

      // Assert - New logger can read old logs
      const entries = await auditLogger2.getRecentEntries(10);
      expect(entries.length).toBe(2);
    });
  });

  describe('createSyncInterceptor Factory', () => {
    it('should create interceptor with default configuration', async () => {
      // Arrange
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true,
      };
      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });

      // Act
      const interceptor = await createSyncInterceptor(
        permissionEnforcer,
        specweavePath
      );

      // Assert - Interceptor works
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        async () => ({ id: 1 })
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    it('should work with all convenience methods', async () => {
      // Arrange - All permissions enabled
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger = new SyncAuditLogger({ specweavePath });
      const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger });

      // Act & Assert - interceptRead
      const readResult = await interceptor.interceptRead('github', 'FS-001', async () => ({ id: 1 }));
      expect(readResult.allowed).toBe(true);

      // Act & Assert - interceptStatusUpdate
      const statusResult = await interceptor.interceptStatusUpdate('github', 'FS-002', async () => ({ id: 2 }));
      expect(statusResult.allowed).toBe(true);

      // Act & Assert - interceptUpsert (internal)
      const upsertResult = await interceptor.interceptUpsert('github', 'FS-003', async () => ({ id: 3 }));
      expect(upsertResult.allowed).toBe(true);

      // Act & Assert - interceptAuto
      const autoResult = await interceptor.interceptAuto('github', 'read', 'FS-004', async () => ({ id: 4 }));
      expect(autoResult.allowed).toBe(true);

      // Verify all logged
      const stats = await auditLogger.getStats();
      expect(stats.total).toBe(4);
      expect(stats.success).toBe(4);
    });
  });

  describe('wouldAllow Pre-flight Check', () => {
    it('should correctly predict permission without executing', async () => {
      // Arrange - Some permissions enabled, some disabled
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true,
      };

      const permissionEnforcer = new PermissionEnforcer({
        settings,
        specweavePath,
      });
      const auditLogger = new SyncAuditLogger({ specweavePath });
      const interceptor = new SyncInterceptor({ permissionEnforcer, auditLogger });

      // Act & Assert - Pre-flight checks
      expect(interceptor.wouldAllow('github', 'upsert-internal', 'FS-001')).toBe(true);
      expect(interceptor.wouldAllow('github', 'upsert-external', 'EXT-001E')).toBe(false);
      expect(interceptor.wouldAllow('jira', 'upsert-internal', 'FS-001')).toBe(true); // Same global permissions

      // Verify no logs created (pre-flight doesn't log)
      const stats = await auditLogger.getStats();
      expect(stats.total).toBe(0);
    });
  });
});

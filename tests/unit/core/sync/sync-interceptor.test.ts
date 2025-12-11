/**
 * Unit Tests: SyncInterceptor
 *
 * Tests the interceptor pattern for wrapping sync operations
 * with permission checks and audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SyncInterceptor,
  InterceptorResult,
  PermissionDeniedError,
  createSyncInterceptor,
} from '../../../../src/core/sync/sync-interceptor.js';
import { PermissionEnforcer, PermissionResult } from '../../../../src/core/sync/permission-enforcer.js';
import { SyncAuditLogger } from '../../../../src/core/sync/sync-audit-logger.js';
import { SyncPlatform } from '../../../../src/core/types/sync-config.js';

describe('SyncInterceptor', () => {
  let mockPermissionEnforcer: any;
  let mockAuditLogger: any;
  let interceptor: SyncInterceptor;

  beforeEach(() => {
    // Mock PermissionEnforcer
    mockPermissionEnforcer = {
      checkAndLog: vi.fn(),
      checkPermission: vi.fn(),
      getPermissionsSummary: vi.fn().mockReturnValue({ summary: 'Test summary' }),
    };

    // Mock AuditLogger
    mockAuditLogger = {
      logSuccess: vi.fn().mockResolvedValue(undefined),
      logDenied: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
    };

    interceptor = new SyncInterceptor({
      permissionEnforcer: mockPermissionEnforcer as unknown as PermissionEnforcer,
      auditLogger: mockAuditLogger as unknown as SyncAuditLogger,
    });
  });

  describe('intercept()', () => {
    it('should execute operation when permission is allowed', async () => {
      // Arrange
      const mockResult = { id: 123, title: 'Test Issue' };
      const mockExecute = vi.fn().mockResolvedValue(mockResult);

      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Operation permitted',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        mockExecute
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.result).toEqual(mockResult);
      expect(mockExecute).toHaveBeenCalledOnce();
      expect(mockAuditLogger.logSuccess).toHaveBeenCalledWith(
        'github',
        'upsert-internal',
        'FS-001',
        expect.any(Number)
      );
    });

    it('should return null and log denial when permission is denied', async () => {
      // Arrange
      const mockExecute = vi.fn().mockResolvedValue({ id: 123 });

      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: false,
        reason: 'canUpsertInternalItems is disabled',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        mockExecute
      );

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.result).toBeNull();
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockAuditLogger.logDenied).toHaveBeenCalledWith(
        'github',
        'upsert-internal',
        'FS-001',
        'canUpsertInternalItems is disabled'
      );
    });

    it('should log error and rethrow when operation fails', async () => {
      // Arrange
      const testError = new Error('Network timeout');
      const mockExecute = vi.fn().mockRejectedValue(testError);

      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Operation permitted',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        mockExecute
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.result).toBeNull();
      expect(result.error).toBe(testError);
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        'github',
        'upsert-internal',
        'FS-001',
        testError
      );
    });

    it('should track operation duration', async () => {
      // Arrange
      const mockExecute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return { id: 123 };
      });

      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Operation permitted',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      const result = await interceptor.intercept(
        'github',
        'upsert-internal',
        'FS-001',
        'internal',
        mockExecute
      );

      // Assert
      // Note: setTimeout(15) can resolve in 9-16ms due to timer resolution
      // Use a relaxed threshold to avoid flaky tests
      expect(result.durationMs).toBeGreaterThanOrEqual(5);
    });
  });

  describe('strict mode', () => {
    it('should throw PermissionDeniedError when strictMode is enabled', async () => {
      // Arrange
      const strictInterceptor = new SyncInterceptor({
        permissionEnforcer: mockPermissionEnforcer as unknown as PermissionEnforcer,
        auditLogger: mockAuditLogger as unknown as SyncAuditLogger,
        strictMode: true,
      });

      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: false,
        reason: 'Access denied',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act & Assert
      await expect(
        strictInterceptor.intercept(
          'github',
          'upsert-internal',
          'FS-001',
          'internal',
          vi.fn()
        )
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe('interceptAuto()', () => {
    it('should detect internal origin for FS-XXX items', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Operation permitted',
        platform: 'github',
        operation: 'read',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptAuto('github', 'read', 'FS-001', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'read',
        'FS-001',
        'internal'
      );
    });

    it('should detect external origin for items ending with E', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Operation permitted',
        platform: 'github',
        operation: 'read',
        itemId: 'EXT-123E',
        origin: 'external',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptAuto('github', 'read', 'EXT-123E', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'read',
        'EXT-123E',
        'external'
      );
    });
  });

  describe('interceptRead()', () => {
    it('should always use read operation type', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Read always allowed',
        platform: 'github',
        operation: 'read',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptRead('github', 'FS-001', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'read',
        'FS-001',
        'internal'
      );
    });
  });

  describe('interceptStatusUpdate()', () => {
    it('should use update-status operation type', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Status update allowed',
        platform: 'github',
        operation: 'update-status',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptStatusUpdate('github', 'FS-001', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'update-status',
        'FS-001',
        'internal'
      );
    });
  });

  describe('interceptUpsert()', () => {
    it('should use upsert-internal for internal items', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Upsert allowed',
        platform: 'github',
        operation: 'upsert-internal',
        itemId: 'FS-001',
        origin: 'internal',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptUpsert('github', 'FS-001', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'upsert-internal',
        'FS-001',
        'internal'
      );
    });

    it('should use upsert-external for external items', async () => {
      // Arrange
      mockPermissionEnforcer.checkAndLog.mockResolvedValue({
        allowed: true,
        reason: 'Upsert allowed',
        platform: 'github',
        operation: 'upsert-external',
        itemId: 'JIRA-123E',
        origin: 'external',
        timestamp: new Date().toISOString(),
      });

      // Act
      await interceptor.interceptUpsert('github', 'JIRA-123E', vi.fn().mockResolvedValue(null));

      // Assert
      expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
        'github',
        'upsert-external',
        'JIRA-123E',
        'external'
      );
    });
  });

  describe('wouldAllow()', () => {
    it('should return true when operation would be allowed', () => {
      // Arrange
      mockPermissionEnforcer.checkPermission.mockReturnValue({
        allowed: true,
        reason: 'Operation permitted',
      });

      // Act
      const result = interceptor.wouldAllow('github', 'upsert-internal', 'FS-001');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when operation would be denied', () => {
      // Arrange
      mockPermissionEnforcer.checkPermission.mockReturnValue({
        allowed: false,
        reason: 'Permission denied',
      });

      // Act
      const result = interceptor.wouldAllow('github', 'upsert-internal', 'FS-001');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getPermissionsSummary()', () => {
    it('should return permission summary from enforcer', () => {
      // Act
      const summary = interceptor.getPermissionsSummary();

      // Assert
      expect(summary).toBe('Test summary');
      expect(mockPermissionEnforcer.getPermissionsSummary).toHaveBeenCalled();
    });
  });

  describe('platform support', () => {
    const platforms: SyncPlatform[] = ['github', 'jira', 'ado'];

    platforms.forEach((platform) => {
      it(`should work with ${platform} platform`, async () => {
        // Arrange
        mockPermissionEnforcer.checkAndLog.mockResolvedValue({
          allowed: true,
          reason: 'Operation permitted',
          platform,
          operation: 'read',
          itemId: 'TEST-001',
          origin: 'internal',
          timestamp: new Date().toISOString(),
        });

        // Act
        const result = await interceptor.intercept(
          platform,
          'read',
          'TEST-001',
          'internal',
          vi.fn().mockResolvedValue({ id: 1 })
        );

        // Assert
        expect(result.allowed).toBe(true);
        expect(mockPermissionEnforcer.checkAndLog).toHaveBeenCalledWith(
          platform,
          'read',
          'TEST-001',
          'internal'
        );
      });
    });
  });
});

describe('PermissionDeniedError', () => {
  it('should contain permission, platform, and operation info', () => {
    // Arrange
    const permission: PermissionResult = {
      allowed: false,
      reason: 'Access denied',
      platform: 'github',
      operation: 'upsert-internal',
      itemId: 'FS-001',
      origin: 'internal',
      timestamp: new Date().toISOString(),
    };

    // Act
    const error = new PermissionDeniedError(permission, 'github', 'upsert-internal');

    // Assert
    expect(error.name).toBe('PermissionDeniedError');
    expect(error.message).toBe('Permission denied: Access denied');
    expect(error.permission).toEqual(permission);
    expect(error.platform).toBe('github');
    expect(error.operation).toBe('upsert-internal');
  });
});

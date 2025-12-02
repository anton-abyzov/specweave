/**
 * Sync Interceptor
 *
 * Central control point for all sync operations. Wraps sync operations with
 * permission checks and audit logging. Implements the interceptor pattern to
 * ensure consistent enforcement across all platforms (GitHub, JIRA, ADO).
 *
 * Pattern:
 *   Request → Interceptor → Permission Check → Execute/Deny → Log → Response
 *
 * @module core/sync/sync-interceptor
 */

import {
  PermissionEnforcer,
  SyncOperation,
  ItemOrigin,
  PermissionResult,
} from './permission-enforcer.js';
import { SyncAuditLogger, AuditLogEntry } from './sync-audit-logger.js';
import { SyncPlatform } from '../types/sync-config.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Interceptor result - wraps the operation result with metadata
 */
export interface InterceptorResult<T> {
  /**
   * Whether the operation was allowed
   */
  allowed: boolean;

  /**
   * The result of the operation (null if denied or error)
   */
  result: T | null;

  /**
   * Permission check result
   */
  permission: PermissionResult;

  /**
   * Duration of the operation in milliseconds
   */
  durationMs: number;

  /**
   * Error if operation failed
   */
  error?: Error;
}

/**
 * Sync interceptor options
 */
export interface SyncInterceptorOptions {
  /**
   * Permission enforcer instance
   */
  permissionEnforcer: PermissionEnforcer;

  /**
   * Audit logger instance
   */
  auditLogger: SyncAuditLogger;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Enable strict mode - throw on permission denial instead of returning null
   * @default false
   */
  strictMode?: boolean;
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly permission: PermissionResult,
    public readonly platform: SyncPlatform,
    public readonly operation: SyncOperation
  ) {
    super(`Permission denied: ${permission.reason}`);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * SyncInterceptor - Central control point for sync operations
 *
 * All sync operations must pass through this interceptor to ensure:
 * 1. Permissions are checked before execution
 * 2. All attempts are logged (success, denied, error)
 * 3. Consistent behavior across all platforms
 *
 * Usage:
 * ```typescript
 * const result = await interceptor.intercept(
 *   'github',
 *   'upsert-internal',
 *   'FS-001',
 *   'internal',
 *   () => this.githubClient.createIssue(item)
 * );
 *
 * if (result.allowed) {
 *   return result.result;
 * } else {
 *   console.log(`Denied: ${result.permission.reason}`);
 * }
 * ```
 */
export class SyncInterceptor {
  private readonly permissionEnforcer: PermissionEnforcer;
  private readonly auditLogger: SyncAuditLogger;
  private readonly logger: Logger;
  private readonly strictMode: boolean;

  constructor(options: SyncInterceptorOptions) {
    this.permissionEnforcer = options.permissionEnforcer;
    this.auditLogger = options.auditLogger;
    this.logger = options.logger ?? consoleLogger;
    this.strictMode = options.strictMode ?? false;
  }

  /**
   * Intercept a sync operation
   *
   * Checks permissions, executes if allowed, logs the result.
   *
   * @param platform - Target platform (github, jira, ado)
   * @param operation - Operation type (read, update-status, upsert-internal, upsert-external)
   * @param itemId - Item ID being operated on
   * @param origin - Item origin (internal or external)
   * @param execute - Function to execute if permitted
   * @returns Interceptor result with operation outcome
   */
  async intercept<T>(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    origin: ItemOrigin,
    execute: () => Promise<T>
  ): Promise<InterceptorResult<T>> {
    const startTime = Date.now();

    // Check permission
    const permission = await this.permissionEnforcer.checkAndLog(
      platform,
      operation,
      itemId,
      origin
    );

    // Handle denial
    if (!permission.allowed) {
      const durationMs = Date.now() - startTime;

      await this.auditLogger.logDenied(
        platform,
        operation,
        itemId,
        permission.reason
      );

      this.logger.debug(
        `[SyncInterceptor] Denied: ${platform}/${operation} for ${itemId} - ${permission.reason}`
      );

      // Strict mode throws instead of returning
      if (this.strictMode) {
        throw new PermissionDeniedError(permission, platform, operation);
      }

      return {
        allowed: false,
        result: null,
        permission,
        durationMs,
      };
    }

    // Execute the operation
    try {
      const result = await execute();
      const durationMs = Date.now() - startTime;

      await this.auditLogger.logSuccess(platform, operation, itemId, durationMs);

      this.logger.debug(
        `[SyncInterceptor] Success: ${platform}/${operation} for ${itemId} (${durationMs}ms)`
      );

      return {
        allowed: true,
        result,
        permission,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      await this.auditLogger.logError(platform, operation, itemId, err);

      this.logger.debug(
        `[SyncInterceptor] Error: ${platform}/${operation} for ${itemId} - ${err.message}`
      );

      return {
        allowed: true, // Was allowed, but failed
        result: null,
        permission,
        durationMs,
        error: err,
      };
    }
  }

  /**
   * Intercept with automatic origin detection
   *
   * Convenience method that auto-detects item origin from itemId.
   * External items end with 'E' or contain '-E-'.
   *
   * @param platform - Target platform
   * @param operation - Operation type
   * @param itemId - Item ID (origin auto-detected)
   * @param execute - Function to execute
   */
  async interceptAuto<T>(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    execute: () => Promise<T>
  ): Promise<InterceptorResult<T>> {
    const origin = this.detectOrigin(itemId);
    return this.intercept(platform, operation, itemId, origin, execute);
  }

  /**
   * Intercept a read operation (always allowed)
   *
   * Convenience method for read operations. Still logs for audit.
   *
   * @param platform - Target platform
   * @param itemId - Item ID
   * @param execute - Function to execute
   */
  async interceptRead<T>(
    platform: SyncPlatform,
    itemId: string,
    execute: () => Promise<T>
  ): Promise<InterceptorResult<T>> {
    return this.intercept(platform, 'read', itemId, 'internal', execute);
  }

  /**
   * Intercept a status update operation
   *
   * @param platform - Target platform
   * @param itemId - Item ID
   * @param execute - Function to execute
   */
  async interceptStatusUpdate<T>(
    platform: SyncPlatform,
    itemId: string,
    execute: () => Promise<T>
  ): Promise<InterceptorResult<T>> {
    const origin = this.detectOrigin(itemId);
    return this.intercept(platform, 'update-status', itemId, origin, execute);
  }

  /**
   * Intercept an upsert operation
   *
   * Automatically determines operation type based on item origin.
   *
   * @param platform - Target platform
   * @param itemId - Item ID
   * @param execute - Function to execute
   */
  async interceptUpsert<T>(
    platform: SyncPlatform,
    itemId: string,
    execute: () => Promise<T>
  ): Promise<InterceptorResult<T>> {
    const origin = this.detectOrigin(itemId);
    const operation: SyncOperation =
      origin === 'external' ? 'upsert-external' : 'upsert-internal';
    return this.intercept(platform, operation, itemId, origin, execute);
  }

  /**
   * Check if an operation would be allowed (without executing)
   *
   * Useful for pre-flight checks before expensive operations.
   *
   * @param platform - Target platform
   * @param operation - Operation type
   * @param itemId - Item ID
   * @returns true if operation would be allowed
   */
  wouldAllow(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string
  ): boolean {
    const origin = this.detectOrigin(itemId);
    const permission = this.permissionEnforcer.checkPermission(
      platform,
      operation,
      itemId,
      origin
    );
    return permission.allowed;
  }

  /**
   * Get permission summary for a platform
   *
   * @param platform - Target platform
   * @returns Human-readable summary
   */
  getPermissionsSummary(): string {
    return this.permissionEnforcer.getPermissionsSummary().summary;
  }

  /**
   * Detect item origin from ID
   *
   * External items end with 'E' or contain '-E-'.
   */
  private detectOrigin(itemId: string): ItemOrigin {
    if (itemId.endsWith('E') || itemId.includes('-E-')) {
      return 'external';
    }
    return 'internal';
  }
}

/**
 * Create a SyncInterceptor with default configuration
 *
 * @param permissionEnforcer - Permission enforcer instance
 * @param specweavePath - Path to .specweave directory
 * @param logger - Optional logger
 */
export async function createSyncInterceptor(
  permissionEnforcer: PermissionEnforcer,
  specweavePath: string,
  logger?: Logger
): Promise<SyncInterceptor> {
  const { SyncAuditLogger: AuditLoggerClass } = await import('./sync-audit-logger.js');

  const auditLogger = new AuditLoggerClass({
    specweavePath,
    logger,
  });

  return new SyncInterceptor({
    permissionEnforcer,
    auditLogger,
    logger,
  });
}

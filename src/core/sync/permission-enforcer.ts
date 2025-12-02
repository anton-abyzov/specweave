/**
 * Permission Enforcer
 *
 * Validates sync operations against configured permissions before execution.
 * Uses the existing SyncSettings from config.json (set during specweave init).
 * Logs all permission decisions for audit.
 *
 * IMPORTANT: This integrates with the existing sync.settings configuration:
 * - canUpsertInternalItems: CREATE/UPDATE internal items in external tools
 * - canUpdateExternalItems: UPDATE items created externally
 * - canUpdateStatus: UPDATE status field for both internal and external items
 *
 * @module core/sync/permission-enforcer
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  SyncSettings,
  DEFAULT_SYNC_SETTINGS,
} from '../types/sync-settings.js';
import { SyncPlatform } from '../types/sync-config.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Sync operation types
 *
 * Maps to existing SyncSettings:
 * - 'read' → always allowed (reading is safe)
 * - 'update-status' → canUpdateStatus
 * - 'upsert-internal' → canUpsertInternalItems
 * - 'upsert-external' → canUpdateExternalItems
 */
export type SyncOperation =
  | 'read'
  | 'update-status'
  | 'upsert-internal'
  | 'upsert-external';

/**
 * Item origin - where the item was created
 */
export type ItemOrigin = 'internal' | 'external';

/**
 * Permission check result
 */
export interface PermissionResult {
  /**
   * Whether the operation is allowed
   */
  allowed: boolean;

  /**
   * Reason for the decision
   */
  reason: string;

  /**
   * Platform checked
   */
  platform: SyncPlatform;

  /**
   * Operation attempted
   */
  operation: SyncOperation;

  /**
   * Item ID involved
   */
  itemId: string;

  /**
   * Item origin
   */
  origin: ItemOrigin;

  /**
   * ISO timestamp of the check
   */
  timestamp: string;
}

/**
 * Permission enforcer options
 */
export interface PermissionEnforcerOptions {
  /**
   * SyncSettings from config.json (set during specweave init)
   * If not provided, uses defaults (all permissions disabled)
   */
  settings?: SyncSettings;

  /**
   * Path to .specweave directory for logging
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Enable decision logging to file
   * @default true
   */
  enableLogging?: boolean;
}

/**
 * PermissionEnforcer - Validates sync operations before execution
 *
 * Uses the existing SyncSettings from config.json that are configured during
 * `specweave init`. This ensures consistency with user's sync preferences.
 *
 * Features:
 * - Check permissions before any sync operation
 * - Differentiate between internal and external items
 * - Log all decisions for audit
 */
export class PermissionEnforcer {
  private settings: SyncSettings;
  private readonly logPath: string;
  private readonly logger: Logger;
  private readonly enableLogging: boolean;

  constructor(options: PermissionEnforcerOptions = {}) {
    this.settings = options.settings ?? { ...DEFAULT_SYNC_SETTINGS };

    const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
    this.logPath = path.join(specweavePath, 'logs', 'sync', 'permissions.jsonl');
    this.logger = options.logger ?? consoleLogger;
    this.enableLogging = options.enableLogging ?? true;
  }

  /**
   * Check if an operation is permitted for an item
   *
   * @param platform - Target platform (github, jira, ado)
   * @param operation - Operation to perform
   * @param itemId - Item ID being operated on
   * @param origin - Whether item is internal or external
   * @returns Permission result
   */
  checkPermission(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    origin: ItemOrigin = 'internal'
  ): PermissionResult {
    const allowed = this.isOperationAllowed(operation, origin);

    const reason = allowed
      ? `Operation "${operation}" permitted for ${origin} item`
      : this.getDenialReason(operation, origin);

    const result: PermissionResult = {
      allowed,
      reason,
      platform,
      operation,
      itemId,
      origin,
      timestamp: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Check permission and log the decision
   *
   * @param platform - Target platform
   * @param operation - Operation to perform
   * @param itemId - Item ID being operated on
   * @param origin - Whether item is internal or external
   * @returns Permission result
   */
  async checkAndLog(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    origin: ItemOrigin = 'internal'
  ): Promise<PermissionResult> {
    const result = this.checkPermission(platform, operation, itemId, origin);

    // Log the decision
    await this.logDecision(result);

    // Log to console if denied
    if (!result.allowed) {
      this.logger.debug(`Permission denied: ${result.reason} (${itemId})`);
    }

    return result;
  }

  /**
   * Convenience method: Check if upsert is allowed
   *
   * Automatically determines origin from itemId (ends with 'E' = external)
   *
   * @param platform - Target platform
   * @param itemId - Item ID (e.g., "FS-001" or "FS-001E")
   * @returns Permission result
   */
  checkUpsertPermission(
    platform: SyncPlatform,
    itemId: string
  ): PermissionResult {
    const origin = this.detectOrigin(itemId);
    const operation: SyncOperation = origin === 'external' ? 'upsert-external' : 'upsert-internal';
    return this.checkPermission(platform, operation, itemId, origin);
  }

  /**
   * Convenience method: Check if status update is allowed
   *
   * @param platform - Target platform
   * @param itemId - Item ID
   * @returns Permission result
   */
  checkStatusUpdatePermission(
    platform: SyncPlatform,
    itemId: string
  ): PermissionResult {
    const origin = this.detectOrigin(itemId);
    return this.checkPermission(platform, 'update-status', itemId, origin);
  }

  /**
   * Update settings at runtime
   *
   * @param settings - New sync settings (partial update supported)
   */
  updateSettings(settings: Partial<SyncSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.logger.debug('Permission enforcer settings updated');
  }

  /**
   * Get current settings
   *
   * @returns Current sync settings
   */
  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  /**
   * Check if sync is enabled for any operation
   *
   * @returns true if any sync operation is enabled
   */
  isSyncEnabled(): boolean {
    return (
      this.settings.canUpsertInternalItems ||
      this.settings.canUpdateExternalItems ||
      this.settings.canUpdateStatus
    );
  }

  /**
   * Get a human-readable summary of current permissions
   *
   * @returns Summary object
   */
  getPermissionsSummary(): {
    canCreateInternal: boolean;
    canUpdateExternal: boolean;
    canUpdateStatus: boolean;
    summary: string;
  } {
    const parts: string[] = [];
    if (this.settings.canUpsertInternalItems) {
      parts.push('create/update internal items');
    }
    if (this.settings.canUpdateExternalItems) {
      parts.push('update external items');
    }
    if (this.settings.canUpdateStatus) {
      parts.push('update status');
    }

    return {
      canCreateInternal: this.settings.canUpsertInternalItems,
      canUpdateExternal: this.settings.canUpdateExternalItems,
      canUpdateStatus: this.settings.canUpdateStatus,
      summary: parts.length > 0 ? `Allowed: ${parts.join(', ')}` : 'All sync disabled (read-only)',
    };
  }

  /**
   * Detect item origin from ID
   *
   * External items have 'E' suffix (e.g., FS-001E)
   */
  private detectOrigin(itemId: string): ItemOrigin {
    // External items end with 'E' or have '-E-' in the ID
    if (itemId.endsWith('E') || itemId.includes('-E-')) {
      return 'external';
    }
    return 'internal';
  }

  /**
   * Check if operation is allowed by current settings
   */
  private isOperationAllowed(operation: SyncOperation, origin: ItemOrigin): boolean {
    switch (operation) {
      case 'read':
        // Reading is always allowed
        return true;

      case 'update-status':
        // Status updates controlled by canUpdateStatus
        return this.settings.canUpdateStatus;

      case 'upsert-internal':
        // Creating/updating internal items controlled by canUpsertInternalItems
        return this.settings.canUpsertInternalItems;

      case 'upsert-external':
        // Updating external items controlled by canUpdateExternalItems
        return this.settings.canUpdateExternalItems;

      default:
        return false;
    }
  }

  /**
   * Get denial reason for logging
   */
  private getDenialReason(operation: SyncOperation, origin: ItemOrigin): string {
    switch (operation) {
      case 'update-status':
        return 'Status updates disabled. Enable sync.settings.canUpdateStatus in config.';

      case 'upsert-internal':
        return 'Creating/updating internal items disabled. Enable sync.settings.canUpsertInternalItems in config.';

      case 'upsert-external':
        return 'Updating external items disabled. Enable sync.settings.canUpdateExternalItems in config.';

      default:
        return `Operation "${operation}" not permitted for ${origin} items.`;
    }
  }

  /**
   * Log permission decision to file
   */
  async logDecision(result: PermissionResult): Promise<void> {
    if (!this.enableLogging) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      await fs.mkdir(dir, { recursive: true });

      // Append to JSONL file
      const line = JSON.stringify(result) + '\n';
      await fs.appendFile(this.logPath, line, 'utf-8');
    } catch (error) {
      // Log errors but don't fail the operation
      this.logger.debug(`Failed to log permission decision: ${error}`);
    }
  }

  /**
   * Get log file path (for testing/debugging)
   */
  getLogPath(): string {
    return this.logPath;
  }
}

/**
 * Create a PermissionEnforcer from config.json
 *
 * Reads the existing sync.settings from config.json that was set during
 * `specweave init` and creates a PermissionEnforcer with those settings.
 *
 * @param specweavePath - Path to .specweave directory
 * @param logger - Optional logger
 * @returns PermissionEnforcer instance
 */
export async function createPermissionEnforcerFromConfig(
  specweavePath: string = path.join(process.cwd(), '.specweave'),
  logger?: Logger
): Promise<PermissionEnforcer> {
  const configPath = path.join(specweavePath, 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Extract sync settings from config
    const settings: SyncSettings = {
      canUpsertInternalItems: config?.sync?.settings?.canUpsertInternalItems ?? false,
      canUpdateExternalItems: config?.sync?.settings?.canUpdateExternalItems ?? false,
      canUpdateStatus: config?.sync?.settings?.canUpdateStatus ?? false,
    };

    return new PermissionEnforcer({
      settings,
      specweavePath,
      logger,
    });
  } catch {
    // Return enforcer with default (disabled) settings
    return new PermissionEnforcer({
      settings: DEFAULT_SYNC_SETTINGS,
      specweavePath,
      logger,
    });
  }
}

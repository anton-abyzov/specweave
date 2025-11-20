/**
 * Permission Checker - Controls what SpecWeave can modify in external tools
 *
 * Provides centralized permission checking for external tool sync operations.
 * All permissions default to false (explicit opt-in required).
 *
 * Usage:
 * ```typescript
 * const checker = await PermissionChecker.load(projectRoot);
 *
 * if (checker.canUpsertInternalItems()) {
 *   await createGitHubIssue(item);
 * }
 *
 * if (checker.canUpdateStatus()) {
 *   await updateIssueStatus(issueNumber, 'Done');
 * }
 * ```
 */

import fs from 'fs-extra';
import path from 'path';
import { SyncSettings, DEFAULT_SYNC_SETTINGS, migrateSyncDirection } from '../types/sync-settings.js';

/**
 * Configuration structure from .specweave/config.json
 */
export interface SpecWeaveConfig {
  sync?: {
    settings?: Partial<SyncSettings> & {
      // Legacy field (for migration)
      syncDirection?: 'bidirectional' | 'one-way';
      // Other global settings
      autoDetectProject?: boolean;
      defaultTimeRange?: string;
      rateLimitProtection?: boolean;
    };
  };
}

/**
 * Permission checker for external tool sync operations
 */
export class PermissionChecker {
  private settings: SyncSettings;

  /**
   * Create permission checker with explicit settings
   * @param settings - Sync permission settings
   */
  constructor(settings: SyncSettings) {
    this.settings = settings;
  }

  /**
   * Load permission settings from .specweave/config.json
   * @param projectRoot - Project root directory
   * @returns Permission checker instance
   */
  static async load(projectRoot: string): Promise<PermissionChecker> {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config: SpecWeaveConfig = JSON.parse(configContent);

      // Extract sync settings
      const syncSettings = config.sync?.settings || {};

      // Handle migration from old syncDirection format
      if ('syncDirection' in syncSettings && syncSettings.syncDirection) {
        const migratedSettings = migrateSyncDirection(syncSettings.syncDirection);
        return new PermissionChecker(migratedSettings);
      }

      // Use new permission settings (with defaults)
      const settings: SyncSettings = {
        canUpsertInternalItems: syncSettings.canUpsertInternalItems ?? DEFAULT_SYNC_SETTINGS.canUpsertInternalItems,
        canUpdateExternalItems: syncSettings.canUpdateExternalItems ?? DEFAULT_SYNC_SETTINGS.canUpdateExternalItems,
        canUpdateStatus: syncSettings.canUpdateStatus ?? DEFAULT_SYNC_SETTINGS.canUpdateStatus,
      };

      return new PermissionChecker(settings);
    } catch (error) {
      // If config.json doesn't exist or is invalid, use safe defaults (all false)
      return new PermissionChecker(DEFAULT_SYNC_SETTINGS);
    }
  }

  /**
   * Check if SpecWeave can CREATE and UPDATE internal work items in external tools
   *
   * UPSERT = CREATE initially + UPDATE as work progresses
   * - Controls: Title, Description/Body, Acceptance Criteria for INTERNAL items
   * - Flow: increment → living spec → CREATE external item → UPDATE on task completion
   * - If false: Stops before external item creation (local-only workflow)
   *
   * @returns true if UPSERT (CREATE + UPDATE) is allowed for internal items
   */
  canUpsertInternalItems(): boolean {
    return this.settings.canUpsertInternalItems;
  }

  /**
   * Check if SpecWeave can UPDATE work items created externally
   *
   * UPDATE = Full content updates (title, description, ACs, tasks, comments)
   * - Controls: FULL content updates of EXTERNAL items
   * - Flow: increment progress → living spec → UPDATE external tool (full sync)
   * - If false: External items remain read-only snapshots (no sync back)
   *
   * @returns true if UPDATE is allowed for external items (full content updates)
   */
  canUpdateExternalItems(): boolean {
    return this.settings.canUpdateExternalItems;
  }

  /**
   * Check if SpecWeave can UPDATE status of work items
   *
   * STATUS = Status field ONLY (for BOTH internal AND external items)
   * - Controls: Status field updates after all ACs/tasks complete
   * - Flow: Both flows (internal and external items)
   * - If false: No status updates regardless of item origin (manual status management)
   *
   * @returns true if status updates are allowed
   */
  canUpdateStatus(): boolean {
    return this.settings.canUpdateStatus;
  }

  /**
   * Get all permission settings (for logging/debugging)
   * @returns Current permission settings
   */
  getSettings(): Readonly<SyncSettings> {
    return { ...this.settings };
  }

  /**
   * Get human-readable description of current permissions
   * @returns Permission summary string
   */
  getPermissionSummary(): string {
    const permissions: string[] = [];

    if (this.canUpsertInternalItems()) {
      permissions.push('✅ Can CREATE and UPDATE internal items');
    } else {
      permissions.push('❌ Cannot create internal items (local-only)');
    }

    if (this.canUpdateExternalItems()) {
      permissions.push('✅ Can UPDATE external items (full content)');
    } else {
      permissions.push('❌ Cannot update external items (read-only)');
    }

    if (this.canUpdateStatus()) {
      permissions.push('✅ Can UPDATE status (both internal & external)');
    } else {
      permissions.push('❌ Cannot update status (manual only)');
    }

    return permissions.join('\n');
  }

  /**
   * Validate that operation is allowed, throw error if not
   * @param operation - Operation type
   * @throws Error if operation not allowed
   */
  requirePermission(operation: 'upsert-internal' | 'update-external' | 'update-status'): void {
    switch (operation) {
      case 'upsert-internal':
        if (!this.canUpsertInternalItems()) {
          throw new Error(
            'Permission denied: canUpsertInternalItems=false. ' +
              'Enable in .specweave/config.json under sync.settings to create external items.'
          );
        }
        break;

      case 'update-external':
        if (!this.canUpdateExternalItems()) {
          throw new Error(
            'Permission denied: canUpdateExternalItems=false. ' +
              'Enable in .specweave/config.json under sync.settings to update external items.'
          );
        }
        break;

      case 'update-status':
        if (!this.canUpdateStatus()) {
          throw new Error(
            'Permission denied: canUpdateStatus=false. ' +
              'Enable in .specweave/config.json under sync.settings to update status.'
          );
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

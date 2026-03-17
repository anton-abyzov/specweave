/**
 * ADO Permission Gate
 *
 * Validates that sync permissions are enabled before allowing ADO write operations.
 * This ensures manual ADO commands respect the same permission settings as the
 * sync-coordinator.
 *
 * Usage:
 * ```typescript
 * const gate = await createAdoPermissionGate();
 * const result = gate.checkWritePermission();
 * if (!result.allowed) {
 *   console.log(result.reason);
 *   return;
 * }
 * ```
 *
 * @module ado-permission-gate
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /**
   * Whether the operation is allowed
   */
  allowed: boolean;

  /**
   * Human-readable reason for the decision
   */
  reason: string;

  /**
   * Suggested action if permission denied
   */
  suggestedAction?: string;

  /**
   * Which setting controls this permission
   */
  settingPath?: string;
}

/**
 * Sync settings from config.json
 */
export interface SyncSettings {
  canUpsertInternalItems: boolean;
  canUpdateExternalItems: boolean;
  canUpdateStatus: boolean;
}

/**
 * Resolve preset permissions for fallback when explicit settings are absent
 */
function resolvePresetPermissions(preset?: string): { canUpsert: boolean; canUpdateStatus: boolean } {
  switch (preset) {
    case 'bidirectional': return { canUpsert: true, canUpdateStatus: true };
    case 'push-only': return { canUpsert: true, canUpdateStatus: true };
    case 'full-control': return { canUpsert: true, canUpdateStatus: true };
    case 'read-only': return { canUpsert: false, canUpdateStatus: false };
    default: return { canUpsert: false, canUpdateStatus: false };
  }
}

/**
 * Default settings (all disabled for safety)
 */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  canUpsertInternalItems: false,
  canUpdateExternalItems: false,
  canUpdateStatus: false,
};

/**
 * ADO Permission Gate
 *
 * Checks permission settings before allowing ADO write operations.
 */
export class AdoPermissionGate {
  private settings: SyncSettings;
  private configPath: string;

  constructor(settings: SyncSettings, configPath: string) {
    this.settings = settings;
    this.configPath = configPath;
  }

  /**
   * Check if write operations (create/update work items) are allowed
   *
   * Requires: canUpdateExternalItems = true
   */
  checkWritePermission(): PermissionCheckResult {
    if (this.settings.canUpdateExternalItems) {
      return {
        allowed: true,
        reason: 'Write operations permitted (canUpdateExternalItems=true)',
      };
    }

    return {
      allowed: false,
      reason: 'Permission denied: External tool updates are disabled.',
      suggestedAction: `Enable sync.settings.canUpdateExternalItems in ${this.configPath}`,
      settingPath: 'sync.settings.canUpdateExternalItems',
    };
  }

  /**
   * Check if status updates are allowed
   *
   * Requires: canUpdateStatus = true
   */
  checkStatusPermission(): PermissionCheckResult {
    if (this.settings.canUpdateStatus) {
      return {
        allowed: true,
        reason: 'Status updates permitted (canUpdateStatus=true)',
      };
    }

    return {
      allowed: false,
      reason: 'Permission denied: Status updates are disabled.',
      suggestedAction: `Enable sync.settings.canUpdateStatus in ${this.configPath}`,
      settingPath: 'sync.settings.canUpdateStatus',
    };
  }

  /**
   * Check if internal item creation is allowed
   *
   * Requires: canUpsertInternalItems = true
   */
  checkCreateInternalPermission(): PermissionCheckResult {
    if (this.settings.canUpsertInternalItems) {
      return {
        allowed: true,
        reason: 'Internal item creation permitted (canUpsertInternalItems=true)',
      };
    }

    return {
      allowed: false,
      reason: 'Permission denied: Creating internal items is disabled.',
      suggestedAction: `Enable sync.settings.canUpsertInternalItems in ${this.configPath}`,
      settingPath: 'sync.settings.canUpsertInternalItems',
    };
  }

  /**
   * Get current settings
   */
  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  /**
   * Get human-readable permission summary
   */
  getPermissionSummary(): string {
    const parts: string[] = [];

    if (this.settings.canUpdateExternalItems) {
      parts.push('create/update ADO items');
    }
    if (this.settings.canUpdateStatus) {
      parts.push('update status');
    }
    if (this.settings.canUpsertInternalItems) {
      parts.push('create internal items');
    }

    if (parts.length === 0) {
      return 'All ADO write operations disabled (read-only mode)';
    }

    return `Allowed: ${parts.join(', ')}`;
  }
}

/**
 * Create an AdoPermissionGate from config.json
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns AdoPermissionGate instance
 */
export async function createAdoPermissionGate(
  projectRoot: string = process.cwd()
): Promise<AdoPermissionGate> {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // v1.0.240 FIX: Honor preset (e.g., "bidirectional") when explicit settings absent
    const preset = config?.sync?.preset;
    const presetDefaults = resolvePresetPermissions(preset);

    const settings: SyncSettings = {
      canUpsertInternalItems: config?.sync?.settings?.canUpsertInternalItems ?? false,
      canUpdateExternalItems: config?.sync?.settings?.canUpdateExternalItems ?? presetDefaults.canUpsert,
      canUpdateStatus: config?.sync?.settings?.canUpdateStatus ?? presetDefaults.canUpdateStatus,
    };

    return new AdoPermissionGate(settings, configPath);
  } catch {
    // Return gate with default (disabled) settings if config not found
    return new AdoPermissionGate(DEFAULT_SYNC_SETTINGS, configPath);
  }
}

/**
 * Quick check: Are ADO write operations allowed?
 *
 * Convenience function for simple permission checks.
 *
 * @param projectRoot - Project root directory
 * @returns Permission check result
 */
export async function canWriteToAdo(
  projectRoot: string = process.cwd()
): Promise<PermissionCheckResult> {
  const gate = await createAdoPermissionGate(projectRoot);
  return gate.checkWritePermission();
}

/**
 * Quick check: Are ADO status updates allowed?
 *
 * @param projectRoot - Project root directory
 * @returns Permission check result
 */
export async function canUpdateAdoStatus(
  projectRoot: string = process.cwd()
): Promise<PermissionCheckResult> {
  const gate = await createAdoPermissionGate(projectRoot);
  return gate.checkStatusPermission();
}

export default AdoPermissionGate;

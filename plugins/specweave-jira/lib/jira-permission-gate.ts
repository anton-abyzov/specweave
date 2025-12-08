/**
 * JIRA Permission Gate
 *
 * Validates that sync permissions are enabled before allowing JIRA write operations.
 * This ensures manual JIRA commands respect the same permission settings as the
 * sync-coordinator.
 *
 * Usage:
 * ```typescript
 * const gate = await createJiraPermissionGate();
 * const result = gate.checkWritePermission();
 * if (!result.allowed) {
 *   console.log(result.reason);
 *   return;
 * }
 * ```
 *
 * @module jira-permission-gate
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
 * Default settings (all disabled for safety)
 */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  canUpsertInternalItems: false,
  canUpdateExternalItems: false,
  canUpdateStatus: false,
};

/**
 * JIRA Permission Gate
 *
 * Checks permission settings before allowing JIRA write operations.
 */
export class JiraPermissionGate {
  private settings: SyncSettings;
  private configPath: string;

  constructor(settings: SyncSettings, configPath: string) {
    this.settings = settings;
    this.configPath = configPath;
  }

  /**
   * Check if write operations (create/update issues) are allowed
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
      reason: 'Permission denied: JIRA updates are disabled.',
      suggestedAction: `Enable sync.settings.canUpdateExternalItems in ${this.configPath}`,
      settingPath: 'sync.settings.canUpdateExternalItems',
    };
  }

  /**
   * Check if status updates (transitions) are allowed
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
      reason: 'Permission denied: JIRA status transitions are disabled.',
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
   * Check if close operation is allowed (requires both write AND status)
   *
   * Requires: canUpdateExternalItems = true AND canUpdateStatus = true
   */
  checkClosePermission(): PermissionCheckResult {
    const writeCheck = this.checkWritePermission();
    const statusCheck = this.checkStatusPermission();

    if (writeCheck.allowed && statusCheck.allowed) {
      return {
        allowed: true,
        reason: 'Close operations permitted (canUpdateExternalItems=true, canUpdateStatus=true)',
      };
    }

    const missingPermissions: string[] = [];
    if (!writeCheck.allowed) {
      missingPermissions.push('canUpdateExternalItems');
    }
    if (!statusCheck.allowed) {
      missingPermissions.push('canUpdateStatus');
    }

    return {
      allowed: false,
      reason: `Permission denied: Closing JIRA issues requires ${missingPermissions.join(' and ')}.`,
      suggestedAction: `Enable ${missingPermissions.map(p => `sync.settings.${p}`).join(' and ')} in ${this.configPath}`,
      settingPath: missingPermissions.map(p => `sync.settings.${p}`).join(', '),
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
      parts.push('create/update JIRA issues');
    }
    if (this.settings.canUpdateStatus) {
      parts.push('transition issue status');
    }
    if (this.settings.canUpsertInternalItems) {
      parts.push('create internal items');
    }

    if (parts.length === 0) {
      return 'All JIRA write operations disabled (read-only mode)';
    }

    return `Allowed: ${parts.join(', ')}`;
  }
}

/**
 * Create a JiraPermissionGate from config.json
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns JiraPermissionGate instance
 */
export async function createJiraPermissionGate(
  projectRoot: string = process.cwd()
): Promise<JiraPermissionGate> {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    const settings: SyncSettings = {
      canUpsertInternalItems: config?.sync?.settings?.canUpsertInternalItems ?? false,
      canUpdateExternalItems: config?.sync?.settings?.canUpdateExternalItems ?? false,
      canUpdateStatus: config?.sync?.settings?.canUpdateStatus ?? false,
    };

    return new JiraPermissionGate(settings, configPath);
  } catch {
    // Return gate with default (disabled) settings if config not found
    return new JiraPermissionGate(DEFAULT_SYNC_SETTINGS, configPath);
  }
}

/**
 * Quick check: Are JIRA write operations allowed?
 *
 * Convenience function for simple permission checks.
 *
 * @param projectRoot - Project root directory
 * @returns Permission check result
 */
export async function canWriteToJira(
  projectRoot: string = process.cwd()
): Promise<PermissionCheckResult> {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkWritePermission();
}

/**
 * Quick check: Are JIRA status updates allowed?
 *
 * @param projectRoot - Project root directory
 * @returns Permission check result
 */
export async function canUpdateJiraStatus(
  projectRoot: string = process.cwd()
): Promise<PermissionCheckResult> {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkStatusPermission();
}

/**
 * Quick check: Can JIRA issues be closed?
 *
 * @param projectRoot - Project root directory
 * @returns Permission check result
 */
export async function canCloseJiraIssue(
  projectRoot: string = process.cwd()
): Promise<PermissionCheckResult> {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkClosePermission();
}

export default JiraPermissionGate;

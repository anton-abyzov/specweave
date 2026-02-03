/**
 * Shared permission gate for external sync operations (GitHub, JIRA, ADO)
 * Extracts the identical permission checking pattern from all sync plugins.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface SyncPermissionResult {
  canRead: boolean;
  canWrite: boolean;
  message: string;
  configPath: string;
}

export interface SyncConfig {
  sync?: {
    enabled?: boolean;
    settings?: {
      canUpdateExternalItems?: boolean;
    };
  };
}

/**
 * Check if external sync operations are permitted.
 * Used by GitHub, JIRA, and ADO sync commands.
 *
 * @param projectRoot - Root directory of the project
 * @param toolName - Display name of the tool (e.g., "GitHub", "JIRA", "Azure DevOps")
 * @returns Permission result with read/write capabilities
 */
export function checkSyncPermissions(
  projectRoot: string,
  toolName: string
): SyncPermissionResult {
  const configPath = join(projectRoot, '.specweave', 'config.json');

  // Default: read-only
  const result: SyncPermissionResult = {
    canRead: true,
    canWrite: false,
    message: '',
    configPath
  };

  if (!existsSync(configPath)) {
    result.message = `Config not found at ${configPath}`;
    return result;
  }

  try {
    const config: SyncConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    result.canWrite = config?.sync?.settings?.canUpdateExternalItems ?? false;

    if (!result.canWrite) {
      result.message = formatPermissionDeniedMessage(toolName);
    }
  } catch {
    result.message = `Failed to read config at ${configPath}`;
  }

  return result;
}

/**
 * Format a consistent permission denied message for all external tools.
 */
export function formatPermissionDeniedMessage(toolName: string): string {
  const toolLower = toolName.toLowerCase().replace(/\s+/g, '-');

  return `
❌ Permission Denied: ${toolName} Write Operations Disabled

Cannot push changes to ${toolName} (sync.settings.canUpdateExternalItems = false).

Options:
1. Enable writes: Set canUpdateExternalItems to true in config.json
   {
     "sync": {
       "settings": {
         "canUpdateExternalItems": true
       }
     }
   }

2. Pull-only mode: /sw-${toolLower}:sync \${incrementId} --direction from-${toolLower}

3. View status: /sw-${toolLower}:status \${incrementId}
`.trim();
}

/**
 * Check if sync is enabled at all for this project.
 */
export function isSyncEnabled(projectRoot: string): boolean {
  const configPath = join(projectRoot, '.specweave', 'config.json');

  if (!existsSync(configPath)) {
    return false;
  }

  try {
    const config: SyncConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config?.sync?.enabled !== false; // Default to enabled
  } catch {
    return false;
  }
}

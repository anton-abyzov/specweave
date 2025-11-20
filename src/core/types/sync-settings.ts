/**
 * Sync Settings - Controls what SpecWeave can modify in external tools
 *
 * These settings determine how Living Docs sync with external tools (GitHub, JIRA, ADO).
 * All settings default to false for safety (explicit opt-in required).
 *
 * Storage: .specweave/config.json under sync.settings
 */

/**
 * Three independent permission flags for external tool sync
 */
export interface SyncSettings {
  /**
   * Q1: Can SpecWeave CREATE and UPDATE internal work items in external tools?
   *
   * UPSERT = CREATE initially + UPDATE as work progresses
   * - Controls: Title, Description/Body, Acceptance Criteria for INTERNAL items
   * - Flow: increment → living spec → CREATE external item → UPDATE on task completion
   * - If false: Stops before external item creation (local-only workflow)
   *
   * @default false (safer, no external items created)
   */
  canUpsertInternalItems: boolean;

  /**
   * Q2: Can SpecWeave UPDATE work items created externally?
   *
   * UPDATE = Full content updates (title, description, ACs, tasks, comments)
   * - Controls: FULL content updates of EXTERNAL items
   * - Flow: increment progress → living spec → UPDATE external tool (full sync)
   * - If false: External items remain read-only snapshots (no sync back)
   *
   * @default false (safer, external items remain read-only)
   */
  canUpdateExternalItems: boolean;

  /**
   * Q3: Can SpecWeave UPDATE status of work items?
   *
   * STATUS = Status field ONLY (for BOTH internal AND external items)
   * - Controls: Status field updates after all ACs/tasks complete
   * - Flow: Both flows (internal and external items)
   * - If false: No status updates regardless of item origin (manual status management)
   *
   * @default false (safer, status updated manually in external tool)
   */
  canUpdateStatus: boolean;
}

/**
 * Default sync settings (all permissions disabled for safety)
 */
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  canUpsertInternalItems: false,
  canUpdateExternalItems: false,
  canUpdateStatus: false,
};

/**
 * Type guard to check if an object is valid SyncSettings
 */
export function isValidSyncSettings(obj: any): obj is SyncSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.canUpsertInternalItems === 'boolean' &&
    typeof obj.canUpdateExternalItems === 'boolean' &&
    typeof obj.canUpdateStatus === 'boolean'
  );
}

/**
 * Migrate old syncDirection to new SyncSettings
 *
 * @param syncDirection - Old syncDirection value ('bidirectional' | 'export' | 'import' | 'to-external' | 'from-external' | undefined)
 * @returns SyncSettings with appropriate permissions
 */
export function migrateSyncDirection(syncDirection?: string | null): SyncSettings {
  if (syncDirection === 'bidirectional') {
    // Old bidirectional mode → enable all permissions
    return {
      canUpsertInternalItems: true,
      canUpdateExternalItems: true,
      canUpdateStatus: true,
    };
  }

  if (syncDirection === 'export' || syncDirection === 'to-external') {
    // Old export-only mode → create/update internal items only
    return {
      canUpsertInternalItems: true,
      canUpdateExternalItems: false,
      canUpdateStatus: false,
    };
  }

  if (syncDirection === 'import' || syncDirection === 'from-external') {
    // Old import-only mode → status updates only
    return {
      canUpsertInternalItems: false,
      canUpdateExternalItems: false,
      canUpdateStatus: true,
    };
  }

  // Old one-way or missing or unknown → disable all (safer default)
  return { ...DEFAULT_SYNC_SETTINGS };
}

/**
 * Validate SyncSettings object
 *
 * @param settings - Settings to validate
 * @throws Error if settings are invalid
 */
export function validateSyncSettings(settings: SyncSettings): void {
  if (!settings || typeof settings !== 'object') {
    throw new Error('SyncSettings must be a non-null object');
  }

  if (typeof settings.canUpsertInternalItems !== 'boolean') {
    throw new Error('SyncSettings.canUpsertInternalItems must be a boolean (required)');
  }

  if (typeof settings.canUpdateExternalItems !== 'boolean') {
    throw new Error('SyncSettings.canUpdateExternalItems must be a boolean (required)');
  }

  if (typeof settings.canUpdateStatus !== 'boolean') {
    throw new Error('SyncSettings.canUpdateStatus must be a boolean (required)');
  }
}

/**
 * Merge user-provided settings with defaults (fill in missing fields)
 */
export function mergeSyncSettings(
  userSettings: Partial<SyncSettings> | undefined
): SyncSettings {
  return {
    ...DEFAULT_SYNC_SETTINGS,
    ...userSettings,
  };
}

/**
 * Sync Config — Permission Presets & Config Validation
 *
 * ADR-0236: Named presets replace 8+ booleans.
 * 4 presets: read-only, push-only, bidirectional, full-control
 * With optional per-flag overrides.
 */

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------

export type SyncPreset = 'read-only' | 'push-only' | 'bidirectional' | 'full-control';

export interface SyncPermissions {
  canRead: boolean;
  canUpdateStatus: boolean;
  canUpsert: boolean;
  canDelete: boolean;
}

/** Legacy settings from the old boolean-based system */
export interface LegacySyncSettings {
  canUpsertInternalItems?: boolean;
  canUpdateExternalItems?: boolean;
  canUpdateStatus?: boolean;
  autoSyncOnCompletion?: boolean;
}

// ---------------------------------------------------------------------------
// Preset defaults
// ---------------------------------------------------------------------------

export const PRESET_DEFAULTS: Record<SyncPreset, SyncPermissions> = {
  'read-only': {
    canRead: true,
    canUpdateStatus: false,
    canUpsert: false,
    canDelete: false,
  },
  'push-only': {
    canRead: false,
    canUpdateStatus: true,
    canUpsert: true,
    canDelete: false,
  },
  bidirectional: {
    canRead: true,
    canUpdateStatus: true,
    canUpsert: true,
    canDelete: false,
  },
  'full-control': {
    canRead: true,
    canUpdateStatus: true,
    canUpsert: true,
    canDelete: true,
  },
};

// ---------------------------------------------------------------------------
// Permission resolution
// ---------------------------------------------------------------------------

/**
 * Resolve effective permissions from preset + overrides + legacy settings.
 *
 * Priority: preset → overrides → effective
 * If no preset, falls back to legacy boolean settings.
 */
export function resolvePermissions(
  preset?: SyncPreset,
  overrides?: Partial<SyncPermissions>,
  legacySettings?: LegacySyncSettings,
): SyncPermissions {
  let base: SyncPermissions;

  if (preset && PRESET_DEFAULTS[preset]) {
    base = { ...PRESET_DEFAULTS[preset] };
  } else if (legacySettings) {
    // Backward compat: map old booleans to new permissions
    base = {
      canRead: legacySettings.canUpdateExternalItems ?? true,
      canUpdateStatus: legacySettings.canUpdateStatus ?? true,
      canUpsert: legacySettings.canUpsertInternalItems ?? true,
      canDelete: false, // legacy system had no delete
    };
  } else {
    // Default to read-only
    base = { ...PRESET_DEFAULTS['read-only'] };
  }

  if (overrides) {
    if (overrides.canRead !== undefined) base.canRead = overrides.canRead;
    if (overrides.canUpdateStatus !== undefined) base.canUpdateStatus = overrides.canUpdateStatus;
    if (overrides.canUpsert !== undefined) base.canUpsert = overrides.canUpsert;
    if (overrides.canDelete !== undefined) base.canDelete = overrides.canDelete;
  }

  return base;
}

// ---------------------------------------------------------------------------
// Config consistency validation
// ---------------------------------------------------------------------------

export interface SyncConfigIssue {
  type: 'contradiction' | 'warning' | 'failure';
  message: string;
  suggestedFix: string;
}

interface PartialSyncConfig {
  enabled?: boolean;
  settings?: {
    canUpsertInternalItems?: boolean;
    canUpdateExternalItems?: boolean;
    canUpdateStatus?: boolean;
    autoSyncOnCompletion?: boolean;
  };
  github?: { enabled?: boolean; owner?: string; repo?: string };
  jira?: { enabled?: boolean; domain?: string; projectKey?: string };
  ado?: { enabled?: boolean; organization?: string; project?: string };
  preset?: SyncPreset;
  profiles?: Record<string, { provider?: string; config?: Record<string, unknown> }>;
}

interface PlatformSyncMetadata {
  lastSyncResult?: string;
  lastImportCount?: number;
}

/**
 * Validate sync configuration for consistency and report issues.
 */
export function validateSyncConfigConsistency(
  config: PartialSyncConfig,
  syncMetadata?: Record<string, PlatformSyncMetadata>,
): SyncConfigIssue[] {
  const issues: SyncConfigIssue[] = [];

  // Check: enabled=false with write flags=true
  if (config.enabled === false && config.settings) {
    const { canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus } = config.settings;
    if (canUpsertInternalItems || canUpdateExternalItems || canUpdateStatus) {
      issues.push({
        type: 'contradiction',
        message: 'Sync is disabled but write permissions are enabled. The effective behavior is disabled (sync.enabled=false overrides all).',
        suggestedFix: 'Either set sync.enabled=true to use the permissions, or set all permission flags to false.',
      });
    }
  }

  // Check: provider enabled but incomplete config (legacy format only)
  // Skip these checks when the provider is configured via profiles instead
  if (config.enabled !== false) {
    const profileProviders = new Set(
      Object.values(config.profiles ?? {}).map((p) => p.provider).filter(Boolean),
    );

    if (config.github?.enabled && !config.github.owner && !config.github.repo && !profileProviders.has('github')) {
      issues.push({
        type: 'warning',
        message: 'GitHub sync enabled but github.owner and github.repo are not configured.',
        suggestedFix: 'Set sync.github.owner and sync.github.repo in config.json, or run /sw:sync-setup.',
      });
    }
    if (config.jira?.enabled && !config.jira.domain && !profileProviders.has('jira')) {
      issues.push({
        type: 'warning',
        message: 'JIRA sync enabled but jira.domain is not configured.',
        suggestedFix: 'Set sync.jira.domain and sync.jira.projectKey in config.json.',
      });
    }
    if (config.ado?.enabled && !config.ado.organization && !profileProviders.has('ado')) {
      issues.push({
        type: 'warning',
        message: 'ADO sync enabled but ado.organization is not configured.',
        suggestedFix: 'Set sync.ado.organization and sync.ado.project in config.json.',
      });
    }
  }

  // Check sync metadata for failures
  if (syncMetadata) {
    for (const [platform, meta] of Object.entries(syncMetadata)) {
      if (meta.lastSyncResult === 'failed') {
        issues.push({
          type: 'failure',
          message: `${platform} sync last result was "failed" with ${meta.lastImportCount ?? 0} imports.`,
          suggestedFix: `Check ${platform} credentials and configuration. Run /sw:sync-setup to reconfigure.`,
        });
      }
    }
  }

  return issues;
}

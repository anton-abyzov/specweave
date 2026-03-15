/**
 * Sync Config — Permission Presets & Config Validation
 *
 * ADR-0236: Named presets replace 8+ booleans.
 * 4 presets: read-only, push-only, bidirectional, full-control
 * With optional per-flag overrides.
 */
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
export declare const PRESET_DEFAULTS: Record<SyncPreset, SyncPermissions>;
/**
 * Resolve effective permissions from preset + overrides + legacy settings.
 *
 * Priority: preset → overrides → effective
 * If no preset, falls back to legacy boolean settings.
 */
export declare function resolvePermissions(preset?: SyncPreset, overrides?: Partial<SyncPermissions>, legacySettings?: LegacySyncSettings): SyncPermissions;
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
    github?: {
        enabled?: boolean;
        owner?: string;
        repo?: string;
    };
    jira?: {
        enabled?: boolean;
        domain?: string;
        projectKey?: string;
    };
    ado?: {
        enabled?: boolean;
        organization?: string;
        project?: string;
    };
    preset?: SyncPreset;
    profiles?: Record<string, {
        provider?: string;
        config?: Record<string, unknown>;
    }>;
}
interface PlatformSyncMetadata {
    lastSyncResult?: string;
    lastImportCount?: number;
}
/**
 * Validate sync configuration for consistency and report issues.
 */
export declare function validateSyncConfigConsistency(config: PartialSyncConfig, syncMetadata?: Record<string, PlatformSyncMetadata>): SyncConfigIssue[];
export {};
//# sourceMappingURL=config.d.ts.map
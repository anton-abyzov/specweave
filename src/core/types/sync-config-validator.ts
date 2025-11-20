/**
 * Sync Config Validator - Validates critical sync configuration rules
 *
 * Enforces immutable architectural constraints:
 * 1. Increment → Living Docs MUST be one-way (IMMUTABLE)
 * 2. autoIncrementCreation MUST be false (FORBIDDEN)
 * 3. Warns if all permissions enabled (conflict risk)
 *
 * Part of v0.24.0 three-permission architecture (FS-047)
 */

import { SyncSettings, validateSyncSettings } from './sync-settings.js';

/**
 * Validation result for sync configuration
 */
export interface SyncConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Config structure (partial, relevant to sync validation)
 */
export interface SyncConfig {
  sync?: {
    settings?: SyncSettings;
    incrementToLivingDocs?: 'one-way' | 'two-way'; // MUST be 'one-way'
    autoIncrementCreation?: boolean; // MUST be false
    [key: string]: any;
  };
}

/**
 * Validate sync configuration against architectural rules
 *
 * @param config - Configuration object from .specweave/config.json
 * @returns Validation result with errors and warnings
 */
export function validateSyncConfig(config: SyncConfig): SyncConfigValidationResult {
  const result: SyncConfigValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // If no sync config, that's fine (safe defaults apply)
  if (!config.sync) {
    return result;
  }

  const { sync } = config;

  // Rule 1: Validate SyncSettings structure (if provided)
  if (sync.settings) {
    try {
      validateSyncSettings(sync.settings);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid sync settings: ${(error as Error).message}`);
    }
  }

  // Rule 2: incrementToLivingDocs MUST be 'one-way' (immutable architectural rule)
  if (sync.incrementToLivingDocs !== undefined && sync.incrementToLivingDocs !== 'one-way') {
    result.valid = false;
    result.errors.push(
      `sync.incrementToLivingDocs MUST be 'one-way' (found: '${sync.incrementToLivingDocs}'). ` +
        'Increment → Living Docs sync is ALWAYS one-way by architectural design. ' +
        'This direction is IMMUTABLE and cannot be configured.'
    );
  }

  // Rule 3: autoIncrementCreation MUST be false (forbidden feature)
  if (sync.autoIncrementCreation === true) {
    result.valid = false;
    result.errors.push(
      'sync.autoIncrementCreation MUST be false. ' +
        'Auto-creating increments for external items is FORBIDDEN. ' +
        'External items live in living docs ONLY. ' +
        'Users MUST manually create increments when ready to work on external items.'
    );
  }

  // Warning: All permissions enabled (full sync mode)
  if (
    sync.settings &&
    sync.settings.canUpsertInternalItems === true &&
    sync.settings.canUpdateExternalItems === true &&
    sync.settings.canUpdateStatus === true
  ) {
    result.warnings.push(
      '⚠️  All sync permissions enabled (full sync mode). ' +
        'This allows bidirectional sync between SpecWeave and external tools. ' +
        'Be aware of potential sync conflicts when multiple tools modify the same items. ' +
        'Consider enabling only the permissions you need for your workflow.'
    );
  }

  // Warning: Conflicting permissions (update external without status)
  if (
    sync.settings &&
    sync.settings.canUpdateExternalItems === true &&
    sync.settings.canUpdateStatus === false
  ) {
    result.warnings.push(
      '⚠️  canUpdateExternalItems=true but canUpdateStatus=false. ' +
        'External items will be updated with content changes but status will not sync. ' +
        'Consider enabling canUpdateStatus if you want status to reflect completion.'
    );
  }

  return result;
}

/**
 * Throw error if sync config is invalid
 *
 * @param config - Configuration object from .specweave/config.json
 * @param options - Optional logger for warnings
 * @throws Error if validation fails
 */
export function assertValidSyncConfig(
  config: SyncConfig,
  options: { logger?: { warn: (message: string) => void } } = {}
): void {
  const result = validateSyncConfig(config);

  if (!result.valid) {
    throw new Error(`Invalid sync configuration:\n${result.errors.join('\n')}`);
  }

  // Log warnings (but don't throw)
  if (result.warnings.length > 0 && options.logger) {
    options.logger.warn('Sync configuration warnings:');
    result.warnings.forEach((warning) => options.logger!.warn(warning));
  }
}

/**
 * Get human-readable summary of sync config validation
 *
 * @param config - Configuration object
 * @returns Summary string
 */
export function getSyncConfigSummary(config: SyncConfig): string {
  const result = validateSyncConfig(config);

  const lines: string[] = [];
  lines.push('=== Sync Configuration Validation ===');
  lines.push(`Valid: ${result.valid ? '✅ Yes' : '❌ No'}`);

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach((error) => lines.push(`  ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach((warning) => lines.push(`  ⚠️  ${warning}`));
  }

  if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
    lines.push('\n✅ All sync configuration rules satisfied');
  }

  return lines.join('\n');
}

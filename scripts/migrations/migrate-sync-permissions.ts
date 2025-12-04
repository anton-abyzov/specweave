#!/usr/bin/env tsx
/**
 * Migration Script: Bidirectional Sync → Three-Permission Architecture
 *
 * Migrates .specweave/config.json from old syncDirection format to new
 * three-permission architecture (canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus).
 *
 * Usage:
 *   npx tsx scripts/migrate-sync-permissions.ts [project-root]
 *
 * Examples:
 *   npx tsx scripts/migrate-sync-permissions.ts
 *   npx tsx scripts/migrate-sync-permissions.ts /path/to/project
 *
 * See: .specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md
 */

import fs from 'fs-extra';
import path from 'path';
import { migrateSyncDirection } from '../src/core/types/sync-settings.js';

interface Config {
  sync?: {
    settings?: {
      syncDirection?: string;
      canUpsertInternalItems?: boolean;
      canUpdateExternalItems?: boolean;
      canUpdateStatus?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface MigrationResult {
  success: boolean;
  migrated: boolean;
  alreadyMigrated: boolean;
  backup: string | null;
  oldSettings: unknown;
  newSettings: unknown;
  errors: string[];
}

async function migrateConfigFile(projectRoot: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: false,
    alreadyMigrated: false,
    backup: null,
    oldSettings: null,
    newSettings: null,
    errors: []
  };

  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  // Check if config exists
  if (!await fs.pathExists(configPath)) {
    result.errors.push(`Config file not found: ${configPath}`);
    return result;
  }

  // Read config
  let config: Config;
  try {
    config = await fs.readJSON(configPath);
  } catch (error) {
    result.errors.push(`Failed to parse config.json: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  // Check if sync settings exist
  if (!config.sync?.settings) {
    result.errors.push('No sync.settings found in config.json');
    return result;
  }

  const settings = config.sync.settings;
  result.oldSettings = { ...settings };

  // Check if already migrated (has new permission fields)
  const hasNewPermissions =
    'canUpsertInternalItems' in settings ||
    'canUpdateExternalItems' in settings ||
    'canUpdateStatus' in settings;

  if (hasNewPermissions && !settings.syncDirection) {
    result.alreadyMigrated = true;
    result.success = true;
    result.newSettings = settings;
    return result;
  }

  // Check if has old syncDirection field
  if (!settings.syncDirection) {
    result.errors.push('No syncDirection field found. Config appears to be neither old nor new format.');
    return result;
  }

  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(projectRoot, '.specweave', `config.backup.${timestamp}.json`);

  try {
    await fs.writeJSON(backupPath, config, { spaces: 2 });
    result.backup = backupPath;
  } catch (error) {
    result.errors.push(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  // Migrate sync settings
  const newPermissions = migrateSyncDirection(settings.syncDirection);

  // Remove old syncDirection field
  delete settings.syncDirection;

  // Add new permission fields
  settings.canUpsertInternalItems = newPermissions.canUpsertInternalItems;
  settings.canUpdateExternalItems = newPermissions.canUpdateExternalItems;
  settings.canUpdateStatus = newPermissions.canUpdateStatus;

  result.newSettings = { ...settings };

  // Write migrated config
  try {
    await fs.writeJSON(configPath, config, { spaces: 2 });
    result.migrated = true;
    result.success = true;
  } catch (error) {
    result.errors.push(`Failed to write config.json: ${error instanceof Error ? error.message : String(error)}`);

    // Restore from backup
    try {
      await fs.copy(backupPath, configPath);
      result.errors.push('Restored from backup due to write failure');
    } catch (restoreError) {
      result.errors.push(`Failed to restore from backup: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
    }

    return result;
  }

  return result;
}

function printResult(result: MigrationResult, projectRoot: string): void {
  console.log('\n🔄 SpecWeave Config Migration\n');
  console.log('='.repeat(60));
  console.log(`Project: ${projectRoot}`);
  console.log('='.repeat(60));

  if (result.errors.length > 0) {
    console.log('\n❌ Migration Failed\n');
    for (const error of result.errors) {
      console.log(`   ${error}`);
    }
    console.log('');
    process.exit(1);
  }

  if (result.alreadyMigrated) {
    console.log('\n✅ Already Migrated\n');
    console.log('   Config is already using the new three-permission architecture.');
    console.log('\n   Current Permissions:');
    const settings = result.newSettings as Record<string, unknown>;
    console.log(`     canUpsertInternalItems:  ${settings.canUpsertInternalItems}`);
    console.log(`     canUpdateExternalItems: ${settings.canUpdateExternalItems}`);
    console.log(`     canUpdateStatus:        ${settings.canUpdateStatus}`);
    console.log('');
    return;
  }

  if (result.migrated) {
    console.log('\n✅ Migration Successful\n');

    console.log('   Old Format:');
    const oldSettings = result.oldSettings as Record<string, unknown>;
    console.log(`     syncDirection: "${oldSettings.syncDirection}"`);

    console.log('\n   New Format:');
    const newSettings = result.newSettings as Record<string, unknown>;
    console.log(`     canUpsertInternalItems:  ${newSettings.canUpsertInternalItems}`);
    console.log(`     canUpdateExternalItems: ${newSettings.canUpdateExternalItems}`);
    console.log(`     canUpdateStatus:        ${newSettings.canUpdateStatus}`);

    if (result.backup) {
      console.log(`\n   📦 Backup Created: ${result.backup}`);
    }

    console.log('\n   Migration Mapping:');
    if (oldSettings.syncDirection === 'bidirectional') {
      console.log('     "bidirectional" → All 3 permissions = true');
      console.log('     (Full sync with all operations enabled)');
    } else if (oldSettings.syncDirection === 'export') {
      console.log('     "export" → canUpsertInternalItems = true');
      console.log('     (Create internal items, no external updates)');
    } else if (oldSettings.syncDirection === 'import') {
      console.log('     "import" → canUpdateStatus = true');
      console.log('     (Status updates only, no content sync)');
    }

    console.log('\n📚 Next Steps:\n');
    console.log('   1. Review the new permissions in .specweave/config.json');
    console.log('   2. Adjust permissions if needed for your team workflow');
    console.log('   3. Test sync operations: /specweave-github:sync');
    console.log('   4. Read the migration guide:');
    console.log('      .specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md');
    console.log('');
  }
}

async function main() {
  const projectRoot = process.argv[2] || process.cwd();

  console.log('🚀 Starting migration...\n');
  console.log(`   Project root: ${projectRoot}`);

  const result = await migrateConfigFile(projectRoot);
  printResult(result, projectRoot);

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
main().catch((error) => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});

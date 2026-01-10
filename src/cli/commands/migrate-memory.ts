/**
 * Migrate Memory Command
 *
 * Migrates global memory files from legacy location to correct location.
 *
 * Legacy:  ~/.claude/specweave/memory/
 * Correct: ~/.claude/plugins/marketplaces/specweave/memory/
 *
 * This migration was needed after fixing the getGlobalMemoryDir() path bug.
 *
 * @module cli/commands/migrate-memory
 */

import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import {
  hasLegacyMemoryFiles,
  migrateMemoryFiles,
  getLegacyMemoryDir,
  getGlobalMemoryDir,
  type MemoryMigrationResult,
} from '../../core/reflection/skill-memory-paths.js';

/**
 * Command options
 */
export interface MigrateMemoryOptions {
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Migrate memory files from legacy location to correct location
 *
 * @param options - Command options
 */
export async function migrateMemory(options: MigrateMemoryOptions = {}): Promise<void> {
  const { dryRun = false, yes = false } = options;

  console.log(chalk.bold.cyan('\n🧠 SpecWeave Memory Migration\n'));
  console.log(chalk.gray('Migrating global memory files to correct location\n'));

  // Check if migration is needed
  const spinner = ora('Checking for legacy memory files...').start();
  const hasLegacy = hasLegacyMemoryFiles();

  if (!hasLegacy) {
    spinner.succeed('No legacy memory files found');
    console.log(chalk.green('\n✅ Your memory files are already in the correct location!'));
    console.log(chalk.gray(`   Location: ${getGlobalMemoryDir()}\n`));
    return;
  }

  spinner.succeed('Legacy memory files found');

  // Preview migration
  console.log(chalk.bold('\n📋 Migration Preview\n'));
  const previewSpinner = ora('Analyzing files to migrate...').start();

  let preview: MemoryMigrationResult;
  try {
    preview = migrateMemoryFiles(true);
    previewSpinner.succeed('Analysis complete');
  } catch (error: unknown) {
    previewSpinner.fail('Analysis failed');
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
    return;
  }

  // Display what will be migrated
  console.log(chalk.bold('\nFiles to Migrate:'));
  console.log(chalk.gray(`  From: ${preview.sourcePath}`));
  console.log(chalk.gray(`  To:   ${preview.targetPath}\n`));

  if (preview.migratedFiles.length > 0) {
    console.log(chalk.bold('  Files:'));
    for (const file of preview.migratedFiles) {
      console.log(chalk.cyan(`    - ${file}`));
    }
    console.log('');
  }

  console.log(chalk.green(`  Total: ${preview.filesMigrated} file(s)\n`));

  // Dry run mode - stop here
  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes made\n'));
    console.log(chalk.gray('Run without --dry-run to perform migration\n'));
    return;
  }

  // Confirm migration
  if (!yes) {
    console.log(chalk.bold('❓ Migration Actions:\n'));
    console.log(chalk.gray('  1. Copy files to correct location'));
    console.log(chalk.gray('  2. Merge with existing files (if any)'));
    console.log(chalk.gray('  3. Remove legacy files after successful copy'));
    console.log(chalk.gray('  4. Clean up empty legacy directories\n'));

    const confirmResult = await confirm({
      message: 'Proceed with migration?',
      default: true,
    });

    if (!confirmResult) {
      console.log(chalk.yellow('\n⚠️  Migration cancelled\n'));
      return;
    }
  }

  // Perform migration
  console.log(chalk.bold('\n🚀 Performing Migration...\n'));
  const migrationSpinner = ora('Migrating memory files...').start();

  let result: MemoryMigrationResult;
  try {
    result = migrateMemoryFiles(false);
  } catch (error: unknown) {
    migrationSpinner.fail('Migration failed');
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`));
    return;
  }

  if (!result.success) {
    migrationSpinner.fail('Migration completed with errors');
    console.log(chalk.yellow('\n⚠️  Some files could not be migrated:\n'));
    for (const error of result.errors) {
      console.log(chalk.red(`  - ${error}`));
    }
    console.log('');
    return;
  }

  migrationSpinner.succeed('Migration complete');

  // Display results
  console.log(chalk.bold.green('\n✅ Migration Successful!\n'));

  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  ✓ ${result.filesMigrated} file(s) migrated`));
  console.log(chalk.gray(`  ✓ Legacy directory cleaned up\n`));

  if (result.migratedFiles.length > 0) {
    console.log(chalk.bold('Migrated Files:'));
    for (const file of result.migratedFiles) {
      console.log(chalk.cyan(`  - ${file}`));
    }
    console.log('');
  }

  console.log(chalk.bold('📍 New Location:\n'));
  console.log(chalk.gray(`  ${result.targetPath}\n`));

  console.log(chalk.gray('Your learnings are now stored in the correct location!\n'));
}

/**
 * Check if migration is needed (for use by other commands)
 *
 * @returns true if legacy memory files exist
 */
export function needsMemoryMigration(): boolean {
  return hasLegacyMemoryFiles();
}

/**
 * Get migration status message (for use by other commands)
 *
 * @returns Status message about memory migration
 */
export function getMemoryMigrationStatus(): string {
  if (!hasLegacyMemoryFiles()) {
    return '';
  }

  const legacyPath = getLegacyMemoryDir();
  return `Legacy memory files found at ${legacyPath}. Run 'specweave migrate-memory' to migrate.`;
}

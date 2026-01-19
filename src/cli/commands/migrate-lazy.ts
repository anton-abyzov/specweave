/**
 * Migrate to Lazy Loading Command
 *
 * Migrates existing full plugin installations to lazy loading mode.
 * Backs up current skills, populates cache, and installs router only.
 *
 * Usage: specweave migrate-lazy [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { PluginCacheManager, CACHE_PATHS } from '../../core/lazy-loading/cache-manager.js';

export interface MigrateLazyOptions {
  /** Rollback to pre-migration state */
  rollback?: boolean;
  /** Skip confirmation prompt */
  yes?: boolean;
  /** Show detailed output */
  verbose?: boolean;
  /** Dry run - show what would happen */
  dryRun?: boolean;
}

/** Backup directory for pre-migration skills */
const BACKUP_DIR = path.join(os.homedir(), '.specweave', 'skills-backup');

/** Router plugin name */
const ROUTER_PLUGIN = 'specweave-router';

/**
 * Migrate to lazy loading command handler
 */
export async function migrateLazyCommand(options: MigrateLazyOptions = {}): Promise<void> {
  const { rollback = false, dryRun = false, verbose = false } = options;

  if (rollback) {
    await rollbackMigration(options);
    return;
  }

  console.log(chalk.bold.blue('\n🔄 Migrate to Lazy Loading'));
  console.log(chalk.gray('==========================\n'));

  const cacheManager = new PluginCacheManager();
  const activeSkillsDir = CACHE_PATHS.active;

  // Check current state
  const currentSkills = getInstalledSkills(activeSkillsDir);
  const state = cacheManager.readState();

  if (state.lazyMode) {
    console.log(chalk.yellow('Already in lazy loading mode.'));
    console.log(chalk.gray('Use --rollback to restore full installation.'));
    return;
  }

  console.log(chalk.cyan('Current State:'));
  console.log(`  Active skills: ${chalk.yellow(currentSkills.length)}`);
  console.log(`  Location: ${chalk.gray(activeSkillsDir)}`);

  if (currentSkills.length === 0) {
    console.log(chalk.yellow('\nNo skills currently installed. Nothing to migrate.'));
    console.log(chalk.gray('Run: specweave refresh-marketplace'));
    return;
  }

  // Show what will happen
  console.log(chalk.bold('\n📋 Migration Plan:'));
  console.log(`  1. Backup current skills to ${chalk.gray(BACKUP_DIR)}`);
  console.log(`  2. Populate skills cache at ${chalk.gray(CACHE_PATHS.cache)}`);
  console.log(`  3. Remove all skills except ${chalk.cyan(ROUTER_PLUGIN)}`);
  console.log(`  4. Enable lazy loading mode`);

  if (dryRun) {
    console.log(chalk.yellow('\n[Dry run] No changes made.\n'));
    return;
  }

  // Step 1: Backup current skills
  const backupSpinner = ora('Backing up current skills...').start();
  try {
    await backupSkills(activeSkillsDir, currentSkills, verbose);
    backupSpinner.succeed(`Backed up ${currentSkills.length} skills`);
  } catch (error) {
    backupSpinner.fail('Failed to backup skills');
    console.error(chalk.red(`Error: ${error}`));
    return;
  }

  // Step 2: Populate cache
  const cacheSpinner = ora('Populating skills cache...').start();
  const cacheResult = await cacheManager.populateCache();
  if (cacheResult.success) {
    cacheSpinner.succeed(`Cached ${cacheResult.pluginsAffected} plugins`);
  } else {
    cacheSpinner.fail(`Cache failed: ${cacheResult.error}`);
    console.log(chalk.yellow('Continuing with existing cache...'));
  }

  // Step 3: Remove all skills except router
  const removeSpinner = ora('Removing full plugins...').start();
  try {
    const skillsToRemove = currentSkills.filter(s => s !== ROUTER_PLUGIN);
    for (const skill of skillsToRemove) {
      const skillPath = path.join(activeSkillsDir, skill);
      if (fs.existsSync(skillPath)) {
        fs.rmSync(skillPath, { recursive: true, force: true });
      }
    }
    removeSpinner.succeed(`Removed ${skillsToRemove.length} plugins`);
  } catch (error) {
    removeSpinner.fail('Failed to remove plugins');
    console.error(chalk.red(`Error: ${error}`));
    return;
  }

  // Step 4: Ensure router is installed
  const routerSpinner = ora('Ensuring router skill installed...').start();
  const routerPath = path.join(activeSkillsDir, ROUTER_PLUGIN);
  if (!fs.existsSync(routerPath)) {
    // Install router from cache
    const routerCachePath = path.join(CACHE_PATHS.cache, ROUTER_PLUGIN);
    if (fs.existsSync(routerCachePath)) {
      copyDirectory(routerCachePath, routerPath);
      routerSpinner.succeed('Router skill installed');
    } else {
      routerSpinner.warn('Router skill not in cache - run refresh-marketplace');
    }
  } else {
    routerSpinner.succeed('Router skill already present');
  }

  // Step 5: Update state
  const stateSpinner = ora('Updating state...').start();
  try {
    const stateDir = path.dirname(CACHE_PATHS.state);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const newState = {
      ...cacheManager.readState(),
      lazyMode: true,
      loadedPlugins: [ROUTER_PLUGIN],
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(CACHE_PATHS.state, JSON.stringify(newState, null, 2));
    stateSpinner.succeed('State updated to lazy mode');
  } catch (error) {
    stateSpinner.fail('Failed to update state');
    console.error(chalk.red(`Error: ${error}`));
  }

  // Success message
  console.log(chalk.green('\n✅ Migration complete!'));
  console.log(chalk.cyan('\n📊 New State:'));
  console.log(`  Mode: ${chalk.green('Lazy Loading')}`);
  console.log(`  Active: ${chalk.cyan('1')} plugin (router only)`);
  console.log(`  Cached: ${chalk.yellow(cacheManager.getCachedPlugins().length)} plugins`);

  console.log(chalk.bold('\n💡 What happens now:'));
  console.log('  • Router skill detects SpecWeave keywords');
  console.log('  • Full plugins load automatically when needed');
  console.log('  • ~99% token savings when not using SpecWeave');

  console.log(chalk.gray('\nTo rollback: specweave migrate-lazy --rollback\n'));
}

/**
 * Rollback migration to restore full installation
 */
async function rollbackMigration(options: MigrateLazyOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🔄 Rollback Lazy Loading Migration'));
  console.log(chalk.gray('===================================\n'));

  const { dryRun = false, verbose = false } = options;
  const cacheManager = new PluginCacheManager();
  const activeSkillsDir = CACHE_PATHS.active;

  // Check if backup exists
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(chalk.yellow('No backup found.'));
    console.log(chalk.gray('Cannot rollback - no pre-migration state saved.'));
    console.log(chalk.gray('\nTo install all plugins: specweave load-plugins all'));
    return;
  }

  const backupSkills = getInstalledSkills(BACKUP_DIR);
  console.log(chalk.cyan('Backup Found:'));
  console.log(`  Skills: ${chalk.yellow(backupSkills.length)}`);
  console.log(`  Location: ${chalk.gray(BACKUP_DIR)}`);

  if (dryRun) {
    console.log(chalk.yellow('\n[Dry run] Would restore backup.\n'));
    return;
  }

  // Restore from backup
  const restoreSpinner = ora('Restoring from backup...').start();
  try {
    // Remove current skills
    const currentSkills = getInstalledSkills(activeSkillsDir);
    for (const skill of currentSkills) {
      const skillPath = path.join(activeSkillsDir, skill);
      fs.rmSync(skillPath, { recursive: true, force: true });
    }

    // Copy backup skills
    for (const skill of backupSkills) {
      const sourcePath = path.join(BACKUP_DIR, skill);
      const destPath = path.join(activeSkillsDir, skill);
      copyDirectory(sourcePath, destPath);
    }

    restoreSpinner.succeed(`Restored ${backupSkills.length} skills`);
  } catch (error) {
    restoreSpinner.fail('Failed to restore backup');
    console.error(chalk.red(`Error: ${error}`));
    return;
  }

  // Update state
  const stateSpinner = ora('Updating state...').start();
  try {
    const newState = {
      ...cacheManager.readState(),
      lazyMode: false,
      loadedPlugins: backupSkills,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(CACHE_PATHS.state, JSON.stringify(newState, null, 2));
    stateSpinner.succeed('State updated to full mode');
  } catch (error) {
    stateSpinner.fail('Failed to update state');
  }

  // Clean up backup (optional - keep for safety)
  console.log(chalk.gray(`\nBackup preserved at: ${BACKUP_DIR}`));
  console.log(chalk.gray('Delete manually when no longer needed.'));

  console.log(chalk.green('\n✅ Rollback complete!'));
  console.log(chalk.cyan(`Active skills: ${chalk.yellow(backupSkills.length)}\n`));
}

/**
 * Backup current skills to backup directory
 */
async function backupSkills(
  activeDir: string,
  skills: string[],
  verbose: boolean
): Promise<void> {
  // Create backup directory
  if (fs.existsSync(BACKUP_DIR)) {
    // Remove old backup
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Copy each skill
  for (const skill of skills) {
    const sourcePath = path.join(activeDir, skill);
    const destPath = path.join(BACKUP_DIR, skill);
    copyDirectory(sourcePath, destPath);
    if (verbose) {
      console.log(chalk.gray(`  Backed up: ${skill}`));
    }
  }

  // Save backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    skills: skills,
    sourceDir: activeDir,
  };
  fs.writeFileSync(
    path.join(BACKUP_DIR, '.backup-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
}

/**
 * Get list of installed skills in a directory
 */
function getInstalledSkills(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);
}

/**
 * Copy directory recursively
 */
function copyDirectory(source: string, dest: string): void {
  if (!fs.existsSync(source)) return;

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

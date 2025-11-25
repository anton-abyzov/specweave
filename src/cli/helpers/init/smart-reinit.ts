/**
 * Smart re-initialization logic
 * Handles the case when .specweave/ already exists
 * Consolidates duplicate logic from init.ts
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { ReinitAction } from './types.js';
import { countFilesRecursive } from './path-utils.js';

/**
 * Options for smart re-initialization prompt
 */
export interface SmartReinitOptions {
  targetDir: string;
  isCI: boolean;
  hasForce: boolean;
}

/**
 * Result of smart re-initialization
 */
export interface SmartReinitResult {
  action: ReinitAction;
  continueExisting: boolean;
}

/**
 * Prompt user for re-initialization action when .specweave/ already exists
 * This consolidates the duplicate logic that appeared twice in init.ts
 *
 * @param options - Configuration options
 * @returns The chosen action and whether to continue with existing project
 */
export async function promptSmartReinit(options: SmartReinitOptions): Promise<SmartReinitResult> {
  const { targetDir, isCI, hasForce } = options;

  console.log(chalk.blue('\n📦 Existing SpecWeave project detected!'));
  console.log(chalk.gray('   Found .specweave/ folder with your increments, docs, and configuration.\n'));

  let action: ReinitAction;

  if (hasForce) {
    // Force mode: warn about destructive action
    console.log(chalk.red.bold('\n⛔ DANGER: --force DELETES ALL DATA!'));
    console.log(chalk.red('   This will permanently delete:'));
    console.log(chalk.red('   • All increments (.specweave/increments/)'));
    console.log(chalk.red('   • All documentation (.specweave/docs/)'));
    console.log(chalk.red('   • All configuration and history'));
    console.log(chalk.yellow('\n   💡 TIP: Use "specweave init ." (no --force) for safe updates\n'));

    if (isCI) {
      // CI mode: proceed with force deletion without prompting
      console.log(chalk.gray('   → CI mode: Proceeding with force deletion'));
      action = 'fresh';
    } else {
      // Interactive: require explicit confirmation
      const confirmDeletion = await confirm({
        message: chalk.red('⚠️  Type "y" to PERMANENTLY DELETE all .specweave/ data:'),
        default: false,
      });

      if (!confirmDeletion) {
        console.log(chalk.green('\n✅ Deletion cancelled. No data lost.'));
        console.log(chalk.gray('   → Run "specweave init ." (without --force) for safe updates'));
        return { action: 'cancel', continueExisting: false };
      }

      action = 'fresh';
    }
    console.log(chalk.yellow('\n   🔄 Force mode: Proceeding with fresh start...'));
  } else if (isCI) {
    // CI mode without force: auto-continue
    console.log(chalk.gray('   → CI mode: Continuing with existing project'));
    action = 'continue';
  } else {
    // Interactive mode: show choices
    action = await select({
      message: 'What would you like to do?',
      choices: [
        {
          name: '✨ Continue working (keep all existing increments, docs, and history)',
          value: 'continue' as const,
        },
        {
          name: '🔄 Fresh start (delete .specweave/ and start from scratch)',
          value: 'fresh' as const,
        },
        {
          name: '❌ Cancel (exit without changes)',
          value: 'cancel' as const,
        }
      ],
      default: 'continue'
    });
  }

  if (action === 'cancel') {
    console.log(chalk.yellow('\n⏸️  Initialization cancelled. No changes made.'));
    return { action: 'cancel', continueExisting: false };
  }

  if (action === 'fresh') {
    // Handle fresh start
    const freshResult = await handleFreshStart(targetDir, isCI, hasForce);
    return { action: freshResult ? 'fresh' : 'cancel', continueExisting: false };
  }

  // Continue working
  console.log(chalk.green('\n✅ Continuing with existing project'));
  console.log(chalk.gray('   → Keeping all increments, docs, and history'));
  console.log(chalk.gray('   → Config will be updated if needed\n'));
  return { action: 'continue', continueExisting: true };
}

/**
 * Handle fresh start action - backup and delete .specweave/
 *
 * @param targetDir - Target directory
 * @param isCI - Whether running in CI mode
 * @param hasForce - Whether --force flag was used
 * @returns true if fresh start succeeded, false if cancelled
 */
async function handleFreshStart(targetDir: string, isCI: boolean, hasForce: boolean): Promise<boolean> {
  const specweavePath = path.join(targetDir, '.specweave');

  if (!hasForce) {
    if (isCI) {
      // CI mode without force: NEVER allow fresh start
      console.log(chalk.red('\n⛔ ERROR: Cannot start fresh in CI mode without --force flag'));
      console.log(chalk.gray('   → Use "specweave init . --force" if you really want to delete all data'));
      return false;
    }

    // Interactive: ask for confirmation
    console.log(chalk.yellow('\n⚠️  WARNING: This will DELETE all increments, docs, and configuration!'));
    const confirmFresh = await confirm({
      message: 'Are you sure you want to start fresh? (all .specweave/ content will be lost)',
      default: false,
    });

    if (!confirmFresh) {
      console.log(chalk.yellow('\n⏸️  Fresh start cancelled. No changes made.'));
      return false;
    }
  }

  // Create backup before deletion
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(targetDir, `.specweave.backup-${timestamp}`);

  try {
    console.log(chalk.cyan('\n   📦 Creating backup before deletion...'));
    fs.copySync(specweavePath, backupPath);
    console.log(chalk.green(`   ✅ Backup saved: ${path.relative(targetDir, backupPath)}`));
    console.log(chalk.gray(`      To restore: mv ${path.basename(backupPath)} .specweave`));
  } catch {
    console.log(chalk.yellow('   ⚠️  Could not create backup (proceeding anyway)'));
  }

  // Count files before deletion
  const fileCount = countFilesRecursive(specweavePath);

  // Delete .specweave/
  fs.removeSync(specweavePath);
  console.log(chalk.blue(`\n   ♻️  Removed .specweave/ (${fileCount} files deleted)`));
  console.log(chalk.green('   ✅ Starting fresh - will create new .specweave/ structure\n'));

  return true;
}

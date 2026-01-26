/**
 * Cancel Auto CLI Command (Simplified)
 *
 * Just removes the auto-mode flag. That's it.
 * The stop hook will then approve exit on next attempt.
 *
 * Usage:
 *   specweave cancel-auto
 *   specweave cancel-auto --force
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { AutoModeFlag } from '../../core/auto/types.js';

export interface CancelAutoOptions {
  force?: boolean;
}

export function createCancelAutoCommand(): Command {
  const cmd = new Command('cancel-auto')
    .description('Cancel auto mode')
    .option('--force', 'Cancel without confirmation')
    .action(async (options: CancelAutoOptions) => {
      const projectPath = process.cwd();

      // Check if SpecWeave is initialized
      const specweavePath = path.join(projectPath, '.specweave');
      if (!fs.existsSync(specweavePath)) {
        console.log(chalk.yellow('No SpecWeave project found in current directory.'));
        console.log(chalk.gray('Run `specweave init` to initialize a project.'));
        return;
      }

      try {
        await handleCancelAuto(projectPath, options);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Handle cancel-auto command
 */
async function handleCancelAuto(projectPath: string, options: CancelAutoOptions): Promise<void> {
  const autoFlagPath = path.join(projectPath, '.specweave/state/auto-mode.json');

  // Check if auto mode is active
  if (!fs.existsSync(autoFlagPath)) {
    console.log(chalk.yellow('No auto mode active'));
    return;
  }

  let flag: AutoModeFlag | null = null;
  try {
    flag = JSON.parse(fs.readFileSync(autoFlagPath, 'utf-8'));
  } catch {
    // Invalid file, just remove it
  }

  if (!flag?.active) {
    console.log(chalk.yellow('Auto mode is not active'));
    // Clean up the file anyway
    fs.unlinkSync(autoFlagPath);
    return;
  }

  // Ask for confirmation unless --force
  if (!options.force) {
    console.log('');
    console.log(chalk.yellow('⚠️  Cancel Auto Mode'));
    console.log('');
    console.log('Started: ' + chalk.gray(flag.timestamp));
    if (flag.incrementIds && flag.incrementIds.length > 0) {
      console.log('Increments:');
      for (const id of flag.incrementIds) {
        console.log('  • ' + chalk.cyan(id));
      }
    }
    console.log('');
    console.log('Are you sure you want to cancel? (y/N)');

    const answer = await getUserInput();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log(chalk.gray('Cancelled'));
      return;
    }
  }

  // Remove the flag file
  fs.unlinkSync(autoFlagPath);

  // Also clean up ALL auto-related state files (critical for preventing infinite loops!)
  const stateFiles = [
    // Legacy session files
    path.join(projectPath, '.specweave/state/auto-session.json'),
    path.join(projectPath, '.specweave/state/active-session.lock'),
    // Stop hook state files (CRITICAL - these cause infinite loops if not cleaned!)
    path.join(projectPath, '.specweave/state/.stop-auto-turns'),
    path.join(projectPath, '.specweave/state/.stop-auto-retry'),
    path.join(projectPath, '.specweave/state/.stop-auto-dedup'),
    path.join(projectPath, '.specweave/state/.stop-auto-last-fire'),
  ];

  for (const file of stateFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  console.log('');
  console.log(chalk.green('✅ Auto Mode Cancelled'));
  console.log('');
  console.log(chalk.bold('What would you like to do next?'));
  console.log('');
  console.log('  📋 Continue current increment work:');
  console.log('     ' + chalk.cyan('/sw:do') + ' - Resume tasks manually');
  console.log('     ' + chalk.cyan('/sw:progress') + ' - Check what remains');
  console.log('');
  console.log('  🆕 Start something new:');
  console.log('     ' + chalk.cyan('/sw:increment "feature description"') + ' - Create new increment');
  console.log('     ' + chalk.cyan('/sw:increment "bug fix" --type=bug') + ' - Create bug fix increment');
  console.log('');
  console.log('  ⏸️  Manage current increment:');
  console.log('     ' + chalk.cyan('/sw:pause <id>') + ' - Pause and work on something else');
  console.log('     ' + chalk.cyan('/sw:done <id>') + ' - Close if work is complete');
  console.log('');
  console.log(chalk.gray('💡 Tip: Creating a new increment invokes PM and Architect for proper planning.'));
  console.log('');
}

/**
 * Get user input from stdin (cross-platform)
 */
function getUserInput(): Promise<string> {
  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setEncoding('utf8');

    if (stdin.isTTY && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(false);
    }

    stdin.once('data', data => {
      resolve(data.toString().trim());
    });
  });
}

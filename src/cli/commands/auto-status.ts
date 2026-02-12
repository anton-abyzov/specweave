/**
 * Auto Status CLI Command (Simplified)
 *
 * Shows auto mode status by checking the flag file and counting active increments.
 * The increment metadata.json IS the source of truth.
 *
 * Usage:
 *   specweave auto-status
 *   specweave auto-status --json
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { AutoModeFlag } from '../../core/auto/types.js';

export interface AutoStatusOptions {
  json?: boolean;
}

export function createAutoStatusCommand(): Command {
  const cmd = new Command('auto-status')
    .description('Check auto mode status')
    .option('--json', 'Output as JSON')
    .action(async (options: AutoStatusOptions) => {
      const projectPath = process.cwd();

      // Check if SpecWeave is initialized
      const specweavePath = path.join(projectPath, '.specweave');
      if (!fs.existsSync(specweavePath)) {
        console.log(chalk.yellow('No SpecWeave project found in current directory.'));
        console.log(chalk.gray('Run `specweave init` to initialize a project.'));
        return;
      }

      try {
        await handleAutoStatus(projectPath, options);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Handle auto-status command
 */
async function handleAutoStatus(projectPath: string, options: AutoStatusOptions): Promise<void> {
  const autoFlagPath = path.join(projectPath, '.specweave/state/auto-mode.json');
  const incrementsDir = path.join(projectPath, '.specweave/increments');

  // Check if auto mode is active
  let flag: AutoModeFlag | null = null;
  let isActive = false;

  if (fs.existsSync(autoFlagPath)) {
    try {
      flag = JSON.parse(fs.readFileSync(autoFlagPath, 'utf-8'));
      isActive = flag?.active ?? false;
    } catch {
      // Invalid file
    }
  }

  // Count active increments (THE source of truth)
  const activeIncrements = findActiveIncrements(incrementsDir);

  // Build status object
  const status = {
    autoModeActive: isActive,
    startTime: flag?.timestamp ?? null,
    configuredIncrements: flag?.incrementIds ?? [],
    activeIncrements: activeIncrements,
    activeCount: activeIncrements.length,
  };

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Human-readable output
  console.log('');
  console.log(chalk.bold('AUTO MODE STATUS'));
  console.log('━'.repeat(50));
  console.log('');

  if (isActive) {
    console.log('Status: ' + chalk.green('🔄 ACTIVE'));
    if (flag?.timestamp) {
      console.log('Started: ' + chalk.gray(flag.timestamp));
    }
  } else {
    console.log('Status: ' + chalk.gray('⏹️  NOT ACTIVE'));
  }

  console.log('');
  console.log(chalk.bold('ACTIVE INCREMENTS') + ` (${activeIncrements.length})`);
  console.log('━'.repeat(50));

  if (activeIncrements.length === 0) {
    console.log(chalk.gray('  No active increments'));
  } else {
    for (const inc of activeIncrements) {
      console.log('  • ' + chalk.cyan(inc));
    }
  }

  console.log('');

  // Show actions
  if (isActive && activeIncrements.length > 0) {
    console.log(chalk.bold('NEXT STEPS'));
    console.log('━'.repeat(50));
    console.log('  • Continue working: ' + chalk.cyan('/sw:do'));
    console.log('  • Cancel auto mode: ' + chalk.cyan('specweave cancel-auto'));
    console.log('');
  } else if (isActive && activeIncrements.length === 0) {
    console.log(chalk.yellow('⚠️  Auto mode is active but no active increments found.'));
    console.log('The stop hook will allow exit on next attempt.');
    console.log('');
  } else {
    console.log('Start auto mode: ' + chalk.cyan('specweave auto [INCREMENT_IDS...]'));
    console.log('');
  }
}

/**
 * Find active or in-progress increments
 */
function findActiveIncrements(incrementsDir: string): string[] {
  if (!fs.existsSync(incrementsDir)) return [];

  const increments: string[] = [];

  for (const entry of fs.readdirSync(incrementsDir)) {
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const metaPath = path.join(incrementsDir, entry, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (metadata.status === 'active' || metadata.status === 'in-progress') {
          increments.push(entry);
        }
      } catch {
        // Skip invalid metadata
      }
    }
  }

  return increments;
}

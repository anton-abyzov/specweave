#!/usr/bin/env node
/**
 * SpecWeave Update Command
 *
 * Unified update command for keeping SpecWeave up-to-date.
 * This is the recommended command for users to run when updating.
 *
 * What it does (by default):
 * 1. Self-updates SpecWeave CLI via npm (npm i -g specweave@latest)
 * 2. Migrates config.json (adds missing sections like 'auto')
 * 3. Updates instruction files (CLAUDE.md, AGENTS.md)
 * 4. Validates project health
 * 5. Refreshes marketplace plugins (optional, with --plugins)
 *
 * Usage:
 *   specweave update                  # Update CLI + instructions + config
 *   specweave update --plugins        # Also refresh marketplace plugins
 *   specweave update --all            # Full update including all plugins
 *   specweave update --no-self        # Skip CLI update, only project files
 *   specweave update --check          # Dry run - show what would change
 *
 * @since 1.0.131
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import { updateInstructionsCommand } from './update-instructions.js';
import { refreshMarketplaceCommand } from './refresh-marketplace.js';
import { getPackageVersion } from '../helpers/init/instruction-file-merger.js';

interface UpdateOptions {
  /** Also refresh marketplace plugins */
  plugins?: boolean;
  /** Install all plugins (not just router) */
  all?: boolean;
  /** Dry run - show what would change */
  check?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Force refresh even if up to date */
  force?: boolean;
  /** Skip self-update of specweave CLI (default: false, CLI updates by default) */
  noSelf?: boolean;
}

interface UpdateResult {
  configMigrated: boolean;
  instructionsUpdated: boolean;
  pluginsRefreshed: boolean;
  selfUpdated: boolean;
  newVersion?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Main update command
 */
export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  const projectPath = process.cwd();
  const version = getPackageVersion();
  const isSpecWeaveProject = fs.existsSync(path.join(projectPath, '.specweave'));

  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('  SpecWeave Update'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(chalk.gray(`  Version: ${version}`));
  console.log(chalk.gray(`  Project: ${projectPath}`));

  if (options.check) {
    console.log(chalk.yellow('\n  Mode: DRY RUN (no changes will be made)\n'));
  } else {
    console.log('');
  }

  const result: UpdateResult = {
    configMigrated: false,
    instructionsUpdated: false,
    pluginsRefreshed: false,
    selfUpdated: false,
    errors: [],
    warnings: [],
  };

  const spinner = ora();

  // Step 0: Self-update SpecWeave CLI (default: ON, skip with --no-self)
  if (!options.noSelf) {
    const selfUpdateResult = await selfUpdateSpecWeave(version, options, spinner);
    result.selfUpdated = selfUpdateResult.updated;
    result.newVersion = selfUpdateResult.newVersion;
    if (selfUpdateResult.error) {
      result.errors.push(selfUpdateResult.error);
    }

    // If self-update happened, recommend restarting
    if (result.selfUpdated) {
      console.log(chalk.green(`\n✓ SpecWeave updated to ${result.newVersion}`));
      console.log(chalk.yellow('  Please restart your terminal and run this command again.\n'));
      return;
    }
  }

  // Check if this is a SpecWeave project
  if (!isSpecWeaveProject) {
    console.log(chalk.yellow('⚠️  Not a SpecWeave project (no .specweave directory found)'));
    console.log(chalk.gray('   Run: specweave init\n'));

    // Still allow plugins refresh for global updates
    if (options.plugins || options.all) {
      console.log(chalk.blue('Proceeding with plugins refresh only...\n'));
    } else {
      return;
    }
  }

  // Step 1: Update instructions & migrate config
  if (isSpecWeaveProject) {
    spinner.start('Updating instructions and config...');

    try {
      await updateInstructionsCommand({
        dryRun: options.check,
        verbose: options.verbose,
      });
      result.instructionsUpdated = true;
      result.configMigrated = true; // updateInstructionsCommand now handles this
      spinner.succeed('Instructions and config updated');
    } catch (error) {
      spinner.fail('Failed to update instructions');
      result.errors.push(`Instructions update failed: ${error}`);
    }
  }

  // Step 2: Validate project health (quick checks)
  if (isSpecWeaveProject && !options.check) {
    spinner.start('Validating project health...');

    const healthIssues = await validateProjectHealth(projectPath);

    if (healthIssues.length > 0) {
      spinner.warn(`Found ${healthIssues.length} issue(s)`);
      result.warnings.push(...healthIssues);

      if (options.verbose) {
        healthIssues.forEach(issue => {
          console.log(chalk.yellow(`   - ${issue}`));
        });
      }
    } else {
      spinner.succeed('Project health OK');
    }
  }

  // Step 3: Refresh plugins (if requested)
  if (options.plugins || options.all) {
    console.log('');
    spinner.start('Refreshing marketplace plugins...');
    spinner.stop();

    try {
      await refreshMarketplaceCommand({
        all: options.all,
        force: options.force,
        verbose: options.verbose,
      });
      result.pluginsRefreshed = true;
    } catch (error) {
      result.errors.push(`Plugin refresh failed: ${error}`);
    }
  }

  // Summary
  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('  Update Summary'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (isSpecWeaveProject) {
    console.log(`  Config:       ${result.configMigrated ? chalk.green('✓ Updated') : chalk.gray('No changes')}`);
    console.log(`  Instructions: ${result.instructionsUpdated ? chalk.green('✓ Updated') : chalk.gray('No changes')}`);
  }

  if (options.plugins || options.all) {
    console.log(`  Plugins:      ${result.pluginsRefreshed ? chalk.green('✓ Refreshed') : chalk.red('Failed')}`);
  } else {
    console.log(chalk.gray(`  Plugins:      Skipped (use --plugins to refresh)`));
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow(`\n  Warnings: ${result.warnings.length}`));
    if (!options.verbose) {
      console.log(chalk.gray('    Use --verbose to see details'));
    }
  }

  if (result.errors.length > 0) {
    console.log(chalk.red(`\n  Errors: ${result.errors.length}`));
    result.errors.forEach(err => {
      console.log(chalk.red(`    - ${err}`));
    });
  }

  // Next steps
  console.log(chalk.blue('\n  Next steps:'));

  if (options.plugins || options.all) {
    console.log(chalk.gray('    1. Restart Claude Code for plugin changes'));
  } else {
    console.log(chalk.gray('    1. Run `specweave update --plugins` to also refresh plugins'));
  }

  if (result.warnings.length > 0) {
    console.log(chalk.gray('    2. Review warnings above'));
  }

  console.log('');
}

/**
 * Quick project health validation
 */
async function validateProjectHealth(projectPath: string): Promise<string[]> {
  const issues: string[] = [];

  // Check config.json exists and is valid
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Check for missing recommended sections
      if (!config.auto) {
        issues.push('Missing "auto" section in config.json (will be added)');
      }

      if (!config.project?.name) {
        issues.push('Missing project.name in config.json');
      }

    } catch {
      issues.push('config.json is invalid JSON');
    }
  } else {
    issues.push('config.json not found');
  }

  // Check for orphaned state files
  const stateDir = path.join(projectPath, '.specweave', 'state');
  if (fs.existsSync(stateDir)) {
    const staleFiles = [
      'auto-mode.json',
      'auto-session.json',
      '.stop-auto-dedup',
      '.stop-auto-last-fire',
      '.stop-auto-retry',
    ];

    for (const file of staleFiles) {
      const filePath = path.join(stateDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

          // Warn if state file is older than 24 hours
          if (ageHours > 24) {
            issues.push(`Stale state file: ${file} (${Math.floor(ageHours)}h old)`);
          }
        } catch {
          // Ignore stat errors
        }
      }
    }
  }

  // Check for too many active increments
  const incrementsDir = path.join(projectPath, '.specweave', 'increments');
  if (fs.existsSync(incrementsDir)) {
    try {
      const dirs = fs.readdirSync(incrementsDir).filter(name => /^\d{4}/.test(name));
      let activeCount = 0;

      for (const dir of dirs) {
        const metadataPath = path.join(incrementsDir, dir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            if (metadata.status === 'active' || metadata.status === 'in-progress') {
              activeCount++;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (activeCount > 5) {
        issues.push(`High number of active increments: ${activeCount} (consider closing some)`);
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return issues;
}

/**
 * Self-update SpecWeave CLI via npm
 */
async function selfUpdateSpecWeave(
  currentVersion: string,
  options: UpdateOptions,
  spinner: ReturnType<typeof ora>
): Promise<{ updated: boolean; newVersion?: string; error?: string }> {
  spinner.start('Checking for SpecWeave updates...');

  try {
    // Get latest version from npm
    const latestVersion = execSync('npm view specweave version', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Compare versions
    if (latestVersion === currentVersion) {
      spinner.succeed(`SpecWeave is up to date (v${currentVersion})`);
      return { updated: false };
    }

    // Check if newer version available
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);

    let isNewer = false;
    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) {
        isNewer = true;
        break;
      } else if (latestParts[i] < currentParts[i]) {
        break;
      }
    }

    if (!isNewer) {
      spinner.succeed(`SpecWeave is up to date (v${currentVersion})`);
      return { updated: false };
    }

    // Dry run - just report
    if (options.check) {
      spinner.info(`New version available: v${currentVersion} → v${latestVersion}`);
      console.log(chalk.gray('    Run without --check to update'));
      return { updated: false, newVersion: latestVersion };
    }

    // Perform update
    spinner.text = `Updating SpecWeave: v${currentVersion} → v${latestVersion}...`;

    execSync('npm install -g specweave@latest', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    spinner.succeed(`SpecWeave updated: v${currentVersion} → v${latestVersion}`);
    return { updated: true, newVersion: latestVersion };

  } catch (error: any) {
    spinner.fail('Failed to check/update SpecWeave');

    // Provide helpful error messages
    if (error.message?.includes('EACCES') || error.message?.includes('permission denied')) {
      return {
        updated: false,
        error: 'Permission denied. Try: sudo npm install -g specweave@latest',
      };
    }

    if (error.message?.includes('ENOENT') || error.message?.includes('npm: not found')) {
      return {
        updated: false,
        error: 'npm not found. Make sure Node.js is installed.',
      };
    }

    return {
      updated: false,
      error: `Self-update failed: ${error.message || error}`,
    };
  }
}

/**
 * Register command with Commander
 */
export function registerUpdateCommand(program: import('commander').Command): void {
  program
    .command('update')
    .description('Update SpecWeave: CLI, instructions, config, and optionally plugins')
    .option('--no-self', 'Skip CLI self-update via npm')
    .option('--plugins', 'Also refresh marketplace plugins')
    .option('--all', 'Full update including all plugins (not just router)')
    .option('--check', 'Dry run - show what would change without making changes')
    .option('-v, --verbose', 'Show detailed output')
    .option('-f, --force', 'Force refresh even if up to date')
    .action(async (options) => {
      await updateCommand(options);
    });
}

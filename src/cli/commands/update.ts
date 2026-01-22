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
 * 5. Refreshes marketplace plugins (DEFAULT - cleans non-core, installs router only)
 *
 * Usage:
 *   specweave update                  # Full update: CLI + instructions + config + plugins
 *   specweave update --no-plugins     # Skip marketplace plugins refresh
 *   specweave update --all            # Install ALL plugins (not just router)
 *   specweave update --minimal        # Clean /plugin output (removes marketplace)
 *   specweave update --no-self        # Skip CLI update, only project files
 *   specweave update --check          # Dry run - show what would change
 *
 * @since 1.0.131
 * @updated 1.0.138 - Plugins refresh is now DEFAULT (use --no-plugins to skip)
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import { updateInstructionsCommand } from './update-instructions.js';
import { refreshMarketplaceCommand } from './refresh-marketplace.js';
import { getPackageVersion } from '../helpers/init/instruction-file-merger.js';
import { migrateOldMemoryFiles } from '../../core/reflection/index.js';

interface UpdateOptions {
  /** Skip marketplace plugins refresh (default: false - plugins ARE refreshed) */
  noPlugins?: boolean;
  /** Install all plugins (not just router) */
  all?: boolean;
  /** Minimal mode: remove marketplace for clean /plugin output */
  minimal?: boolean;
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
  stateFilesCleaned: number;
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
    stateFilesCleaned: 0,
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

    // If self-update happened, spawn NEW CLI to complete remaining steps
    if (result.selfUpdated) {
      console.log(chalk.green(`\n✓ SpecWeave updated to ${result.newVersion}`));
      console.log(chalk.blue('  Running post-update tasks with new version...\n'));

      // Build command with same flags, but add --no-self to skip re-updating
      const flags: string[] = ['--no-self'];
      if (options.noPlugins) flags.push('--no-plugins');
      if (options.all) flags.push('--all');
      if (options.minimal) flags.push('--minimal');
      if (options.verbose) flags.push('--verbose');
      if (options.force) flags.push('--force');
      if (options.check) flags.push('--check');

      try {
        // Spawn NEW binary to run instructions/config/plugins update
        execSync(`specweave update ${flags.join(' ')}`, {
          stdio: 'inherit',
          cwd: projectPath,
        });
      } catch (error: any) {
        // Non-zero exit from spawned process - already printed output
        if (error.status) {
          process.exit(error.status);
        }
        throw error;
      }
      return;
    }
  }

  // Check if this is a SpecWeave project
  if (!isSpecWeaveProject) {
    console.log(chalk.yellow('⚠️  Not a SpecWeave project (no .specweave directory found)'));
    console.log(chalk.gray('   Run: specweave init\n'));

    // Still allow plugins refresh for global updates (default behavior)
    if (!options.noPlugins) {
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

  // Step 2: Cleanup stale auto state files (prevents infinite stop hook loops!)
  if (isSpecWeaveProject) {
    const cleanupResult = await cleanupStaleAutoState(projectPath, options.verbose, options.check);
    result.stateFilesCleaned = cleanupResult.cleaned;

    if (cleanupResult.cleaned > 0) {
      if (options.check) {
        console.log(chalk.yellow(`  ⚠️  ${cleanupResult.cleaned} stale auto state file(s) found (will be cleaned on update)`));
      } else {
        console.log(chalk.green(`  ✓ Cleaned ${cleanupResult.cleaned} stale auto state file(s)`));
      }
      if (options.verbose || options.check) {
        cleanupResult.files.forEach(file => {
          console.log(chalk.gray(`    - ${file}`));
        });
      }
    }
  }

  // Step 2.5: Migrate old memory files to CLAUDE.md (reflect v2.0)
  if (isSpecWeaveProject && !options.check) {
    try {
      const migrationResult = migrateOldMemoryFiles(projectPath);
      if (migrationResult.migrated > 0) {
        console.log(chalk.green(`  ✓ Migrated ${migrationResult.migrated} learning(s) from old memory files to CLAUDE.md`));
        if (migrationResult.deleted.length > 0 && options.verbose) {
          console.log(chalk.gray(`    Removed ${migrationResult.deleted.length} old memory file(s)`));
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.log(chalk.yellow(`  ⚠ Memory migration skipped: ${error}`));
      }
    }
  }

  // Step 3: Validate project health (quick checks)
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

  // Step 4: Refresh plugins (DEFAULT - unless --no-plugins specified)
  if (!options.noPlugins) {
    console.log('');
    spinner.start('Refreshing marketplace plugins...');
    spinner.stop();

    try {
      await refreshMarketplaceCommand({
        all: options.all,
        minimal: options.minimal,
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
    console.log(`  State cleanup: ${result.stateFilesCleaned > 0 ? chalk.green(`✓ Cleaned ${result.stateFilesCleaned} file(s)`) : chalk.gray('No stale files')}`);
  }

  if (!options.noPlugins) {
    console.log(`  Plugins:      ${result.pluginsRefreshed ? chalk.green('✓ Refreshed') : chalk.red('Failed')}`);
  } else {
    console.log(chalk.gray(`  Plugins:      Skipped (--no-plugins specified)`));
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

  if (!options.noPlugins) {
    console.log(chalk.gray('    1. Restart Claude Code for plugin changes'));
    if (result.warnings.length > 0) {
      console.log(chalk.gray('    2. Review warnings above'));
    }
  } else {
    console.log(chalk.gray('    1. Plugins were skipped. Run `specweave update` to refresh them.'));
    if (result.warnings.length > 0) {
      console.log(chalk.gray('    2. Review warnings above'));
    }
  }

  console.log('');
}

/**
 * Cleanup stale auto state files that can cause infinite stop hook loops
 * Only cleans files older than the threshold (default: 4 hours for safety)
 *
 * @param projectPath - Path to the project root
 * @param verbose - Show detailed output
 * @param dryRun - If true, only report what would be cleaned (don't actually delete)
 */
async function cleanupStaleAutoState(
  projectPath: string,
  verbose?: boolean,
  dryRun?: boolean
): Promise<{ cleaned: number; files: string[] }> {
  const stateDir = path.join(projectPath, '.specweave', 'state');
  const result = { cleaned: 0, files: [] as string[] };

  if (!fs.existsSync(stateDir)) {
    return result;
  }

  // All auto-related state files that should be session-scoped
  const autoStateFiles = [
    'auto-mode.json',
    'auto-session.json',
    '.stop-auto-dedup',
    '.stop-auto-last-fire',
    '.stop-auto-retry',
    '.stop-auto-turns',
  ];

  // Threshold: 4 hours (sessions rarely last this long, and if they do, state should be fresh)
  const staleThresholdHours = 4;

  for (const file of autoStateFiles) {
    const filePath = path.join(stateDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

        // Only clean if stale (older than threshold)
        if (ageHours > staleThresholdHours) {
          if (dryRun) {
            // Dry run - just report
            result.cleaned++;
            result.files.push(`${file} (${Math.floor(ageHours)}h old)`);
          } else {
            // Actually delete
            try {
              fs.unlinkSync(filePath);
              result.cleaned++;
              result.files.push(`${file} (was ${Math.floor(ageHours)}h old)`);
            } catch {
              // Ignore cleanup errors silently
            }
          }
        }
      } catch {
        // Ignore stat errors
      }
    }
  }

  return result;
}

/**
 * Quick project health validation (no cleanup - that's done separately)
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
 * Fetch what's new from npm package changelog
 */
async function fetchWhatsNew(currentVersion: string, latestVersion: string): Promise<string[]> {
  try {
    // Try to get changelog from GitHub raw content
    const https = await import('https');

    return new Promise((resolve) => {
      const url = 'https://raw.githubusercontent.com/anthropics/specweave/main/CHANGELOG.md';

      const req = https.get(url, { timeout: 5000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve([]);
          return;
        }

        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          const changes = parseChangelogBetweenVersions(data, currentVersion, latestVersion);
          resolve(changes);
        });
      });

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  } catch {
    return [];
  }
}

/**
 * Parse changelog entries between two versions
 */
function parseChangelogBetweenVersions(changelog: string, fromVersion: string, toVersion: string): string[] {
  const changes: string[] = [];
  const lines = changelog.split('\n');

  let inRelevantSection = false;
  let currentSection = '';

  for (const line of lines) {
    // Match version headers like ## [1.0.132] or ## [1.0.132] - 2026-01-20
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\]/);

    if (versionMatch) {
      const version = versionMatch[1];
      const versionNum = versionToNumber(version);
      const fromNum = versionToNumber(fromVersion);
      const toNum = versionToNumber(toVersion);

      // Include versions > fromVersion and <= toVersion
      if (versionNum > fromNum && versionNum <= toNum) {
        inRelevantSection = true;
        changes.push(`\n${chalk.cyan.bold(`v${version}`)}`);
      } else if (versionNum <= fromNum) {
        inRelevantSection = false;
      }
      continue;
    }

    if (inRelevantSection) {
      // Match section headers like ### ✨ Features
      if (line.startsWith('### ')) {
        currentSection = line.replace('### ', '').trim();
        changes.push(chalk.yellow(`  ${currentSection}`));
      }
      // Match bullet points
      else if (line.startsWith('- ')) {
        const item = line.replace('- ', '').trim();
        // Truncate long items
        const truncated = item.length > 80 ? item.substring(0, 77) + '...' : item;
        changes.push(chalk.gray(`    • ${truncated}`));
      }
    }
  }

  return changes.slice(0, 20); // Limit to 20 lines
}

/**
 * Convert version string to number for comparison
 */
function versionToNumber(version: string): number {
  const parts = version.split('.').map(Number);
  return parts[0] * 1000000 + parts[1] * 1000 + parts[2];
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
      if (options.check) {
        console.log(chalk.green('\n  ✓ You have the latest version. No update needed.'));
      }
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

    spinner.info(`New version available: v${currentVersion} → v${latestVersion}`);

    // Fetch and show what's new
    spinner.start('Fetching changelog...');
    const whatsNew = await fetchWhatsNew(currentVersion, latestVersion);
    spinner.stop();

    if (whatsNew.length > 0) {
      console.log(chalk.blue.bold('\n  📋 What\'s New:'));
      whatsNew.forEach(line => console.log(line));
      console.log('');
    }

    // Dry run - show recommendation
    if (options.check) {
      console.log(chalk.green.bold('  ✅ Update recommended!'));
      console.log('');
      console.log(chalk.gray('  To update, run:'));
      console.log(chalk.cyan('    specweave update'));
      console.log('');
      return { updated: false, newVersion: latestVersion };
    }

    // Perform update
    spinner.start(`Updating SpecWeave: v${currentVersion} → v${latestVersion}...`);

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
    .description('Update SpecWeave: CLI, instructions, config, AND plugins (default)')
    .option('--no-self', 'Skip CLI self-update via npm')
    .option('--no-plugins', 'Skip marketplace plugins refresh')
    .option('--all', 'Install ALL plugins (not just router)')
    .option('--minimal', 'Clean /plugin output (removes marketplace, no lazy loading)')
    .option('--check', 'Dry run - show what would change without making changes')
    .option('-v, --verbose', 'Show detailed output')
    .option('-f, --force', 'Force refresh even if up to date')
    .action(async (options) => {
      await updateCommand(options);
    });
}

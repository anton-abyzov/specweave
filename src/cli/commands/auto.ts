/**
 * Auto Mode CLI Command (v3.0 - Pure Ralph Wiggum Pattern)
 *
 * PHILOSOPHY: No session files. No state management.
 * The stop hook simply checks: "Are there active increments?"
 * If yes → block exit. If no → approve exit.
 *
 * This CLI is just a HELPER to:
 * 1. Validate the project
 * 2. Show what increments exist
 * 3. Optionally activate backlog increments
 *
 * Usage:
 *   specweave auto                        # Show active increments
 *   specweave auto 0001                   # Activate specific increment
 *   specweave auto --all-backlog          # Activate all backlog items
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { isSpecWeaveInitialized } from '../../utils/fs-native.js';
import { DisciplineChecker } from '../../core/increment/discipline-checker.js';

export interface AutoCommandOptions {
  dryRun?: boolean;
  allBacklog?: boolean;
  reset?: boolean;
}

export function createAutoCommand(): Command {
  const cmd = new Command('auto')
    .description('Start autonomous execution (Ralph Wiggum pattern)')
    .argument('[incrementIds...]', 'Increment IDs to activate (e.g., 0001, 0001-feature)')
    .option('--dry-run', 'Preview without activating')
    .option('--all-backlog', 'Activate all backlog items')
    .option('--reset', 'Clean up any stale state files')
    .action(async (incrementIds: string[], options: AutoCommandOptions) => {
      const projectPath = process.cwd();

      if (!isSpecWeaveInitialized(projectPath)) {
        console.log(chalk.yellow('No SpecWeave project found in current directory.'));
        console.log(chalk.gray('Run `specweave init` to initialize a project.'));
        return;
      }

      try {
        await handleAutoCommand(projectPath, incrementIds, options);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Main auto command handler
 */
export async function handleAutoCommand(
  projectPath: string,
  incrementIds: string[],
  options: AutoCommandOptions
): Promise<void> {
  const incrementsDir = path.join(projectPath, '.specweave/increments');
  const stateDir = path.join(projectPath, '.specweave/state');
  const configPath = path.join(projectPath, '.specweave/config.json');

  // Handle --reset (clean up stale files)
  if (options.reset) {
    cleanupStateFiles(stateDir);
    console.log(chalk.green('✓ State files cleaned up'));
    return;
  }

  // Check WIP discipline BEFORE starting auto mode
  const disciplineChecker = new DisciplineChecker(projectPath);
  const disciplineResult = await disciplineChecker.validate();

  // Find active and backlog increments
  const activeIncrements = findIncrementsByStatus(incrementsDir, ['active', 'in-progress']);
  const backlogIncrements = findIncrementsByStatus(incrementsDir, ['backlog', 'planned']);

  // Handle --all-backlog: activate all backlog items
  if (options.allBacklog) {
    if (backlogIncrements.length === 0) {
      console.log(chalk.yellow('⚠️  No backlog or planned increments found'));
      return;
    }

    // WIP discipline check: Warn if activating backlog would exceed limits
    const wouldHaveActive = activeIncrements.length + backlogIncrements.length;
    const hardCapViolation = disciplineResult.violations.find(v => v.type === 'hard_cap_exceeded');

    if (wouldHaveActive > (disciplineResult.config.hardCap || 3)) {
      console.log(chalk.red('❌ Cannot activate backlog: Would exceed hard cap'));
      console.log('');
      console.log(`Current active: ${activeIncrements.length}`);
      console.log(`Backlog to activate: ${backlogIncrements.length}`);
      console.log(`Total would be: ${wouldHaveActive}`);
      console.log(`Hard cap: ${disciplineResult.config.hardCap}`);
      console.log('');
      console.log('Complete some work first:');
      for (const inc of activeIncrements) {
        console.log('  • ' + chalk.cyan(inc));
      }
      return;
    }

    if (options.dryRun) {
      console.log(chalk.blue('🔍 Dry Run - Would activate:'));
      for (const inc of backlogIncrements) {
        console.log('  • ' + chalk.cyan(inc));
      }
      return;
    }

    // Show WIP warning if applicable
    if (wouldHaveActive > (disciplineResult.config.maxActiveIncrements || 1)) {
      console.log(chalk.yellow('⚠️  WIP Warning'));
      console.log(`Will have ${wouldHaveActive} active (recommended: ${disciplineResult.config.maxActiveIncrements})`);
      console.log(chalk.gray('Research shows 2+ concurrent tasks reduces productivity by 20-40%'));
      console.log('');
    }

    // Activate backlog increments
    for (const inc of backlogIncrements) {
      activateIncrement(incrementsDir, inc);
    }

    printStartMessage([...activeIncrements, ...backlogIncrements], configPath);
    return;
  }

  // Handle specific increment IDs
  if (incrementIds.length > 0) {
    const toActivate: string[] = [];

    for (const idOrPrefix of incrementIds) {
      const found = findIncrementByIdOrPrefix(incrementsDir, idOrPrefix);
      if (found) {
        toActivate.push(found);
      } else {
        console.log(chalk.yellow(`⚠️  Increment not found: ${idOrPrefix}`));
      }
    }

    if (toActivate.length === 0) {
      console.log(chalk.red('❌ No valid increments found'));
      process.exit(1);
    }

    // WIP discipline check: Warn if activating would exceed limits
    const wouldHaveActive = activeIncrements.length + toActivate.length;

    if (wouldHaveActive > (disciplineResult.config.hardCap || 3)) {
      console.log(chalk.red('❌ Cannot activate: Would exceed hard cap'));
      console.log('');
      console.log(`Current active: ${activeIncrements.length}`);
      console.log(`Trying to activate: ${toActivate.length}`);
      console.log(`Total would be: ${wouldHaveActive}`);
      console.log(`Hard cap: ${disciplineResult.config.hardCap}`);
      console.log('');
      console.log('Complete some work first or increase hard cap in config.json');
      return;
    }

    if (options.dryRun) {
      console.log(chalk.blue('🔍 Dry Run - Would activate:'));
      for (const inc of toActivate) {
        console.log('  • ' + chalk.cyan(inc));
      }
      return;
    }

    // Show WIP warning if applicable
    if (wouldHaveActive > (disciplineResult.config.maxActiveIncrements || 1)) {
      console.log(chalk.yellow('⚠️  WIP Warning'));
      console.log(`Will have ${wouldHaveActive} active (recommended: ${disciplineResult.config.maxActiveIncrements})`);
      console.log(chalk.gray('Research shows 2+ concurrent tasks reduces productivity by 20-40%'));
      console.log('');
    }

    // Activate the specified increments
    for (const inc of toActivate) {
      activateIncrement(incrementsDir, inc);
    }

    printStartMessage(toActivate, configPath);
    return;
  }

  // No arguments - just show status and explain how it works
  if (activeIncrements.length > 0) {
    // Auto with existing active increments - ALLOWED (completing existing work)
    // WIP limits don't apply when continuing work that's already started
    console.log(chalk.blue('ℹ️  Continuing with existing active increments'));
    console.log('');

    // Show discipline status for awareness, but don't block
    if (!disciplineResult.compliant) {
      const hardCapViolation = disciplineResult.violations.find(v => v.type === 'hard_cap_exceeded');
      const wipViolation = disciplineResult.violations.find(v => v.type === 'wip_limit_exceeded');

      if (hardCapViolation) {
        console.log(chalk.red('⚠️  Hard cap exceeded: ' + activeIncrements.length + ' active'));
        console.log(chalk.gray('   WIP limits apply to STARTING new work, not completing existing work'));
      } else if (wipViolation) {
        console.log(chalk.yellow('⚠️  WIP limit: ' + activeIncrements.length + ' active (recommended: ' + disciplineResult.config.maxActiveIncrements + ')'));
        console.log(chalk.gray('   Will complete all active increments before stopping'));
      }
      console.log('');
    }

    printStartMessage(activeIncrements, configPath);
  } else if (backlogIncrements.length > 0) {
    console.log(chalk.blue('ℹ️  No active increments, but backlog exists:'));
    console.log('');
    for (const inc of backlogIncrements) {
      console.log('  • ' + chalk.gray(inc));
    }
    console.log('');
    console.log('To activate backlog: ' + chalk.cyan('specweave auto --all-backlog'));
    console.log('To activate specific: ' + chalk.cyan('specweave auto ' + backlogIncrements[0]));
  } else {
    console.log(chalk.yellow('⚠️  No increments found'));
    console.log('');
    console.log('Create an increment first:');
    console.log('  • ' + chalk.cyan('/sw:increment "Feature description"'));
    console.log('  • ' + chalk.cyan('specweave increment --title "Feature"'));
  }
}

/**
 * Find increments by status
 */
function findIncrementsByStatus(incrementsDir: string, statuses: string[]): string[] {
  if (!fs.existsSync(incrementsDir)) return [];

  const increments: string[] = [];

  for (const entry of fs.readdirSync(incrementsDir)) {
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const metaPath = path.join(incrementsDir, entry, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (statuses.includes(metadata.status)) {
          increments.push(entry);
        }
      } catch {
        // Skip invalid metadata
      }
    }
  }

  return increments;
}

/**
 * Find increment by ID or prefix
 */
function findIncrementByIdOrPrefix(incrementsDir: string, idOrPrefix: string): string | null {
  if (!fs.existsSync(incrementsDir)) return null;

  // Exact match
  const exactPath = path.join(incrementsDir, idOrPrefix);
  if (fs.existsSync(exactPath)) return idOrPrefix;

  // Prefix match
  for (const entry of fs.readdirSync(incrementsDir)) {
    if (entry.startsWith(idOrPrefix)) return entry;
  }

  return null;
}

/**
 * Activate an increment (set status to active)
 */
function activateIncrement(incrementsDir: string, incId: string): void {
  const metaPath = path.join(incrementsDir, incId, 'metadata.json');
  if (!fs.existsSync(metaPath)) return;

  try {
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    // Only activate if not already active
    if (metadata.status !== 'active' && metadata.status !== 'in-progress') {
      metadata.status = 'active';
      metadata.updated = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log(chalk.green(`✓ Activated: ${incId}`));
    }
  } catch {
    // Skip invalid metadata
  }
}

/**
 * Clean up stale state files
 */
function cleanupStateFiles(stateDir: string): void {
  if (!fs.existsSync(stateDir)) return;

  const filesToClean = [
    'auto-mode.json',
    'auto-session.json',
    'auto-needs-increment.json',
    '.stop-auto-dedup',
    '.stop-auto-last-fire',
  ];

  for (const file of filesToClean) {
    const filePath = path.join(stateDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Print start message
 */
function printStartMessage(incrementIds: string[], configPath: string): void {
  // Read config for TDD mode
  let tddMode = false;
  let requireTests = false;

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      tddMode = config.testing?.defaultTestMode === 'tdd';
      requireTests = config.auto?.requireTests === true;
    } catch {
      // Ignore
    }
  }

  console.log('');
  console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  🚀 AUTO MODE READY'));
  console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  console.log('Active Increments:');
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');

  // Show mode
  if (tddMode) {
    console.log(chalk.red.bold('  🔴 TDD MODE ENABLED'));
    console.log(chalk.gray('     All tests must pass before completion'));
  } else if (requireTests) {
    console.log(chalk.yellow.bold('  🧪 TEST MODE ENABLED'));
    console.log(chalk.gray('     Tests should be run before completing'));
  }
  console.log('');

  console.log(chalk.bold('How it works (Pure Ralph Pattern):'));
  console.log('');
  console.log('  Stop hook asks: "Are there active increments?"');
  console.log('    • YES → Block exit, show "Continue with /sw:do"');
  console.log('    • NO  → Approve exit, session complete');
  console.log('');
  console.log(chalk.gray('  No session files. No complex state.'));
  console.log(chalk.gray('  The increment metadata IS the state.'));
  console.log('');

  console.log('Session ends when:');
  console.log('  • All tasks marked [x] complete');
  console.log('  • Increment status changes to "completed"');
  console.log('');

  console.log(chalk.blue('Start working with: ') + chalk.cyan('/sw:do'));
  console.log('');
}

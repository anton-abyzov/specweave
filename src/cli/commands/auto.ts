/**
 * Auto Mode CLI Command (Simplified - Ralph Wiggum Pattern)
 *
 * Philosophy: The increment's metadata.json status IS the state.
 * - No complex session files, no lock files
 * - Just set an auto-mode flag and let the stop hook handle continuation
 * - Stop hook blocks exit if active increments exist
 *
 * Usage:
 *   specweave auto [INCREMENT_IDS...]     # Start auto mode for specific increments
 *   specweave auto --all-backlog          # Process all backlog items
 *   specweave auto --prompt "Build X"     # Create increments from prompt
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { AutoModeFlag } from '../../core/auto/types.js';
import { isSpecWeaveInitialized, ensureSpecWeaveDir } from '../../utils/fs-native.js';

export interface AutoCommandOptions {
  dryRun?: boolean;
  allBacklog?: boolean;
  noIncrement?: boolean;
  noInc?: boolean;
  prompt?: string;
  yes?: boolean;
  y?: boolean;
}

export function createAutoCommand(): Command {
  const cmd = new Command('auto')
    .description('Start autonomous execution (Ralph Wiggum pattern)')
    .argument('[incrementIds...]', 'Increment IDs to process (e.g., 0001, 0001-feature)')
    .option('--dry-run', 'Preview without starting')
    .option('--all-backlog', 'Process all backlog items')
    .option('--no-increment', 'Require existing increments (no auto-creation)')
    .option('--no-inc', 'Alias for --no-increment')
    .option('--prompt <text>', 'Create increments from prompt')
    .option('--yes, -y', 'Auto-approve increment plan')
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
  const stateDir = path.join(projectPath, '.specweave/state');
  const incrementsDir = path.join(projectPath, '.specweave/increments');

  // Ensure state directory exists
  ensureSpecWeaveDir(stateDir, projectPath);

  const autoFlagPath = path.join(stateDir, 'auto-mode.json');
  const noIncrement = options.noIncrement || options.noInc || false;
  const autoApprove = options.yes || options.y || false;

  // Check for already active auto mode
  if (fs.existsSync(autoFlagPath)) {
    try {
      const flag: AutoModeFlag = JSON.parse(fs.readFileSync(autoFlagPath, 'utf-8'));
      if (flag.active) {
        console.log(chalk.yellow('⚠️  Auto mode is already active'));
        console.log('');
        console.log('Options:');
        console.log('  1. Let it continue (close this session)');
        console.log('  2. Cancel it: ' + chalk.cyan('specweave cancel-auto'));
        console.log('  3. Check status: ' + chalk.cyan('specweave auto-status'));
        return;
      }
    } catch {
      // Invalid flag file, will be overwritten
    }
  }

  // Handle --prompt (intelligent increment creation)
  if (options.prompt) {
    await handlePromptMode(projectPath, options.prompt, autoApprove, stateDir);
    return;
  }

  // Build increment list
  let finalIncrementIds = [...incrementIds];

  // Handle --all-backlog
  if (options.allBacklog) {
    finalIncrementIds = await findBacklogIncrements(incrementsDir);
    if (finalIncrementIds.length === 0) {
      console.log(chalk.yellow('⚠️  No backlog or planned increments found'));
      return;
    }
  }

  // If no increments specified, find active ones
  if (finalIncrementIds.length === 0) {
    finalIncrementIds = await findActiveIncrements(incrementsDir);
  }

  // Still no increments?
  if (finalIncrementIds.length === 0) {
    if (noIncrement) {
      console.log(chalk.red('❌ No increments specified and no active increment found'));
      console.log('');
      console.log('Usage: specweave auto [INCREMENT_IDS...]');
      console.log('       specweave auto --all-backlog');
      console.log('       specweave auto --prompt "Build feature X"');
      process.exit(1);
    }

    // Signal to LLM that increment creation is needed
    console.log(chalk.blue('🤔 No increments found.'));
    console.log('');
    console.log('Auto mode will analyze context and create increments as needed.');
    console.log('To require existing increments: use --no-increment');

    // Create marker for LLM
    const markerPath = path.join(stateDir, 'auto-needs-increment.json');
    fs.writeFileSync(
      markerPath,
      JSON.stringify({ needsIncrementCreation: true, timestamp: new Date().toISOString() }, null, 2)
    );

    process.exit(2);
  }

  // Validate increments exist
  const validIncrements: string[] = [];
  for (const incId of finalIncrementIds) {
    const found = findIncrementPath(incrementsDir, incId);
    if (found) {
      validIncrements.push(found);
    } else {
      console.log(chalk.yellow(`⚠️  Increment not found: ${incId}`));
    }
  }

  if (validIncrements.length === 0) {
    console.log(chalk.red('❌ No valid increments found'));
    process.exit(1);
  }

  // Dry run preview
  if (options.dryRun) {
    printDryRunPreview(validIncrements);
    return;
  }

  // Create auto-mode flag (THE ONLY STATE NEEDED!)
  const autoFlag: AutoModeFlag = {
    active: true,
    timestamp: new Date().toISOString(),
    incrementIds: validIncrements,
  };

  fs.writeFileSync(autoFlagPath, JSON.stringify(autoFlag, null, 2), 'utf-8');

  // Print success
  printStartMessage(validIncrements);
}

/**
 * Handle --prompt mode (create increments from prompt)
 */
async function handlePromptMode(
  projectPath: string,
  prompt: string,
  autoApprove: boolean,
  stateDir: string
): Promise<void> {
  console.log(chalk.blue('🧠 Analyzing prompt for intelligent chunking...'));
  console.log('');

  // Create marker for LLM to handle chunking
  const marker = {
    needsIncrementCreation: true,
    fromChunking: true,
    autoApproved: autoApprove,
    prompt,
    timestamp: new Date().toISOString(),
  };

  const markerPath = path.join(stateDir, 'auto-needs-increment.json');
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');

  console.log(chalk.yellow('📋 Prompt analysis required'));
  console.log('');
  if (autoApprove) {
    console.log(chalk.green('✅ Plan will be auto-approved'));
  } else {
    console.log('💡 Review the plan and approve before execution');
  }

  process.exit(2);
}

/**
 * Find backlog or planned increments
 */
async function findBacklogIncrements(incrementsDir: string): Promise<string[]> {
  if (!fs.existsSync(incrementsDir)) return [];

  const increments: string[] = [];

  for (const entry of fs.readdirSync(incrementsDir)) {
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const metaPath = path.join(incrementsDir, entry, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (metadata.status === 'backlog' || metadata.status === 'planned') {
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
 * Find active or in-progress increments
 */
async function findActiveIncrements(incrementsDir: string): Promise<string[]> {
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

/**
 * Find increment by ID or prefix
 */
function findIncrementPath(incrementsDir: string, idOrPrefix: string): string | null {
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
 * Print dry run preview
 */
function printDryRunPreview(incrementIds: string[]): void {
  console.log(chalk.blue('🔍 Dry Run - Preview'));
  console.log('');
  console.log('Would start auto mode for:');
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log(chalk.gray('Run without --dry-run to start.'));
}

/**
 * Print start message
 */
function printStartMessage(incrementIds: string[]): void {
  console.log(chalk.green('🚀 Auto Mode Started'));
  console.log('');
  console.log('Increments:');
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log(chalk.bold('How it works (Ralph Wiggum pattern):'));
  console.log('  1. Stop hook checks: are there active increments?');
  console.log('  2. If yes → block exit, continue working');
  console.log('  3. If no → approve exit, session complete');
  console.log('');
  console.log('Session continues until:');
  console.log('  • All increment tasks are marked [x] complete');
  console.log('  • All increments reach "completed" status');
  console.log('  • You run ' + chalk.cyan('specweave cancel-auto'));
  console.log('');
  console.log(chalk.gray('💡 Tip: Close session anytime. Resume with /sw:do'));
}

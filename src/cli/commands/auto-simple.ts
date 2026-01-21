/**
 * Auto Mode CLI Command (Simplified)
 *
 * Philosophy: Trust the framework!
 * - No session state (increments ARE the state)
 * - No manual sync (hooks handle it)
 * - No quality gates here (belongs in /sw:done)
 * - Just: find active increments, start working, stop hook blocks until done
 *
 * Usage:
 *   specweave auto [INCREMENT_IDS...] [OPTIONS]
 *   specweave auto              # Work on active increments
 *   specweave auto 0001 0002    # Work on specific increments
 *   specweave auto --all-backlog # Work on all backlog increments
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { consoleLogger as logger } from '../../utils/logger.js';
import { isSpecWeaveInitialized } from '../../utils/fs-native.js';

export interface AutoCommandOptions {
  allBacklog?: boolean;
  noIncrement?: boolean;
  noInc?: boolean;
  prompt?: string;
  yes?: boolean;
  y?: boolean;
  dryRun?: boolean;
}

export function createAutoCommand(): Command {
  const cmd = new Command('auto')
    .description('Start autonomous execution (simplified - trusts framework hooks)')
    .argument('[incrementIds...]', 'Increment IDs to process')
    .option('--all-backlog', 'Process all backlog/planned increments')
    .option('--no-increment', 'Require existing increments (skip auto-creation)')
    .option('--no-inc', 'Alias for --no-increment')
    .option('--prompt <text>', 'Analyze prompt and create increments')
    .option('--yes', 'Auto-approve increment plan')
    .option('-y', 'Alias for --yes')
    .option('--dry-run', 'Preview without starting')
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
 * Main auto command handler (simplified)
 */
export async function handleAutoCommand(
  projectPath: string,
  incrementIds: string[],
  options: AutoCommandOptions
): Promise<void> {
  const incrementsDir = path.join(projectPath, '.specweave/increments');
  const stateDir = path.join(projectPath, '.specweave/state');

  // Parse options
  const allBacklog = options.allBacklog || false;
  const noIncrement = options.noIncrement || options.noInc || false;
  const prompt = options.prompt;
  const autoApprove = options.yes || options.y || false;
  const dryRun = options.dryRun || false;

  // Handle --prompt (intelligent chunking)
  if (prompt) {
    await handlePromptChunking(projectPath, prompt, autoApprove, stateDir);
    return;
  }

  // Build increment list
  let finalIncrementIds = [...incrementIds];

  if (allBacklog) {
    finalIncrementIds = findIncrementsByStatus(incrementsDir, ['backlog', 'planned']);
    if (finalIncrementIds.length === 0) {
      console.log(chalk.yellow('⚠️  No backlog or planned increments found'));
      return;
    }
  }

  // If no increments specified, find active ones
  if (finalIncrementIds.length === 0) {
    finalIncrementIds = findIncrementsByStatus(incrementsDir, ['active', 'in-progress']);
  }

  // Still no increments?
  if (finalIncrementIds.length === 0) {
    if (noIncrement) {
      console.log(chalk.red('❌ No increments specified and no active increments found'));
      console.log('');
      console.log('Usage: specweave auto [INCREMENT_IDS...]');
      console.log('       specweave auto --all-backlog');
      process.exit(1);
    } else {
      // Signal to Claude: create increments as needed
      console.log(chalk.blue('🤔 No increments found. Auto mode will analyze context and create increments.'));
      console.log('');
      console.log('💡 The LLM will:');
      console.log('   1. Analyze user prompt and project context');
      console.log('   2. Match existing increments OR create new ones');
      console.log('   3. Start autonomous execution');
      console.log('');

      // Create marker for LLM
      const markerPath = path.join(stateDir, 'auto-needs-increment.json');
      fs.writeFileSync(
        markerPath,
        JSON.stringify({ needsIncrementCreation: true, timestamp: new Date().toISOString() }, null, 2),
        'utf-8'
      );

      process.exit(2); // Special exit code: increment creation needed
    }
  }

  // Dry run preview
  if (dryRun) {
    printDryRunPreview(finalIncrementIds);
    return;
  }

  // Start autonomous execution
  printStartMessage(finalIncrementIds);
}

/**
 * Handle --prompt option (intelligent chunking)
 */
async function handlePromptChunking(
  projectPath: string,
  prompt: string,
  autoApprove: boolean,
  stateDir: string
): Promise<void> {
  console.log(chalk.blue('🧠 Analyzing prompt for intelligent chunking...'));
  console.log('');

  const marker = {
    needsIncrementCreation: true,
    fromChunking: true,
    autoApproved: autoApprove,
    prompt,
    timestamp: new Date().toISOString(),
  };

  const markerPath = path.join(stateDir, 'auto-needs-increment.json');
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');

  console.log(chalk.yellow('📋 Prompt analysis required - LLM will handle chunking'));
  console.log('');
  if (autoApprove) {
    console.log(chalk.green('✅ Plan will be auto-approved'));
  } else {
    console.log('💡 Review the plan and approve before execution');
  }

  process.exit(2);
}

/**
 * Find increments by status (filesystem-based, no session state!)
 */
function findIncrementsByStatus(incrementsDir: string, statuses: string[]): string[] {
  if (!fs.existsSync(incrementsDir)) {
    return [];
  }

  const increments: string[] = [];
  const entries = fs.readdirSync(incrementsDir);

  for (const entry of entries) {
    // Skip non-increment directories
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const metaPath = path.join(incrementsDir, entry, 'metadata.json');
    if (!fs.existsSync(metaPath)) continue;

    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (statuses.includes(metadata.status)) {
        increments.push(entry);
      }
    } catch (error) {
      // Skip invalid metadata
      continue;
    }
  }

  return increments;
}

/**
 * Print dry run preview
 */
function printDryRunPreview(incrementIds: string[]): void {
  console.log(chalk.blue('🔍 Dry Run - Preview'));
  console.log('');
  console.log('Active Increments:');
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log(chalk.gray('Run without --dry-run to start autonomous execution.'));
}

/**
 * Print start message
 */
function printStartMessage(incrementIds: string[]): void {
  console.log(chalk.green('🚀 Auto Mode Started'));
  console.log('');
  console.log(`Active Increments (${incrementIds.length}):`);
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(chalk.yellow('📋 HOW AUTO MODE WORKS:'));
  console.log('');
  console.log('1. Stop hook checks for active increments');
  console.log('2. If active increments exist → blocks exit, continues working');
  console.log('3. Execute /sw:do to work on tasks');
  console.log('4. When tasks complete → run /sw:done for validation');
  console.log('5. If /sw:done passes → increment completes, move to next');
  console.log('6. If /sw:done fails → keep fixing, try again');
  console.log('7. When all increments complete → stop hook approves exit');
  console.log('');
  console.log(chalk.yellow('🎯 FRAMEWORK HANDLES:'));
  console.log('  • Task updates → Auto-sync to GitHub/JIRA/ADO (via hooks)');
  console.log('  • Spec updates → Auto-update ACs (via hooks)');
  console.log('  • Status transitions → Auto-transition when tasks complete (via hooks)');
  console.log('  • Quality validation → Tests, build, coverage (/sw:done)');
  console.log('  • Living docs → Auto-sync on completion (via hooks)');
  console.log('');
  console.log(chalk.yellow('⚡ STOP CRITERIA:'));
  console.log('  • All active increments completed (validated by /sw:done)');
  console.log('  • Tests pass (enforced by /sw:done)');
  console.log('  • Build succeeds (enforced by /sw:done)');
  console.log('  • User runs specweave cancel-auto');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(chalk.gray('💡 Tip: The stop hook will keep you working until done. Trust the framework!'));
  console.log('');
}

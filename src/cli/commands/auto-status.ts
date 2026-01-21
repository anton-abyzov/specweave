/**
 * Auto Status CLI Command (Simplified - Ralph Wiggum Pattern)
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
import { ParallelOrchestrator } from '../../core/auto/parallel/index.js';

export interface AutoStatusOptions {
  json?: boolean;
  parallel?: boolean;
  watch?: boolean;
}

export function createAutoStatusCommand(): Command {
  const cmd = new Command('auto-status')
    .description('Check auto mode status')
    .option('--json', 'Output as JSON')
    .option('--parallel', 'Show parallel session details')
    .option('--watch', 'Watch mode: auto-refresh every 2 seconds')
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
  // Handle watch mode
  if (options.watch) {
    await watchParallelStatus(projectPath, options);
    return;
  }

  // Handle parallel mode status
  if (options.parallel) {
    displayParallelStatus(projectPath, options);
    return;
  }

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

// ============================================================================
// PARALLEL MODE STATUS
// ============================================================================

/**
 * Display parallel session status
 */
export function displayParallelStatus(projectPath: string, options: AutoStatusOptions): void {
  const orchestrator = new ParallelOrchestrator(projectPath);
  const status = orchestrator.getSessionStatus();

  if (!status) {
    if (options.json) {
      console.log(JSON.stringify({ parallelSession: null }, null, 2));
      return;
    }

    console.log('');
    console.log(chalk.bold('PARALLEL SESSION STATUS'));
    console.log('━'.repeat(70));
    console.log(chalk.gray('  No active parallel session'));
    console.log('');
    console.log('Start parallel mode: ' + chalk.cyan('specweave auto --parallel --frontend --backend <increment-id>'));
    console.log('');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Display parallel dashboard
  displayParallelDashboard(status, orchestrator);
}

/**
 * Display the parallel dashboard
 */
function displayParallelDashboard(
  status: ReturnType<ParallelOrchestrator['getSessionStatus']>,
  orchestrator: ParallelOrchestrator
): void {
  if (!status) return;

  console.log('');
  console.log(chalk.bold('╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold(`║  PARALLEL SESSION: ${status.sessionId.padEnd(46)}║`));
  console.log(chalk.bold('╠═══════════════════════════════════════════════════════════════════╣'));

  // Get session
  const session = orchestrator.getSession();
  if (!session) return;

  // Header
  console.log(chalk.bold('║  Agent      │ Status  │ Progress    │ Time   │ Branch               ║'));
  console.log(chalk.bold('║  ───────────────────────────────────────────────────────────────── ║'));

  // Agents
  for (const agentSummary of session.agents) {
    const agent = orchestrator.getAgent(agentSummary.id);
    if (!agent) continue;

    const statusIcon = getStatusIcon(agent.status);
    const statusText = agent.status.padEnd(4);
    const progress = formatProgress(agent.progress.completed, agent.progress.total);
    const elapsed = formatElapsedTime(agent.startedAt);
    const branch = agent.worktree.branch.substring(0, 20).padEnd(20);

    console.log(
      chalk.bold('║  ') +
        chalk.cyan(agent.domain.padEnd(10)) +
        ' │ ' +
        statusIcon +
        ' ' +
        statusText +
        ' │ ' +
        progress +
        ' │ ' +
        chalk.gray(elapsed) +
        ' │ ' +
        chalk.gray(branch) +
        chalk.bold(' ║')
    );
  }

  console.log(chalk.bold('╠═══════════════════════════════════════════════════════════════════╣'));

  // Overall progress
  const overallPercent = Math.round(
    ((status.overall.completed + status.overall.failed) / status.overall.totalAgents) * 100
  ) || 0;

  console.log(
    chalk.bold('║  Overall: ') +
      chalk.green(`${overallPercent}%`) +
      ' │ ' +
      `Completed: ${status.overall.completed} │ Running: ${status.overall.running} │ Failed: ${status.overall.failed}`.padEnd(50) +
      chalk.bold('║')
  );
  console.log(chalk.bold('╚═══════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Actions
  console.log(chalk.bold('ACTIONS'));
  console.log('━'.repeat(70));
  console.log('  • Check detailed status: ' + chalk.cyan('/sw:auto-status --parallel'));
  console.log('  • Cancel session:        ' + chalk.cyan('specweave auto --reset'));
  console.log('');
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'running':
      return '🔄';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'cancelled':
      return '🚫';
    default:
      return '❓';
  }
}

/**
 * Format progress bar
 */
function formatProgress(completed: number, total: number): string {
  const barLength = 6;
  const filledLength = total > 0 ? Math.round((completed / total) * barLength) : 0;
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  const count = `${completed}/${total}`;
  return `${bar} ${count.padEnd(4)}`;
}

/**
 * Format elapsed time
 */
function formatElapsedTime(startedAt: string | undefined): string {
  if (!startedAt) return '  -  ';

  const started = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - started.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`.padStart(5);
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h${mins}m`;
}

/**
 * Watch mode: refresh every 2 seconds
 */
export async function watchParallelStatus(projectPath: string, options: AutoStatusOptions): Promise<void> {
  const refreshInterval = 2000; // 2 seconds

  console.log(chalk.gray('Watching parallel status (Ctrl+C to exit)...'));

  const refresh = () => {
    // Clear screen
    console.clear();
    displayParallelStatus(projectPath, { ...options, watch: false });
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()} (refreshing every 2s)`));
  };

  refresh();

  // Set up interval
  const interval = setInterval(refresh, refreshInterval);

  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('');
    console.log(chalk.gray('Watch mode ended'));
    process.exit(0);
  });

  // Keep process running
  await new Promise(() => {});
}

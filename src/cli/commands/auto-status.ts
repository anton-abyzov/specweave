/**
 * Auto Status CLI Command
 *
 * Check current auto session status, progress, and pending gates.
 *
 * Usage:
 *   specweave auto-status
 *   specweave auto-status --verbose
 *   specweave auto-status --json
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { SessionStateManager } from '../../core/auto/session-state.js';
import { AutoSession } from '../../core/auto/types.js';

export interface AutoStatusOptions {
  verbose?: boolean;
  json?: boolean;
}

export function createAutoStatusCommand(): Command {
  const cmd = new Command('auto-status')
    .description('Check auto session status and progress')
    .option('--verbose', 'Show detailed information')
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
async function handleAutoStatus(
  projectPath: string,
  options: AutoStatusOptions
): Promise<void> {
  const sessionManager = new SessionStateManager(projectPath);
  const session = sessionManager.load();

  if (!session) {
    console.log(chalk.yellow('No auto session found'));
    console.log('');
    console.log('Start a new session with: ' + chalk.cyan('specweave auto [INCREMENT_IDS...]'));
    return;
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(session, null, 2));
    return;
  }

  // Calculate duration
  const startTime = new Date(session.startTime);
  const endTime = session.endTime ? new Date(session.endTime) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // Status color
  const statusColor = getStatusColor(session.status);
  const statusIcon = getStatusIcon(session.status);

  // Print status
  console.log('');
  console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('AUTO SESSION STATUS'));
  console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log('Session ID:   ' + chalk.cyan(session.sessionId));
  console.log(`Status:       ${statusIcon} ${statusColor(session.status)}`);
  console.log('Started:      ' + chalk.gray(session.startTime));

  if (session.endTime) {
    console.log('Ended:        ' + chalk.gray(session.endTime));
  }

  console.log(`Duration:     ${durationHours}h ${durationMinutes}m`);
  console.log(`Iteration:    ${chalk.yellow(session.iteration.toString())}/${chalk.yellow(session.maxIterations.toString())}`);

  if (session.maxHours) {
    const hoursRemaining = session.maxHours - durationHours;
    console.log(`Hours Limit:  ${hoursRemaining}h remaining (max: ${session.maxHours}h)`);
  }

  console.log('');
  console.log(chalk.bold('PROGRESS'));
  console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  if (session.currentIncrement) {
    console.log('Current:      ' + chalk.green(session.currentIncrement));
  } else {
    console.log('Current:      ' + chalk.gray('(none)'));
  }

  console.log(`Queue:        ${session.incrementQueue.length} remaining`);
  console.log(`Completed:    ${chalk.green(session.completedIncrements.length.toString())}`);
  console.log(`Failed:       ${chalk.red(session.failedIncrements.length.toString())}`);

  if (options.verbose) {
    if (session.incrementQueue.length > 0) {
      console.log('');
      console.log(chalk.bold('QUEUE'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      for (const incId of session.incrementQueue) {
        console.log('  • ' + chalk.cyan(incId));
      }
    }

    if (session.completedIncrements.length > 0) {
      console.log('');
      console.log(chalk.bold('COMPLETED'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      for (const incId of session.completedIncrements) {
        console.log('  ✅ ' + chalk.green(incId));
      }
    }

    if (session.failedIncrements.length > 0) {
      console.log('');
      console.log(chalk.bold('FAILED'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      for (const incId of session.failedIncrements) {
        console.log('  ❌ ' + chalk.red(incId));
      }
    }
  }

  // Human gates
  if (session.humanGates.pending) {
    console.log('');
    console.log(chalk.bold('PENDING GATE'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log('Operation:    ' + chalk.yellow(session.humanGates.pending.operation));
    console.log('Pattern:      ' + chalk.gray(session.humanGates.pending.pattern));
    console.log('Requested:    ' + chalk.gray(session.humanGates.pending.requestedAt));
  }

  if (options.verbose && session.humanGates.approved.length > 0) {
    console.log('');
    console.log(chalk.bold('APPROVED GATES'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    for (const gate of session.humanGates.approved) {
      console.log('  ✓ ' + chalk.green(gate));
    }
  }

  // Circuit breakers
  const openBreakers = Object.entries(session.circuitBreakers).filter(
    ([_, status]) => status.state === 'open'
  );

  if (openBreakers.length > 0) {
    console.log('');
    console.log(chalk.bold('CIRCUIT BREAKERS'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    for (const [service, status] of openBreakers) {
      console.log(`${service}:`.padEnd(15) + chalk.red('OPEN'));
      console.log('  Failures:   ' + chalk.yellow(status.failures.toString()));
      if (status.lastFailure) {
        console.log('  Last:       ' + chalk.gray(status.lastFailure));
      }
      if (status.nextRetry) {
        console.log('  Next Retry: ' + chalk.gray(status.nextRetry));
      }
    }
  }

  // End reason
  if (session.endReason) {
    console.log('');
    console.log(chalk.bold('END REASON'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(session.endReason);
  }

  console.log('');
  console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // Commands
  if (session.status === 'running') {
    console.log('Commands:');
    console.log('  • Cancel: ' + chalk.cyan('specweave cancel-auto'));
    console.log('  • Resume: ' + chalk.cyan('/sw:do'));
  } else {
    console.log('Session has ended.');
    console.log('Start a new session: ' + chalk.cyan('specweave auto [INCREMENT_IDS...]'));
  }

  console.log('');
}

/**
 * Get status color function
 */
function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'running':
      return chalk.green;
    case 'completed':
      return chalk.blue;
    case 'paused':
      return chalk.yellow;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'running':
      return '🔄';
    case 'completed':
      return '✅';
    case 'paused':
      return '⏸️';
    case 'failed':
      return '❌';
    case 'cancelled':
      return '🚫';
    default:
      return '❓';
  }
}

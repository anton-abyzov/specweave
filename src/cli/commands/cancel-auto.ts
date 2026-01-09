/**
 * Cancel Auto CLI Command
 *
 * Cancel running auto session and generate summary report.
 *
 * Usage:
 *   specweave cancel-auto
 *   specweave cancel-auto --force
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';

export interface CancelAutoOptions {
  force?: boolean;
}

export function createCancelAutoCommand(): Command {
  const cmd = new Command('cancel-auto')
    .description('Cancel running auto session')
    .option('--force', 'Force cancel without confirmation')
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
async function handleCancelAuto(
  projectPath: string,
  options: CancelAutoOptions
): Promise<void> {
  const stateDir = path.join(projectPath, '.specweave/state');
  const sessionPath = path.join(stateDir, 'auto-session.json');

  // Load session
  if (!fs.existsSync(sessionPath)) {
    console.log(chalk.yellow('No auto session found'));
    return;
  }

  let session: any;
  try {
    session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
  } catch (error) {
    console.log(chalk.yellow('Invalid auto session file'));
    return;
  }

  if (session.status !== 'running') {
    console.log(chalk.yellow(`Session is not running (status: ${session.status})`));
    return;
  }

  // Ask for confirmation unless --force
  if (!options.force) {
    console.log('');
    console.log(chalk.yellow('⚠️  Cancel Auto Session'));
    console.log('');
    console.log('Session ID:   ' + chalk.cyan(session.sessionId));
    console.log('Current:      ' + chalk.green(session.currentIncrement || '(none)'));
    console.log(`Progress:     ${session.completedIncrements.length} completed, ${session.incrementQueue.length} remaining`);
    console.log('');
    console.log('Are you sure you want to cancel? (y/N)');

    // Wait for user input
    const answer = await getUserInput();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log(chalk.gray('Cancelled'));
      return;
    }
  }

  // Calculate duration
  const startTime = new Date(session.startTime);
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // Update session status
  session.status = 'cancelled';
  session.endTime = new Date().toISOString();
  session.endReason = 'User requested cancellation';

  try {
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
  } catch (error) {
    console.log(chalk.red('❌ Failed to cancel session'));
    return;
  }

  // Release lock
  const lockPath = path.join(stateDir, 'active-session.lock');
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (error) {
    // Ignore lock release errors
  }

  // Generate summary report
  const logsDir = path.join(projectPath, '.specweave/logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const summaryPath = path.join(logsDir, `${session.sessionId}-summary.md`);
  const summary = generateSummaryReport(session, durationHours, durationMinutes, 'cancelled');

  fs.writeFileSync(summaryPath, summary, 'utf-8');

  // Log session end
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'session_cancel',
    sessionId: session.sessionId,
    duration: `${durationHours}h ${durationMinutes}m`,
    iterations: session.iteration,
    completed: session.completedIncrements.length,
    failed: session.failedIncrements.length,
  };
  const logPath = path.join(logsDir, 'auto-sessions.log');
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');

  // Output
  console.log('');
  console.log(chalk.yellow('🚫 Auto Session Cancelled'));
  console.log('');
  console.log('Session ID:   ' + chalk.cyan(session.sessionId));
  console.log(`Duration:     ${durationHours}h ${durationMinutes}m`);
  console.log(`Iterations:   ${session.iteration}/${session.maxIterations}`);
  console.log('');
  console.log('RESULTS:');
  console.log('  Completed:  ' + chalk.green(session.completedIncrements.length.toString()));
  console.log('  Failed:     ' + chalk.red(session.failedIncrements.length.toString()));
  console.log('  Remaining:  ' + chalk.yellow(session.incrementQueue.length.toString()));
  console.log('');
  console.log('Summary saved to: ' + chalk.cyan(summaryPath));
  console.log('');
}

/**
 * Get user input from stdin
 * Cross-platform safe (handles Windows, macOS, Linux, WSL, CI environments)
 */
function getUserInput(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setEncoding('utf8');

    // Only set raw mode if stdin is a TTY (prevents Windows errors)
    if (stdin.isTTY && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(false);
    }

    stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

/**
 * Generate summary report
 */
function generateSummaryReport(
  session: any,
  durationHours: number,
  durationMinutes: number,
  status: string
): string {
  const lines: string[] = [];

  lines.push(`# Auto Session Summary`);
  lines.push('');
  lines.push(`**Session ID**: \`${session.sessionId}\``);
  lines.push(`**Status**: ${status}`);
  lines.push(`**Started**: ${session.startTime}`);
  lines.push(`**Ended**: ${new Date().toISOString()}`);
  lines.push(`**Duration**: ${durationHours}h ${durationMinutes}m`);
  lines.push('');

  lines.push(`## Progress`);
  lines.push('');
  lines.push(`- **Iterations**: ${session.iteration}/${session.maxIterations}`);
  lines.push(`- **Completed**: ${session.completedIncrements.length}`);
  lines.push(`- **Failed**: ${session.failedIncrements.length}`);
  lines.push(`- **Remaining**: ${session.incrementQueue.length}`);
  lines.push('');

  if (session.completedIncrements.length > 0) {
    lines.push(`## Completed Increments`);
    lines.push('');
    for (const incId of session.completedIncrements) {
      lines.push(`- ✅ ${incId}`);
    }
    lines.push('');
  }

  if (session.failedIncrements.length > 0) {
    lines.push(`## Failed Increments`);
    lines.push('');
    for (const incId of session.failedIncrements) {
      lines.push(`- ❌ ${incId}`);
    }
    lines.push('');
  }

  if (session.incrementQueue.length > 0) {
    lines.push(`## Remaining Queue`);
    lines.push('');
    for (const incId of session.incrementQueue) {
      lines.push(`- ⏳ ${incId}`);
    }
    lines.push('');
  }

  if (session.humanGates.approved.length > 0) {
    lines.push(`## Approved Gates`);
    lines.push('');
    for (const gate of session.humanGates.approved) {
      lines.push(`- ✓ ${gate}`);
    }
    lines.push('');
  }

  const openBreakers = Object.entries(session.circuitBreakers).filter(
    ([_, status]: [string, any]) => status.state === 'open'
  );

  if (openBreakers.length > 0) {
    lines.push(`## Circuit Breakers`);
    lines.push('');
    for (const [service, status] of openBreakers) {
      lines.push(`- **${service}**: OPEN (${(status as any).failures} failures)`);
    }
    lines.push('');
  }

  if (session.endReason) {
    lines.push(`## End Reason`);
    lines.push('');
    lines.push(session.endReason);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('_Generated by SpecWeave Auto Mode_');

  return lines.join('\n');
}

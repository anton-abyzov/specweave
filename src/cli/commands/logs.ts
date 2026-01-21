import * as path from 'path';
import chalk from 'chalk';
import { HookLogger, HookLogEntry } from '../../core/hooks/hook-logger.js';

export interface LogsCommandOptions {
  tail?: number;
  hook?: string;
  format?: 'json' | 'table';
  follow?: boolean;
}

/**
 * CLI command to view hook logs
 *
 * @param options - Command options (tail, hook filter, format, follow)
 */
export async function logsCommand(options: LogsCommandOptions = {}): Promise<void> {
  const {
    tail = 50,
    hook,
    format = 'table',
    follow = false
  } = options;

  // Determine logs directory
  const logsDir = path.join(process.cwd(), '.specweave', 'logs', 'hooks');

  const logger = new HookLogger(logsDir);

  try {
    if (follow) {
      console.log(chalk.yellow('Follow mode not yet implemented. Showing current logs...\n'));
    }

    let allEntries: HookLogEntry[] = [];

    if (hook) {
      allEntries = await logger.readLogs(hook, tail);
    } else {
      // Show logs from all hooks
      const hooks = await logger.listHooks();

      if (hooks.length === 0) {
        console.log(chalk.yellow('No hook logs found.\n'));
        console.log(chalk.dim(`Logs directory: ${logsDir}`));
        return;
      }

      // Collect logs from all hooks
      const entriesPerHook = await Promise.all(
        hooks.map(hookName => logger.readLogs(hookName, tail))
      );

      // Flatten and sort by timestamp (most recent first)
      allEntries = entriesPerHook
        .flat()
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, tail);
    }

    // Display logs
    if (format === 'json') {
      // JSON format - one entry per line
      for (const entry of allEntries) {
        console.log(JSON.stringify(entry));
      }
    } else {
      // Table format (default)
      displayTable(allEntries);
    }

  } catch (error) {
    console.error(chalk.red('Error reading logs:'), error);
    process.exit(1);
  }
}

/**
 * Display log entries as a formatted table
 */
function displayTable(entries: HookLogEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.yellow('No log entries found.'));
    return;
  }

  console.log('\n' + chalk.bold.underline('Hook Execution Logs') + '\n');
  console.log(
    chalk.bold(
      pad('Timestamp', 22) +
      pad('Hook', 25) +
      pad('Status', 12) +
      pad('Duration', 12) +
      'Details'
    )
  );
  console.log(chalk.dim('─'.repeat(120)));

  for (const entry of entries) {
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : 'N/A';
    const duration = entry.duration ? `${entry.duration}ms` : 'N/A';
    const details = entry.error
      ? chalk.red(truncate(entry.error, 40))
      : entry.warnings?.length
        ? chalk.yellow(truncate(entry.warnings[0].message, 40))
        : '';

    console.log(
      pad(timestamp, 22) +
      pad(entry.hookName, 25) +
      pad(formatStatus(entry.status), 12) +
      pad(duration, 12) +
      details
    );
  }

  console.log('\n' + chalk.dim(`Showing ${entries.length} entries`) + '\n');
}

/** Format status with color */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    success: chalk.green('✓ success'),
    warning: chalk.yellow('⚠ warning'),
    error: chalk.red('✗ error'),
  };
  return statusMap[status] ?? status;
}

/** Pad string to fixed width (ANSI-aware) */
function pad(str: string, width: number): string {
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, width - cleanStr.length));
}

/** Truncate string to max length */
function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.substring(0, maxLen - 3) + '...';
}

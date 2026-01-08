import * as path from 'path';
import chalk from 'chalk';
import { HookLogger } from '../../core/hooks/hook-logger.js';
import { HookLogEntry } from '../../core/hooks/hook-logger.js';

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
      // Follow mode not implemented in this task (would require file watching)
      console.log(chalk.yellow('Follow mode not yet implemented. Showing current logs...'));
      console.log('');
    }

    let allEntries: HookLogEntry[] = [];

    if (hook) {
      // Filter by specific hook
      const entries = await logger.readLogs(hook, tail);
      allEntries = entries;
    } else {
      // Show logs from all hooks
      const hooks = await logger.listHooks();

      if (hooks.length === 0) {
        console.log(chalk.yellow('No hook logs found.'));
        console.log('');
        console.log(chalk.dim(`Logs directory: ${logsDir}`));
        return;
      }

      // Collect logs from all hooks
      const entriesPerHook = await Promise.all(
        hooks.map(async (hookName) => {
          const entries = await logger.readLogs(hookName, tail);
          return entries;
        })
      );

      // Flatten and sort by timestamp
      allEntries = entriesPerHook
        .flat()
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA; // Most recent first
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
 *
 * @param entries - Log entries to display
 */
function displayTable(entries: HookLogEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.yellow('No log entries found.'));
    return;
  }

  // Table header
  console.log('');
  console.log(chalk.bold.underline('Hook Execution Logs'));
  console.log('');
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

  // Table rows
  for (const entry of entries) {
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : 'N/A';

    const status = formatStatus(entry.status);
    const duration = entry.duration ? `${entry.duration}ms` : 'N/A';

    let details = '';
    if (entry.error) {
      details = chalk.red(truncate(entry.error, 40));
    } else if (entry.warnings && entry.warnings.length > 0) {
      details = chalk.yellow(truncate(entry.warnings[0].message, 40));
    }

    console.log(
      pad(timestamp, 22) +
      pad(entry.hookName, 25) +
      pad(status, 12) +
      pad(duration, 12) +
      details
    );
  }

  console.log('');
  console.log(chalk.dim(`Showing ${entries.length} entries`));
  console.log('');
}

/**
 * Format status with color
 *
 * @param status - Status string
 * @returns Colored status string
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'success':
      return chalk.green('✓ success');
    case 'warning':
      return chalk.yellow('⚠ warning');
    case 'error':
      return chalk.red('✗ error');
    default:
      return status;
  }
}

/**
 * Pad string to fixed width
 *
 * @param str - String to pad
 * @param width - Target width
 * @returns Padded string
 */
function pad(str: string, width: number): string {
  // Remove ANSI color codes for length calculation
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, width - cleanStr.length);
  return str + ' '.repeat(padding);
}

/**
 * Truncate string to max length
 *
 * @param str - String to truncate
 * @param maxLen - Maximum length
 * @returns Truncated string
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.substring(0, maxLen - 3) + '...';
}

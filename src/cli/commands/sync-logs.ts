/**
 * Sync Logs Command
 *
 * Query and export sync audit logs.
 *
 * @module cli/commands/sync-logs
 */

import { Command } from 'commander';
import path from 'path';
import { LogAggregator, LogQuery, LogQueryResult } from '../../core/logs/log-aggregator.js';
import { LogExporter, ExportFormat } from '../../core/logs/log-exporter.js';
import { AuditLogEntry } from '../../core/sync/sync-audit-logger.js';
import { SyncPlatform } from '../../core/types/sync-config.js';
import { SyncOperation } from '../../core/sync/permission-enforcer.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Sync logs command options
 */
export interface SyncLogsOptions {
  since?: string;
  until?: string;
  platform?: SyncPlatform;
  operation?: SyncOperation;
  result?: 'success' | 'denied' | 'error';
  limit?: number;
  export?: string;
  json?: boolean;
}

/**
 * Result emoji mapping
 */
const RESULT_EMOJI: Record<string, string> = {
  success: '✅',
  denied: '🚫',
  error: '❌',
};

/**
 * Create the sync-logs command
 */
export function createSyncLogsCommand(options: {
  logger?: Logger;
  specweavePath?: string;
} = {}): Command {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const command = new Command('sync-logs')
    .description('Query and export sync audit logs')
    .option('--since <date>', 'Start date (ISO 8601 or YYYY-MM-DD)')
    .option('--until <date>', 'End date (ISO 8601 or YYYY-MM-DD)')
    .option('--platform <name>', 'Filter by platform (github|jira|ado)')
    .option('--operation <type>', 'Filter by operation type')
    .option('--result <result>', 'Filter by result (success|denied|error)')
    .option('--limit <n>', 'Maximum entries to return', '100')
    .option('--export <path>', 'Export to file (JSON, JSONL, or CSV)')
    .option('--json', 'Output as JSON')
    .action(async (cmdOptions: SyncLogsOptions) => {
      await runSyncLogs({
        ...cmdOptions,
        limit: typeof cmdOptions.limit === 'string'
          ? parseInt(cmdOptions.limit, 10)
          : cmdOptions.limit,
        logger,
        specweavePath,
      });
    });

  return command;
}

/**
 * Run the sync logs command
 */
export async function runSyncLogs(options: SyncLogsOptions & {
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const aggregator = new LogAggregator({ specweavePath, logger });

  // Build query from options
  const query: LogQuery = {
    limit: options.limit ?? 100,
  };

  if (options.since) {
    query.since = parseDate(options.since);
  } else {
    // Default: last 24 hours
    query.since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  if (options.until) {
    query.until = parseDate(options.until);
  }

  if (options.platform) {
    query.platform = options.platform;
  }

  if (options.operation) {
    query.operation = options.operation;
  }

  if (options.result) {
    query.result = options.result;
  }

  try {
    const result = await aggregator.query(query);

    // Export to file if requested
    if (options.export) {
      const exporter = new LogExporter({ logger });
      await exporter.export(result, options.export);
      console.log(`✅ Exported ${result.entries.length} entries to ${options.export}`);
      return;
    }

    // Output as JSON if requested
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Format and print human-readable output
    const output = formatLogOutput(result, query);
    console.log(output);
  } catch (error) {
    logger.error(`Failed to query logs: ${error}`);
    console.error(`❌ Failed to query logs: ${error}`);
    process.exitCode = 1;
  }
}

/**
 * Format log entries for human-readable output
 */
function formatLogOutput(result: LogQueryResult, query: LogQuery): string {
  const lines: string[] = [];

  // Header
  const timeRange = formatTimeRange(query);
  const filters = formatFilters(query);
  const header = `📋 SYNC LOGS (${timeRange})${filters}`;
  lines.push(header);
  lines.push('━'.repeat(70));
  lines.push('');

  if (result.entries.length === 0) {
    lines.push('No log entries found for the specified criteria.');
    return lines.join('\n');
  }

  // Column headers
  lines.push(
    'TIMESTAMP'.padEnd(20) +
    'PLATFORM'.padEnd(10) +
    'OPERATION'.padEnd(18) +
    'ITEM'.padEnd(12) +
    'RESULT'.padEnd(12) +
    'TIME'
  );
  lines.push('-'.repeat(70));

  // Entries
  for (const entry of result.entries) {
    lines.push(formatLogLine(entry));

    // Show reason for denied entries
    if (entry.result === 'denied' && entry.reason) {
      lines.push(`   Reason: ${entry.reason}`);
    }

    // Show error for failed entries
    if (entry.result === 'error' && entry.error) {
      lines.push(`   Error: ${entry.error}`);
    }
  }

  // Footer
  lines.push('');
  if (result.hasMore) {
    lines.push(`Showing ${result.entries.length} of ${result.total} entries`);
    lines.push('Use --limit to show more, --export to save all');
  } else {
    lines.push(`Showing ${result.entries.length} entries (query took ${result.executionTimeMs}ms)`);
  }

  return lines.join('\n');
}

/**
 * Format a single log entry line
 */
function formatLogLine(entry: AuditLogEntry): string {
  const timestamp = formatTimestamp(entry.timestamp).padEnd(20);
  const platform = entry.platform.padEnd(10);
  const operation = entry.operation.padEnd(18);
  const itemId = truncate(entry.itemId, 10).padEnd(12);
  const emoji = RESULT_EMOJI[entry.result] || '❓';
  const result = `${emoji} ${entry.result}`.padEnd(12);
  const duration = entry.durationMs ? `${entry.durationMs}ms` : '-';

  return `${timestamp}${platform}${operation}${itemId}${result}${duration}`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Format time range description
 */
function formatTimeRange(query: LogQuery): string {
  if (query.since && query.until) {
    return `${formatDate(query.since)} to ${formatDate(query.until)}`;
  }
  if (query.since) {
    const now = Date.now();
    const sinceTime = query.since.getTime();
    const diffHours = Math.round((now - sinceTime) / (60 * 60 * 1000));

    if (diffHours <= 24) {
      return 'last 24 hours';
    }
    if (diffHours <= 168) {
      return `last ${Math.round(diffHours / 24)} days`;
    }
    return `since ${formatDate(query.since)}`;
  }
  return 'all time';
}

/**
 * Format active filters
 */
function formatFilters(query: LogQuery): string {
  const filters: string[] = [];

  if (query.platform) {
    filters.push(query.platform);
  }
  if (query.operation) {
    filters.push(query.operation);
  }
  if (query.result) {
    filters.push(`${query.result} only`);
  }

  return filters.length > 0 ? ` [${filters.join(', ')}]` : '';
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  // Try ISO format first
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}

/**
 * Truncate text to fit width
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }
  return text.slice(0, maxWidth - 2) + '..';
}

// Export for testing
export {
  formatLogOutput,
  formatLogLine,
  parseDate,
};

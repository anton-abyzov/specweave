/**
 * @file decision-log.ts
 * @description CLI command to query structured decision logs from hooks
 *
 * Usage:
 *   specweave decision-log                     # Show last 20 decisions
 *   specweave decision-log --hook stop-auto    # Filter by hook
 *   specweave decision-log --decision block    # Filter by decision type
 *   specweave decision-log --since 1h          # Filter by time window
 *   specweave decision-log --json              # Raw JSON output
 *   specweave decision-log --limit 50          # Custom limit
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface DecisionLogEntry {
  timestamp: string;
  hook: string;
  decision: 'approve' | 'block';
  reason: string;
  reasonCode: string;
  durationMs: number;
  context: Record<string, unknown>;
}

export interface DecisionLogCommandOptions {
  projectRoot?: string;
  hook?: string;
  decision?: 'approve' | 'block';
  since?: string;
  limit?: number;
  json?: boolean;
  tail?: boolean;
}

export interface DecisionLogResult {
  entries: DecisionLogEntry[];
  format: 'table' | 'json';
}

/**
 * Parse time window string (1h, 24h, 7d) to milliseconds
 */
function parseSinceWindow(since: string): number {
  const match = since.match(/^(\d+)(h|d|m)$/);
  if (!match) {
    throw new Error(`Invalid time window format: ${since}. Use 1h, 24h, 7d, etc.`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    m: 60 * 1000,          // minutes
    h: 60 * 60 * 1000,     // hours
    d: 24 * 60 * 60 * 1000, // days
  };

  return value * multipliers[unit];
}

/**
 * Read and parse the decisions.jsonl file
 */
async function readDecisionLog(logPath: string): Promise<DecisionLogEntry[]> {
  if (!fs.existsSync(logPath)) {
    return [];
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const entries: DecisionLogEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as DecisionLogEntry;
      entries.push(entry);
    } catch {
      // Skip malformed JSON lines
    }
  }

  return entries;
}

/**
 * Filter entries based on options
 */
function filterEntries(
  entries: DecisionLogEntry[],
  options: DecisionLogCommandOptions,
): DecisionLogEntry[] {
  let filtered = [...entries];

  // Filter by hook name
  if (options.hook) {
    filtered = filtered.filter((e) => e.hook === options.hook);
  }

  // Filter by decision type
  if (options.decision) {
    filtered = filtered.filter((e) => e.decision === options.decision);
  }

  // Filter by time window
  if (options.since) {
    const windowMs = parseSinceWindow(options.since);
    const cutoff = Date.now() - windowMs;
    filtered = filtered.filter((e) => {
      const entryTime = new Date(e.timestamp).getTime();
      return entryTime >= cutoff;
    });
  }

  return filtered;
}

/**
 * Sort entries by timestamp (most recent first) and apply limit
 */
function sortAndLimit(
  entries: DecisionLogEntry[],
  limit: number,
): DecisionLogEntry[] {
  return entries
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Most recent first
    })
    .slice(0, limit);
}

/**
 * Format a single entry for table display
 */
function formatEntryForTable(entry: DecisionLogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleString();
  const hook = entry.hook.padEnd(15);
  const decision =
    entry.decision === 'approve'
      ? chalk.green('✓ approve')
      : chalk.red('✗ block');
  const decisionPadded = decision.padEnd(20);
  const reason = entry.reason.substring(0, 40);
  const duration = `${entry.durationMs}ms`;

  return `${timestamp.padEnd(22)} ${hook} ${decisionPadded} ${duration.padEnd(10)} ${reason}`;
}

/**
 * Display entries in table format
 */
function displayTable(entries: DecisionLogEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.yellow('No decision log entries found.'));
    return;
  }

  console.log('\n' + chalk.bold.underline('Decision Log') + '\n');
  console.log(
    chalk.bold(
      'Timestamp'.padEnd(22) +
        ' Hook'.padEnd(16) +
        ' Decision'.padEnd(21) +
        ' Duration'.padEnd(11) +
        ' Reason',
    ),
  );
  console.log(chalk.dim('─'.repeat(100)));

  for (const entry of entries) {
    console.log(formatEntryForTable(entry));
  }

  console.log('\n' + chalk.dim(`Showing ${entries.length} entries`) + '\n');
}

/**
 * Display entries in JSON format
 */
function displayJson(entries: DecisionLogEntry[]): void {
  for (const entry of entries) {
    console.log(JSON.stringify(entry));
  }
}

/**
 * CLI command to query decision logs
 */
export async function decisionLogCommand(
  options: DecisionLogCommandOptions = {},
): Promise<DecisionLogResult> {
  const {
    projectRoot = process.cwd(),
    hook,
    decision,
    since,
    limit = 20,
    json = false,
  } = options;

  // Determine log file path
  const logPath = path.join(projectRoot, '.specweave', 'logs', 'decisions.jsonl');

  // Read all entries
  const allEntries = await readDecisionLog(logPath);

  // Apply filters
  const filtered = filterEntries(allEntries, { hook, decision, since });

  // Sort and limit
  const result = sortAndLimit(filtered, limit);

  // Display output (only when running as CLI, not when testing)
  if (!options.projectRoot || options.projectRoot === process.cwd()) {
    if (json) {
      displayJson(result);
    } else {
      displayTable(result);
    }
  }

  return {
    entries: result,
    format: json ? 'json' : 'table',
  };
}

/**
 * Watch mode for --tail option (follows log file)
 */
export async function decisionLogTail(
  options: DecisionLogCommandOptions = {},
): Promise<void> {
  const { projectRoot = process.cwd(), hook, decision } = options;

  const logPath = path.join(projectRoot, '.specweave', 'logs', 'decisions.jsonl');
  const logsDir = path.dirname(logPath);

  console.log(chalk.yellow(`Watching ${logPath} for new entries...`));
  console.log(chalk.dim('Press Ctrl+C to stop.\n'));

  // Track file position and inode for staleness detection
  let lastSize = 0;
  let lastInode: number | null = null;

  const updateFileInfo = (): void => {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      lastSize = stats.size;
      lastInode = stats.ino;
    } else {
      lastSize = 0;
      lastInode = null;
    }
  };

  updateFileInfo();

  // Watch for changes
  const watcher = fs.watch(logsDir, (event, filename) => {
    if (filename === 'decisions.jsonl') {
      if (!fs.existsSync(logPath)) {
        // File was deleted - reset tracking
        lastSize = 0;
        lastInode = null;
        return;
      }

      const stats = fs.statSync(logPath);

      // Detect file replacement (different inode = new file)
      if (lastInode !== null && stats.ino !== lastInode) {
        console.log(chalk.dim('[File recreated, resetting position]'));
        lastSize = 0;
        lastInode = stats.ino;
      }

      if (stats.size > lastSize) {
        // Read new content
        const fd = fs.openSync(logPath, 'r');
        const buffer = Buffer.alloc(stats.size - lastSize);
        fs.readSync(fd, buffer, 0, buffer.length, lastSize);
        fs.closeSync(fd);

        const newContent = buffer.toString('utf-8');
        const lines = newContent.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as DecisionLogEntry;

            // Apply filters
            if (hook && entry.hook !== hook) continue;
            if (decision && entry.decision !== decision) continue;

            console.log(formatEntryForTable(entry));
          } catch {
            // Skip malformed lines
          }
        }

        lastSize = stats.size;
        lastInode = stats.ino;
      } else if (stats.size < lastSize) {
        // File was truncated/rotated
        lastSize = stats.size;
        lastInode = stats.ino;
      }
    }
  });

  // Periodic staleness check (every 5 seconds)
  const stalenessCheck = setInterval(() => {
    if (!fs.existsSync(logPath)) {
      if (lastInode !== null) {
        console.log(chalk.dim('[File deleted, waiting for recreation...]'));
        lastSize = 0;
        lastInode = null;
      }
    } else {
      const stats = fs.statSync(logPath);
      // Check if file was replaced while watcher wasn't notified
      if (lastInode !== null && stats.ino !== lastInode) {
        console.log(chalk.dim('[File replaced, resetting position]'));
        lastSize = 0;
        lastInode = stats.ino;
      }
    }
  }, 5000);

  // Keep process alive and cleanup on exit
  process.on('SIGINT', () => {
    clearInterval(stalenessCheck);
    watcher.close();
    console.log('\nStopped watching.');
    process.exit(0);
  });
}

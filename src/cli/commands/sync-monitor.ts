/**
 * Sync Monitor Command
 *
 * Displays the sync orchestration dashboard with job statuses,
 * notifications, and recent activity.
 *
 * @module cli/commands/sync-monitor
 */

import { Command } from 'commander';
import path from 'path';
import {
  DashboardDataProvider,
  DashboardData,
  DashboardJobInfo,
} from '../../core/dashboard/dashboard-data.js';
import { getSeverityEmoji } from '../../core/notifications/notification-types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Sync monitor command options
 */
export interface SyncMonitorOptions {
  json?: boolean;
}

/**
 * Box drawing characters for ASCII dashboard
 */
const BOX = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  headerSep: '╠',
  headerSepRight: '╣',
  sectionSep: '╟',
  sectionSepRight: '╢',
};

/**
 * Dashboard width (excluding box borders)
 */
const DASHBOARD_WIDTH = 64;

/**
 * Create the sync-monitor command
 */
export function createSyncMonitorCommand(options: {
  logger?: Logger;
  specweavePath?: string;
} = {}): Command {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const command = new Command('sync-monitor')
    .description('Show sync orchestration dashboard')
    .option('--json', 'Output as JSON')
    .action(async (cmdOptions: SyncMonitorOptions) => {
      await runSyncMonitor({
        json: cmdOptions.json,
        logger,
        specweavePath,
      });
    });

  return command;
}

/**
 * Run the sync monitor command
 */
export async function runSyncMonitor(options: {
  json?: boolean;
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const provider = new DashboardDataProvider({
    specweavePath,
    logger,
  });

  try {
    const data = await provider.getData();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Format and print the dashboard
    const output = formatDashboard(data, provider);
    console.log(output);
  } catch (error) {
    logger.error(`Failed to fetch dashboard data: ${error}`);
    throw error;
  }
}

/**
 * Format the dashboard data as an ASCII box
 */
function formatDashboard(data: DashboardData, provider: DashboardDataProvider): string {
  const lines: string[] = [];

  // Title
  lines.push(boxLine(BOX.topLeft, BOX.topRight));
  lines.push(centeredLine('SYNC MONITOR DASHBOARD'));
  lines.push(boxLine(BOX.headerSep, BOX.headerSepRight));

  // Jobs Section
  lines.push(sectionHeader('SCHEDULED JOBS'));
  lines.push(boxLine(BOX.sectionSep, BOX.sectionSepRight));

  if (data.jobs.length === 0) {
    lines.push(paddedLine('No scheduled jobs'));
  } else {
    for (const job of data.jobs) {
      lines.push(formatJobLine(job, provider));
    }
  }

  // Notifications Section
  lines.push(boxLine(BOX.headerSep, BOX.headerSepRight));
  const notifCount = data.notifications.pending;
  lines.push(sectionHeader(`PENDING NOTIFICATIONS (${notifCount})`));
  lines.push(boxLine(BOX.sectionSep, BOX.sectionSepRight));

  if (data.notifications.recent.length === 0) {
    lines.push(paddedLine('No pending notifications'));
  } else {
    for (const notif of data.notifications.recent) {
      const emoji = getSeverityEmoji(notif.severity);
      const severity = notif.severity.toUpperCase();
      const text = `${emoji} ${severity}: ${notif.title}`;
      lines.push(paddedLine(truncate(text, DASHBOARD_WIDTH - 2)));
    }
  }

  // Activity Section
  lines.push(boxLine(BOX.headerSep, BOX.headerSepRight));
  lines.push(sectionHeader('RECENT SYNC ACTIVITY (last 24h)'));
  lines.push(boxLine(BOX.sectionSep, BOX.sectionSepRight));

  // Platform breakdown
  const platforms = data.activity.byPlatform;
  const platformLine = `GitHub: ${platforms.github} │ JIRA: ${platforms.jira} │ ADO: ${platforms.ado}`;
  lines.push(paddedLine(platformLine));

  // Result breakdown
  const { synced, failed, skipped } = data.activity.last24h;
  const resultLine = `Success: ${synced} │ Failed: ${failed} │ Skipped: ${skipped}`;
  lines.push(paddedLine(resultLine));

  // Footer
  lines.push(boxLine(BOX.bottomLeft, BOX.bottomRight));

  return lines.join('\n');
}

/**
 * Format a job line for display
 */
function formatJobLine(job: DashboardJobInfo, provider: DashboardDataProvider): string {
  const emoji = provider.getJobStatusEmoji(job.status);
  const statusText = job.status.padEnd(8);

  let timeInfo = '';
  if (job.status === 'running') {
    // Show when started (approximate from last state change)
    timeInfo = 'Started recently';
  } else if (job.status === 'disabled') {
    timeInfo = '';
  } else if (job.status === 'failed') {
    timeInfo = job.lastError ? truncate(job.lastError, 25) : 'Error';
  } else {
    const lastRun = provider.formatRelativeTime(job.lastRun);
    const nextRun = provider.formatRelativeTime(job.nextRun);
    timeInfo = `Last: ${lastRun} │ Next: ${nextRun}`;
  }

  const jobName = job.id.padEnd(18);
  const content = `${jobName} │ ${emoji} ${statusText} │ ${timeInfo}`;
  return paddedLine(truncate(content, DASHBOARD_WIDTH - 2));
}

/**
 * Create a horizontal line with specified corners
 */
function boxLine(left: string, right: string): string {
  return left + BOX.horizontal.repeat(DASHBOARD_WIDTH) + right;
}

/**
 * Create a centered text line
 */
function centeredLine(text: string): string {
  const padding = Math.max(0, Math.floor((DASHBOARD_WIDTH - text.length) / 2));
  const paddedText = ' '.repeat(padding) + text;
  return BOX.vertical + paddedText.padEnd(DASHBOARD_WIDTH) + BOX.vertical;
}

/**
 * Create a section header line
 */
function sectionHeader(text: string): string {
  return BOX.vertical + ' ' + text.padEnd(DASHBOARD_WIDTH - 1) + BOX.vertical;
}

/**
 * Create a padded content line
 */
function paddedLine(text: string): string {
  return BOX.vertical + ' ' + text.padEnd(DASHBOARD_WIDTH - 1) + BOX.vertical;
}

/**
 * Truncate text to fit width
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }
  return text.slice(0, maxWidth - 3) + '...';
}

// Export for testing
export { formatDashboard, formatJobLine };

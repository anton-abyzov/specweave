/**
 * Notifications Command
 *
 * View and manage sync notifications.
 *
 * @module cli/commands/notifications
 */

import { Command } from 'commander';
import path from 'path';
import { NotificationManager } from '../../core/notifications/notification-manager.js';
import {
  Notification,
  NotificationType,
  NotificationSeverity,
  getSeverityEmoji,
  getNotificationTypeLabel,
} from '../../core/notifications/notification-types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Notifications command options
 */
export interface NotificationsOptions {
  all?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  json?: boolean;
}

/**
 * Create the notifications command
 */
export function createNotificationsCommand(options: {
  logger?: Logger;
  specweavePath?: string;
} = {}): Command {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const command = new Command('notifications')
    .description('View and manage sync notifications')
    .option('--all', 'Include dismissed notifications')
    .option('--type <type>', 'Filter by notification type')
    .option('--severity <level>', 'Filter by severity level')
    .option('--json', 'Output as JSON')
    .action(async (cmdOptions: NotificationsOptions) => {
      await listNotifications({
        ...cmdOptions,
        logger,
        specweavePath,
      });
    });

  // Subcommand: show
  command
    .command('show <id>')
    .description('Show notification details')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts: { json?: boolean }) => {
      await showNotification(id, {
        json: opts.json,
        logger,
        specweavePath,
      });
    });

  // Subcommand: dismiss
  command
    .command('dismiss <id>')
    .description('Dismiss a notification')
    .action(async (id: string) => {
      await dismissNotification(id, { logger, specweavePath });
    });

  // Subcommand: dismiss-all
  command
    .command('dismiss-all')
    .description('Dismiss all pending notifications')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (opts: { yes?: boolean }) => {
      await dismissAllNotifications({ skipConfirm: opts.yes, logger, specweavePath });
    });

  return command;
}

/**
 * List notifications
 */
export async function listNotifications(options: NotificationsOptions & {
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const manager = new NotificationManager({ specweavePath, logger });

  const notifications = await manager.getAll({
    type: options.type,
    severity: options.severity,
    includeDismissed: options.all,
  });

  if (options.json) {
    console.log(JSON.stringify(notifications, null, 2));
    return;
  }

  const pending = notifications.filter(n => !n.dismissedAt);
  const header = options.all
    ? `📬 ALL NOTIFICATIONS (${notifications.length})`
    : `📬 PENDING NOTIFICATIONS (${pending.length})`;

  console.log(header);
  console.log('━'.repeat(50));

  if (notifications.length === 0) {
    console.log('No notifications found.');
    return;
  }

  for (const notif of notifications) {
    console.log(formatNotificationLine(notif));
  }

  console.log('');
  console.log("Use '/specweave:notifications show <id>' to view details");
  console.log("Use '/specweave:notifications dismiss <id>' to dismiss");
}

/**
 * Show notification details
 */
export async function showNotification(
  id: string,
  options: {
    json?: boolean;
    logger?: Logger;
    specweavePath?: string;
  }
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const manager = new NotificationManager({ specweavePath, logger });
  const notification = await manager.getById(id);

  if (!notification) {
    console.error(`❌ Notification not found: ${id}`);
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(notification, null, 2));
    return;
  }

  console.log('📬 NOTIFICATION DETAILS');
  console.log('━'.repeat(50));
  console.log('');
  console.log(`ID:        ${notification.id}`);
  console.log(`Type:      ${getNotificationTypeLabel(notification.type)}`);
  console.log(`Severity:  ${getSeverityEmoji(notification.severity)} ${notification.severity}`);
  console.log(`Title:     ${notification.title}`);
  console.log(`Message:   ${notification.message}`);
  console.log(`Created:   ${formatDate(notification.createdAt)} (${formatRelativeTime(notification.createdAt)})`);

  if (notification.readAt) {
    console.log(`Read:      ${formatDate(notification.readAt)}`);
  }
  if (notification.dismissedAt) {
    console.log(`Dismissed: ${formatDate(notification.dismissedAt)}`);
  }

  if (notification.data && Object.keys(notification.data).length > 0) {
    console.log('');
    console.log('Data:');
    for (const [key, value] of Object.entries(notification.data)) {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    }
  }
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(
  id: string,
  options: {
    logger?: Logger;
    specweavePath?: string;
  }
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const manager = new NotificationManager({ specweavePath, logger });

  const notification = await manager.getById(id);
  if (!notification) {
    console.error(`❌ Notification not found: ${id}`);
    process.exitCode = 1;
    return;
  }

  if (notification.dismissedAt) {
    console.log(`ℹ️ Notification ${id} is already dismissed`);
    return;
  }

  await manager.dismiss([id]);

  const remaining = await manager.getPending();
  console.log(`✅ Dismissed notification ${id}`);
  console.log('');
  console.log(`Remaining: ${remaining.length} pending notifications`);
}

/**
 * Dismiss all pending notifications
 */
export async function dismissAllNotifications(options: {
  skipConfirm?: boolean;
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const manager = new NotificationManager({ specweavePath, logger });
  const pending = await manager.getPending();

  if (pending.length === 0) {
    console.log('ℹ️ No pending notifications to dismiss');
    return;
  }

  if (!options.skipConfirm) {
    // In non-interactive mode, require --yes flag
    console.log(`⚠️ This will dismiss ${pending.length} pending notifications.`);
    console.log('Use --yes flag to confirm: /specweave:notifications dismiss-all --yes');
    return;
  }

  await manager.dismissAll();
  console.log(`✅ Dismissed ${pending.length} notifications`);
}

/**
 * Format a notification for list display
 */
function formatNotificationLine(notif: Notification): string {
  const id = notif.id.padEnd(14);
  const emoji = getSeverityEmoji(notif.severity);
  const severity = notif.severity.toUpperCase().padEnd(8);
  const title = truncate(notif.title, 30);
  const age = formatRelativeTime(notif.createdAt);
  const dismissed = notif.dismissedAt ? ' [dismissed]' : '';

  return `${id}  ${emoji} ${severity}  ${title}  ${age}${dismissed}`;
}

/**
 * Format ISO date to readable string
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format time relative to now
 */
function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 60 * 1000) {
    return 'just now';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Truncate text to fit width
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text.padEnd(maxWidth);
  }
  return text.slice(0, maxWidth - 3) + '...';
}

// Export helpers for testing
export {
  formatNotificationLine,
  formatDate,
  formatRelativeTime,
};

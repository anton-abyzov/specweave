/**
 * Notification Display
 *
 * Formatting utilities for displaying notifications in CLI output.
 *
 * @module core/notifications/notification-display
 */

import {
  Notification,
  NotificationSeverity,
  getSeverityEmoji,
  getNotificationTypeLabel,
} from './notification-types.js';

/**
 * Format a single notification for display
 *
 * @param notification - Notification to format
 * @returns Formatted string
 */
export function formatNotification(notification: Notification): string {
  const emoji = getSeverityEmoji(notification.severity);
  return `${emoji} ${notification.title}`;
}

/**
 * Format a detailed notification for display
 *
 * @param notification - Notification to format
 * @returns Formatted string with message
 */
export function formatNotificationDetailed(notification: Notification): string {
  const emoji = getSeverityEmoji(notification.severity);
  const type = getNotificationTypeLabel(notification.type);
  return `${emoji} [${type}] ${notification.title}\n   ${notification.message}`;
}

/**
 * Format a notification summary line
 *
 * @param notifications - Array of pending notifications
 * @returns Summary string (e.g., "3 notifications: 1 critical, 2 warnings")
 */
export function formatNotificationSummary(notifications: Notification[]): string {
  if (notifications.length === 0) {
    return '';
  }

  const bySeverity: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };

  for (const n of notifications) {
    bySeverity[n.severity]++;
  }

  const parts: string[] = [];
  if (bySeverity.critical > 0) {
    parts.push(`${bySeverity.critical} critical`);
  }
  if (bySeverity.warning > 0) {
    parts.push(`${bySeverity.warning} warning${bySeverity.warning > 1 ? 's' : ''}`);
  }
  if (bySeverity.info > 0) {
    parts.push(`${bySeverity.info} info`);
  }

  const count = notifications.length;
  const countLabel = count === 1 ? 'notification' : 'notifications';

  return `📬 ${count} ${countLabel}${parts.length > 0 ? ': ' + parts.join(', ') : ''}`;
}

/**
 * Format a notification list for CLI display
 *
 * @param notifications - Array of notifications
 * @param options - Display options
 * @returns Formatted string
 */
export function formatNotificationList(
  notifications: Notification[],
  options: { maxItems?: number; showDetails?: boolean } = {}
): string {
  const { maxItems = 5, showDetails = false } = options;

  if (notifications.length === 0) {
    return '';
  }

  const items = notifications.slice(0, maxItems);
  const remaining = notifications.length - items.length;

  const lines: string[] = [];

  for (const notification of items) {
    if (showDetails) {
      lines.push(formatNotificationDetailed(notification));
    } else {
      lines.push(formatNotification(notification));
    }
  }

  if (remaining > 0) {
    lines.push(`   ... and ${remaining} more`);
  }

  return lines.join('\n');
}

/**
 * Format notifications in a box for prominent display
 *
 * @param notifications - Array of notifications
 * @returns Formatted box string
 */
export function formatNotificationBox(notifications: Notification[]): string {
  if (notifications.length === 0) {
    return '';
  }

  const width = 50;
  const horizontalLine = '─'.repeat(width - 2);

  const lines: string[] = [];

  // Top border
  lines.push(`╭${horizontalLine}╮`);

  // Header
  const header = `📬 ${notifications.length} pending notification${notifications.length > 1 ? 's' : ''}`;
  lines.push(`│ ${header.padEnd(width - 3)} │`);

  // Separator
  lines.push(`├${horizontalLine}┤`);

  // Notifications (max 5)
  const maxItems = 5;
  const items = notifications.slice(0, maxItems);

  for (const notification of items) {
    const emoji = getSeverityEmoji(notification.severity);
    const text = `${emoji} ${notification.severity.toUpperCase()}: ${notification.title}`;
    const truncated = text.length > width - 4 ? text.substring(0, width - 7) + '...' : text;
    lines.push(`│ ${truncated.padEnd(width - 3)} │`);
  }

  // Remaining count
  const remaining = notifications.length - items.length;
  if (remaining > 0) {
    const moreText = `   ... and ${remaining} more`;
    lines.push(`│ ${moreText.padEnd(width - 3)} │`);
  }

  // Bottom border
  lines.push(`╰${horizontalLine}╯`);

  return lines.join('\n');
}

/**
 * Get a compact notification indicator for status line
 *
 * @param count - Number of pending notifications
 * @param hasCritical - Whether any are critical
 * @returns Compact indicator string
 */
export function getNotificationIndicator(
  count: number,
  hasCritical: boolean
): string {
  if (count === 0) {
    return '';
  }

  const emoji = hasCritical ? '🔔' : '📬';
  return `${emoji} ${count}`;
}

/**
 * Format notifications for injection into command output
 *
 * This is the main function used by hooks to display notifications
 * after command execution.
 *
 * @param notifications - Pending notifications
 * @param options - Display options
 * @returns Formatted string to append to output
 */
export function formatNotificationsForOutput(
  notifications: Notification[],
  options: {
    style?: 'compact' | 'summary' | 'box';
    separator?: string;
  } = {}
): string {
  const { style = 'summary', separator = '\n\n' } = options;

  if (notifications.length === 0) {
    return '';
  }

  let output: string;

  switch (style) {
    case 'compact':
      const hasCritical = notifications.some((n) => n.severity === 'critical');
      output = getNotificationIndicator(notifications.length, hasCritical);
      break;

    case 'box':
      output = formatNotificationBox(notifications);
      break;

    case 'summary':
    default:
      output = [
        formatNotificationSummary(notifications),
        formatNotificationList(notifications, { maxItems: 3 }),
      ].filter(Boolean).join('\n');
      break;
  }

  return output ? separator + output : '';
}

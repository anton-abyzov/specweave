/**
 * Notification Command Integration
 *
 * Helper for injecting notification summaries into command output.
 * Used by SpecWeave commands like /progress, /status, /done to show
 * pending notifications after their main output.
 *
 * @module core/notifications/command-integration
 */

import path from 'path';
import { NotificationManager } from './notification-manager.js';
import { Notification } from './notification-types.js';
import { formatNotificationsForOutput } from './notification-display.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Options for command notification display
 */
export interface CommandNotificationOptions {
  /**
   * Path to .specweave directory
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Display style
   * @default 'summary'
   */
  style?: 'compact' | 'summary' | 'box';

  /**
   * Minimum severity to show
   * If 'critical', only show if critical notifications exist
   */
  minSeverity?: 'info' | 'warning' | 'critical';
}

/**
 * Result of notification check
 */
export interface NotificationCheckResult {
  /**
   * Number of pending notifications
   */
  count: number;

  /**
   * Whether any critical notifications exist
   */
  hasCritical: boolean;

  /**
   * Whether any warning notifications exist
   */
  hasWarning: boolean;

  /**
   * Formatted output string (empty if no notifications to show)
   */
  output: string;

  /**
   * The pending notifications
   */
  notifications: Notification[];
}

/**
 * Check for pending notifications and format for command output
 *
 * @param options - Configuration options
 * @returns Check result with formatted output
 */
export async function checkAndFormatNotifications(
  options: CommandNotificationOptions = {}
): Promise<NotificationCheckResult> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
  const style = options.style ?? 'summary';

  const manager = new NotificationManager({ specweavePath, logger });

  let notifications: Notification[];
  try {
    notifications = await manager.getPending();
  } catch (error) {
    logger.debug(`Failed to load notifications: ${error}`);
    notifications = [];
  }

  const hasCritical = notifications.some(n => n.severity === 'critical');
  const hasWarning = notifications.some(n => n.severity === 'warning');

  // Filter by minimum severity if specified
  let filteredNotifications = notifications;
  if (options.minSeverity === 'critical') {
    filteredNotifications = hasCritical ? notifications : [];
  } else if (options.minSeverity === 'warning') {
    filteredNotifications = (hasCritical || hasWarning) ? notifications : [];
  }

  const output = formatNotificationsForOutput(filteredNotifications, { style });

  return {
    count: notifications.length,
    hasCritical,
    hasWarning,
    output,
    notifications: filteredNotifications,
  };
}

/**
 * Print notification summary to console if there are pending notifications
 *
 * @param options - Configuration options
 * @returns true if notifications were printed
 */
export async function printNotificationSummary(
  options: CommandNotificationOptions = {}
): Promise<boolean> {
  const result = await checkAndFormatNotifications(options);

  if (result.output) {
    console.log(result.output);
    console.log("Run '/sw:notifications' to view");
    return true;
  }

  return false;
}

/**
 * Wrapper to add notification summary to a command function
 *
 * @param commandFn - The command function to wrap
 * @param options - Notification display options
 * @returns Wrapped function that shows notifications after command
 */
export function withNotifications<T extends (...args: unknown[]) => Promise<void>>(
  commandFn: T,
  options: CommandNotificationOptions = {}
): T {
  return (async (...args: unknown[]) => {
    await commandFn(...args);
    await printNotificationSummary(options);
  }) as T;
}

/**
 * Notification Types
 *
 * Defines the types for the notification system.
 *
 * @module core/notifications/notification-types
 */

/**
 * Types of notifications
 */
export type NotificationType =
  | 'import-complete'
  | 'discrepancy'
  | 'sync-failure'
  | 'drift'
  | 'job-complete'
  | 'cost-alert';

/**
 * Notification severity levels
 */
export type NotificationSeverity = 'info' | 'warning' | 'critical';

/**
 * Notification data structure
 */
export interface Notification {
  /**
   * Unique notification ID
   */
  id: string;

  /**
   * Type of notification
   */
  type: NotificationType;

  /**
   * Severity level
   */
  severity: NotificationSeverity;

  /**
   * Short title for display
   */
  title: string;

  /**
   * Detailed message
   */
  message: string;

  /**
   * Type-specific data
   */
  data?: Record<string, unknown>;

  /**
   * ISO timestamp when created
   */
  createdAt: string;

  /**
   * ISO timestamp when user saw the notification
   */
  readAt?: string;

  /**
   * ISO timestamp when user dismissed the notification
   */
  dismissedAt?: string;
}

/**
 * Input for creating a new notification
 */
export interface CreateNotificationInput {
  /**
   * Type of notification
   */
  type: NotificationType;

  /**
   * Severity level
   */
  severity: NotificationSeverity;

  /**
   * Short title for display
   */
  title: string;

  /**
   * Detailed message
   */
  message: string;

  /**
   * Type-specific data
   */
  data?: Record<string, unknown>;
}

/**
 * Query options for notifications
 */
export interface NotificationQueryOptions {
  /**
   * Filter by type
   */
  type?: NotificationType;

  /**
   * Filter by severity
   */
  severity?: NotificationSeverity;

  /**
   * Include dismissed notifications
   * @default false
   */
  includeDismissed?: boolean;

  /**
   * Include read notifications
   * @default true
   */
  includeRead?: boolean;

  /**
   * Maximum number of notifications to return
   */
  limit?: number;

  /**
   * Skip first N notifications
   */
  offset?: number;

  /**
   * Sort order
   * @default 'desc' (newest first)
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generate a unique notification ID
 *
 * @returns Unique ID string
 */
export function generateNotificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `notif-${timestamp}-${random}`;
}

/**
 * Create a notification from input
 *
 * @param input - Notification input
 * @returns Full notification object
 */
export function createNotification(input: CreateNotificationInput): Notification {
  return {
    id: generateNotificationId(),
    type: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    data: input.data,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Check if notification should be shown (not dismissed)
 *
 * @param notification - Notification to check
 * @returns true if notification should be shown
 */
export function isPendingNotification(notification: Notification): boolean {
  return !notification.dismissedAt;
}

/**
 * Check if notification has been read
 *
 * @param notification - Notification to check
 * @returns true if notification has been read
 */
export function isReadNotification(notification: Notification): boolean {
  return !!notification.readAt;
}

/**
 * Get severity emoji for display
 *
 * @param severity - Severity level
 * @returns Emoji string
 */
export function getSeverityEmoji(severity: NotificationSeverity): string {
  switch (severity) {
    case 'critical':
      return '❗';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📬';
  }
}

/**
 * Get notification type label for display
 *
 * @param type - Notification type
 * @returns Human-readable label
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'import-complete':
      return 'Import Complete';
    case 'discrepancy':
      return 'Discrepancy';
    case 'sync-failure':
      return 'Sync Failure';
    case 'drift':
      return 'Drift Detected';
    case 'job-complete':
      return 'Job Complete';
    case 'cost-alert':
      return 'Cost Alert';
    default:
      return 'Notification';
  }
}

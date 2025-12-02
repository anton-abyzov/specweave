/**
 * Notification Manager
 *
 * Manages notification storage, retrieval, and lifecycle.
 *
 * @module core/notifications/notification-manager
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  Notification,
  CreateNotificationInput,
  NotificationQueryOptions,
  createNotification,
  isPendingNotification,
} from './notification-types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Persisted notifications file format
 */
interface NotificationsFile {
  /**
   * Schema version
   */
  version: number;

  /**
   * Array of notifications
   */
  notifications: Notification[];

  /**
   * Last updated timestamp
   */
  lastUpdated: string;
}

/**
 * Current schema version
 */
const CURRENT_VERSION = 1;

/**
 * Notification manager options
 */
export interface NotificationManagerOptions {
  /**
   * Path to .specweave directory
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Default cleanup age in days
   * @default 30
   */
  defaultRetentionDays?: number;
}

/**
 * NotificationManager - Central notification storage and retrieval
 *
 * Features:
 * - Add/query/dismiss notifications
 * - Automatic persistence
 * - Cleanup of old notifications
 */
export class NotificationManager {
  private readonly filePath: string;
  private readonly logger: Logger;
  private readonly defaultRetentionDays: number;
  private notifications: Notification[] | null = null;

  constructor(options: NotificationManagerOptions = {}) {
    const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
    this.filePath = path.join(specweavePath, 'state', 'notifications.json');
    this.logger = options.logger ?? consoleLogger;
    this.defaultRetentionDays = options.defaultRetentionDays ?? 30;
  }

  /**
   * Add a new notification
   *
   * @param input - Notification input
   * @returns Created notification
   */
  async add(input: CreateNotificationInput): Promise<Notification> {
    const notifications = await this.load();
    const notification = createNotification(input);

    notifications.push(notification);
    await this.save(notifications);

    this.logger.debug(`Added notification: ${notification.id} (${notification.type})`);
    return notification;
  }

  /**
   * Get pending notifications (not dismissed)
   *
   * @returns Array of pending notifications
   */
  async getPending(): Promise<Notification[]> {
    const notifications = await this.load();
    return notifications
      .filter(isPendingNotification)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all notifications with optional filtering
   *
   * @param options - Query options
   * @returns Array of notifications
   */
  async getAll(options: NotificationQueryOptions = {}): Promise<Notification[]> {
    const notifications = await this.load();

    let filtered = notifications;

    // Filter by type
    if (options.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }

    // Filter by severity
    if (options.severity) {
      filtered = filtered.filter((n) => n.severity === options.severity);
    }

    // Filter dismissed
    if (!options.includeDismissed) {
      filtered = filtered.filter((n) => !n.dismissedAt);
    }

    // Filter read (default: include read)
    if (options.includeRead === false) {
      filtered = filtered.filter((n) => !n.readAt);
    }

    // Sort
    const sortMultiplier = options.sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) =>
      sortMultiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );

    // Pagination
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get a single notification by ID
   *
   * @param id - Notification ID
   * @returns Notification or undefined
   */
  async getById(id: string): Promise<Notification | undefined> {
    const notifications = await this.load();
    return notifications.find((n) => n.id === id);
  }

  /**
   * Mark notifications as read
   *
   * @param ids - Array of notification IDs to mark as read
   */
  async markRead(ids: string[]): Promise<void> {
    const notifications = await this.load();
    const now = new Date().toISOString();
    let changed = false;

    for (const id of ids) {
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.readAt) {
        notification.readAt = now;
        changed = true;
      }
    }

    if (changed) {
      await this.save(notifications);
      this.logger.debug(`Marked ${ids.length} notifications as read`);
    }
  }

  /**
   * Dismiss notifications (hide from pending but keep in history)
   *
   * @param ids - Array of notification IDs to dismiss
   */
  async dismiss(ids: string[]): Promise<void> {
    const notifications = await this.load();
    const now = new Date().toISOString();
    let changed = false;

    for (const id of ids) {
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.dismissedAt) {
        notification.dismissedAt = now;
        // Also mark as read if not already
        if (!notification.readAt) {
          notification.readAt = now;
        }
        changed = true;
      }
    }

    if (changed) {
      await this.save(notifications);
      this.logger.debug(`Dismissed ${ids.length} notifications`);
    }
  }

  /**
   * Dismiss all pending notifications
   */
  async dismissAll(): Promise<void> {
    const pending = await this.getPending();
    const ids = pending.map((n) => n.id);
    if (ids.length > 0) {
      await this.dismiss(ids);
    }
  }

  /**
   * Cleanup old notifications
   *
   * @param olderThanDays - Remove notifications older than this many days
   * @returns Number of removed notifications
   */
  async cleanup(olderThanDays?: number): Promise<number> {
    const days = olderThanDays ?? this.defaultRetentionDays;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const notifications = await this.load();
    const originalCount = notifications.length;

    const filtered = notifications.filter((n) => {
      const createdAt = new Date(n.createdAt);
      return createdAt > cutoff;
    });

    const removedCount = originalCount - filtered.length;

    if (removedCount > 0) {
      await this.save(filtered);
      this.logger.debug(`Cleaned up ${removedCount} old notifications`);
    }

    return removedCount;
  }

  /**
   * Get summary for display
   *
   * @returns Summary object
   */
  async getSummary(): Promise<{
    total: number;
    pending: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const notifications = await this.load();
    const pending = notifications.filter(isPendingNotification);

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const n of pending) {
      bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1;
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      total: notifications.length,
      pending: pending.length,
      bySeverity,
      byType,
    };
  }

  /**
   * Check if there are any pending notifications
   *
   * @returns true if pending notifications exist
   */
  async hasPending(): Promise<boolean> {
    const pending = await this.getPending();
    return pending.length > 0;
  }

  /**
   * Load notifications from disk
   */
  private async load(): Promise<Notification[]> {
    if (this.notifications !== null) {
      return this.notifications;
    }

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content) as NotificationsFile;

      if (!Array.isArray(data.notifications)) {
        this.notifications = [];
        return this.notifications;
      }

      this.notifications = data.notifications;
      return this.notifications;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.notifications = [];
        return this.notifications;
      }

      if (error instanceof SyntaxError) {
        this.logger.warn('Corrupted notifications file, starting fresh');
        this.notifications = [];
        return this.notifications;
      }

      this.logger.error(`Failed to load notifications: ${error}`);
      this.notifications = [];
      return this.notifications;
    }
  }

  /**
   * Save notifications to disk
   */
  private async save(notifications: Notification[]): Promise<void> {
    this.notifications = notifications;

    const data: NotificationsFile = {
      version: CURRENT_VERSION,
      notifications,
      lastUpdated: new Date().toISOString(),
    };

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Atomic write
    const tempPath = `${this.filePath}.tmp`;
    const content = JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, this.filePath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.notifications = null;
  }

  /**
   * Get file path (for testing/debugging)
   */
  getFilePath(): string {
    return this.filePath;
  }
}

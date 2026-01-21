/**
 * Dashboard Data Provider
 *
 * Aggregates data from scheduler, notifications, and logs for the sync monitor dashboard.
 * Caches summary stats with configurable TTL for performance.
 *
 * @module core/dashboard/dashboard-data
 */

import { JobScheduler } from '../scheduler/job-scheduler.js';
import { ScheduledJob, JobStatus, JobType } from '../scheduler/scheduled-job.js';
import { NotificationManager } from '../notifications/notification-manager.js';
import { Notification, NotificationSeverity } from '../notifications/notification-types.js';
import { SyncAuditLogger, AuditLogEntry } from '../sync/sync-audit-logger.js';
import { SyncPlatform } from '../types/sync-config.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Job info for dashboard display
 */
export interface DashboardJobInfo {
  id: string;
  type: JobType;
  status: JobStatus;
  lastRun?: string;
  nextRun?: string;
  lastError?: string;
  retryCount?: number;
}

/**
 * Notification summary for dashboard
 */
export interface DashboardNotificationSummary {
  total: number;
  pending: number;
  bySeverity: Record<NotificationSeverity, number>;
  recent: Notification[];
}

/**
 * Sync activity summary for dashboard
 */
export interface DashboardActivitySummary {
  last24h: {
    synced: number;
    failed: number;
    skipped: number;
  };
  byPlatform: Record<SyncPlatform, number>;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  jobs: DashboardJobInfo[];
  notifications: DashboardNotificationSummary;
  activity: DashboardActivitySummary;
  generatedAt: string;
}

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Dashboard data provider options
 */
export interface DashboardDataProviderOptions {
  /**
   * Path to .specweave directory
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Job scheduler instance (optional, will create new if not provided)
   */
  scheduler?: JobScheduler;

  /**
   * Notification manager instance (optional, will create new if not provided)
   */
  notificationManager?: NotificationManager;

  /**
   * Audit logger instance (optional, will create new if not provided)
   */
  auditLogger?: SyncAuditLogger;

  /**
   * Notification cache TTL in milliseconds
   * @default 5000 (5 seconds)
   */
  notificationCacheTtlMs?: number;

  /**
   * Activity cache TTL in milliseconds
   * @default 60000 (1 minute)
   */
  activityCacheTtlMs?: number;

  /**
   * Number of recent notifications to include
   * @default 5
   */
  recentNotificationsLimit?: number;
}

/**
 * DashboardDataProvider - Aggregates data for the sync monitor dashboard
 *
 * Pulls data from:
 * - JobScheduler: Job statuses, last run, next run
 * - NotificationManager: Pending notifications, summaries
 * - SyncAuditLogger: Activity stats for last 24 hours
 *
 * Caching strategy:
 * - Job statuses: Real-time (no cache)
 * - Notification counts: 5-second cache
 * - Activity summary: 1-minute cache
 */
export class DashboardDataProvider {
  private readonly scheduler: JobScheduler;
  private readonly notificationManager: NotificationManager;
  private readonly auditLogger: SyncAuditLogger;
  private readonly logger: Logger;

  private readonly notificationCacheTtlMs: number;
  private readonly activityCacheTtlMs: number;
  private readonly recentNotificationsLimit: number;

  // Caches
  private notificationCache: CacheEntry<DashboardNotificationSummary> | null = null;
  private activityCache: CacheEntry<DashboardActivitySummary> | null = null;

  constructor(options: DashboardDataProviderOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.notificationCacheTtlMs = options.notificationCacheTtlMs ?? 5000;
    this.activityCacheTtlMs = options.activityCacheTtlMs ?? 60000;
    this.recentNotificationsLimit = options.recentNotificationsLimit ?? 5;

    // Use provided instances or create new ones
    this.scheduler = options.scheduler ?? new JobScheduler({ logger: this.logger });
    this.notificationManager = options.notificationManager ?? new NotificationManager({
      specweavePath: options.specweavePath,
      logger: this.logger,
    });
    this.auditLogger = options.auditLogger ?? new SyncAuditLogger({
      specweavePath: options.specweavePath,
      logger: this.logger,
    });
  }

  /**
   * Get complete dashboard data
   *
   * @returns Aggregated dashboard data
   */
  async getData(): Promise<DashboardData> {
    const [jobs, notifications, activity] = await Promise.all([
      this.getJobsData(),
      this.getNotificationsData(),
      this.getActivityData(),
    ]);

    return {
      jobs,
      notifications,
      activity,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get jobs data (real-time, no cache)
   */
  async getJobsData(): Promise<DashboardJobInfo[]> {
    const jobs = this.scheduler.getAllJobs();
    return jobs.map(this.mapJobToDashboard);
  }

  /**
   * Get notifications data (cached)
   */
  async getNotificationsData(): Promise<DashboardNotificationSummary> {
    // Check cache
    if (this.notificationCache && Date.now() < this.notificationCache.expiresAt) {
      return this.notificationCache.data;
    }

    // Fetch fresh data
    const [summary, pending] = await Promise.all([
      this.notificationManager.getSummary(),
      this.notificationManager.getPending(),
    ]);

    const data: DashboardNotificationSummary = {
      total: summary.total,
      pending: summary.pending,
      bySeverity: {
        info: summary.bySeverity['info'] || 0,
        warning: summary.bySeverity['warning'] || 0,
        critical: summary.bySeverity['critical'] || 0,
      },
      recent: pending.slice(0, this.recentNotificationsLimit),
    };

    // Cache result
    this.notificationCache = {
      data,
      expiresAt: Date.now() + this.notificationCacheTtlMs,
    };

    return data;
  }

  /**
   * Get activity data (cached)
   */
  async getActivityData(): Promise<DashboardActivitySummary> {
    // Check cache
    if (this.activityCache && Date.now() < this.activityCache.expiresAt) {
      return this.activityCache.data;
    }

    // Fetch fresh data from audit logger
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const stats = await this.auditLogger.getStats(since);

    const data: DashboardActivitySummary = {
      last24h: {
        synced: stats.success,
        failed: stats.errors,
        skipped: stats.denied,
      },
      byPlatform: stats.byPlatform,
    };

    // Cache result
    this.activityCache = {
      data,
      expiresAt: Date.now() + this.activityCacheTtlMs,
    };

    return data;
  }

  /**
   * Get job status emoji for display
   */
  getJobStatusEmoji(status: JobStatus): string {
    const statusEmojis: Record<JobStatus, string> = {
      idle: '✅',
      running: '🔄',
      failed: '❌',
      disabled: '⏸️',
    };
    return statusEmojis[status] ?? '❓';
  }

  /**
   * Format time relative to now (e.g., "5m ago", "in 10m")
   */
  formatRelativeTime(isoTimestamp: string | undefined): string {
    if (!isoTimestamp) {
      return 'never';
    }

    const timestamp = new Date(isoTimestamp).getTime();
    const now = Date.now();
    const diffMs = timestamp - now;
    const absDiffMs = Math.abs(diffMs);

    if (absDiffMs < 60 * 1000) {
      return diffMs < 0 ? 'just now' : 'soon';
    }

    const minutes = Math.floor(absDiffMs / (60 * 1000));
    if (minutes < 60) {
      return diffMs < 0 ? `${minutes}m ago` : `in ${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return diffMs < 0 ? `${hours}h ago` : `in ${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return diffMs < 0 ? `${days}d ago` : `in ${days}d`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.notificationCache = null;
    this.activityCache = null;
  }

  /**
   * Map scheduled job to dashboard format
   */
  private mapJobToDashboard = (job: ScheduledJob): DashboardJobInfo => {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      lastRun: job.schedule.lastRun,
      nextRun: job.schedule.nextRun,
      lastError: job.lastError,
      retryCount: job.schedule.retryCount > 0 ? job.schedule.retryCount : undefined,
    };
  };
}

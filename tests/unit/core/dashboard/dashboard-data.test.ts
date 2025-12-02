/**
 * Dashboard Data Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DashboardDataProvider,
  DashboardData,
  DashboardJobInfo,
} from '../../../../src/core/dashboard/dashboard-data.js';
import { JobScheduler } from '../../../../src/core/scheduler/job-scheduler.js';
import { NotificationManager } from '../../../../src/core/notifications/notification-manager.js';
import { SyncAuditLogger } from '../../../../src/core/sync/sync-audit-logger.js';
import { ScheduledJob } from '../../../../src/core/scheduler/scheduled-job.js';

// Mock the dependencies
vi.mock('../../../../src/core/scheduler/job-scheduler.js');
vi.mock('../../../../src/core/notifications/notification-manager.js');
vi.mock('../../../../src/core/sync/sync-audit-logger.js');

describe('DashboardDataProvider', () => {
  let provider: DashboardDataProvider;
  let mockScheduler: JobScheduler;
  let mockNotificationManager: NotificationManager;
  let mockAuditLogger: SyncAuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockScheduler = new JobScheduler();
    mockNotificationManager = new NotificationManager();
    mockAuditLogger = new SyncAuditLogger();

    // Setup mock implementations
    vi.mocked(mockScheduler.getAllJobs).mockReturnValue([
      {
        id: 'external-sync',
        type: 'external-sync',
        status: 'idle',
        schedule: {
          intervalMs: 600000,
          enabled: true,
          lastRun: '2025-12-01T12:00:00Z',
          nextRun: '2025-12-01T12:10:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
      },
      {
        id: 'discrepancy-check',
        type: 'discrepancy-check',
        status: 'running',
        schedule: {
          intervalMs: 3600000,
          enabled: true,
          lastRun: '2025-12-01T11:00:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
      },
    ] as ScheduledJob[]);

    vi.mocked(mockNotificationManager.getSummary).mockResolvedValue({
      total: 10,
      pending: 3,
      bySeverity: { info: 1, warning: 1, critical: 1 },
      byType: { 'sync-failure': 1, discrepancy: 2 },
    });

    vi.mocked(mockNotificationManager.getPending).mockResolvedValue([
      {
        id: 'notif-1',
        type: 'sync-failure',
        severity: 'critical',
        title: 'GitHub sync failed',
        message: 'Rate limited',
        createdAt: '2025-12-01T12:00:00Z',
      },
      {
        id: 'notif-2',
        type: 'discrepancy',
        severity: 'warning',
        title: '2 discrepancies found',
        message: 'In FS-045',
        createdAt: '2025-12-01T11:00:00Z',
      },
    ]);

    vi.mocked(mockAuditLogger.getStats).mockResolvedValue({
      total: 60,
      success: 45,
      denied: 8,
      errors: 7,
      byPlatform: { github: 40, jira: 15, ado: 5 },
      avgDurationMs: 250,
    });

    provider = new DashboardDataProvider({
      scheduler: mockScheduler,
      notificationManager: mockNotificationManager,
      auditLogger: mockAuditLogger,
    });
  });

  describe('getData', () => {
    it('should return complete dashboard data', async () => {
      const data = await provider.getData();

      expect(data).toHaveProperty('jobs');
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('activity');
      expect(data).toHaveProperty('generatedAt');
    });

    it('should include job statuses', async () => {
      const data = await provider.getData();

      expect(data.jobs).toHaveLength(2);
      expect(data.jobs[0]).toEqual({
        id: 'external-sync',
        type: 'external-sync',
        status: 'idle',
        lastRun: '2025-12-01T12:00:00Z',
        nextRun: '2025-12-01T12:10:00Z',
        lastError: undefined,
        retryCount: undefined,
      });
    });

    it('should include notification summary', async () => {
      const data = await provider.getData();

      expect(data.notifications.total).toBe(10);
      expect(data.notifications.pending).toBe(3);
      expect(data.notifications.bySeverity.critical).toBe(1);
      expect(data.notifications.recent).toHaveLength(2);
    });

    it('should include activity summary', async () => {
      const data = await provider.getData();

      expect(data.activity.last24h.synced).toBe(45);
      expect(data.activity.last24h.failed).toBe(7);
      expect(data.activity.last24h.skipped).toBe(8);
      expect(data.activity.byPlatform.github).toBe(40);
    });
  });

  describe('caching', () => {
    it('should cache notification data', async () => {
      await provider.getNotificationsData();
      await provider.getNotificationsData();

      // Should only call once due to cache
      expect(mockNotificationManager.getSummary).toHaveBeenCalledTimes(1);
    });

    it('should cache activity data', async () => {
      await provider.getActivityData();
      await provider.getActivityData();

      // Should only call once due to cache
      expect(mockAuditLogger.getStats).toHaveBeenCalledTimes(1);
    });

    it('should not cache job data', async () => {
      await provider.getJobsData();
      await provider.getJobsData();

      // Jobs are real-time, no caching
      expect(mockScheduler.getAllJobs).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearCache is called', async () => {
      await provider.getNotificationsData();
      provider.clearCache();
      await provider.getNotificationsData();

      // Should call twice - once before clear, once after
      expect(mockNotificationManager.getSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('getJobStatusEmoji', () => {
    it('should return correct emoji for each status', () => {
      expect(provider.getJobStatusEmoji('idle')).toBe('✅');
      expect(provider.getJobStatusEmoji('running')).toBe('🔄');
      expect(provider.getJobStatusEmoji('failed')).toBe('❌');
      expect(provider.getJobStatusEmoji('disabled')).toBe('⏸️');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "never" for undefined', () => {
      expect(provider.formatRelativeTime(undefined)).toBe('never');
    });

    it('should format past times correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(provider.formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(provider.formatRelativeTime(twoHoursAgo)).toBe('2h ago');

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(provider.formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('should format future times correctly', () => {
      const inTenMinutes = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      expect(provider.formatRelativeTime(inTenMinutes)).toBe('in 10m');

      const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      expect(provider.formatRelativeTime(inThreeHours)).toBe('in 3h');
    });
  });
});

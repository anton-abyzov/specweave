/**
 * Sync Monitor Command Tests
 *
 * IMPORTANT: Uses vi.hoisted() with class-based mocks for vitest 4.x compatibility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DashboardData } from '../../../../src/core/dashboard/dashboard-data.js';

// Use vi.hoisted() to create mock class
const { mockGetData, mockGetJobStatusEmoji, mockFormatRelativeTime, MockDashboardDataProvider } =
  vi.hoisted(() => {
    const _mockGetData = vi.fn().mockResolvedValue({
      jobs: [
        {
          id: 'external-sync',
          type: 'external-sync',
          status: 'idle',
          lastRun: '2025-12-01T12:00:00Z',
          nextRun: '2025-12-01T12:10:00Z',
        },
        {
          id: 'discrepancy-check',
          type: 'discrepancy-check',
          status: 'running',
        },
      ],
      notifications: {
        total: 10,
        pending: 2,
        bySeverity: { info: 1, warning: 0, critical: 1 },
        recent: [
          {
            id: 'notif-1',
            type: 'sync-failure',
            severity: 'critical',
            title: 'GitHub sync failed',
            message: 'Rate limited',
            createdAt: '2025-12-01T12:00:00Z',
          },
        ],
      },
      activity: {
        last24h: { synced: 45, failed: 2, skipped: 8 },
        byPlatform: { github: 40, jira: 12, ado: 3 },
      },
      generatedAt: '2025-12-01T12:05:00Z',
    });

    const _mockGetJobStatusEmoji = vi.fn().mockImplementation((status: string) => {
      switch (status) {
        case 'idle':
          return '✅';
        case 'running':
          return '🔄';
        case 'failed':
          return '❌';
        case 'disabled':
          return '⏸️';
        default:
          return '❓';
      }
    });

    const _mockFormatRelativeTime = vi.fn().mockReturnValue('5m ago');

    class _MockDashboardDataProvider {
      getData = _mockGetData;
      getJobStatusEmoji = _mockGetJobStatusEmoji;
      formatRelativeTime = _mockFormatRelativeTime;
    }

    return {
      mockGetData: _mockGetData,
      mockGetJobStatusEmoji: _mockGetJobStatusEmoji,
      mockFormatRelativeTime: _mockFormatRelativeTime,
      MockDashboardDataProvider: _MockDashboardDataProvider,
    };
  });

// Mock the dashboard provider
vi.mock('../../../../src/core/dashboard/dashboard-data.js', () => {
  return {
    DashboardDataProvider: MockDashboardDataProvider,
  };
});

// Import AFTER mocks are set up
import {
  createSyncMonitorCommand,
  runSyncMonitor,
  formatDashboard,
} from '../../../../src/cli/commands/sync-monitor.js';
import { DashboardDataProvider } from '../../../../src/core/dashboard/dashboard-data.js';

describe('sync-monitor command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('createSyncMonitorCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createSyncMonitorCommand();
      expect(cmd.name()).toBe('sync-monitor');
    });

    it('should have --json option', () => {
      const cmd = createSyncMonitorCommand();
      const jsonOption = cmd.options.find(o => o.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('runSyncMonitor', () => {
    it('should output JSON when --json flag is set', async () => {
      await runSyncMonitor({ json: true });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];

      // Should be valid JSON
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('jobs');
      expect(parsed).toHaveProperty('notifications');
      expect(parsed).toHaveProperty('activity');
    });

    it('should output formatted dashboard by default', async () => {
      await runSyncMonitor({});

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];

      // Should contain dashboard elements
      expect(output).toContain('SYNC MONITOR DASHBOARD');
      expect(output).toContain('SCHEDULED JOBS');
      expect(output).toContain('PENDING NOTIFICATIONS');
      expect(output).toContain('RECENT SYNC ACTIVITY');
    });

    it('should include job statuses in output', async () => {
      await runSyncMonitor({});

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('external-sync');
      expect(output).toContain('discrepancy-check');
    });

    it('should include notification summary in output', async () => {
      await runSyncMonitor({});

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('PENDING NOTIFICATIONS (2)');
      expect(output).toContain('GitHub sync failed');
    });

    it('should include activity stats in output', async () => {
      await runSyncMonitor({});

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('GitHub: 40');
      expect(output).toContain('JIRA: 12');
      expect(output).toContain('ADO: 3');
      expect(output).toContain('Success: 45');
      expect(output).toContain('Failed: 2');
      expect(output).toContain('Skipped: 8');
    });
  });

  describe('formatDashboard', () => {
    it('should format dashboard with box drawing characters', async () => {
      const mockProvider = new DashboardDataProvider();
      const data = await mockProvider.getData();

      const output = formatDashboard(data, mockProvider);

      // Check box characters
      expect(output).toContain('╔');
      expect(output).toContain('╗');
      expect(output).toContain('╚');
      expect(output).toContain('╝');
      expect(output).toContain('║');
    });

    it('should handle empty jobs list', async () => {
      const mockProvider = new DashboardDataProvider();
      const data: DashboardData = {
        jobs: [],
        notifications: {
          total: 0,
          pending: 0,
          bySeverity: { info: 0, warning: 0, critical: 0 },
          recent: [],
        },
        activity: {
          last24h: { synced: 0, failed: 0, skipped: 0 },
          byPlatform: { github: 0, jira: 0, ado: 0 },
        },
        generatedAt: new Date().toISOString(),
      };

      const output = formatDashboard(data, mockProvider);

      expect(output).toContain('No scheduled jobs');
    });

    it('should handle empty notifications list', async () => {
      const mockProvider = new DashboardDataProvider();
      const data: DashboardData = {
        jobs: [],
        notifications: {
          total: 0,
          pending: 0,
          bySeverity: { info: 0, warning: 0, critical: 0 },
          recent: [],
        },
        activity: {
          last24h: { synced: 0, failed: 0, skipped: 0 },
          byPlatform: { github: 0, jira: 0, ado: 0 },
        },
        generatedAt: new Date().toISOString(),
      };

      const output = formatDashboard(data, mockProvider);

      expect(output).toContain('No pending notifications');
    });
  });
});

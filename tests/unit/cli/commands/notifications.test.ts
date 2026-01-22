/**
 * Notifications Command Tests
 *
 * IMPORTANT: Uses vi.hoisted() with class-based mocks for vitest 4.x compatibility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Notification } from '../../../../src/core/notifications/notification-types.js';

// Use vi.hoisted() to create mock class and data
const { mockNotifications, mockGetAll, mockGetPending, mockGetById, mockDismiss, mockDismissAll, MockNotificationManager } =
  vi.hoisted(() => {
    const _mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        type: 'sync-failure',
        severity: 'critical',
        title: 'GitHub sync failed',
        message: 'Rate limit exceeded',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2m ago
        data: { platform: 'github', error: 'Rate limit exceeded' },
      },
      {
        id: 'notif-2',
        type: 'discrepancy',
        severity: 'warning',
        title: '2 discrepancies found',
        message: 'In FS-045',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
      },
      {
        id: 'notif-3',
        type: 'import-complete',
        severity: 'info',
        title: '107 items imported',
        message: 'From JIRA project CORE',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
        dismissedAt: new Date().toISOString(),
      },
    ];

    const _mockGetAll = vi.fn().mockImplementation(async (options: any) => {
      if (options?.includeDismissed) {
        return _mockNotifications;
      }
      return _mockNotifications.filter(n => !n.dismissedAt);
    });

    const _mockGetPending = vi.fn().mockResolvedValue(
      _mockNotifications.filter(n => !n.dismissedAt)
    );

    const _mockGetById = vi.fn().mockImplementation(async (id: string) => {
      return _mockNotifications.find(n => n.id === id);
    });

    const _mockDismiss = vi.fn().mockResolvedValue(undefined);
    const _mockDismissAll = vi.fn().mockResolvedValue(undefined);

    class _MockNotificationManager {
      getAll = _mockGetAll;
      getPending = _mockGetPending;
      getById = _mockGetById;
      dismiss = _mockDismiss;
      dismissAll = _mockDismissAll;
    }

    return {
      mockNotifications: _mockNotifications,
      mockGetAll: _mockGetAll,
      mockGetPending: _mockGetPending,
      mockGetById: _mockGetById,
      mockDismiss: _mockDismiss,
      mockDismissAll: _mockDismissAll,
      MockNotificationManager: _MockNotificationManager,
    };
  });

// Mock the NotificationManager
vi.mock('../../../../src/core/notifications/notification-manager.js', () => {
  return {
    NotificationManager: MockNotificationManager,
  };
});

// Import AFTER mocks are set up
import {
  createNotificationsCommand,
  listNotifications,
  showNotification,
  dismissNotification,
  formatRelativeTime,
} from '../../../../src/cli/commands/notifications.js';

describe('notifications command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('createNotificationsCommand', () => {
    it('should create a command with correct name', () => {
      const cmd = createNotificationsCommand();
      expect(cmd.name()).toBe('notifications');
    });

    it('should have --all option', () => {
      const cmd = createNotificationsCommand();
      const allOption = cmd.options.find(o => o.long === '--all');
      expect(allOption).toBeDefined();
    });

    it('should have --type option', () => {
      const cmd = createNotificationsCommand();
      const typeOption = cmd.options.find(o => o.long === '--type');
      expect(typeOption).toBeDefined();
    });

    it('should have --severity option', () => {
      const cmd = createNotificationsCommand();
      const severityOption = cmd.options.find(o => o.long === '--severity');
      expect(severityOption).toBeDefined();
    });

    it('should have show subcommand', () => {
      const cmd = createNotificationsCommand();
      const showCmd = cmd.commands.find(c => c.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should have dismiss subcommand', () => {
      const cmd = createNotificationsCommand();
      const dismissCmd = cmd.commands.find(c => c.name() === 'dismiss');
      expect(dismissCmd).toBeDefined();
    });

    it('should have dismiss-all subcommand', () => {
      const cmd = createNotificationsCommand();
      const dismissAllCmd = cmd.commands.find(c => c.name() === 'dismiss-all');
      expect(dismissAllCmd).toBeDefined();
    });
  });

  describe('listNotifications', () => {
    it('should list pending notifications by default', async () => {
      await listNotifications({});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PENDING NOTIFICATIONS (2)'));
    });

    it('should include dismissed when --all flag is set', async () => {
      await listNotifications({ all: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ALL NOTIFICATIONS'));
    });

    it('should output JSON when --json flag is set', async () => {
      await listNotifications({ json: true });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should show notification IDs', async () => {
      await listNotifications({});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('notif-1');
      expect(output).toContain('notif-2');
    });
  });

  describe('showNotification', () => {
    it('should show notification details', async () => {
      await showNotification('notif-1', {});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('NOTIFICATION DETAILS');
      expect(output).toContain('GitHub sync failed');
      expect(output).toContain('Rate limit exceeded');
    });

    it('should show error for non-existent notification', async () => {
      await showNotification('non-existent', {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification not found')
      );
      expect(process.exitCode).toBe(1);
    });

    it('should output JSON when --json flag is set', async () => {
      await showNotification('notif-1', { json: true });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('notif-1');
    });

    it('should show data section if present', async () => {
      await showNotification('notif-1', {});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Data:');
      expect(output).toContain('platform');
      expect(output).toContain('github');
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss a notification', async () => {
      await dismissNotification('notif-1', {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dismissed notification notif-1')
      );
    });

    it('should show error for non-existent notification', async () => {
      await dismissNotification('non-existent', {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification not found')
      );
    });

    it('should show remaining count after dismiss', async () => {
      await dismissNotification('notif-1', {});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Remaining:');
      expect(output).toContain('pending notifications');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format just now', () => {
      const result = formatRelativeTime(new Date().toISOString());
      expect(result).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });
});

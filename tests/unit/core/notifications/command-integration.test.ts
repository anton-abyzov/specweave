/**
 * Command Integration Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkAndFormatNotifications,
  printNotificationSummary,
  withNotifications,
} from '../../../../src/core/notifications/command-integration.js';
import { NotificationManager } from '../../../../src/core/notifications/notification-manager.js';
import { Notification } from '../../../../src/core/notifications/notification-types.js';

// Mock NotificationManager
vi.mock('../../../../src/core/notifications/notification-manager.js', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      type: 'sync-failure',
      severity: 'critical',
      title: 'GitHub sync failed',
      message: 'Rate limited',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      type: 'discrepancy',
      severity: 'warning',
      title: '2 discrepancies found',
      message: 'In FS-045',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-3',
      type: 'import-complete',
      severity: 'info',
      title: '107 items imported',
      message: 'From JIRA',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    NotificationManager: vi.fn().mockImplementation(() => ({
      getPending: vi.fn().mockResolvedValue(mockNotifications),
    })),
  };
});

describe('command-integration', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('checkAndFormatNotifications', () => {
    it('should return notification count', async () => {
      const result = await checkAndFormatNotifications();

      expect(result.count).toBe(3);
    });

    it('should detect critical notifications', async () => {
      const result = await checkAndFormatNotifications();

      expect(result.hasCritical).toBe(true);
    });

    it('should detect warning notifications', async () => {
      const result = await checkAndFormatNotifications();

      expect(result.hasWarning).toBe(true);
    });

    it('should return formatted output', async () => {
      const result = await checkAndFormatNotifications();

      expect(result.output).toContain('📬');
      expect(result.output).toContain('3');
    });

    it('should include notifications array', async () => {
      const result = await checkAndFormatNotifications();

      expect(result.notifications).toHaveLength(3);
    });

    it('should use summary style by default', async () => {
      const result = await checkAndFormatNotifications({ style: 'summary' });

      expect(result.output).toContain('notification');
    });

    it('should use box style when specified', async () => {
      const result = await checkAndFormatNotifications({ style: 'box' });

      expect(result.output).toContain('╭');
      expect(result.output).toContain('╰');
    });

    it('should use compact style when specified', async () => {
      const result = await checkAndFormatNotifications({ style: 'compact' });

      expect(result.output).toContain('🔔'); // Critical indicator
      expect(result.output).toContain('3');
    });

    it('should filter by minimum severity', async () => {
      // When minSeverity is 'critical' and there are critical notifications
      const result = await checkAndFormatNotifications({ minSeverity: 'critical' });

      // Since there IS a critical notification, should show all
      expect(result.count).toBe(3);
      expect(result.output).not.toBe('');
    });
  });

  describe('printNotificationSummary', () => {
    it('should print summary to console', async () => {
      const printed = await printNotificationSummary();

      expect(printed).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include hint to view notifications', async () => {
      await printNotificationSummary();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('/sw:notifications');
    });
  });

  describe('withNotifications', () => {
    it('should wrap a command function', async () => {
      const commandFn = vi.fn().mockResolvedValue(undefined);
      const wrapped = withNotifications(commandFn);

      await wrapped('arg1', 'arg2');

      expect(commandFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should print notifications after command', async () => {
      const commandFn = vi.fn().mockResolvedValue(undefined);
      const wrapped = withNotifications(commandFn);

      await wrapped();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('notification');
    });
  });

  describe('empty notifications', () => {
    it('should return empty output when no notifications', async () => {
      // Override mock to return empty
      vi.mocked(NotificationManager).mockImplementation(() => ({
        getPending: vi.fn().mockResolvedValue([]),
      }) as unknown as NotificationManager);

      const result = await checkAndFormatNotifications();

      expect(result.count).toBe(0);
      expect(result.output).toBe('');
    });

    it('should not print when no notifications', async () => {
      vi.mocked(NotificationManager).mockImplementation(() => ({
        getPending: vi.fn().mockResolvedValue([]),
      }) as unknown as NotificationManager);

      const printed = await printNotificationSummary();

      expect(printed).toBe(false);
    });
  });
});

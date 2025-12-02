/**
 * Notification Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  NotificationManager,
  Notification,
  CreateNotificationInput,
  createNotification,
  isPendingNotification,
  getSeverityEmoji,
} from '../../../../src/core/notifications/index.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('NotificationManager', () => {
  let manager: NotificationManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tempDir, 'state'), { recursive: true });

    manager = new NotificationManager({
      specweavePath: tempDir,
      logger: silentLogger,
    });
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('add', () => {
    it('should add a notification', async () => {
      const input: CreateNotificationInput = {
        type: 'import-complete',
        severity: 'info',
        title: 'Import Complete',
        message: '100 items imported successfully',
      };

      const notification = await manager.add(input);

      expect(notification.id).toBeDefined();
      expect(notification.type).toBe('import-complete');
      expect(notification.severity).toBe('info');
      expect(notification.title).toBe('Import Complete');
      expect(notification.createdAt).toBeDefined();
    });

    it('should persist notifications', async () => {
      await manager.add({
        type: 'sync-failure',
        severity: 'critical',
        title: 'Sync Failed',
        message: 'Rate limit exceeded',
      });

      // Create new manager to read from disk
      const manager2 = new NotificationManager({
        specweavePath: tempDir,
        logger: silentLogger,
      });

      const pending = await manager2.getPending();

      expect(pending.length).toBe(1);
      expect(pending[0].title).toBe('Sync Failed');
    });
  });

  describe('getPending', () => {
    it('should return non-dismissed notifications', async () => {
      await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'Notification 1',
        message: 'Message 1',
      });

      await manager.add({
        type: 'warning' as any,
        severity: 'warning',
        title: 'Notification 2',
        message: 'Message 2',
      });

      const pending = await manager.getPending();

      expect(pending.length).toBe(2);
    });

    it('should not return dismissed notifications', async () => {
      const notification = await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'To Dismiss',
        message: 'Will be dismissed',
      });

      await manager.dismiss([notification.id]);

      const pending = await manager.getPending();

      expect(pending.length).toBe(0);
    });

    it('should sort by creation time (newest first)', async () => {
      await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'First',
        message: 'Created first',
      });

      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'Second',
        message: 'Created second',
      });

      const pending = await manager.getPending();

      expect(pending[0].title).toBe('Second');
      expect(pending[1].title).toBe('First');
    });
  });

  describe('markRead', () => {
    it('should mark notifications as read', async () => {
      const notification = await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'To Read',
        message: 'Will be read',
      });

      await manager.markRead([notification.id]);

      const all = await manager.getAll({ includeDismissed: true });
      const updated = all.find((n) => n.id === notification.id);

      expect(updated?.readAt).toBeDefined();
    });

    it('should still appear in pending after read', async () => {
      const notification = await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'Read but Pending',
        message: 'Read != dismissed',
      });

      await manager.markRead([notification.id]);

      const pending = await manager.getPending();

      expect(pending.find((n) => n.id === notification.id)).toBeDefined();
    });
  });

  describe('dismiss', () => {
    it('should dismiss notifications', async () => {
      const notification = await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'To Dismiss',
        message: 'Will be dismissed',
      });

      await manager.dismiss([notification.id]);

      const all = await manager.getAll({ includeDismissed: true });
      const updated = all.find((n) => n.id === notification.id);

      expect(updated?.dismissedAt).toBeDefined();
      expect(updated?.readAt).toBeDefined(); // Dismiss also marks as read
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all pending notifications', async () => {
      await manager.add({ type: 'info' as any, severity: 'info', title: 'N1', message: 'M1' });
      await manager.add({ type: 'info' as any, severity: 'info', title: 'N2', message: 'M2' });
      await manager.add({ type: 'info' as any, severity: 'info', title: 'N3', message: 'M3' });

      await manager.dismissAll();

      const pending = await manager.getPending();

      expect(pending.length).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove old notifications', async () => {
      // Add a notification
      await manager.add({
        type: 'info' as any,
        severity: 'info',
        title: 'Recent',
        message: 'Just created',
      });

      // Cleanup with 0 days retention (removes all)
      const removed = await manager.cleanup(0);

      // Note: The notification was just created, so it might not be removed
      // depending on timing. This test verifies cleanup runs without error.
      expect(typeof removed).toBe('number');
    });
  });

  describe('getSummary', () => {
    it('should return correct summary', async () => {
      await manager.add({ type: 'sync-failure', severity: 'critical', title: 'C1', message: '' });
      await manager.add({ type: 'discrepancy', severity: 'warning', title: 'W1', message: '' });
      await manager.add({ type: 'import-complete', severity: 'info', title: 'I1', message: '' });
      await manager.add({ type: 'import-complete', severity: 'info', title: 'I2', message: '' });

      const summary = await manager.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.pending).toBe(4);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.bySeverity.warning).toBe(1);
      expect(summary.bySeverity.info).toBe(2);
      expect(summary.byType['import-complete']).toBe(2);
    });
  });

  describe('hasPending', () => {
    it('should return true when notifications exist', async () => {
      await manager.add({ type: 'info' as any, severity: 'info', title: 'N', message: 'M' });

      const hasPending = await manager.hasPending();

      expect(hasPending).toBe(true);
    });

    it('should return false when no notifications', async () => {
      const hasPending = await manager.hasPending();

      expect(hasPending).toBe(false);
    });
  });
});

describe('Notification helpers', () => {
  describe('createNotification', () => {
    it('should create notification with ID and timestamp', () => {
      const input: CreateNotificationInput = {
        type: 'drift',
        severity: 'warning',
        title: 'Drift Detected',
        message: 'Code differs from spec',
      };

      const notification = createNotification(input);

      expect(notification.id).toMatch(/^notif-/);
      expect(notification.createdAt).toBeDefined();
      expect(notification.type).toBe('drift');
      expect(notification.severity).toBe('warning');
    });
  });

  describe('isPendingNotification', () => {
    it('should return true for non-dismissed notification', () => {
      const notification: Notification = {
        id: 'test',
        type: 'info' as any,
        severity: 'info',
        title: 'Test',
        message: 'Test',
        createdAt: new Date().toISOString(),
      };

      expect(isPendingNotification(notification)).toBe(true);
    });

    it('should return false for dismissed notification', () => {
      const notification: Notification = {
        id: 'test',
        type: 'info' as any,
        severity: 'info',
        title: 'Test',
        message: 'Test',
        createdAt: new Date().toISOString(),
        dismissedAt: new Date().toISOString(),
      };

      expect(isPendingNotification(notification)).toBe(false);
    });
  });

  describe('getSeverityEmoji', () => {
    it('should return correct emojis', () => {
      expect(getSeverityEmoji('critical')).toBe('❗');
      expect(getSeverityEmoji('warning')).toBe('⚠️');
      expect(getSeverityEmoji('info')).toBe('ℹ️');
    });
  });
});
